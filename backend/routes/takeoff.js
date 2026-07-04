const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

router.get("/takeoff-filter", async (req, res) => {
  try {
    const {
      minHeight = 0,
      maxHeight = 500,
      minArea = 50,
      maxArea = 5000,
      zoneType,
    } = req.query;

    let sql = `
      SELECT DISTINCT ON (lb.id)
        lb.id,
        lb.bid,
        lb.height,
        lb.area_m2,
        lb.confidence,
        lb.height_fil,
        nz.zone_name,
        nz.flight_cei,
        nz.restrict,
        ST_AsGeoJSON(lb.geom) AS geometry
      FROM la_building lb
      LEFT JOIN nofly_zone nz ON ST_Intersects(lb.geom, nz.geom)
      WHERE lb.height >= $1 AND lb.height <= $2
        AND lb.area_m2 >= $3 AND lb.area_m2 <= $4
        AND lb.geom IS NOT NULL
    `;

    const params = [minHeight, maxHeight, minArea, maxArea];

    if (zoneType) {
      params.push(zoneType);
      sql += ` AND nz.zone_name = $${params.length}`;
    }

    sql += " LIMIT 1000";

    const result = await query(sql, params);

    const features = result.rows.map((row) => {
      const height = parseFloat(row.height);
      const flightCeil = row.flight_cei ? parseFloat(row.flight_cei) : null;
      return {
        type: "Feature",
        properties: {
          id: row.id,
          bid: row.bid,
          height,
          roof_area: parseFloat(row.area_m2),
          confidence: parseFloat(row.confidence),
          height_fil: parseFloat(row.height_fil),
          zone_name: row.zone_name,
          flight_ceil: flightCeil,
          restriction: row.restrict,
          is_valid: !flightCeil || height <= flightCeil,
        },
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      };
    });

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    res.json({
      code: 0,
      message: features.length === 0 ? "未找到符合条件的起降点" : "success",
      data: geojson,
      count: features.length,
    });
  } catch (error) {
    console.error("Takeoff filter error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;
