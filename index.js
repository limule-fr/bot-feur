require("dotenv").config();

console.log("Début chargement index.js");

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

// =====================================================
// 🎛️ IDS DES RÔLES DISCORD
// =====================================================

const ROLE_VICTIME_ULTIME_ID = "TON_ID_DE_ROLE_VICTIME_ULTIME";
const ROLE_GROS_COCHON_ID = "TON_ID_DE_ROLE_GROS_COCHON";
const ROLE_BOULET_IRRECUPERABLE_ID = "TON_ID_DE_ROLE_BOULET_IRRECUPERABLE";

// =====================================================
// 📊 GESTION DES STATISTIQUES
// =====================================================

async function getStats() {
    if (redis) {
        try {
            const data = await redis.get("feur_stats");

            return data
                ? JSON.parse(data)
                : {
                    total: 0,
                    users: {}
                };
        } catch (e) {
            console.error("Erreur de lecture Redis :", e);

            return {
                total: 0,
                users: {}
            };
        }
    }

    const STATS_FILE = path.join(__dirname, "stats.json");

    if (!fs.existsSync(STATS_FILE)) {
        fs.writeFileSync(
            STATS_FILE,
            JSON.stringify(
                {
                    total: 0,
                    users: {}
                },
                null,
                4
            )
        );
    }

    try {
        return JSON.parse(
            fs.readFileSync(STATS_FILE, "utf8")
        );
    } catch (e) {
        console.error("Erreur de lecture stats.json :", e);

        return {
            total: 0,
            users: {}
        };
    }
}

async function saveStats(stats) {
    if (redis) {
        try {
            await redis.set(
                "feur_stats",
                JSON.stringify(stats)
            );

            return;
        } catch (e) {
            console.error("Erreur d'écriture Redis :", e);
        }
    }

    const STATS_FILE = path.join(__dirname, "stats.json");

    fs.writeFileSync(
        STATS_FILE,
        JSON.stringify(stats, null, 4)
    );
}

// =====================================================
// 🏆 GESTION AUTOMATIQUE DES RÔLES
// =====================================================

async function checkAndAssignRoles(guild, stats) {
    if (!guild) return;

    try {
        const topUsers = Object.entries(stats.users)
            .map(([id, data]) => ({
                id,
                count: data.count || 0,
                sexuel: data.sexuel || 0
            }))
            .sort((a, b) => b.count - a.count);

        // Trouve l'utilisateur avec le plus de fautes
        const pireUserId =
            topUsers.length > 0 && topUsers[0].count > 0
                ? topUsers[0].id
                : null;

        const members = await guild.members.fetch();

        for (const [memberId, member] of members) {
            const userData = stats.users[memberId] || {};

            const totalCount = userData.count || 0;
            const sexuelCount = userData.sexuel || 0;

            // =================================================
            // 👑 VICTIME ULTIME
            // =================================================

            if (ROLE_VICTIME_ULTIME_ID) {
                if (memberId === pireUserId) {
                    if (
                        !member.roles.cache.has(
                            ROLE_VICTIME_ULTIME_ID
                        )
                    ) {
                        await member.roles
                            .add(ROLE_VICTIME_ULTIME_ID)
                            .catch(console.error);

                        console.log(
                            `👑 Rôle Victime Ultime attribué à ${member.user.username}`
                        );
                    }
                } else {
                    if (
                        member.roles.cache.has(
                            ROLE_VICTIME_ULTIME_ID
                        )
                    ) {
                        await member.roles
                            .remove(ROLE_VICTIME_ULTIME_ID)
                            .catch(console.error);
                    }
                }
            }

            // =================================================
            // 🐷 GROS COCHON
            // À partir de 5 fautes sexuelles
            // =================================================

            if (ROLE_GROS_COCHON_ID) {
                if (sexuelCount >= 5) {
                    if (
                        !member.roles.cache.has(
                            ROLE_GROS_COCHON_ID
                        )
                    ) {
                        await member.roles
                            .add(ROLE_GROS_COCHON_ID)
                            .catch(console.error);

                        console.log(
                            `🐷 Rôle Gros Cochon attribué à ${member.user.username}`
                        );
                    }
                } else {
                    if (
                        member.roles.cache.has(
                            ROLE_GROS_COCHON_ID
                        )
                    ) {
                        await member.roles
                            .remove(ROLE_GROS_COCHON_ID)
                            .catch(console.error);

                        console.log(
                            `🐷 Rôle Gros Cochon retiré à ${member.user.username}`
                        );
                    }
                }
            }

            // =================================================
            // 💀 BOULET IRRÉCUPÉRABLE
            // À partir de 101 fautes au total
            // =================================================

            if (ROLE_BOULET_IRRECUPERABLE_ID) {
                if (totalCount > 100) {
                    if (
                        !member.roles.cache.has(
                            ROLE_BOULET_IRRECUPERABLE_ID
                        )
                    ) {
                        await member.roles
                            .add(ROLE_BOULET_IRRECUPERABLE_ID)
                            .catch(console.error);

                        console.log(
                            `💀 Rôle Boulet Irrécupérable attribué à ${member.user.username}`
                        );
                    }
                } else {
                    if (
                        member.roles.cache.has(
                            ROLE_BOULET_IRRECUPERABLE_ID
                        )
                    ) {
                        await member.roles
                            .remove(ROLE_BOULET_IRRECUPERABLE_ID)
                            .catch(console.error);

                        console.log(
                            `💀 Rôle Boulet Irrécupérable retiré à ${member.user.username}`
                        );
                    }
                }
            }
        }
    } catch (err) {
        console.error(
            "Erreur lors de la mise à jour des rôles :",
            err
        );
    }
}

// =====================================================
// 🌐 SERVEUR HTTP
// =====================================================

http.createServer(async (req, res) => {
    const rawUrl = req.url.split("?")[0];

    // =================================================
    // 📊 API DES STATISTIQUES
    // =================================================

    if (
        rawUrl === "/api/stats" ||
        rawUrl === "/api/stats/"
    ) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            "*"
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, OPTIONS"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type"
        );

        res.setHeader(
            "Content-Type",
            "application/json"
        );

        if (req.method === "OPTIONS") {
            res.writeHead(200);
            return res.end();
        }

        try {
            const stats = await getStats();

            const topUsers = Object.entries(stats.users)
                .map(([id, data]) => ({
                    id,
                    username: data.username,
                    count: data.count || 0,
                    feur: data.feur || 0,
                    pourquoi: data.pourquoi || 0,
                    sexuel: data.sexuel || 0,
                    raciste: data.raciste || 0,
                    autre: data.autre || 0
                }))
                .sort((a, b) => b.count - a.count);

            res.writeHead(200);

            return res.end(
                JSON.stringify({
                    total: stats.total,
                    ranking: topUsers
                })
            );
        } catch (error) {
            res.writeHead(500);

            return res.end(
                JSON.stringify({
                    total: 0,
                    ranking: [],
                    error: error.message
                })
            );
        }
    }

    // =================================================
    // 🏠 PAGE WEB
    // =================================================

    else if (
        rawUrl === "" ||
        rawUrl === "/"
    ) {
        const htmlPath = path.join(
            __dirname,
            "index.html"
        );

        fs.readFile(
            htmlPath,
            "utf8",
            (err, htmlContent) => {
                if (err) {
                    res.writeHead(500, {
                        "Content-Type": "text/plain"
                    });

                    return res.end(
                        "Erreur lors du chargement de la page web."
                    );
                }

                res.writeHead(200, {
                    "Content-Type": "text/html"
                });

                return res.end(htmlContent);
            }
        );
    }

    // =================================================
    // ❌ PAGE INEXISTANTE
    // =================================================

    else {
        res.writeHead(404, {
            "Content-Type": "text/plain"
        });

        res.end("Page non trouvée");
    }

}).listen(
    process.env.PORT || 3000,
    () => {
        console.log(
            `Serveur HTTP en écoute sur le port ${process.env.PORT || 3000}`
        );
    }
);

// =====================================================
// 🤖 CONFIGURATION DU BOT DISCORD
// =====================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

console.log(
    "Client créé avec l'intent GuildMembers"
);

const OWNER_ID = process.env.OWNER_ID;

// =====================================================
// 🔞 MOTS SEXUELS
// =====================================================

const MOTS_SEXUELS = [
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
    "boobs",
    "paf",
    "paffs",
    "sucer",
    "gor",
    "br",
    "branlette",
    "branle"
];

const REGEX_MOTS_SEXUELS = new RegExp(
    `\\b(?:${MOTS_SEXUELS.join("|")})\\b`,
    "i"
);

// =====================================================
// ⚠️ MOTS RACISTES
// =====================================================

const MOTS_RACISTES = [
    "bougnoule",
    "bougnoules",
    "arabe",
    "arabes",
    "nega",
    "negas",
    "bougnoul",
    "negro",
    "negros",
    "nègre",
    "nigers",
    "nigger"
];

const REGEX_MOTS_RACISTES = new RegExp(
    `\\b(?:${MOTS_RACISTES.join("|")})\\b`,
    "i"
);

// =====================================================
// 📜 RÈGLES
// =====================================================

const REGLES = [

    {
        type: "raciste",

        match: (t) =>
            REGEX_MOTS_RACISTES.test(t),

        responses: [
            "SALE RACISTE !"
        ]
    },

    {
        type: "sexuel",

        match: (t) =>
            REGEX_MOTS_SEXUELS.test(t),

        responses: [
            "gros cochon 🐷",
            "sale porc",
            "you dirty pervert",
            "hmm, tu m'excite",
            "fait voir ?"
        ]
    },

    {
        type: "autre",

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
        type: "pourquoi",

        match: (t) =>
            /\bpourquoi\b/i.test(t),

        responses: [
            "Parce que Feur",
            "car c'est comme ça",
            "bah jsp",
            "pcq vas te faire foutre"
        ]
    },

    {
        type: "feur",

        match: (t) =>
            /\b(quoi+|koi+|kwa+|qoi+|quoa+|qwa+)\b/i.test(t),

        responses: [
            "Feur",
            "FEUR 😂",
            "Feuuur",
            "feur 😏",
            "feur sale kk",
            "koubhé",
            "quoikoufeur",
            "j en ai marre de toi je répond pas",
            "https://klipy.com"
        ]
    }
];

// =====================================================
// 🛠️ FONCTIONS UTILITAIRES
// =====================================================

function pick(arr) {
    return arr[
        Math.floor(Math.random() * arr.length)
    ];
}

function run(cmd) {
    execSync(cmd, {
        stdio: "inherit"
    });
}

async function safeSend(channel, content) {
    try {
        return await channel.send(content);
    } catch (e) {
        console.error(
            "send error :",
            e
        );
    }
}

async function safeReply(message, content) {
    try {
        return await message.reply(content);
    } catch (e) {
        console.error(
            "reply error :",
            e
        );
    }
}

// =====================================================
// 🚨 GESTION DES ERREURS
// =====================================================

client.on(
    "error",
    err => console.error(
        "CLIENT ERROR :",
        err
    )
);

process.on(
    "unhandledRejection",
    err => console.error(
        "REJECTION :",
        err
    )
);

process.on(
    "uncaughtException",
    err => console.error(
        "EXCEPTION :",
        err
    )
);

// =====================================================
// 🟢 BOT PRÊT
// =====================================================

client.once(
    Events.ClientReady,
    async () => {

        console.log(
            `Connecté en tant que ${client.user.tag}`
        );

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
        } catch (err) {
            console.error(err);
        }
    }
);

// =====================================================
// 💬 MESSAGES
// =====================================================

client.on(
    "messageCreate",
    async (message) => {

        if (message.author.bot) return;

        const texte =
            message.content
                .toLowerCase()
                .trim();

        // =================================================
        // 🌐 !site
        // =================================================

        if (texte === "!site") {
            return safeReply(
                message,
                "📊 Découvre le tableau de bord de la Feur-Mania en direct ici : https://onrender.com"
            );
        }

        // =================================================
        // 😈 !injectertriche
        // =================================================

        if (texte === "!injectertriche") {

            if (message.author.id !== OWNER_ID) {
                return;
            }

            const statsTrichees = {

                total: 0,

                users: {

                    "123456789012345678": {
                        username: "limule_26543",
                        count: 50,
                        feur: 42,
                        pourquoi: 5,
                        sexuel: 3,
                        raciste: 0,
                        autre: 0
                    },

                    "987654321098765432": {
                        username: "noctalune44",
                        count: 1,
                        feur: 1,
                        pourquoi: 0,
                        sexuel: 0,
                        raciste: 0,
                        autre: 0
                    },

                    "111222333444555666": {
                        username: "Un_Ami_Trop_Bavard",
                        count: 850,
                        feur: 800,
                        pourquoi: 40,
                        sexuel: 10,
                        raciste: 0,
                        autre: 0
                    }

                }
            };

            let totalGlobal = 0;

            Object.values(
                statsTrichees.users
            ).forEach(
                u => {
                    totalGlobal +=
                        u.count || 0;
                }
            );

            statsTrichees.total =
                totalGlobal;

            await saveStats(
                statsTrichees
            );

            // Mise à jour des rôles après injection
            await checkAndAssignRoles(
                message.guild,
                statsTrichees
            );

            return safeReply(
                message,
                `🚀 **Triche injectée avec succès depuis Render !** Total global : ${totalGlobal} fautes. Tu peux aller voir le site.`
            );
        }

        // =================================================
        // 📊 !stats
        // =================================================

        if (texte === "!stats") {

            const stats =
                await getStats();

            const topUsers =
                Object.entries(
                    stats.users
                )
                    .sort(
                        (a, b) =>
                            (b[1].count || 0) -
                            (a[1].count || 0)
                    )
                    .slice(0, 5);

            let affichageTop = "";

            const medailles = [
                "🥇",
                "🥈",
                "🥉",
                "4️⃣",
                "5️⃣"
            ];

            if (topUsers.length === 0) {

                affichageTop =
                    "Personne ne s'est encore fait avoir... Pour l'instant. 👀";

            } else {

                topUsers.forEach(
                    ([id, data], index) => {

                        affichageTop +=
                            `${medailles[index]} **${data.username}** : ${data.count || 0} fautes ` +
                            `(Feur: ${data.feur || 0}, ` +
                            `Pourquoi: ${data.pourquoi || 0}, ` +
                            `Sexuel: ${data.sexuel || 0}, ` +
                            `Raciste: ${data.raciste || 0})\n`;
                    }
                );
            }

            return safeReply(
                message,
                `📊 **TABLEAU DE BORD DE LA FEUR-MANIA**\n\n` +
                `🏆 **LE TOP DES VICTIMES :**\n` +
                `${affichageTop}\n` +
                `📈 **STATISTIQUES GLOBALES :**\n` +
                `* 🎯 **Total de pièges déclenchés :** ${stats.total}`
            );
        }

        // =================================================
        // 🤖 MENTION DU BOT
        // =================================================

        if (
            message.mentions.has(client.user.id) &&
            !message.mentions.everyone
        ) {

            return safeReply(
                message,
                pick([
                    "Quoi ? 👀",
                    "On m'appelle ? 🤖",
                    "Dis feur pour voir.",
                    "tg tu es chiant",
                    "suce mes bits",
                    "montre moi ta grosse clé usb !"
                ])
            );
        }

        // =================================================
        // 🚀 !deploy
        // =================================================

        if (message.content === "!deploy") {

            if (
                message.author.id !== OWNER_ID
            ) {
                return;
            }

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "deploy_git"
                            )
                            .setLabel(
                                "🚀 Push GitHub"
                            )
                            .setStyle(
                                ButtonStyle.Success
                            )
                    );

            return safeSend(
                message.channel,
                {
                    content:
                        "Déploiement disponible :",
                    components: [row]
                }
            );
        }

        // =================================================
        // 📜 TRAITEMENT DES RÈGLES
        // =================================================

        for (
            const rule of REGLES
        ) {

            if (
                rule.match(texte)
            ) {

                const stats =
                    await getStats();

                const userId =
                    message.author.id;

                // Total global
                stats.total += 1;

                // Création de l'utilisateur
                if (
                    !stats.users[userId]
                ) {

                    stats.users[userId] = {
                        username:
                            message.author.username,

                        count: 0,
                        feur: 0,
                        pourquoi: 0,
                        sexuel: 0,
                        raciste: 0,
                        autre: 0
                    };
                }

                // Sécurisation des anciennes statistiques

                if (
                    stats.users[userId].count === undefined
                ) {
                    stats.users[userId].count = 0;
                }

                if (
                    stats.users[userId].feur === undefined
                ) {
                    stats.users[userId].feur = 0;
                }

                if (
                    stats.users[userId].pourquoi === undefined
                ) {
                    stats.users[userId].pourquoi = 0;
                }

                if (
                    stats.users[userId].sexuel === undefined
                ) {
                    stats.users[userId].sexuel = 0;
                }

                if (
                    stats.users[userId].raciste === undefined
                ) {
                    stats.users[userId].raciste = 0;
                }

                if (
                    stats.users[userId].autre === undefined
                ) {
                    stats.users[userId].autre = 0;
                }

                // Incrémentation du total utilisateur

                stats.users[userId].count += 1;

                // Incrémentation de la catégorie

                if (
                    rule.type &&
                    stats.users[userId][rule.type] !== undefined
                ) {

                    stats.users[userId][rule.type] += 1;

                } else {

                    stats.users[userId].autre += 1;
                }

                // Mise à jour du pseudo

                stats.users[userId].username =
                    message.author.username;

                // Sauvegarde

                await saveStats(
                    stats
                );

                // Attribution automatique des rôles

                await checkAndAssignRoles(
                    message.guild,
                    stats
                );

                // Réponse du bot

                return safeReply(
                    message,
                    pick(rule.responses)
                );
            }
        }
    }
);

// =====================================================
// 🚀 BOUTON DE DÉPLOIEMENT
// =====================================================

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (
            !interaction.isButton() ||
            interaction.user.id !== OWNER_ID
        ) {
            return;
        }

        if (
            interaction.customId === "deploy_git"
        ) {

            try {

                await interaction.reply({
                    content:
                        "Déploiement en cours...",
                    ephemeral: true
                });

                run(
                    "node deploy.js"
                );

                await interaction.followUp({
                    content:
                        "✅ Push terminé. Redémarrage..."
                });

                setTimeout(
                    () => process.exit(0),
                    1500
                );

            } catch (e) {

                console.error(e);
            }
        }
    }
);

// =====================================================
// 🔑 CONNEXION DISCORD
// =====================================================

client.login(
    process.env.TOKEN
).catch(
    err =>
        console.error(
            "❌ Login erreur :",
            err
        )
);