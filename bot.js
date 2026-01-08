import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const args = message.content.split(" ");

  // !addStation <路線> <駅> <距離>
  if (args[0] === "!addStation") {
    if (args.length < 4) {
      return message.reply("⚠ ERROR 101: !addStation <line> <station> <distance>");
    }

    const [_, line, station, distance] = args;
    const res = await fetch(`https://api.render.com/deploy/srv-xxxx/addStation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line, station, distance })
    });

    const data = await res.json();
    message.reply(data.added ? `✅ 追加OK: ${station} (${line} ${distance}km)` : `❌ 追加失敗 or 重複`);

  }

  // !stations
  if (args[0] === "!stations") {
    const res = await fetch(`https://api.render.com/deploy/srv-xxxx/stations`);
    const data = await res.json();
    if (data.error) return message.reply(`⚠ ${data.error}`);
    message.reply(`📌 登録駅数: ${data.length}`);
  }

  // !resetStations
  if (args[0] === "!resetStations") {
    const res = await fetch(`https://api.render.com/deploy/srv-xxxx/resetStations`, { method: "POST" });
    const data = await res.json();
    message.reply(`♻ ${data.message}`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
