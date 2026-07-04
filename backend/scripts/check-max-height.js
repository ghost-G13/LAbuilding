const { query } = require("../utils/db");

(async () => {
  try {
    const result = await query(`SELECT MAX(height) as max_height FROM la_building WHERE height IS NOT NULL`);
    console.log("Max building height:", result.rows[0]);
    
    const avgResult = await query(`SELECT AVG(height) as avg_height FROM la_building WHERE height IS NOT NULL`);
    console.log("Avg building height:", avgResult.rows[0]);
    
    const percentileResult = await query(`SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY height) as p95_height FROM la_building WHERE height IS NOT NULL`);
    console.log("95th percentile height:", percentileResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();