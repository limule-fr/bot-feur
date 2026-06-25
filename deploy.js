const { execSync } = require("child_process");

const commitMessage = process.argv.slice(2).join(" ") || "bot ready";

function run(cmd) {
    console.log(`\n> ${cmd}`);
    return execSync(cmd, {
        encoding: "utf8",
        stdio: "pipe"
    });
}

try {
    console.log("Ajout des fichiers...");
    run("git add .");

    try {
        console.log("Création du commit...");
        const commitResult = run(`git commit -m "${commitMessage}"`);
        console.log(commitResult);
    } catch (e) {
        const output =
            (e.stdout || "").toString() +
            (e.stderr || "").toString();

        if (
            output.includes("nothing to commit") ||
            output.includes("working tree clean")
        ) {
            console.log("Aucune modification à envoyer.");
            process.exit(0);
        }

        console.error("Erreur pendant le commit :");
        console.error(output);
        process.exit(1);
    }

    console.log("Envoi vers GitHub...");
    const pushResult = run("git push origin main");
    console.log(pushResult);

    console.log("✅ Déploiement terminé.");

} catch (e) {
    console.error("❌ Erreur :");

    if (e.stdout) console.error(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());

    console.error(e.message);
    process.exit(1);
}