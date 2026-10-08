// Copies the assets Next.js standalone output doesn't include, so the
// embedded server can run fully self-contained inside the packaged app.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
    console.error("[prepare-standalone] .next/standalone/server.js not found. Run `next build` first.");
    process.exit(1);
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    return true;
}

// Static assets + JS/CSS chunks the server serves at runtime
copyDir(path.join(root, "public"), path.join(standalone, "public"));
copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));

// The RAG data dir is local-only user data (written under userData at runtime
// via BROWSER_DATA_DIR). Never ship it inside the installer.
for (const stale of ["data", "data-seed"]) {
    const p = path.join(standalone, stale);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

// Env vars read by API routes (SERPER_API_KEY etc.)
const envLocal = path.join(root, ".env.local");
if (fs.existsSync(envLocal)) {
    fs.copyFileSync(envLocal, path.join(standalone, ".env.local"));
}

console.log("[prepare-standalone] Standalone bundle ready.");
