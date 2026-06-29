const fs = require("fs");
const { query, pool } = require("../utils/db");

const BUILDING_GEOJSON = "E:/webist4data/数据1/建筑白模数据/LA_building.geojson";
const NOFLY_GEOJSON = "E:/webist4data/数据1/禁飞区数据/无人机禁飞区_CGS_WGS84.geojson";

async function truncateTables() {
  console.log("Truncating existing tables...");
  await query("TRUNCATE TABLE la_building RESTART IDENTITY");
  await query("TRUNCATE TABLE nofly_zone RESTART IDENTITY");
  console.log("Tables truncated");
}

async function importBuildings() {
  console.log("Reading building GeoJSON file...");
  const rawData = fs.readFileSync(BUILDING_GEOJSON, "utf8");
  const geojson = JSON.parse(rawData);
  console.log(`Total buildings: ${geojson.features.length}`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values = [];
    for (const feature of geojson.features) {
      const props = feature.properties;
      const geomJson = JSON.stringify(feature.geometry);
      values.push(`(${props.bid}, ${props.height || 0}, ${props.confidence || 0}, ${props.area_m2 || 0}, ${props.area_m2_ro || 0}, ${props.height_fil || 0}, ST_SetSRID(ST_GeomFromGeoJSON('${geomJson.replace(/'/g, "''")}'), 4326))`);
    }

    const batchSize = 5000;
    let processed = 0;

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const sql = `INSERT INTO la_building (bid, height, confidence, area_m2, area_m2_ro, height_fil, geom) VALUES ${batch.join(", ")}`;
      await client.query(sql);
      processed += batch.length;
      console.log(`Processed: ${processed}/${values.length}`);
    }

    await client.query("COMMIT");
    console.log("Building import completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error importing buildings:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function importNoflyZones() {
  console.log("\nReading nofly zone GeoJSON file...");
  const rawData = fs.readFileSync(NOFLY_GEOJSON, "utf8");
  const geojson = JSON.parse(rawData);
  console.log(`Total nofly zones: ${geojson.features.length}`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values = [];
    for (const feature of geojson.features) {
      const props = feature.properties;
      const geomJson = JSON.stringify(feature.geometry);
      values.push(`(${props.bid}, '${props.zone_id || ""}', '${(props.zone_name || "").replace(/'/g, "''")}', '${props.restrict || ""}', '${(props.note || "").replace(/'/g, "''")}', ${props.flight_cei || 0}, ${props.height_met || 0}, ST_SetSRID(ST_GeomFromGeoJSON('${geomJson.replace(/'/g, "''")}'), 4326))`);
    }

    const sql = `INSERT INTO nofly_zone (bid, zone_id, zone_name, restrict, note, flight_cei, height_met, geom) VALUES ${values.join(", ")}`;
    await client.query(sql);

    await client.query("COMMIT");
    console.log("Nofly zone import completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error importing nofly zones:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyImport() {
  console.log("\nVerifying import...");

  const buildingResult = await query("SELECT COUNT(*) as count FROM la_building WHERE geom IS NOT NULL");
  const noflyResult = await query("SELECT COUNT(*) as count FROM nofly_zone WHERE geom IS NOT NULL");

  console.log(`Buildings with geometry: ${buildingResult.rows[0].count}`);
  console.log(`Nofly zones with geometry: ${noflyResult.rows[0].count}`);
}

async function main() {
  try {
    await truncateTables();
    await importBuildings();
    await importNoflyZones();
    await verifyImport();
    console.log("\n=== Import completed successfully! ===");
  } catch (error) {
    console.error("\nImport failed:", error);
    process.exit(1);
  }
}

main();
