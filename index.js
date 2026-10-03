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

console.log("REDIS_URL présente :", Object.prototype.hasOwnProperty.call(process.env, "REDIS_URL"));
console.log(
    "Variables Redis détectées :",
    Object.keys(process.env).filter(key => key.toLowerCase().includes("redis"))
);

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : null;

if (redis) {
    redis.on("connect", () => {
        console.log("Redis connecté");
    });

    redis.on("ready", () => {
        console.log("Redis prêt");
    });

    redis.on("error", (err) => {
        console.error("Erreur Redis :", err);
    });
} else {
    console.log("REDIS_URL absente : utilisation de stats.json");
}

// =====================================================
// 🎛️ IDS DES RÔLES DISCORD
// =====================================================

const ROLE_VICTIME_ULTIME_NAME = "Victime Ultime";
const ROLE_GROS_COCHON_NAME = "Gros Cochon";
const ROLE_BOULET_IRRECUPERABLE_NAME = "Boulet Irrécupérable";

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
// 👥 AJOUT AUTOMATIQUE DES MEMBRES AUX STATISTIQUES
// =====================================================

async function syncMembersWithStats(guild, stats) {
    const members = await guild.members.fetch();

    for (const member of members.values()) {

        // On ignore les bots
        if (member.user.bot) continue;

        // Si l'utilisateur existe déjà,
        // on ne touche absolument à rien.
        if (stats.users[member.id]) continue;

        // Sinon, on l'ajoute avec 0 infraction.
        stats.users[member.id] = {
            username: member.user.username,
            count: 0,
            feur: 0,
            pourquoi: 0,
            sexuel: 0,
            raciste: 0,
            autre: 0
        };

        console.log(
            `Nouveau membre ajouté aux statistiques : ${member.user.tag}`
        );
    }

    // Recalcul du total global
    stats.total = Object.values(stats.users)
        .reduce(
            (total, user) =>
                total + (user.count || 0),
            0
        );

    await saveStats(stats);
}

// =====================================================
// 🏆 GESTION AUTOMATIQUE DES RÔLES
// =====================================================

async function checkAndAssignRoles(guild, stats) {
    try {

        const topUsers = Object.entries(stats.users)
            .map(([id, data]) => ({
                id,
                ...data
            }))
            .sort((a, b) => b.count - a.count);

        const pireUserId =
            topUsers.length > 0 && topUsers[0].count > 0
                ? topUsers[0].id
                : null;

        const roleVictimeUltime = guild.roles.cache.find(
            role =>
                role.name.toLowerCase() ===
                ROLE_VICTIME_ULTIME_NAME.toLowerCase()
        );

        const roleGrosCochon = guild.roles.cache.find(
            role =>
                role.name.toLowerCase() ===
                ROLE_GROS_COCHON_NAME.toLowerCase()
        );

        const roleBouletIrrecuperable = guild.roles.cache.find(
            role =>
                role.name.toLowerCase() ===
                ROLE_BOULET_IRRECUPERABLE_NAME.toLowerCase()
        );

        if (!roleVictimeUltime) {
            console.log(
                `Rôle introuvable : ${ROLE_VICTIME_ULTIME_NAME}`
            );
        }

        if (!roleGrosCochon) {
            console.log(
                `Rôle introuvable : ${ROLE_GROS_COCHON_NAME}`
            );
        }

        if (!roleBouletIrrecuperable) {
            console.log(
                `Rôle introuvable : ${ROLE_BOULET_IRRECUPERABLE_NAME}`
            );
        }

        const members = await guild.members.fetch();

        for (const member of members.values()) {

            // On ignore les bots
            if (member.user.bot) continue;

            const userStats =
                stats.users[member.id] || {
                    count: 0,
                    sexuel: 0
                };

            // =================================================
            // 🏆 VICTIME ULTIME
            // =================================================

            if (roleVictimeUltime) {

                if (member.id === pireUserId) {

                    if (
                        !member.roles.cache.has(
                            roleVictimeUltime.id
                        )
                    ) {
                        await member.roles.add(
                            roleVictimeUltime
                        );

                        console.log(
                            `Victime Ultime attribué à ${member.user.tag}`
                        );
                    }

                } else {

                    if (
                        member.roles.cache.has(
                            roleVictimeUltime.id
                        )
                    ) {
                        await member.roles.remove(
                            roleVictimeUltime
                        );
                    }
                }
            }

            // =================================================
            // 🐷 GROS COCHON
            // =================================================

            if (roleGrosCochon) {

                if (userStats.sexuel >= 5) {

                    if (
                        !member.roles.cache.has(
                            roleGrosCochon.id
                        )
                    ) {
                        await member.roles.add(
                            roleGrosCochon
                        );

                        console.log(
                            `Gros Cochon attribué à ${member.user.tag}`
                        );
                    }

                } else {

                    if (
                        member.roles.cache.has(
                            roleGrosCochon.id
                        )
                    ) {
                        await member.roles.remove(
                            roleGrosCochon
                        );
                    }
                }
            }

            // =================================================
            // 💀 BOULET IRRÉCUPÉRABLE
            // =================================================

            if (roleBouletIrrecuperable) {

                if (userStats.count > 100) {

                    if (
                        !member.roles.cache.has(
                            roleBouletIrrecuperable.id
                        )
                    ) {
                        await member.roles.add(
                            roleBouletIrrecuperable
                        );

                        console.log(
                            `Boulet Irrécupérable attribué à ${member.user.tag}`
                        );
                    }

                } else {

                    if (
                        member.roles.cache.has(
                            roleBouletIrrecuperable.id
                        )
                    ) {
                        await member.roles.remove(
                            roleBouletIrrecuperable
                        );
                    }
                }
            }
        }

    } catch (error) {

        console.error(
            "Erreur lors de l'attribution des rôles :",
            error
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
                .sort(
                    (a, b) =>
                        b.count - a.count
                );

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
            /\b(pourquoi+|pk+|pqwa+)\b/i.test(t),

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
            "https://klipy.com/gifs/feur-theobabac"
        ]
    }
];

// =====================================================
// 🛠️ FONCTIONS UTILITAIRES
// =====================================================

function pick(arr) {

    return arr[
        Math.floor(
            Math.random() * arr.length
        )
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
    err =>
        console.error(
            "CLIENT ERROR :",
            err
        )
);

process.on(
    "unhandledRejection",
    err =>
        console.error(
            "REJECTION :",
            err
        )
);

process.on(
    "uncaughtException",
    err =>
        console.error(
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

        // =================================================
        // 👥 SYNCHRONISATION DES MEMBRES
        // =================================================

        try {

            const stats = await getStats();

            for (
                const guild of client.guilds.cache.values()
            ) {

                await syncMembersWithStats(
                    guild,
                    stats
                );

                await checkAndAssignRoles(
                    guild,
                    stats
                );
            }

            console.log(
                "Statistiques des membres synchronisées."
            );

        } catch (err) {

            console.error(
                "Erreur lors de la synchronisation des membres :",
                err
            );
        }
    }
);

// =====================================================
// 👤 NOUVEAU MEMBRE
// =====================================================

client.on(
    Events.GuildMemberAdd,
    async member => {

        // On ignore les bots
        if (member.user.bot) return;

        try {

            const stats = await getStats();

            // Si le membre n'existe pas encore
            if (!stats.users[member.id]) {

                stats.users[member.id] = {

                    username: member.user.username,

                    count: 0,
                    feur: 0,
                    pourquoi: 0,
                    sexuel: 0,
                    raciste: 0,
                    autre: 0

                };

                await saveStats(stats);

                console.log(
                    `Nouveau membre ajouté aux statistiques : ${member.user.tag}`
                );
            }

            await checkAndAssignRoles(
                member.guild,
                stats
            );

        } catch (err) {

            console.error(
                "Erreur lors de l'ajout du nouveau membre aux statistiques :",
                err
            );
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
                "📊 Découvre le tableau de bord de la Feur-Mania en direct ici : https://bot-feur-3qcy.onrender.com/"
            );
        }

        // =================================================
        // 😈 !injectertriche
        // =================================================

        if (texte === "!triche") {

            if (
                message.author.id !== OWNER_ID
            ) {
                return;
            }

            const statsTrichees = {

                users: {

                    [OWNER_ID]: {

                        username: "limule_26543",

                        count: 0,
                        feur: 0,
                        pourquoi: 0,
                        sexuel: 0,
                        raciste: 0,
                        autre: 0
                    }

                }

            };

            const stats =
                await getStats();

            // On remplace uniquement TES statistiques.
            // Les statistiques des autres utilisateurs
            // restent intactes.

            stats.users[OWNER_ID] =
                statsTrichees.users[OWNER_ID];

            // Recalcul du total global

            stats.total =
                Object.values(stats.users)
                    .reduce(
                        (total, user) =>
                            total + (user.count || 0),
                        0
                    );

            await saveStats(stats);

            await checkAndAssignRoles(
                message.guild,
                stats
            );

            return safeReply(
                message,
                `Triche injectée pour limule_26543. Total global : ${stats.total} fautes.`
            );
        }

        // =================================================
        // 📊 !stats
        // =================================================

        if (texte === "!stats") {

            const LIMULE_ID = OWNER_ID;

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

            if (
                topUsers.length === 0
            ) {

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
            message.mentions.has(
                client.user.id
            ) &&
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

        if (
            message.content === "!deploy"
        ) {

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

                // =================================================
                // 📈 TOTAL GLOBAL
                // =================================================

                stats.total += 1;

                // =================================================
                // 👤 CRÉATION DE L'UTILISATEUR
                // =================================================

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

                // =================================================
                // 🛡️ SÉCURISATION DES ANCIENNES STATISTIQUES
                // =================================================

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

                // =================================================
                // 📊 INCRÉMENTATION DU TOTAL UTILISATEUR
                // =================================================

                stats.users[userId].count += 1;

                // =================================================
                // 📂 INCRÉMENTATION DE LA CATÉGORIE
                // =================================================

                if (
                    rule.type &&
                    stats.users[userId][rule.type] !== undefined
                ) {

                    stats.users[userId][rule.type] += 1;

                } else {

                    stats.users[userId].autre += 1;
                }

                // =================================================
                // 👤 MISE À JOUR DU PSEUDO
                // =================================================

                stats.users[userId].username =
                    message.author.username;

                // =================================================
                // 💾 SAUVEGARDE
                // =================================================

                await saveStats(
                    stats
                );

                // =================================================
                // 🏆 ATTRIBUTION AUTOMATIQUE DES RÔLES
                // =================================================

                await checkAndAssignRoles(
                    message.guild,
                    stats
                );

                // =================================================
                // 💬 RÉPONSE DU BOT
                // =================================================

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