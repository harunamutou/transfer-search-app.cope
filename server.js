import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// ---------------- Discord Webhook ----------------
const DISCORD_SEARCH_LOG = process.env.DISCORD_HOOK_SEARCH_LOG;
const DISCORD_ADDLINE_LOG = process.env.DISCORD_HOOK_STATION;
const DISCORD_ERROR_LOG = process.env.DISCORD_HOOK_ERROR_LOG;

// ---------------- 駅データ ----------------
let stationData = [];

// ---------------- Discord送信 ----------------
async function sendDiscordLog(webhook, content){
  try{
    await fetch(webhook,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({content}),
    });
  }catch(err){
    console.error("Discord Webhook送信失敗:", err.message);
  }
}

function logError(message){
  sendDiscordLog(DISCORD_ERROR_LOG, message);
}

// ---------------- 駅追加 ----------------
function addStation(line, station, distance){
  if(!line || !station || !distance) return false;
  const exists = stationData.find(s => s.station === station.trim());
  if(exists) return false;
  stationData.push({line: line.trim(), station: station.trim(), distance: Number(distance)});
  sendDiscordLog(DISCORD_ADDLINE_LOG, `駅追加: ${station} (${line}, ${distance}km)`);
  return true;
}

// ---------------- 経路検索 ----------------
function searchRoute(start, end, via=[]){
  try{
    const path = [start, ...via.filter(Boolean), end];
    let totalDistance = 0;

    for(let i=0;i<path.length-1;i++){
      const from = stationData.find(s=>s.station===path[i]);
      const to = stationData.find(s=>s.station===path[i+1]);
      if(!from || !to) throw new Error(`駅データ不足: ${path[i]} → ${path[i+1]}`);
      totalDistance += Math.abs(to.distance - from.distance);
    }

    const fare = calculateFare(totalDistance);
    return {path, distance: totalDistance, fare};
  }catch(err){
    logError(`searchRouteエラー: ${err.message}`);
    return {error: err.message};
  }
}

// ---------------- 運賃計算 ----------------
function calculateFare(distance){
  const fareTable = [
    {maxDistance:1,fare:140},{maxDistance:3,fare:190},{maxDistance:10,fare:200},
    {maxDistance:15,fare:240},{maxDistance:20,fare:330},{maxDistance:25,fare:420},
    {maxDistance:30,fare:510},{maxDistance:35,fare:590},{maxDistance:40,fare:680},
    {maxDistance:45,fare:770},{maxDistance:50,fare:860},{maxDistance:60,fare:990},
    {maxDistance:70,fare:1170},{maxDistance:80,fare:1340},{maxDistance:90,fare:1520},
    {maxDistance:100,fare:1690},{maxDistance:120,fare:1980},{maxDistance:140,fare:2310},
    {maxDistance:160,fare:2640},{maxDistance:180,fare:3080},{maxDistance:200,fare:3410},
    {maxDistance:220,fare:3740},{maxDistance:240,fare:4070},{maxDistance:260,fare:4510},
    {maxDistance:280,fare:4840},{maxDistance:300,fare:5170},{maxDistance:320,fare:5500},
    {maxDistance:340,fare:5720},{maxDistance:360,fare:6050},{maxDistance:380,fare:6380},
    {maxDistance:400,fare:6600},{maxDistance:420,fare:6930},{maxDistance:440,fare:7150},
    {maxDistance:460,fare:7480},{maxDistance:480,fare:7700},{maxDistance:500,fare:8030},
    {maxDistance:520,fare:8360},{maxDistance:540,fare:8580},{maxDistance:560,fare:8910},
    {maxDistance:580,fare:9130},{maxDistance:600,fare:9460},{maxDistance:640,fare:9790},
    {maxDistance:680,fare:10010},{maxDistance:720,fare:10340},{maxDistance:760,fare:10670},
    {maxDistance:800,fare:11000},{maxDistance:840,fare:11300},{maxDistance:880,fare:11550},
    {maxDistance:920,fare:11880},{maxDistance:960,fare:12210},{maxDistance:1000,fare:12540},    { maxDistance: 1040, fare: 12870 },
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
    // ここに必要な運賃テーブルを追加
  ];

  for(let i=0;i<fareTable.length;i++){
    if(distance<=fareTable[i].maxDistance) return fareTable[i].fare;
  }
  return null; // 未定義距離
}

// ---------------- HTML UI ----------------
app.get("/", (req,res)=>{
  res.sendFile("index.html",{root:"./public"});
});

// ---------------- API ----------------
app.post("/search", async (req,res)=>{
  const {start,end,via} = req.body;
  const result = searchRoute(start,end,via||[]);
  await sendDiscordLog(DISCORD_SEARCH_LOG, `検索: ${start}→${end} 経由:${via?.join(",")||"-"} 結果:${JSON.stringify(result)}`);
  res.json(result);
});

app.post("/addStation", (req,res)=>{
  const {line,station,distance} = req.body;
  const added = addStation(line,station,distance);
  res.json({added,station,line,distance});
});

app.post("/resetStations", (req,res)=>{
  stationData=[];
  sendDiscordLog(DISCORD_ADDLINE_LOG, "駅データ完全リセット");
  res.json({message:"駅データ完全リセット"});
});

// ---------------- サーバー起動 ----------------
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
