const fs = require("fs");
const { query, pool } = require("../utils/db");

const path = require("path");
const BUILDING_GEOJSON = path.join(__dirname, "../../building/LA_building.geojson");
const NOFLY_GEOJSON = path.join(__dirname, "../../no_fly_zone/无人机禁飞区_CGS_WGS84.geojson");

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

function translateNote(note) {
  if (!note) return "";
  
  const patterns = [
    { regex: /LAANC is not presently available in this area, use FAADroneZone/i, cn: "您必须获得FAA的空域授权。LAANC目前在此区域不可用，请使用FAADroneZone。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。" },
    { regex: /No airspace authorization is required/i, cn: "在此区域操作无需空域授权。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。" },
    { regex: /You must have an airspace authorization from the FAA\. Use LAANC/i, cn: "您必须获得FAA的空域授权，请使用LAANC。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。" },
    { regex: /No person may operate a small unmanned aircraft in restricted airspace/i, cn: "未经有关当局许可，任何人不得在限制空域内操作小型无人机。违反任何限制的个人可能会受到处罚。" },
    { regex: /Flight operations within 3NM of an FAA-designated stadium/i, cn: "在FAA指定体育场或体育场馆3海里范围内的飞行操作受到限制。请查看体育场日程安排。" },
    { regex: /Special flight rules apply/i, cn: "适用特殊飞行规则。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。" },
    { regex: /Flight not permitted/i, cn: "禁止飞行。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。" },
    { regex: /You must have an airspace authorization from the FAA/i, cn: "您必须获得FAA的空域授权。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。" }
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(note)) {
      return pattern.cn;
    }
  }
  
  return "";
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
      const noteEn = props.note || "";
      const noteCn = translateNote(noteEn);
      const noteCombined = noteCn ? `${noteEn} | ${noteCn}` : noteEn;
      values.push(`(${props.bid}, '${props.zone_id || ""}', '${(props.zone_name || "").replace(/'/g, "''")}', '${props.restrict || ""}', '${noteCombined.replace(/'/g, "''")}', ${props.flight_cei || 0}, ${props.height_met || 0}, ${props.Area || 0}, ST_SetSRID(ST_GeomFromGeoJSON('${geomJson.replace(/'/g, "''")}'), 4326))`);
    }

    const sql = `INSERT INTO nofly_zone (bid, zone_id, zone_name, restrict, note, flight_cei, height_met, area, geom) VALUES ${values.join(", ")}`;
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
