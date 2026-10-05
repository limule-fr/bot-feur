require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require("discord.js");

const { execSync } = require("child_process");
const Redis = require("ioredis");

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : null;

if (redis) {
    redis.on("connect", () => console.log("Redis connecté"));
    redis.on("ready", () => console.log("Redis prêt"));
    redis.on("error", err => console.error("Erreur Redis :", err));
} else {
    console.log("REDIS_URL absente : utilisation de stats.json");
}

// =====================================================
// 🎛️ RÔLES DISCORD
// =====================================================

const ROLE_CHAMPION_FEUR_NAME = "Champion Feur";
const ROLE_MODERATION_NAME = "Modération active";
const ROLE_CONTRIBUTEUR_REGULIER_NAME = "Contributeur régulier";

// =====================================================
// 📊 STATISTIQUES
// =====================================================

function emptyStats() {
    return {
        total: 0,
        users: {}
    };
}

async function getStats() {
    if (redis) {
        try {
            const data = await redis.get("feur_stats");
            return data ? JSON.parse(data) : emptyStats();
        } catch (e) {
            console.error("Erreur de lecture Redis :", e);
            return emptyStats();
        }
    }

    const statsFile = path.join(__dirname, "stats.json");

    if (!fs.existsSync(statsFile)) {
        fs.writeFileSync(statsFile, JSON.stringify(emptyStats(), null, 4));
    }

    try {
        return JSON.parse(fs.readFileSync(statsFile, "utf8"));
    } catch (e) {
        console.error("Erreur de lecture stats.json :", e);
        return emptyStats();
    }
}

async function saveStats(stats) {
    if (redis) {
        try {
            await redis.set("feur_stats", JSON.stringify(stats));
            return;
        } catch (e) {
            console.error("Erreur d'écriture Redis :", e);
        }
    }

    const statsFile = path.join(__dirname, "stats.json");

    fs.writeFileSync(
        statsFile,
        JSON.stringify(stats, null, 4)
    );
}

// =====================================================
// 🏆 ATTRIBUTION AUTOMATIQUE DES RÔLES
// =====================================================

async function checkAndAssignRoles(guild, stats) {
    try {
        const topUsers = Object.entries(stats.users)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count);

        const topUserId =
            topUsers.length > 0 && topUsers[0].count > 0
                ? topUsers[0].id
                : null;

        const roleChampionFeur = guild.roles.cache.find(
            role =>
                role.name.toLowerCase() ===
                ROLE_CHAMPION_FEUR_NAME.toLowerCase()
        );

        const roleModeration = guild.roles.cache.find(
            role =>
                role.name.toLowerCase() ===
                ROLE_MODERATION_NAME.toLowerCase()
        );

        const roleContributeurRegulier = guild.roles.cache.find(
            role =>
                role.name.toLowerCase() ===
                ROLE_CONTRIBUTEUR_REGULIER_NAME.toLowerCase()
        );

        const members = guild.members.cache;

        for (const member of members.values()) {
            if (member.user.bot) continue;

            const userStats = stats.users[member.id] || {
                count: 0,
                moderation: 0
            };

            if (roleChampionFeur) {
                if (member.id === topUserId) {
                    if (!member.roles.cache.has(roleChampionFeur.id)) {
                        await member.roles.add(roleChampionFeur);
                    }
                } else if (member.roles.cache.has(roleChampionFeur.id)) {
                    await member.roles.remove(roleChampionFeur);
                }
            }

            if (roleModeration) {
                if (userStats.moderation >= 5) {
                    if (!member.roles.cache.has(roleModeration.id)) {
                        await member.roles.add(roleModeration);
                    }
                } else if (member.roles.cache.has(roleModeration.id)) {
                    await member.roles.remove(roleModeration);
                }
            }

            if (roleContributeurRegulier) {
                if (userStats.count > 100) {
                    if (!member.roles.cache.has(roleContributeurRegulier.id)) {
                        await member.roles.add(roleContributeurRegulier);
                    }
                } else if (member.roles.cache.has(roleContributeurRegulier.id)) {
                    await member.roles.remove(roleContributeurRegulier);
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de l'attribution des rôles :", error);
    }
}

// =====================================================
// 🌐 SERVEUR HTTP + API
// =====================================================

http.createServer(async (req, res) => {
    const rawUrl = req.url.split("?")[0];

    if (rawUrl === "/api/stats" || rawUrl === "/api/stats/") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") {
            res.writeHead(200);
            return res.end();
        }

        try {
            const stats = await getStats();

            const ranking = Object.entries(stats.users)
                .map(([id, data]) => ({
                    id,
                    username: data.username,
                    count: data.count || 0,
                    feur: data.feur || 0,
                    pourquoi: data.pourquoi || 0,
                    moderation: data.moderation || 0,
                    signalement: data.signalement || 0,
                    autre: data.autre || 0
                }))
                .sort((a, b) => b.count - a.count);

            res.writeHead(200);
            return res.end(JSON.stringify({
                total: stats.total,
                ranking
            }));
        } catch (error) {
            res.writeHead(500);
            return res.end(JSON.stringify({
                total: 0,
                ranking: [],
                error: error.message
            }));
        }
    }

    if (rawUrl === "" || rawUrl === "/") {
        const htmlPath = path.join(__dirname, "index.html");

        fs.readFile(htmlPath, "utf8", (err, htmlContent) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                return res.end("Erreur lors du chargement de la page web.");
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            return res.end(htmlContent);
        });

        return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page non trouvée");
}).listen(
    process.env.PORT || 3000,
    () => console.log(
        `Serveur HTTP en écoute sur le port ${process.env.PORT || 3000}`
    )
);

// =====================================================
// 🤖 BOT DISCORD
// =====================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const OWNER_ID = process.env.OWNER_ID;

// =====================================================
// 🧪 DÉCLENCHEURS DE DÉMONSTRATION
// =====================================================

const MOTS_DEMO = [
    "botdemo",
    "moderationtest",
    "signalementtest"
];

const REGEX_MOTS_DEMO = new RegExp(
    `\\b(?:${MOTS_DEMO.join("|")})\\b`,
    "i"
);

// =====================================================
// 📜 RÈGLES
// =====================================================

const REGLES = [
    {
        type: "signalement",

        match: t =>
            /\b(67|six\s*seven|6\s*7)\b/i.test(t),

        responses: [
            "Message détecté par le module de filtrage.",
            "Déclencheur identifié.",
            "Le système a repéré ce motif."
        ]
    },

    {
        type: "moderation",

        match: t =>
            REGEX_MOTS_DEMO.test(t),

        responses: [
            "Déclencheur de démonstration détecté.",
            "Le module de modération a réagi.",
            "Événement enregistré dans les statistiques."
        ]
    },

    {
        type: "pourquoi",

        match: t =>
            /\b(pourquoi+|pk+|pqwa+)\b/i.test(t),

        responses: [
            "Parce que Feur",
            "Car c'est comme ça.",
            "Réponse automatique : Feur."
        ]
    },

    {
        type: "feur",

        match: t =>
            /\b(quoi+|koi+|kwa+|qoi+|quoa+|qwa+)\b/i.test(t),

        responses: [
            "Feur",
            "FEUR",
            "Feuuur",
            "Feur, évidemment.",
            "quoikoufeur"
        ]
    }
];

// =====================================================
// 🛠️ FONCTIONS UTILITAIRES
// =====================================================

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
        console.error("send error :", e);
    }
}

async function safeReply(message, content) {
    try {
        return await message.reply(content);
    } catch (e) {
        console.error("reply error :", e);
    }
}

// =====================================================
// 🚨 GESTION DES ERREURS
// =====================================================

client.on("error", err =>
    console.error("CLIENT ERROR :", err)
);

process.on("unhandledRejection", err =>
    console.error("REJECTION :", err)
);

process.on("uncaughtException", err =>
    console.error("EXCEPTION :", err)
);

// =====================================================
// 🟢 BOT PRÊT
// =====================================================

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
    } catch (e) {
        console.error("Erreur présence :", e);
    }

    for (const guild of client.guilds.cache.values()) {
        const stats = await getStats();
        await checkAndAssignRoles(guild, stats);
    }
});

// =====================================================
// 💬 MESSAGES
// =====================================================

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const texte = message.content.trim();

    if (!texte) return;

    // -------------------------------------------------
    // !stats
    // -------------------------------------------------

    if (texte === "!stats") {
        const stats = await getStats();

        const topUsers = Object.entries(stats.users)
            .sort(([, a], [, b]) => (b.count || 0) - (a.count || 0))
            .slice(0, 5);

        let affichageTop = "";

        if (topUsers.length === 0) {
            affichageTop =
                "Aucune donnée disponible pour le moment.";
        } else {
            const medailles = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

            topUsers.forEach(([id, data], index) => {
                affichageTop +=
                    `${medailles[index]} **${data.username}** : ` +
                    `${data.count || 0} événements ` +
                    `(Feur: ${data.feur || 0}, ` +
                    `Pourquoi: ${data.pourquoi || 0}, ` +
                    `Modération: ${data.moderation || 0}, ` +
                    `Signalement: ${data.signalement || 0})\n`;
            });
        }

        return safeReply(
            message,
            `📊 **TABLEAU DE BORD DE LA FEUR-MANIA**\n\n` +
            `🏆 **CLASSEMENT :**\n${affichageTop}\n` +
            `📈 **STATISTIQUES GLOBALES :**\n` +
            `🎯 **Total d'événements :** ${stats.total}`
        );
    }

    // -------------------------------------------------
    // Mention du bot
    // -------------------------------------------------

    if (
        message.mentions.has(client.user.id) &&
        !message.mentions.everyone
    ) {
        return safeReply(
            message,
            pick([
                "Quoi ?",
                "On m'appelle ?",
                "Dis feur pour voir.",
                "Le bot est opérationnel.",
                "Système en ligne."
            ])
        );
    }

    // -------------------------------------------------
    // !deploy
    // -------------------------------------------------

    if (texte === "!deploy") {
        if (message.author.id !== OWNER_ID) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("deploy_git")
                .setLabel("Push GitHub")
                .setStyle(ButtonStyle.Success)
        );

        return safeSend(message.channel, {
            content: "Déploiement disponible :",
            components: [row]
        });
    }

    // -------------------------------------------------
    // Traitement des règles
    // -------------------------------------------------

    for (const rule of REGLES) {
        if (!rule.match(texte)) continue;

        const stats = await getStats();
        const userId = message.author.id;

        stats.total += 1;

        if (!stats.users[userId]) {
            stats.users[userId] = {
                username: message.author.username,
                count: 0,
                feur: 0,
                pourquoi: 0,
                moderation: 0,
                signalement: 0,
                autre: 0
            };
        }

        const userStats = stats.users[userId];

        userStats.count = userStats.count || 0;
        userStats.feur = userStats.feur || 0;
        userStats.pourquoi = userStats.pourquoi || 0;
        userStats.moderation = userStats.moderation || 0;
        userStats.signalement = userStats.signalement || 0;
        userStats.autre = userStats.autre || 0;

        userStats.count += 1;
        userStats.username = message.author.username;

        if (rule.type && userStats[rule.type] !== undefined) {
            userStats[rule.type] += 1;
        } else {
            userStats.autre += 1;
        }

        await saveStats(stats);
        await checkAndAssignRoles(message.guild, stats);

        return safeReply(message, pick(rule.responses));
    }
});

// =====================================================
// 🚀 BOUTON DE DÉPLOIEMENT
// =====================================================

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
                content: "Push terminé. Redémarrage..."
            });

            setTimeout(() => process.exit(0), 1500);
        } catch (e) {
            console.error(e);
        }
    }
});

// =====================================================
// 🔑 CONNEXION DISCORD
// =====================================================

client.login(process.env.TOKEN).catch(err =>
    console.error("Login erreur :", err)
);
