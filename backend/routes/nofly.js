const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

const restrictTranslations = {
  "Controlled Airspace": { zh: "管制空域", en: "Controlled Airspace" },
  "Prohibited Airspace": { zh: "禁飞区", en: "Prohibited Airspace" },
  "Restricted Airspace": { zh: "限制空域", en: "Restricted Airspace" },
  "Special Flight Rules Area": { zh: "特殊飞行规则区域", en: "Special Flight Rules Area" },
  "Warning Area": { zh: "警告区域", en: "Warning Area" },
  "Alert Area": { zh: "警戒区域", en: "Alert Area" }
};

const categoryTranslations = {
  "适飞区": { zh: "适飞区", en: "Fly Zone" },
  "限飞区": { zh: "限飞区", en: "Restricted Zone" },
  "禁飞区": { zh: "禁飞区", en: "No-Fly Zone" }
};

router.get("/zones", async (req, res) => {
  try {
    const { zoneType, restrict, lang = 'zh' } = req.query;

    let sql = `SELECT nz.bid, nz.zone_id, nz.zone_name, nz.restrict, nz.note, nz.flight_cei, nz.height_met, nz.area, ST_AsGeoJSON(nz.geom) AS geometry FROM nofly_zone nz WHERE nz.geom IS NOT NULL`;
    const params = [];

    if (zoneType) {
      params.push(zoneType);
      sql += ` AND nz.zone_name LIKE $${params.length}`;
    }

    if (restrict) {
      params.push(restrict);
      sql += ` AND nz.restrict = $${params.length}`;
    }

    const result = await query(sql, params);

    const features = result.rows.map((row) => {
      let zoneCategory = "适飞区";
      if (row.restrict && row.restrict.includes("Controlled")) {
        zoneCategory = "限飞区";
      }
      if (row.restrict && row.restrict.includes("Prohibited")) {
        zoneCategory = "禁飞区";
      }

      const restrictInfo = restrictTranslations[row.restrict] || { zh: row.restrict, en: row.restrict };
      const catInfo = categoryTranslations[zoneCategory] || { zh: zoneCategory, en: zoneCategory };

      let note = row.note || '';
      if (note) {
        const parts = note.split(' | ');
        if (parts.length === 2) {
          note = lang === 'en' ? parts[0] : parts[1];
        }
      }

      return {
        type: "Feature",
        properties: {
          id: row.bid,
          bid: row.bid,
          zone_id: row.zone_id,
          zone_name: row.zone_name,
          restriction: lang === 'en' ? restrictInfo.en : restrictInfo.zh,
          note: note,
          flight_ceiling: row.flight_cei ? parseFloat(row.flight_cei) : null,
          height_meters: row.height_met ? parseFloat(row.height_met) : null,
          zone_category: lang === 'en' ? catInfo.en : catInfo.zh,
          area: row.area ? parseFloat(row.area) : null,
        },
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      };
    });

    res.json({
      code: 0,
      message: "success",
      data: {
        type: "FeatureCollection",
        features,
      },
      count: features.length,
    });
  } catch (error) {
    console.error("Nofly zones query error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/:zoneId", async (req, res) => {
  try {
    const { zoneId } = req.params;

    const result = await query(
      `SELECT nz.bid, nz.zone_id, nz.zone_name, nz.restrict, nz.note, nz.flight_cei, nz.height_met, ST_AsGeoJSON(nz.geom) AS geometry FROM nofly_zone nz WHERE nz.zone_id = $1 AND nz.geom IS NOT NULL LIMIT 1`,
      [zoneId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "禁飞区不存在",
        data: null,
      });
    }

    const row = result.rows[0];

    res.json({
      code: 0,
      message: "success",
      data: {
        type: "Feature",
        properties: {
          id: row.bid,
          bid: row.bid,
          zone_id: row.zone_id,
          zone_name: row.zone_name,
          restriction: row.restrict,
          note: row.note,
          flight_ceiling: row.flight_cei ? parseFloat(row.flight_cei) : null,
          height_meters: row.height_met ? parseFloat(row.height_met) : null,
        },
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      },
    });
  } catch (error) {
    console.error("Nofly zone detail error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;
