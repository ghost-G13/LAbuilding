const { query, pool } = require("../utils/db");

const translations = {
  "You must have an airspace authorization from the FAA. Use LAANC. Prior to flight, the remote pilot in command must assess local airspace and any flight restrictions.": {
    cn: "您必须获得FAA的空域授权，请使用LAANC。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。"
  },
  "You must have an airspace authorization from the FAA. LAANC is not presently available in this area, use FAADroneZone. Prior to flight, the remote pilot in command must assess local airspace and any flight restrictions.": {
    cn: "您必须获得FAA的空域授权。LAANC目前在此区域不可用，请使用FAADroneZone。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。"
  },
  "No person may operate a small unmanned aircraft in restricted airspace unless that person has permission from the appropriate authority. Individuals violating any of these restrictions may be subject": {
    cn: "未经有关当局许可，任何人不得在限制空域内操作小型无人机。违反任何限制的个人可能会受到处罚。"
  },
  "Flight operations within 3NM of an FAA-designated stadium or sporting venue are restricted from 1 hour before the planned start time until 1 hour after the end of any qualifying event. Check the stadium sch": {
    cn: "在FAA指定体育场或体育场馆3海里范围内的飞行操作受到限制。从计划开始时间前1小时到任何资格赛结束后1小时。请查看体育场日程安排。"
  },
  "No airspace authorization is required": {
    cn: "在此区域操作无需空域授权。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。"
  },
  "LAANC is not presently available in this area, use FAADroneZone": {
    cn: "LAANC目前在此区域不可用，请使用FAADroneZone。飞行前，遥控飞行员必须评估当地空域和任何飞行限制。"
  }
};

const getTranslation = (note) => {
  for (const [en, trans] of Object.entries(translations)) {
    if (note.includes(en)) {
      return trans.cn;
    }
  }
  return "";
};

async function updateNotes() {
  console.log("Updating nofly zone notes with Chinese translations...");
  
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    const result = await client.query("SELECT bid, note FROM nofly_zone WHERE note IS NOT NULL AND note NOT LIKE '% | %'");
    console.log(`Found ${result.rows.length} records to update`);
    
    let updated = 0;
    for (const row of result.rows) {
      const cnTranslation = getTranslation(row.note);
      if (cnTranslation) {
        const newNote = `${row.note} | ${cnTranslation}`;
        await client.query("UPDATE nofly_zone SET note = $1 WHERE bid = $2", [newNote, row.bid]);
        updated++;
      }
    }
    
    await client.query("COMMIT");
    console.log(`Updated ${updated} records`);
    
    const verifyResult = await client.query("SELECT COUNT(*) as count FROM nofly_zone WHERE note LIKE '% | %'");
    console.log(`Total records with translations: ${verifyResult.rows[0].count}`);
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating notes:", error);
    throw error;
  } finally {
    client.release();
  }
}

updateNotes().catch(e => {
  console.error("Failed:", e);
  process.exit(1);
});