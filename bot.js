import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "https://transfer-search-app-cope.onrender.com";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Webhookにログを送る関数（任意・エラー用）
async function sendWebhook(content) {
  const url = process.env.DISCORD_ERROR_WEBHOOK;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

// !addStation 路線 駅名 距離
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const args = message.content.split(" ");

  if (args[0] === "!addStation") {
    const line = args[1];
    const station = args.slice(2, -1).join(" ");
    const distance = args[args.length - 1];

    if (!line || !station || !distance) {
      return message.reply("ERROR 101: `!addStation 路線 駅名 距離` の形式で入力してください");
    }

    try {
      const res = await fetch(`${BASE_URL}/addStation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line, station, distance: Number(distance) }),
      });
      const data = await res.json();

      if (data.error) {
        await sendWebhook(data.error);
        return message.reply(data.error);
      }

      if (data.added) {
        return message.reply(`追加成功: ${station} (${line}, ${distance}km)`);
      } else {
        return message.reply(`追加スキップ: ${station} は既に登録済み`);
      }
    } catch (err) {
      const errMsg = `ERROR 102: 追加リクエスト失敗 - ${err.message}`;
      await sendWebhook(errMsg);
      message.reply(errMsg);
    }
  }

  // !routeSearch 出発 [乗換…] 到着
  if (args[0] === "!routeSearch") {
    const start = args[1];
    const end = args[args.length - 1];
    const via = args.slice(2, -1);

    if (!start || !end) {
      return message.reply("ERROR 201: `!routeSearch 出発 (乗換) 到着` の形式で入力してください");
    }

    try {
      const res = await fetch(`${BASE_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, via }),
      });
      const data = await res.json();

      if (data.error) {
        await sendWebhook(data.error);
        return message.reply(data.error);
      }

      return message.reply(
        `経路: ${data.path.join(" → ")}\n距離: ${data.distance}km\n運賃: ${data.fare ?? "計算不可"}円`
      );
    } catch (err) {
      const errMsg = `ERROR 202: 検索リクエスト失敗 - ${err.message}`;
      await sendWebhook(errMsg);
      message.reply(errMsg);
    }
  }

  // !stationsList で全駅表示
  if (args[0] === "!stationsList") {
    try {
      const res = await fetch(`${BASE_URL}/stations`);
      const data = await res.json();
      if (data.error) {
        await sendWebhook(data.error);
        return message.reply(data.error);
      }
      if (!Array.isArray(data) || data.length === 0) {
        return message.reply("駅データが登録されていません");
      }

      const list = data.map((s) => `${s.station} (${s.line}, ${s.distance}km)`).join("\n");
      return message.reply(`登録駅一覧:\n${list}`);
    } catch (err) {
      const errMsg = `ERROR 301: 駅一覧取得失敗 - ${err.message}`;
      await sendWebhook(errMsg);
      message.reply(errMsg);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
