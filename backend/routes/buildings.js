const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

router.get("/", async (req, res) => {
  try {
    const {
      minHeight,
      maxHeight,
      minArea,
      maxArea,
      page = 1,
      pageSize = 20,
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
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
      },
    });
  } catch (error) {
    console.error("Buildings query error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/point-query", async (req, res) => {
  try {
    const { lng, lat } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        code: 400,
        message: "缺少坐标参数 lng 和 lat",
      });
    }

    const result = await query(
      `SELECT lb.id, lb.bid, lb.height, lb.area_m2, lb.confidence, lb.height_fil, nz.zone_name, nz.flight_cei, nz.restrict, ST_AsGeoJSON(lb.geom) AS geometry FROM la_building lb LEFT JOIN nofly_zone nz ON lb.geom && nz.geom WHERE ST_Contains(lb.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AND lb.geom IS NOT NULL LIMIT 1`,
      [parseFloat(lng), parseFloat(lat)]
    );

    if (result.rows.length === 0) {
      return res.json({
        code: 0,
        message: "未查询到建筑",
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
          id: row.id,
          bid: row.bid,
          height: parseFloat(row.height),
          area_m2: parseFloat(row.area_m2),
          roof_area: parseFloat(row.area_m2),
          confidence: parseFloat(row.confidence),
          height_fil: parseFloat(row.height_fil),
          zone_name: row.zone_name,
          flight_ceil: row.flight_cei ? parseFloat(row.flight_cei) : null,
          restriction: row.restrict,
        },
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      },
    });
  } catch (error) {
    console.error("Point query error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/:bid", async (req, res) => {
  try {
    const { bid } = req.params;

    const result = await query(
      `SELECT lb.id, lb.bid, lb.height, lb.area_m2, lb.confidence, lb.height_fil, nz.zone_name, nz.flight_cei, nz.restrict, ST_AsGeoJSON(lb.geom) AS geometry FROM la_building lb LEFT JOIN nofly_zone nz ON lb.geom && nz.geom WHERE lb.bid = $1 AND lb.geom IS NOT NULL LIMIT 1`,
      [bid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "建筑不存在",
        data: null,
      });
    }

    const row = result.rows[0];
    const height = parseFloat(row.height);
    const flightCeil = row.flight_cei ? parseFloat(row.flight_cei) : null;

    res.json({
      code: 0,
      message: "success",
      data: {
        type: "Feature",
        properties: {
          id: row.id,
          bid: row.bid,
          height,
          area_m2: parseFloat(row.area_m2),
          roof_area: parseFloat(row.area_m2),
          confidence: parseFloat(row.confidence),
          height_fil: parseFloat(row.height_fil),
          zone_name: row.zone_name,
          flight_ceil: flightCeil,
          restriction: row.restrict,
          is_valid_for_takeoff: !flightCeil || height <= flightCeil,
        },
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      },
    });
  } catch (error) {
    console.error("Building detail error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;
