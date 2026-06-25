require('dotenv').config();

const http = require('http');
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require('discord.js');
const { execSync } = require('child_process');

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot online');
}).listen(process.env.PORT);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const OWNER_ID = process.env.OWNER_ID;

const MOTS_SEXUELS = [
    "couille","couilles","zizi","cul","fesse","fesses",
    "bite","sexe","nichon","nichons","boob","boobs"
];

const MOTS_RACISTES = [
    "bougnoule","bougnoules","arabe","arabes",
    "nega","negas","bougnoul","negro","negros"
];

const REGLES = [
    {
        match: (t) =>
            /\b67\b/.test(t) ||
            /\bsix\s*seven\b/i.test(t) ||
            /\b6\s*7\b/.test(t),

        responses: ["va te faire foutre","pas de ça ici","pourquoi faire ?","bro tu es genant"]
    },

    {
        match: (t) => /\bpourquoi\b/i.test(t),
        responses: ["Parce que Feur"]
    },

    {
        match: (t) =>
            /(^| )(quoi+|koi+|kwa+|qoi+|quoa+)\b/i.test(t),

        responses: [
            "Feur",
            "FEUR 😂",
            "Feuuur",
            "feur 😏",
            "feur sale kk",
            "koubhé",
            "quoikoufeur",
            "j en ai marre de toi je répond pas"
        ]
    }
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function run(cmd) {
    execSync(cmd, { stdio: "inherit" });
}

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const texte = message.content.toLowerCase().trim();

    if (message.content === "!deploy") {
        if (message.author.id !== OWNER_ID) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('deploy_git')
                .setLabel('🚀 Push GitHub')
                .setStyle(ButtonStyle.Success)
        );

        return message.channel.send({
            content: "Déploiement disponible :",
            components: [row]
        });
    }

    if (MOTS_SEXUELS.some(m => texte.includes(m)))
        return message.channel.send("gros cochon 🐷");

    if (MOTS_RACISTES.some(m => texte.includes(m)))
        return message.channel.send("SALE RACISTE!");

    for (const rule of REGLES) {
        if (rule.match(texte)) {
            return message.reply(pick(rule.responses));
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.user.id !== OWNER_ID) return;

    if (interaction.customId === 'deploy_git') {
        await interaction.reply({ content: "Déploiement en cours...", ephemeral: true });

        try {
            run("node deploy.js");
            await interaction.followUp({ content: "✅ Push terminé. Redémarrage..." });

            setTimeout(() => process.exit(0), 1500);
        } catch (e) {
            await interaction.followUp({ content: "❌ Erreur Git ou deploy.js" });
        }
    }
});

client.login(process.env.TOKEN);