const { execSync } = require("child_process");

const commitMessage = process.argv[2] || "bot ready";

function run(cmd) {
    execSync(cmd, { stdio: "inherit" });
}

run("git add .");

try {
    run(`git commit -m "${commitMessage}"`);
} catch (e) {
    console.log("Rien à commit");
    process.exit(0);
}

run("git push origin main");