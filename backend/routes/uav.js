const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

router.post("/route-check", async (req, res) => {
  try {
    const { route, maxAltitude, flightBounds } = req.body;

    if (!route || !route.type || route.type !== "LineString") {
      return res.status(400).json({
        code: 400,
        message: "无效的航线数据",
      });
    }

    const routeGeoJson = JSON.stringify(route);

    const risks = {
      building_collision: [],
      nofly_zone: [],
      boundary_violation: false,
    };

    const buildingQuery = `
      SELECT
        lb.id,
        lb.bid,
        lb.height,
        lb.area_m2,
        lb.confidence,
        ST_AsGeoJSON(lb.geom) AS geometry,
        ST_AsGeoJSON(ST_Intersection(lb.geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))) AS collision_point
      FROM la_building lb
      WHERE ST_Intersects(lb.geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
        AND lb.geom IS NOT NULL
        AND lb.height > $2
    `;

    const buildingResult = await query(buildingQuery, [routeGeoJson, maxAltitude]);

    if (buildingResult.rows.length > 0) {
      risks.building_collision = buildingResult.rows.map((row) => ({
        type: "building_collision",
        id: row.id,
        bid: row.bid,
        height: parseFloat(row.height),
        max_altitude: parseFloat(maxAltitude),
        collision_point: row.collision_point ? JSON.parse(row.collision_point) : null,
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      }));
    }

    const noflyQuery = `
      SELECT
        nz.bid,
        nz.zone_id,
        nz.zone_name,
        nz.flight_cei,
        nz.restrict,
        ST_AsGeoJSON(nz.geom) AS geometry,
        ST_AsGeoJSON(ST_Intersection(nz.geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))) AS intrusion_point
      FROM nofly_zone nz
      WHERE ST_Intersects(nz.geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
        AND nz.geom IS NOT NULL
    `;

    const noflyResult = await query(noflyQuery, [routeGeoJson]);

    if (noflyResult.rows.length > 0) {
      risks.nofly_zone = noflyResult.rows.map((row) => ({
        type: "nofly_zone",
        bid: row.bid,
        zone_id: row.zone_id,
        zone_name: row.zone_name,
        flight_ceil: row.flight_cei ? parseFloat(row.flight_cei) : null,
        restriction: row.restrict,
        intrusion_point: row.intrusion_point ? JSON.parse(row.intrusion_point) : null,
        geometry: row.geometry ? JSON.parse(row.geometry) : null,
      }));
    }

    if (flightBounds) {
      const boundsGeoJson = JSON.stringify(flightBounds);

      const boundaryQuery = `
        SELECT ST_Covers(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)) AS is_covered
      `;

      const boundaryResult = await query(boundaryQuery, [boundsGeoJson, routeGeoJson]);
      risks.boundary_violation = !boundaryResult.rows[0].is_covered;
    }

    const hasRisk = risks.building_collision.length > 0 || risks.nofly_zone.length > 0 || risks.boundary_violation;

    res.json({
      code: 0,
      message: "success",
      data: {
        has_risk: hasRisk,
        risks,
        route,
        max_altitude: parseFloat(maxAltitude),
        note: hasRisk ? "检测到潜在风险，请检查航线规划" : "航线安全检查通过",
      },
    });
  } catch (error) {
    console.error("Route check error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;
