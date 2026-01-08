import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once("ready", ()=>{
  console.log(`Discord Bot logged in as ${client.user.tag}`);
});

// 例: !addStation 路線 駅名 距離
client.on("messageCreate", async msg=>{
  if(msg.author.bot) return;
  if(msg.content.startsWith("!addStation")){
    const parts = msg.content.split(" ");
    if(parts.length < 4){
      msg.reply("コマンド形式: !addStation 路線名 駅名 距離");
      return;
    }
    const [cmd,line,station,distance] = parts;
    try{
      const res = await fetch(`${process.env.SERVER_URL}/addStation`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({line,station,distance})
      });
      const data = await res.json();
      msg.reply(`駅追加結果: ${JSON.stringify(data)}`);
    }catch(err){
      msg.reply(`エラー: ${err.message}`);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
