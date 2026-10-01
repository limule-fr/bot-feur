require("dotenv").config();

const fs = require("fs");
const path = require("path");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

const STATS_FILE = path.join(__dirname, "..", "stats.json");

async function backupStats() {
    try {
        console.log("Connexion à Redis...");

        const data = await redis.get("feur_stats");

        if (!data) {
            console.log("Aucune donnée trouvée dans Redis.");
            return;
        }

        const stats = JSON.parse(data);

        fs.writeFileSync(
            STATS_FILE,
            JSON.stringify(stats, null, 4)
        );

        console.log("Sauvegarde Redis → stats.json réussie.");
        console.log(`Total : ${stats.total}`);
        console.log(`Utilisateurs : ${Object.keys(stats.users || {}).length}`);
    } catch (error) {
        console.error("Erreur pendant la sauvegarde :", error);
        process.exitCode = 1;
    } finally {
        redis.disconnect();
    }
}

backupStats();