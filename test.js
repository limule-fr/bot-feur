require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once("ready", () => {
  console.log("✅ Connecté :", client.user.tag);
});

client.on("messageCreate", message => {
  console.log("Message reçu :", message.content);
});

client.on("error", console.error);
client.on("debug", console.log);

console.log("Tentative de connexion...");

client.login(process.env.TOKEN).catch(console.error);