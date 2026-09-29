require("dotenv").config();
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

// Vérification de la présence de la clé dans le .env local
if (!process.env.REDIS_URL) {
    console.error("❌ Erreur : Tu dois ajouter REDIS_URL dans ton fichier .env local !");
    process.exit(1);
}

const redis = new Redis(process.env.REDIS_URL);
const statsPath = path.join(__dirname, 'stats.json');

async function injecter() {
    try {
        if (!fs.existsSync(statsPath)) {
            console.error("❌ Erreur : Le fichier stats.json est introuvable sur ton PC.");
            process.exit(1);
        }

        const statsTrichees = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        
        // Recalcul automatique du total général par sécurité
        let totalGlobal = 0;
        Object.values(statsTrichees.users).forEach(u => {
            totalGlobal += (u.count || 0);
        });
        statsTrichees.total = totalGlobal;

        // Envoi direct dans la base de données de Render
        await redis.set('feur_stats', JSON.stringify(statsTrichees));
        
        console.log("🚀 Les statistiques truquées ont été injectées en direct sur Render !");
        console.log(`📊 Nouveau total global calculé : ${totalGlobal} fautes.`);
        
        // Fermeture propre de la connexion
        await redis.quit();
        process.exit(0);
    } catch (error) {
        console.error("❌ Une erreur est survenue pendant l'injection :", error);
        process.exit(1);
    }
}

injecter();
