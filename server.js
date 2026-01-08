import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Discord Webhook送信
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

// エラーをDiscordに送信
function logErrorToDiscord(msg) {
  sendDiscordLog(process.env.DISCORD_ERROR_LOG, `エラー: ${msg}`);
}

// 駅追加（D1に保存）
app.post("/addStation", async (req, res) => {
  const { line, station, distance } = req.body;
  try {
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `INSERT INTO stations (line, station, distance) VALUES (?,?,?)`,
        params: [line.trim(), station.trim(), Number(distance)]
      }),
    });

    sendDiscordLog(process.env.DISCORD_ADDLINE_LOG, `駅追加: ${station} (${line}, ${distance}km)`);
    res.json({ added: true });
  } catch (err) {
    logErrorToDiscord(err.message);
    res.json({ added: false, error: err.message });
  }
});

// 駅一覧取得
app.get("/stations", async (req, res) => {
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: `SELECT * FROM stations ORDER BY distance ASC` }),
    });
    const d = await r.json();
    res.json({ stations: d.result });
  } catch (err) {
    logErrorToDiscord(err.message);
    res.json({ error: err.message });
  }
});

// 経路検索
app.post("/search", async (req, res) => {
  const { start, end, via } = req.body;
  try {
    const path = [start, ...(via || []).filter(Boolean), end];
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const from = await getStation(path[i]);
      const to = await getStation(path[i+1]);
      if (!from || !to) throw new Error(`駅データ不足: ${path[i]} → ${path[i+1]}`);
      totalDistance += Math.abs(to.distance - from.distance);
    }

    const fare = calculateFare(totalDistance);
    const result = { path, distance: totalDistance, fare };

    sendDiscordLog(process.env.DISCORD_SEARCH_LOG, `検索: ${start} → ${end} / ${JSON.stringify(result)}`);
    res.json(result);
  } catch (err) {
    logErrorToDiscord(err.message);
    res.json({ error: err.message });
  }
});

// D1から駅を1つ取得する内部関数
async function getStation(name) {
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `SELECT * FROM stations WHERE station=?`,
        params: [name.trim()]
      }),
    });
    const d = await r.json();
    return d.result[0];
  } catch {
    return null;
  }
}

// 運賃計算（あなたの仕様を維持）
function calculateFare(distance) {
  const fareTable = [
    { maxDistance: 1, fare: 140 },
    { maxDistance: 3, fare: 190 },
    { maxDistance: 10, fare: 200 },
    { maxDistance: 15, fare: 240 },
    { maxDistance: 20, fare: 330 },
    { maxDistance: 25, fare: 420 },
    { maxDistance: 30, fare: 510 },
    { maxDistance: 35, fare: 590 },
    { maxDistance: 40, fare: 680 },
    { maxDistance: 45, fare: 770 },
    { maxDistance: 50, fare: 860 },
    { maxDistance: 60, fare: 990 },
    { maxDistance: 70, fare: 1170 },
    { maxDistance: 80, fare: 1340 },
    { maxDistance: 90, fare: 1520 },
    { maxDistance: 100, fare: 1690 },
    { maxDistance: 120, fare: 1980 },
    { maxDistance: 140, fare: 2310 },
    { maxDistance: 160, fare: 2640 },
     { maxDistance: 180, fare: 3080 },
    { maxDistance: 200, fare: 3410 },
    { maxDistance: 220, fare: 3740 },
    { maxDistance: 240, fare: 4070 },
    { maxDistance: 260, fare: 4510 },
    { maxDistance: 280, fare: 4840 },
    { maxDistance: 300, fare: 5170 },
    { maxDistance: 320, fare: 5500 },
    { maxDistance: 340, fare: 5720 },
    { maxDistance: 360, fare: 6050 },
    { maxDistance: 380, fare: 6380 },
    { maxDistance: 400, fare: 6600 },
    { maxDistance: 420, fare: 6930 },
    { maxDistance: 440, fare: 7150 },
    { maxDistance: 460, fare: 7480 },
    { maxDistance: 480, fare: 7700 },
    { maxDistance: 500, fare: 8030 },
    { maxDistance: 520, fare: 8360 },
    { maxDistance: 540, fare: 8580 },
    { maxDistance: 560, fare: 8910 },
    { maxDistance: 580, fare: 9130 },
    { maxDistance: 600, fare: 9460 },
    { maxDistance: 640, fare: 9790 },
    { maxDistance: 680, fare: 10010 },
    { maxDistance: 720, fare: 10340 },
    { maxDistance: 760, fare: 10670 },
    { maxDistance: 800, fare: 11000 },
    { maxDistance: 840, fare: 11300 },
    { maxDistance: 880, fare: 11550 },
    { maxDistance: 920, fare: 11880 },
    { maxDistance: 960, fare: 12210 },
    { maxDistance: 1000, fare: 12540 },
    { maxDistance: 1040, fare: 12870 },
    { maxDistance: 1080, fare: 13200 },
    { maxDistance: 1120, fare: 13420 },
    { maxDistance: 1160, fare: 13750 },
    { maxDistance: 1200, fare: 14080 },
    { maxDistance: 1240, fare: 14410 },
    { maxDistance: 1280, fare: 14740 },
    { maxDistance: 1320, fare: 15070 },
    { maxDistance: 1360, fare: 15290 },
    { maxDistance: 1400, fare: 15620 },
    { maxDistance: 1440, fare: 15950 },
    { maxDistance: 1480, fare: 16280 },
    { maxDistance: 1520, fare: 16610 },
    { maxDistance: 1560, fare: 16830 },
    { maxDistance: 1600, fare: 17160 },
    { maxDistance: 1640, fare: 17490 },
    { maxDistance: 1680, fare: 17820 },
    { maxDistance: 1720, fare: 18150 },
    { maxDistance: 1760, fare: 18480 },
    { maxDistance: 1800, fare: 18700 },
    { maxDistance: 1840, fare: 19030 },
    { maxDistance: 1880, fare: 19360 },
    { maxDistance: 1920, fare: 19690 },
    { maxDistance: 1960, fare: 20020 },
    { maxDistance: 2000, fare: 20240 },
    { maxDistance: 2040, fare: 20570 },
    { maxDistance: 2080, fare: 20900 },
    { maxDistance: 2120, fare: 21230 },
    { maxDistance: 2160, fare: 21560 },
    { maxDistance: 2200, fare: 21890 },
    { maxDistance: 2240, fare: 22110 },
    { maxDistance: 2280, fare: 22440 },
    { maxDistance: 2320, fare: 22770 },
    { maxDistance: 2360, fare: 23100 },
    { maxDistance: 2400, fare: 23430 },
    { maxDistance: 2440, fare: 23650 },
    { maxDistance: 2480, fare: 23980 },
    { maxDistance: 2520, fare: 24310 },
    { maxDistance: 2560, fare: 24640 },
    { maxDistance: 2600, fare: 24970 },
    { maxDistance: 2640, fare: 25300 },
    { maxDistance: 2680, fare: 25520 },
    { maxDistance: 2720, fare: 25850 },
    { maxDistance: 2760, fare: 26180 },
    { maxDistance: 2800, fare: 26510 },
    { maxDistance: 2840, fare: 26840 },
    { maxDistance: 2880, fare: 27060 },
    { maxDistance: 2920, fare: 27390 },
    { maxDistance: 2960, fare: 27720 },
    { maxDistance: 3000, fare: 28050 },
    { maxDistance: 3040, fare: 28380 },
    { maxDistance: 3080, fare: 28710 },
    { maxDistance: 3120, fare: 28930 },
    { maxDistance: 3160, fare: 29260 },
    { maxDistance: 3200, fare: 29590 },
    { maxDistance: 3240, fare: 29920 },
    { maxDistance: 3280, fare: 30250 },
    { maxDistance: 3320, fare: 30580 },
    { maxDistance: 3360, fare: 30800 },
    { maxDistance: 3400, fare: 31130 },
  ];

  for (let row of fareTable) {
    if (distance <= row.maxDistance) return row.fare;
  }
  return null;
}

// サーバー起動
app.listen(PORT, () => console.log(`Server起動: PORT ${PORT}`));
-- サーバー起動 ----------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
