const { query } = require("../utils/db");

(async () => {
  try {
    const result = await query(
      "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('la_building', 'nofly_zone') ORDER BY tablename"
    );
    console.log("=== Database Indexes ===");
    console.log(JSON.stringify(result.rows, null, 2));
    
    const buildingCount = await query("SELECT COUNT(*) as count FROM la_building");
    const noflyCount = await query("SELECT COUNT(*) as count FROM nofly_zone");
    console.log("\n=== Table Rows ===");
    console.log(`la_building: ${buildingCount.rows[0].count} rows`);
    console.log(`nofly_zone: ${noflyCount.rows[0].count} rows`);
    
    const buildingGeom = await query("SELECT COUNT(*) as count FROM la_building WHERE geom IS NOT NULL");
    const noflyGeom = await query("SELECT COUNT(*) as count FROM nofly_zone WHERE geom IS NOT NULL");
    console.log("\n=== Geometry Data ===");
    console.log(`la_building with geom: ${buildingGeom.rows[0].count} rows`);
    console.log(`nofly_zone with geom: ${noflyGeom.rows[0].count} rows`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();