require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cooldown = new Map();
const COOLDOWN_TIME = 30000;

const variantes = [
    'quoi',
    'koi',
    'kwa',
    'qoi',
    'quoa'
];

const MOTS = [
    "couille",
    "couilles",
    "zizi",
    "cul",
    "fesse",
    "fesses",
    "bite",
    "sexe",
    "nichon",
    "nichons",
    "boob",
    "boobs"
];

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const texte = message.content.toLowerCase().trim();

    const contientQuoi =
        variantes.some(v => texte.includes(v)) ||
        /\bquoi\b/i.test(texte) ||
        /quo+i+/i.test(texte);

    const contientPourquoi = /\bpourquoi\b/i.test(texte);

    const contientMotsInterdits = MOTS.some(mot => texte.includes(mot));

    if (!contientQuoi && !contientPourquoi && !contientMotsInterdits) return;

    const userId = message.author.id;
    const now = Date.now();
    const lastUsed = cooldown.get(userId);

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
        return message.reply('feur bro ftg tu gêne');
    }

    cooldown.set(userId, now);

    if (contientMotsInterdits) {
        return message.channel.send("gros cochon 🐷");
    }

    if (contientQuoi) {
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

    if (contientPourquoi) {
        return message.reply('Parce que Feur');
    }
});

client.login(process.env.TOKEN);