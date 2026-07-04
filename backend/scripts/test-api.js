const { query } = require("../utils/db");

(async () => {
  try {
    console.log("=== Testing nofly-area API logic ===");
    
    const result = await query(`SELECT COALESCE(SUM(nz.area), 0) AS total_area FROM nofly_zone nz WHERE nz.area IS NOT NULL AND nz.restrict LIKE '%Prohibited%'`);
    console.log("Prohibited zones area:", result.rows[0]);
    
    const allResult = await query(`SELECT COALESCE(SUM(nz.area), 0) AS total_area FROM nofly_zone nz WHERE nz.area IS NOT NULL`);
    console.log("All zones area:", allResult.rows[0]);
    
    const totalAreaKm2 = parseFloat(allResult.rows[0].total_area) || 0;
    console.log("Parsed total_area:", totalAreaKm2);
    console.log("Formatted:", totalAreaKm2.toFixed(2));
    
    console.log("\n=== Testing nofly-zones with area ===");
    const zonesResult = await query(`SELECT nz.bid, nz.zone_name, nz.area FROM nofly_zone nz WHERE nz.geom IS NOT NULL LIMIT 5`);
    console.log("Zones sample:", JSON.stringify(zonesResult.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();