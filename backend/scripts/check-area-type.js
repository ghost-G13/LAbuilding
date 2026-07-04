const { query } = require("../utils/db");

(async () => {
  try {
    const result = await query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'nofly_zone' AND column_name = 'area'`);
    console.log("area column data type:", result.rows[0]);
    
    const sample = await query(`SELECT area, typeof(area) FROM nofly_zone LIMIT 5`);
    console.log("Sample area values:", JSON.stringify(sample.rows, null, 2));
    
    const castResult = await query(`SELECT COALESCE(SUM(nz.area::numeric), 0) AS total_area FROM nofly_zone nz WHERE nz.area IS NOT NULL`);
    console.log("Total area with cast:", castResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();