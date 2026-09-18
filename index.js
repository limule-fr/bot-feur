require("dotenv").config();
console.log("Début chargement index.js");
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
}).listen(process.env.PORT || 3000, () => {
    console.log(`Serveur HTTP en écoute sur le port ${process.env.PORT || 3000}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
console.log("Client créé");

const OWNER_ID = process.env.OWNER_ID;

const MOTS_SEXUELS = [
    "couille", "couilles", "zizi", "cul", "fesse", "fesses", "bite", "sexe", 
    "nichon", "nichons", "boob", "boobs", "paf", "paffs", "sucer", "gor", 
    "br", "branlette", "branle"
];

const REGEX_MOTS_SEXUELS = new RegExp(
    `\\b(?:${MOTS_SEXUELS.join("|")})\\b`,
    "i"
);

const MOTS_RACISTES = [
    "bougnoule", "bougnoules", "arabe", "arabes", "nega", "negas", 
    "bougnoul", "negro", "negros", "nègre", "nigers", "nigger"
];

const REGEX_MOTS_RACISTES = new RegExp(
    `\\b(?:${MOTS_RACISTES.join("|")})\\b`,
    "i"
);

// 💡 Centralisation de toutes les règles de détection textuelle
const REGLES = [
    {
        match: (t) => REGEX_MOTS_RACISTES.test(t),
        responses: [
            "SALE RACISTE !"
        ]
    },
    {
        match: (t) => REGEX_MOTS_SEXUELS.test(t),
        responses: [
            "gros cochon 🐷",
            "sale porc",
            "you dirty pervert",
            "hmm, tu m'excite",
            "fait voir ?"
        ]
    },
    {
        match: (t) =>
            /\b67\b/.test(t) ||
            /\bsix\s*seven\b/i.test(t) ||
            /\b6\s*7\b/.test(t),
        responses: [
            "pas de ça ici",
            "pourquoi faire ?",
            "bro tu es genant",
            "je t'en supplie, non"
        ]
    },
    {
        match: (t) => /\bpourquoi\b/i.test(t),
        responses: [
            "Parce que Feur"
        ]
    },
    {
        match: (t) => /\b(quoi+|koi+|kwa+|qoi+|quoa+|qwa+)\b/i.test(t),
        responses: [ 
            "Feur",
            "FEUR 😂",
            "Feuuur",
            "feur 😏",
            "feur sale kk",
            "koubhé",
            "quoikoufeur",
            "j en ai marre de toi je répond pas",
            "https://klipy.com/gifs/feur-theobabac"
        ]
    }
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function run(cmd) {
    execSync(cmd, { stdio: "inherit" });
}

async function safeSend(channel, content) {
    try {
        return await channel.send(content);
    } catch (e) {
        console.error("send error", e);
    }
}

async function safeReply(message, content) {
    try {
        return await message.reply(content);
    } catch (e) {
        console.error("reply error", e);
    }
}

client.on("error", err => console.error("CLIENT ERROR :", err));
process.on("unhandledRejection", err => console.error("REJECTION :", err));
process.on("uncaughtException", err => console.error("EXCEPTION :", err));

client.once(Events.ClientReady, async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    try {
        await client.user.setPresence({
            status: "online",
            activities: [
                {
                    name: "vos messages",
                    type: 3
                }
            ]
        });
        console.log("Présence mise à jour.");
    } catch (err) {
        console.error(err);
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const texte = message.content.toLowerCase().trim();

    // Mentions / Pings
    if (message.mentions.has(client.user.id) && !message.mentions.everyone) {
        const reponsesPing = [
            "Quoi ? 👀",
            "On m'appelle ? 🤖",
            "Dis feur pour voir.",
            "Laisse-moi tranquille, je regarde vos messages. 🤫",
            "Oui, maître ?",
            "tg tu es chiant",
            "suce mes bits", //je la trouve incroyable cette vanne perso
            "montre moi ta grosse clé usb !" 
        ];
        return safeReply(message, pick(reponsesPing));
    }

    // Commande Deploy
    if (message.content === "!deploy") {
        if (message.author.id !== OWNER_ID) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("deploy_git")
                .setLabel("🚀 Push GitHub") //voir deploy.js
                .setStyle(ButtonStyle.Success)
        );

        return safeSend(message.channel, {
            content: "Déploiement disponible :",
            components: [row]
        });
    }

    // Boucle unique de traitement de toutes les règles (modération + blagues)
    for (const rule of REGLES) {
        if (rule.match(texte)) {
            return safeReply(message, pick(rule.responses));
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.user.id !== OWNER_ID) return;

    if (interaction.customId === "deploy_git") {
        try {
            await interaction.reply({
                content: "Déploiement en cours...",
                ephemeral: true
            });

            run("node deploy.js");

            await interaction.followUp({
                content: "✅ Push terminé. Redémarrage..."
            });

            setTimeout(() => process.exit(0), 1500);
        } catch (e) {
            console.error(e);
            try {
                await interaction.followUp({
                    content: "❌ Erreur Git ou deploy.js"
                });
            } catch {}
        }
    }
});

console.log("Version Node :", process.version);
console.log("Version discord.js :", require("discord.js").version);
console.log("TOKEN présent :", !!process.env.TOKEN);
console.log("PORT :", process.env.PORT);

console.log("Avant login - toutes les déclarations chargées");
console.log("Tentative de connexion Discord...");
console.log("Début login...");

client.login(process.env.TOKEN)
    .then(token => {
        console.log("✅ Login réussi, token reçu");
    })
    .catch(err => {
        console.error("❌ Login erreur :", err);
    });

setTimeout(() => {
    console.log("⏱️ 30 secondes après login, toujours vivant");
}, 30000);

