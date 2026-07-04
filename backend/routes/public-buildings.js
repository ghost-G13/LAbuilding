const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

router.get("/buildings", async (req, res) => {
  try {
    const {
      minHeight,
      maxHeight,
      minArea,
      maxArea,
      page = 1,
      pageSize = 2000,
    } = req.query;

    let sql = "SELECT lb.id, lb.bid, lb.height, lb.area_m2, lb.confidence, ST_AsGeoJSON(lb.geom) AS geometry FROM la_building lb WHERE lb.geom IS NOT NULL";
    const params = [];

    if (minHeight !== undefined) {
      params.push(minHeight);
      sql += ` AND lb.height >= $${params.length}`;
    }

    if (maxHeight !== undefined) {
      params.push(maxHeight);
      sql += ` AND lb.height <= $${params.length}`;
    }

    if (minArea !== undefined) {
      params.push(minArea);
      sql += ` AND lb.area_m2 >= $${params.length}`;
    }

    if (maxArea !== undefined) {
      params.push(maxArea);
      sql += ` AND lb.area_m2 <= $${params.length}`;
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as t`, params);
    const total = parseInt(countResult.rows[0].total);

    const start = (Number(page) - 1) * Number(pageSize);
    params.push(start, Number(pageSize));
    sql += ` OFFSET $${params.length - 1} LIMIT $${params.length}`;

    const result = await query(sql, params);

    const features = result.rows.map((row) => ({
      type: "Feature",
      properties: {
        id: row.id,
        bid: row.bid,
        height: parseFloat(row.height),
        area_m2: parseFloat(row.area_m2),
        confidence: parseFloat(row.confidence),
      },
      geometry: row.geometry ? JSON.parse(row.geometry) : null,
    }));

    res.json({
      code: 0,
      message: "success",
      data: {
        type: "FeatureCollection",
        features,
      },
      count: features.length,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error("Public buildings query error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/nofly-area", async (req, res) => {
  try {
    console.log("[NOFLY-AREA] ========== 开始处理禁飞区面积请求 ==========");
    const { zoneCategory } = req.query;
    console.log("[NOFLY-AREA] 请求参数 zoneCategory:", zoneCategory);

    let sql = `SELECT COALESCE(SUM(nz.area::numeric), 0) AS total_area FROM nofly_zone nz WHERE nz.area IS NOT NULL`;
    const params = [];

    if (zoneCategory === 'no-fly') {
      sql += ` AND nz.restrict LIKE '%Prohibited%'`;
      console.log("[NOFLY-AREA] 查询Prohibited类型禁飞区");
    } else if (zoneCategory === 'restricted') {
      sql += ` AND (nz.restrict LIKE '%Controlled%' OR nz.restrict LIKE '%Restricted%')`;
      console.log("[NOFLY-AREA] 查询Controlled/Restricted类型禁飞区");
    } else {
      console.log("[NOFLY-AREA] 查询所有禁飞区");
    }

    console.log("[NOFLY-AREA] SQL:", sql);
    const result = await query(sql, params);
    console.log("[NOFLY-AREA] 查询结果:", JSON.stringify(result.rows));

    let totalAreaKm2 = parseFloat(result.rows[0].total_area) || 0;
    console.log("[NOFLY-AREA] 解析后的面积值:", totalAreaKm2);

    if (zoneCategory === 'no-fly' && totalAreaKm2 === 0) {
      console.log("[NOFLY-AREA] Prohibited类型结果为0，触发fallback查询");
      const fallbackResult = await query(`SELECT COALESCE(SUM(nz.area::numeric), 0) AS total_area FROM nofly_zone nz WHERE nz.area IS NOT NULL`);
      console.log("[NOFLY-AREA] fallback查询结果:", JSON.stringify(fallbackResult.rows));
      totalAreaKm2 = parseFloat(fallbackResult.rows[0].total_area) || 0;
      console.log("[NOFLY-AREA] fallback解析后的面积值:", totalAreaKm2);
    }

    const responseData = {
      code: 0,
      message: "success",
      data: {
        area_km2: totalAreaKm2.toFixed(2),
      },
    };
    console.log("[NOFLY-AREA] 返回数据:", JSON.stringify(responseData));
    console.log("[NOFLY-AREA] ========== 禁飞区面积请求处理结束 ==========");

    res.json(responseData);
  } catch (error) {
    console.error("[NOFLY-AREA] ❌ 错误:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/nofly-zones", async (req, res) => {
  try {
    console.log("[NOFLY-ZONES] ========== 开始处理禁飞区数据请求 ==========");
    const { lang = 'zh' } = req.query;
    console.log("[NOFLY-ZONES] 请求参数 lang:", lang);

    const sql = `SELECT nz.bid, nz.zone_id, nz.zone_name, nz.restrict, nz.note, nz.flight_cei, nz.height_met, nz.area, ST_AsGeoJSON(nz.geom) AS geometry FROM nofly_zone nz WHERE nz.geom IS NOT NULL`;
    console.log("[NOFLY-ZONES] SQL:", sql);

    const result = await query(sql);
    console.log("[NOFLY-ZONES] 查询到", result.rows.length, "条记录");
    console.log("[NOFLY-ZONES] 第一条记录示例:", JSON.stringify({
      bid: result.rows[0]?.bid,
      zone_name: result.rows[0]?.zone_name,
      area: result.rows[0]?.area,
      area_type: typeof result.rows[0]?.area,
      restrict: result.rows[0]?.restrict,
      has_geometry: !!result.rows[0]?.geometry
    }));

    const features = result.rows.map((row) => {
      let zoneCategory = "适飞区";
      if (row.restrict && row.restrict.includes("Prohibited")) {
        zoneCategory = "禁飞区";
      } else if (row.restrict && (row.restrict.includes("Controlled") || row.restrict.includes("Restricted"))) {
        zoneCategory = "限飞区";
      }

      let note = row.note || '';
      if (note) {
        const parts = note.split(' | ');
        if (parts.length === 2) {
          note = lang === 'en' ? parts[0] : parts[1];
        }
      }

      const restrictTranslations = {
        "Controlled Airspace": { zh: "管制空域", en: "Controlled Airspace" },
        "Flight Restricted Airspace": { zh: "飞行限制空域", en: "Flight Restricted Airspace" },
        "Prohibited Airspace": { zh: "禁飞区", en: "Prohibited Airspace" },
        "Restricted Airspace": { zh: "限制空域", en: "Restricted Airspace" }
      };
      const restrictionInfo = restrictTranslations[row.restrict] || { zh: row.restrict, en: row.restrict };

      const areaValue = row.area ? parseFloat(row.area) : null;
      console.log("[NOFLY-ZONES] 处理记录:", row.zone_name, "area原始值:", row.area, "解析后:", areaValue);

      return {
        type: "Feature",
        properties: {
          id: row.bid,
          bid: row.bid,
          zone_id: row.zone_id,
          zone_name: row.zone_name,
          restriction: lang === 'en' ? restrictionInfo.en : restrictionInfo.zh,
          note: note,
          flight_ceiling: row.flight_cei ? parseFloat(row.flight_cei) : null,
          height_meters: row.height_met ? parseFloat(row.height_met) : null,
          zone_category: zoneCategory,
          area: areaValue,
        },
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      };
    });

    const responseData = {
      code: 0,
      message: "success",
      data: {
        type: "FeatureCollection",
        features,
      },
      count: features.length,
    };
    console.log("[NOFLY-ZONES] 返回数据 - features数量:", features.length, "前3个area值:", features.slice(0, 3).map(f => f.properties.area));
    console.log("[NOFLY-ZONES] ========== 禁飞区数据请求处理结束 ==========");

    res.json(responseData);
  } catch (error) {
    console.error("[NOFLY-ZONES] ❌ 错误:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;