require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("Connecté :", client.user.tag);
  process.exit(0);
});

client.login(process.env.TOKEN).catch(console.error);