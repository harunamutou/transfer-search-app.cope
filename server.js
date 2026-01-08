// server.js
import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Discord Webhook
const DISCORD_SEARCH_LOG = "https://discord.com/api/webhooks/1458559479531573383/clnGsN1RzEesGLtsYWRApXlKxBY1ON5vuSVT9nJUxIPrs5bka8ADZPKxGT4K5isUIfdY";
const DISCORD_ADDLINE_LOG = "https://discord.com/api/webhooks/1458559343065829377/9pf_8WeNhGb9XzVoMJTmoj9YTy7-imKELnzFxMTayIv_hUTlM-gA19_3eGMYKdOEO6w5";
const DISCORD_ERROR_LOG = "https://discord.com/api/webhooks/1458547135472467998/2Ces9SugoRXoJgyC-WavJ3tmNmLy90Z5xIhvBLWcwkN_LZnRjLfxsTf5dOR3eHOX8lMO";

// サーバー内駅データ
let stationData = [];

// Discord Webhook送信
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
  sendDiscordLog(DISCORD_ERROR_LOG, message).catch(e => console.error("Discord送信失敗:", e));
}

// 駅追加
function addStation(line, station, distance) {
  const exists = stationData.find(s => s.station === station.trim());
  if (exists) return false; // すでにある
  stationData.push({ line: line.trim(), station: station.trim(), distance: Number(distance) });
  sendDiscordLog(DISCORD_ADDLINE_LOG, `駅追加: ${station} (${line}, ${distance}km)`);
  return true;
}

// 経路検索
function searchRoute(start, end, via = []) {
  try {
    const path = [start, ...via.filter(Boolean), end];
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const from = stationData.find(s => s.station === path[i].trim());
      const to = stationData.find(s => s.station === path[i + 1].trim());
      if (!from || !to) throw new Error(`駅データ不足: ${path[i]} → ${path[i + 1]}`);
      totalDistance += Math.abs(to.distance - from.distance);
    }

    const fare = calculateFare(totalDistance);
    return { path, distance: totalDistance, fare };
  } catch (err) {
    logErrorToDiscord(`searchRouteエラー: ${err.message}`);
    return { error: err.message };
  }
}

// 運賃計算（指定テーブル）
function calculateFare(distance) {
  const fareTable = [
    { maxDistance: 1, fare: 140 }, { maxDistance: 3, fare: 190 }, { maxDistance: 10, fare: 200 },
    { maxDistance: 15, fare: 240 }, { maxDistance: 20, fare: 330 }, { maxDistance: 25, fare: 420 },
    { maxDistance: 30, fare: 510 }, { maxDistance: 35, fare: 590 }, { maxDistance: 40, fare: 680 },
    { maxDistance: 45, fare: 770 }, { maxDistance: 50, fare: 860 }, { maxDistance: 60, fare: 990 },
    { maxDistance: 70, fare: 1170 }, { maxDistance: 80, fare: 1340 }, { maxDistance: 90, fare: 1520 },
    { maxDistance: 100, fare: 1690 }, { maxDistance: 120, fare: 1980 }, { maxDistance: 140, fare: 2310 },
    { maxDistance: 160, fare: 2640 }, { maxDistance: 180, fare: 3080 }, { maxDistance: 200, fare: 3410 },
    { maxDistance: 220, fare: 3740 }, { maxDistance: 240, fare: 4070 }, { maxDistance: 260, fare: 4510 },
    { maxDistance: 280, fare: 4840 }, { maxDistance: 300, fare: 5170 }, { maxDistance: 320, fare: 5500 },
    { maxDistance: 340, fare: 5720 }, { maxDistance: 360, fare: 6050 }, { maxDistance: 380, fare: 6380 },
    { maxDistance: 400, fare: 6600 }, { maxDistance: 420, fare: 6930 }, { maxDistance: 440, fare: 7150 },
    { maxDistance: 460, fare: 7480 }, { maxDistance: 480, fare: 7700 }, { maxDistance: 500, fare: 8030 },
    { maxDistance: 520, fare: 8360 }, { maxDistance: 540, fare: 8580 }, { maxDistance: 560, fare: 8910 },
    { maxDistance: 580, fare: 9130 }, { maxDistance: 600, fare: 9460 }
  ];

  for (let i = 0; i < fareTable.length; i++) {
    if (distance <= fareTable[i].maxDistance) return fareTable[i].fare;
  }
  return null; // 超過距離は未定義
}

// ---------------- API ----------------
app.get("/", (req, res) => res.sendFile("public/index.html", { root: "." }));

app.post("/search", async (req, res) => {
  const { start, end, via } = req.body;
  const result = searchRoute(start, end, via || []);
  await sendDiscordLog(DISCORD_SEARCH_LOG, `検索: ${start} → ${end} 経由: ${via?.filter(Boolean).join(",")||"-"} 結果: ${JSON.stringify(result)}`);
  res.json(result);
});

app.post("/addStation", (req, res) => {
  const { line, station, distance } = req.body;
  const added = addStation(line, station, distance);
  res.json({ added, station, line, distance });
});

app.post("/resetStations", (req, res) => {
  stationData = [];
  sendDiscordLog(DISCORD_ADDLINE_LOG, "駅データを完全リセットしました");
  res.json({ message: "駅データを完全リセットしました" });
});

// ---------------- サーバー起動 ----------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
