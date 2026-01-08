// server.js
import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// 環境変数から取得
const DISCORD_SEARCH_LOG = process.env.DISCORD_SEARCH_LOG;
const DISCORD_ADDLINE_LOG = process.env.DISCORD_ADDLINE_LOG;
const DISCORD_ERROR_LOG = process.env.DISCORD_ERROR_LOG;
const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// サーバー内駅データ
let stationData = [];

// Discord Webhook送信
async function sendDiscordLog(webhook, content) {
  if (!webhook) return;
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
  if (!line || !station || distance == null) return false;
  const exists = stationData.find(s => s.station === station.trim());
  if (exists) return false; // すでにある
  const entry = { line: line.trim(), station: station.trim(), distance: Number(distance) };
  stationData.push(entry);
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

// 運賃計算（拡張版）
function calculateFare(distance) {
  const fareTable = [
    { maxDistance: 1, fare: 140 }, { maxDistance: 3, fare: 190 }, { maxDistance: 10, fare: 200 },
    { maxDistance: 15, fare: 240 }, { maxDistance: 20, fare: 330 }, { maxDistance: 25, fare: 420 },
    { maxDistance: 30, fare: 510 }, { maxDistance: 35, fare: 590 }, { maxDistance: 40, fare: 680 },
    { maxDistance: 45, fare: 770 }, { maxDistance: 50, fare: 860 }, { maxDistance: 60, fare: 990 },
    { maxDistance: 70, fare: 1170 }, { maxDistance: 80, fare: 1340 }, { maxDistance: 90, fare: 1520 },
    { maxDistance: 100, fare: 1690 }, { maxDistance: 120, fare: 1980 }, { maxDistance: 140, fare: 2310 },
    { maxDistance: 160, fare: 2640 }, { maxDistance: 200, fare: 3410 },
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

  for (let i = 0; i < fareTable.length; i++) {
    if (distance <= fareTable[i].maxDistance) return fareTable[i].fare;
  }
  return null;
}

// ---------------- HTML UI ----------------
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>経路検索アプリ</title>
<style>
body { font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; background:#f0f2f5; display:flex; justify-content:center; padding:50px; }
.container { width:420px; background:#fff; border-radius:10px; box-shadow:0 4px 20px rgba(0,0,0,0.1); padding:25px; }
input { width:100%; padding:10px; margin:6px 0; border-radius:6px; border:1px solid #ccc; }
button { width:100%; padding:12px; border:none; border-radius:6px; background:#007BFF; color:white; font-weight:bold; cursor:pointer; margin:8px 0; }
button:hover { background:#0056b3; }
.card { background:#fefefe; border-radius:8px; padding:15px; margin:10px 0; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
.card p { margin:4px 0; }
.distance { color:#1E90FF; font-weight:bold; }
.fare { color:#28a745; font-weight:bold; }
</style>
</head>
<body>
<div class="container">
<h2>経路検索</h2>
<input id="start" placeholder="出発駅">
<input id="end" placeholder="到着駅">
<input id="via1" placeholder="経由駅1 (任意)">
<input id="via2" placeholder="経由駅2 (任意)">
<input id="via3" placeholder="経由駅3 (任意)">
<button onclick="search()">検索</button>
<div id="result"></div>
<h3>駅追加（Discord経由）</h3>
<input id="line" placeholder="路線名">
<input id="station" placeholder="駅名">
<input id="distance" placeholder="距離(km)">
<button onclick="addStationUI()">追加</button>
</div>
<script>
async function search() {
  const start=document.getElementById("start").value.trim();
  const end=document.getElementById("end").value.trim();
  const via=[document.getElementById("via1").value,
             document.getElementById("via2").value,
             document.getElementById("via3").value].filter(Boolean);
  const res=await fetch("/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({start,end,via})});
  const data=await res.json();
  const resultDiv=document.getElementById("result");
  if(data.error){
    resultDiv.innerHTML='<div class="card" style="color:red;">エラー: '+data.error+'</div>';
  }else{
    resultDiv.innerHTML='<div class="card"><p><strong>経路:</strong> '+data.path.join(" → ")+'</p><p><strong>総距離:</strong> <span class="distance">'+data.distance.toFixed(2)+' km</span></p><p><strong>運賃:</strong> <span class="fare">¥'+(data.fare!==null?data.fare.toLocaleString():"未定")+'</span></p></div>';
  }
}

async function addStationUI() {
  const line=document.getElementById("line").value.trim();
  const station=document.getElementById("station").value.trim();
  const distance=document.getElementById("distance").value.trim();
  if(!line||!station||!distance){alert("line, station, distance は必須です");return;}
  const res=await fetch("/addStation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({line,station,distance})});
  const data=await res.json();
  alert(JSON.stringify(data));
}
</script>
</body>
</html>`);
});

// ---------------- API ----------------
app.post("/search", async (req, res) => {
  const { start, end, via } = req.body;
  const result = searchRoute(start, end, via || []);
  await sendDiscordLog(DISCORD_SEARCH_LOG, `検索: ${start} → ${end} 経由: ${via?.join(",")||"-"} 結果: ${JSON.stringify(result)}`);
  res.json(result);
});

app.post("/addStation", async (req, res) => {
  const { line, station, distance } = req.body;
  const added = addStation(line, station, distance);
  // Discord Webhookに送信
  if (added) {
    await sendDiscordLog(DISCORD_ADDLINE_LOG, `駅追加: ${station} (${line}, ${distance}km)`);
  }
  res.json({ added, station, line, distance });
});

app.post("/resetStations", async (req, res) => {
  stationData = [];
  await sendDiscordLog(DISCORD_ADDLINE_LOG, "駅データを完全リセットしました");
  res.json({ message: "駅データを完全リセットしました" });
});

// ---------------- サーバー起動 ----------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
