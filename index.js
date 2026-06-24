require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const { execSync } = require('child_process');

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

const OWNER_ID = process.env.OWNER_ID;

const cooldown = new Map();
const COOLDOWN_TIME = 30000;

const variantes = ['quoi', 'koi', 'kwa', 'qoi', 'quoa'];

const MOTS_SEXUELS = [
    "couille","couilles","zizi","cul","fesse","fesses",
    "bite","sexe","nichon","nichons","boob","boobs"
];

const MOTS_RACISTES = ["bougnoule","bougnoules","arabe","arabes"];

function run(cmd) {
    execSync(cmd, { stdio: "inherit" });
}

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
        return message.channel.send("SALE RACISTE!");
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

        return message.reply(feur[Math.floor(Math.random() * feur.length)]);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.user.id !== OWNER_ID) return;

    if (interaction.customId === 'deploy_git') {
        await interaction.reply({ content: "Déploiement en cours...", ephemeral: true });

        try {
            run("git add .");
            run('git commit -m "bot ready"');
            run("git push origin main");

            await interaction.followUp({ content: "✅ Push terminé. Redémarrage..." });

            setTimeout(() => {
                process.exit(0);
            }, 1500);

        } catch (e) {
            await interaction.followUp({ content: "❌ Erreur Git (rien à commit ?)" });
        }
    }
});

client.login(process.env.TOKEN);