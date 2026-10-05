const { execSync } = require("child_process");

function run(command) {
    execSync(command, { stdio: "inherit" });
}

try {
    run("git add .");
    run('git commit -m "[CV] Déploiement"');
    run("git push origin CV");
    console.log("Déploiement terminé.");
} catch (error) {
    console.error("Échec du déploiement :", error.message);
    process.exit(1);
}
