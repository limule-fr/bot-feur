const https = require("https");
const { execSync } = require("child_process");

const webhook = "https://discord.com/api/webhooks/1519467358794809484/FYKGvOOTr-sXyoHEndVwCwzw3tnwDYNe_hzncXEy4P8YTJh1rSE9jrSBuvMMTUzUDag1";

try {
    const msg = execSync('git log -1 --pretty=%B').toString().trim();

    const data = JSON.stringify({
        content: "🟡 Nouveau commit : " + msg
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

    req.write(data);
    req.end();
} catch (e) {
    console.error("Erreur webhook:", e);
}