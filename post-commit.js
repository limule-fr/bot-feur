require("dotenv").config();

const https = require("https");
const { execSync } = require("child_process");

const webhook = process.env.WEBHOOK_URL;

try {
    const msg = execSync("git log -1 --pretty=%B")
        .toString()
        .trim();

    console.log("Webhook :", webhook ? "OK" : "MANQUANT");
    console.log("Commit :", msg);

    if (!webhook) {
        throw new Error("WEBHOOK_URL manquant dans le .env");
    }

    const data = JSON.stringify({
        content: `🟡 Nouveau commit : ${msg}`
    });

    const url = new URL(webhook);

    const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data)
        }
    });

    req.on("error", err => {
        console.error("Erreur webhook :", err);
    });

    req.write(data);
    req.end();

} catch (e) {
    console.error("Erreur webhook :", e);
}