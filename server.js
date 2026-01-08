import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { queryD1 } from "./database.js";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Discord Webhook
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
    console.error("Discord送信失敗:", err.message);
  }
}

function logErrorToDiscord(message) {
  sendDiscordLog(DISCORD_ERROR_LOG, message);
}

// 駅追加（D1保存）
app.post("/addStation", async (req, res) => {
  const { line, station, distance } = req.body;
  try {
    const sql = `INSERT INTO stations (line, station, distance) VALUES (?, ?, ?)`;
    await queryD1(sql, [line.trim(), station.trim(), Number(distance)]);
    await sendDiscordLog(DISCORD_ADDLINE_LOG, `駅追加: ${station} (${line}, ${distance}km)`);
    res.json({ added: true });
  } catch (err) {
    logErrorToDiscord(`addStationエラー: ${err.message}`);
    res.json({ added: false, error: err.message });
  }
});

// 経路検索（D1から駅距離を取得）
app.post("/search", async (req, res) => {
  const { start, end, via = [] } = req.body;
  try {
    const path = [start, ...via.filter(Boolean), end];

    let stations = await queryD1(`SELECT station, distance FROM stations`);
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const from = stations.find(s => s.station === path[i].trim());
      const to = stations.find(s => s.station === path[i + 1].trim());
      if (!from || !to) throw new Error(`駅データ不足: ${path[i]} → ${path[i + 1]}`);
      totalDistance += Math.abs(to.distance - from.distance);
    }

    // 運賃計算（あなたのテーブル使う場合は関数化できます）
    const fareResult = await queryD1(`SELECT fare FROM fares WHERE max >= ? ORDER BY max ASC LIMIT 1`, [totalDistance]);
    const fare = fareResult[0]?.fare || null;

    await sendDiscordLog(DISCORD_SEARCH_LOG, `検索: ${start} → ${end} 経由: ${via.join(",") || "-"} / ${totalDistance}km / 運賃:${fare ?? "未定"}`);
    res.json({ path, distance: totalDistance, fare });
  } catch (err) {
    logErrorToDiscord(`searchエラー: ${err.message}`);
    res.json({ error: err.message });
  }
});

// 起動
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
