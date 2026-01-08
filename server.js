import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// ---------------- DB ----------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Renderが提供するPostgresのURL
  ssl: { rejectUnauthorized: false }
});

// ---------------- Discord ----------------
const DISCORD_SEARCH_LOG = process.env.DISCORD_SEARCH_LOG;
const DISCORD_ADDLINE_LOG = process.env.DISCORD_ADDLINE_LOG;
const DISCORD_ERROR_LOG = process.env.DISCORD_ERROR_LOG;

async function sendDiscordLog(webhook, content) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.error("Discord Webhook送信失敗:", err.message);
  }
}

function logErrorToDiscord(message) {
  sendDiscordLog(DISCORD_ERROR_LOG, message).catch(console.error);
}

// ---------------- 駅追加 ----------------
async function addStation(line, station, distance) {
  try {
    const res = await pool.query(
      `INSERT INTO stations (line, station, distance)
       VALUES ($1, $2, $3) ON CONFLICT(station) DO NOTHING RETURNING *`,
      [line.trim(), station.trim(), Number(distance)]
    );
    if (res.rowCount > 0) {
      sendDiscordLog(DISCORD_ADDLINE_LOG, `駅追加: ${station} (${line}, ${distance}km)`);
      return true;
    }
    return false;
  } catch (err) {
    logErrorToDiscord(`addStationエラー: ${err.message}`);
    return false;
  }
}

// ---------------- 経路検索 ----------------
async function searchRoute(start, end, via = []) {
  try {
    const path = [start, ...via.filter(Boolean), end];
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const fromRes = await pool.query("SELECT * FROM stations WHERE station=$1", [path[i].trim()]);
      const toRes = await pool.query("SELECT * FROM stations WHERE station=$1", [path[i + 1].trim()]);
      if (fromRes.rowCount === 0 || toRes.rowCount === 0) throw new Error(`駅データ不足: ${path[i]} → ${path[i + 1]}`);
      totalDistance += Math.abs(toRes.rows[0].distance - fromRes.rows[0].distance);
    }

    // 運賃取得
    const fareRes = await pool.query(
      `SELECT fare FROM fares WHERE max >= $1 ORDER BY max ASC LIMIT 1`,
      [totalDistance]
    );
    const fare = fareRes.rowCount ? fareRes.rows[0].fare : null;

    return { path, distance: totalDistance, fare };
  } catch (err) {
    logErrorToDiscord(`searchRouteエラー: ${err.message}`);
    return { error: err.message };
  }
}

// ---------------- HTML UI ----------------
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

// ---------------- API ----------------
app.post("/search", async (req, res) => {
  const { start, end, via } = req.body;
  const result = await searchRoute(start, end, via || []);
  await sendDiscordLog(DISCORD_SEARCH_LOG, `検索: ${start} → ${end} 経由: ${via?.join(",") || "-"} 結果: ${JSON.stringify(result)}`);
  res.json(result);
});

app.post("/addStation", async (req, res) => {
  const { line, station, distance } = req.body;
  const added = await addStation(line, station, distance);
  res.json({ added, station, line, distance });
});

app.post("/resetStations", async (req, res) => {
  await pool.query("DELETE FROM stations");
  sendDiscordLog(DISCORD_ADDLINE_LOG, "駅データを完全リセットしました");
  res.json({ message: "駅データを完全リセットしました" });
});

// ---------------- サーバー起動 ----------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
