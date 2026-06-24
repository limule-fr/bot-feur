require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot online');
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cooldown = new Map();
const COOLDOWN_TIME = 30000;

const variantes = ['quoi', 'koi', 'kwa', 'qoi', 'quoa'];

const MOTS_SEXUELS = [
    "couille","couilles","zizi","cul","fesse","fesses",
    "bite","sexe","nichon","nichons","boob","boobs"
];

const MOTS_RACISTES = [ "bougnoule","arabe","arabes","bougnoules"];

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const texte = message.content.toLowerCase().trim();

    const estPourquoi = /\bpourquoi\b/i.test(texte);

    const estQuoi =
        variantes.includes(texte) ||
        /^quo+i+$/i.test(texte);

    const contientSexuel = MOTS_SEXUELS.some(mot => texte.includes(mot));
    const contientHaineux = MOTS_RACISTES.some(mot => texte.includes(mot));

    if (!estQuoi && !estPourquoi && !contientSexuel && !contientHaineux) return;

    const userId = message.author.id;
    const now = Date.now();
    const lastUsed = cooldown.get(userId);

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
        return message.reply('feur bro ftg tu gêne');
    }

    cooldown.set(userId, now);

    if (contientSexuel) {
        return message.channel.send("gros cochon 🐷");
    }

    if (contientHaineux) {
        return message.channel.send("sale raciste");
    }

    if (estPourquoi) {
        return message.reply('Parce que Feur');
    }

    if (estQuoi) {
        const feur = [
            'Feur',
            'FEUR 😂',
            'Feuuur',
            'feur 😏',
            'feur sale kk',
            'koubhé',
            'quoikoufeur',
            'j en ai marre de toi je répond pas'
        ];

        return message.reply(
            feur[Math.floor(Math.random() * feur.length)]
        );
    }
});

client.login(process.env.TOKEN);