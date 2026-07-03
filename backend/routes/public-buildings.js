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

    let sql = "SELECT lb.id, lb.bid, lb.height, lb.area_m2, lb.confidence, ST_AsGeoJSON(lb.geom) AS geometry FROM building_footprint lb WHERE lb.geom IS NOT NULL";
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
    sql += ` OFFSET ${start} LIMIT ${pageSize}`;

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

router.get("/zones", async (req, res) => {
  try {
    const result = await query(
      `SELECT nz.bid, nz.zone_id, nz.zone_name, nz.restrict, nz.note, nz.flight_cei, nz.height_met, ST_AsGeoJSON(nz.geom) AS geometry FROM nofly_zone nz WHERE nz.geom IS NOT NULL`
    );

    const features = result.rows.map((row) => {
      let zoneCategory = "适飞区";
      if (row.restrict && row.restrict.includes("Controlled")) {
        zoneCategory = "限飞区";
      }
      if (row.restrict && row.restrict.includes("Prohibited")) {
        zoneCategory = "禁飞区";
      }

      return {
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
          zone_category: zoneCategory,
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
    console.error("Public nofly zones query error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;