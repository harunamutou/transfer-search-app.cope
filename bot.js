import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`BOTログイン成功: ${client.user.tag}`);
});

// !addStation 路線 駅名 距離
// 例: !addStation 寿本線 鴎町 12.5
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!addStation")) return;

  const args = message.content.split(" ").slice(1);
  if (args.length < 3) {
    message.reply("⚠ 形式: `!addStation 路線 駅 距離(km)`");
    return;
  }

  const [line, station, distance] = args;

  const res = await fetch(`${process.env.RENDER_URL}/addStation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line, station, distance }),
  });

  const data = await res.json();
  if (data.added) {
    message.reply(` 駅を保存しました: **${station} (${line}, ${distance}km)**`);
  } else {
    message.reply(`❌ 追加失敗: ${data.error}`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
