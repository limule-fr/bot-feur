require("dotenv").config();

const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot online");
}).listen(process.env.PORT);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.once("ready", () => {
  console.log("✅ Discord connecté :", client.user.tag);
});

console.log("Avant login Discord");

client.login(process.env.TOKEN)
  .then(() => {
    console.log("✅ Login terminé");
  })
  .catch(err => {
    console.error("Erreur :", err);
  });