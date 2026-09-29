require("dotenv").config();
console.log("Début chargement index.js");
const http = require('http');
const fs = require('fs'); // 📊 Gestion des fichiers pour les stats
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require('discord.js');
const { execSync } = require('child_process');

// 📊 Fichier de stockage des statistiques
const STATS_FILE = path.join(__dirname, 'stats.json');

// 📊 Fonctions pour lire et écrire les statistiques
function getStats() {
    if (!fs.existsSync(STATS_FILE)) {
        fs.writeFileSync(STATS_FILE, JSON.stringify({ total: 0, users: {} }, null, 4));
    }
    try {
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    } catch (e) {
        return { total: 0, users: {} };
    }
}

function saveStats(stats) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 4));
}

// 🌐 Serveur HTTP mis à jour pour servir le site web ET l'API avec détails
http.createServer((req, res) => {
    // Gestion de la route de l'API JSON
    if (req.url === '/api/stats' && req.method === 'GET') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        
        const stats = getStats();
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

        return res.end(JSON.stringify({
            total: stats.total,
            ranking: topUsers
        }));
    } 
    
    // Si l'utilisateur va sur la page d'accueil, on lui envoie le fichier index.html
    else if (req.url === '/' && req.method === 'GET') {
        const htmlPath = path.join(__dirname, 'index.html');
        fs.readFile(htmlPath, 'utf8', (err, htmlContent) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('Erreur lors du chargement de la page web.');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(htmlContent);
        });
    } 
    
    // Toutes les autres adresses inconnues
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page non trouvée');
    }
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

// 💡 Centralisation des règles avec catégories d'infractions uniques
const REGLES = [
    {
        type: "raciste",
        match: (t) => REGEX_MOTS_RACISTES.test(t),
        responses: [
            "SALE RACISTE !"
        ]
    },
    {
        type: "sexuel",
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
        match: (t) => /\bpourquoi\b/i.test(t),
        responses: [
            "Parce que Feur",
            "car c'est comme ça",
            "bah jsp"
        ]
    },
    {
        type: "feur",
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
            "https://klipy.com"
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

    // 📊 COMMANDE !stats locale mise à jour pour Discord
    if (texte === "!stats") {
        const stats = getStats();
        const topUsers = Object.entries(stats.users)
            .sort((a, b) => (b.count || 0) - (a.count || 0) )
            .slice(0, 5);

        let affichageTop = "";
        const medailles = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

        if (topUsers.length === 0) {
            affichageTop = "Personne ne s'est encore fait avoir... Pour l'instant. 👀";
        } else {
            topUsers.forEach(([id, data], index) => {
                affichageTop += `${medailles[index]} **${data.username}** : ${data.count || 0} fautes (Feur: ${data.feur || 0}, Pourquoi: ${data.pourquoi || 0}, Sexuel: ${data.sexuel || 0}, Raciste: ${data.raciste || 0})\n`;
            });
        }

        const messageStats = 
`📊 **TABLEAU DE BORD DE LA FEUR-MANIA**

🏆 **LE TOP DES VICTIMES :**
${affichageTop}
📈 **STATISTIQUES GLOBALES :**
* 🎯 **Total de pièges déclenchés :** ${stats.total}`;

        return safeReply(message, messageStats);
    }

    // Mentions / Pings
    if (message.mentions.has(client.user.id) && !message.mentions.everyone) {
        const reponsesPing = [
            "Quoi ? 👀",
            "On m'appelle ? 🤖",
            "Dis feur pour voir.",
            "Laisse-moi tranquille, je regarde vos messages. 🤫",
            "Oui, maître ?",
            "tg tu es chiant",
            "suce mes bits",
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
                .setLabel("🚀 Push GitHub")
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
            // 📊 ENREGISTREMENT DE LA STATISTIQUE AVEC SÉCURITÉ INFRASTRUCTURE
            const stats = getStats();
            const userId = message.author.id;

            stats.total += 1;
            if (!stats.users[userId]) {
                stats.users[userId] = { 
                    username: message.author.username, 
                    count: 0,
                    feur: 0,
                    pourquoi: 0,
                    sexuel: 0,
                    raciste: 0,
                    autre: 0
                };
            }
            
            // Sécurité : initialise le compteur à 0 s'il n'existe pas (évite le bug NaN)
            if (stats.users[userId].count === undefined) stats.users[userId].count = 0;
            if (stats.users[userId].feur === undefined) stats.users[userId].feur = 0;
            if (stats.users[userId].pourquoi === undefined) stats.users[userId].pourquoi = 0;
            if (stats.users[userId].sexuel === undefined) stats.users[userId].sexuel = 0;
            if (stats.users[userId].raciste === undefined) stats.users[userId].raciste = 0;
            if (stats.users[userId].autre === undefined) stats.users[userId].autre = 0;

            // Incrémentations dynamiques sans risque de plantage
            stats.users[userId].count += 1;
            if (rule.type && stats.users[userId][rule.type] !== undefined) {
stats.users[userId][rule.type] += 1;
} else {
stats.users[userId].autre += 1;
}
stats.users[userId].username = message.author.username;
saveStats(stats);
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
