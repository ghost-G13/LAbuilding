const { query } = require("../utils/db");

const LA_MIN_LON = -118.5;
const LA_MAX_LON = -118.2;
const LA_MIN_LAT = 33.7;
const LA_MAX_LAT = 34.0;

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generateBuildingPolygon(lon, lat, area) {
  const size = Math.sqrt(area) / 100000;
  const points = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const offsetLon = Math.cos(angle) * size * randomInRange(0.8, 1.2);
    const offsetLat = Math.sin(angle) * size * randomInRange(0.8, 1.2);
    points.push([lon + offsetLon, lat + offsetLat]);
  }
  points.push(points[0]);
  return {
    type: "Polygon",
    coordinates: [points],
  };
}

function generateNoflyZone(lon, lat, area) {
  const size = Math.sqrt(area) / 1000;
  const points = [];
  const numPoints = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const radius = size * randomInRange(0.5, 1.5);
    points.push([lon + Math.cos(angle) * radius, lat + Math.sin(angle) * radius]);
  }
  points.push(points[0]);
  return {
    type: "Polygon",
    coordinates: [points],
  };
}

async function main() {
  console.log("Starting geometry data import...");

  try {
    const buildResult = await query("SELECT id, bid, area_m2 FROM la_building WHERE geom IS NULL LIMIT 100");
    console.log(`Found ${buildResult.rows.length} buildings without geometry`);

    for (let row of buildResult.rows) {
      const lon = randomInRange(LA_MIN_LON, LA_MAX_LON);
      const lat = randomInRange(LA_MIN_LAT, LA_MAX_LAT);
      const area = parseFloat(row.area_m2);
      const geom = generateBuildingPolygon(lon, lat, area);
      const geomJson = JSON.stringify(geom);

      await query(
        "UPDATE la_building SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2",
        [geomJson, row.id]
      );
    }

    console.log("Building geometry updated");

    const noflyResult = await query("SELECT bid FROM nofly_zone WHERE geom IS NULL LIMIT 20");
    console.log(`Found ${noflyResult.rows.length} nofly zones without geometry`);

    for (let row of noflyResult.rows) {
      const lon = randomInRange(LA_MIN_LON, LA_MAX_LON);
      const lat = randomInRange(LA_MIN_LAT, LA_MAX_LAT);
      const geom = generateNoflyZone(lon, lat, 0.01);
      const geomJson = JSON.stringify(geom);

      await query(
        "UPDATE nofly_zone SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE bid = $2",
        [geomJson, row.bid]
      );
    }

    console.log("Nofly zone geometry updated");

    const verifyBuild = await query("SELECT COUNT(*) as count FROM la_building WHERE geom IS NOT NULL");
    const verifyNofly = await query("SELECT COUNT(*) as count FROM nofly_zone WHERE geom IS NOT NULL");

    console.log(`Buildings with geometry: ${verifyBuild.rows[0].count}`);
    console.log(`Nofly zones with geometry: ${verifyNofly.rows[0].count}`);

    console.log("Geometry import completed successfully!");
  } catch (error) {
    console.error("Error during geometry import:", error);
    process.exit(1);
  }
}

main();
