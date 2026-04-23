/**
 * Repo kokundeki index.html ve statik varliklari bu klasore kopyalar.
 * Netlify build sirasinda calisir; cikti publish = "." olur.
 * Konum: deploy/netlify-web/scripts/ -> repo koku uc seviye yukari.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../../..");

const htmlSrc = path.join(repoRoot, "index.html");
if (!fs.existsSync(htmlSrc)) {
    console.error("Bulunamadı (repo kökünde olmalı):", htmlSrc);
    process.exit(1);
}

function rmrf(p) {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

for (const name of ["index.html", "boundaries", "data", "il-ilce-tr.json", "icon.png"]) {
    rmrf(path.join(pkgRoot, name));
}

fs.copyFileSync(htmlSrc, path.join(pkgRoot, "index.html"));
console.log("index.html ←", path.relative(pkgRoot, htmlSrc));

for (const d of ["boundaries", "data"]) {
    const src = path.join(repoRoot, d);
    if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(pkgRoot, d), { recursive: true });
        console.log("kopyalandı:", d + "/");
    }
}

for (const f of ["il-ilce-tr.json", "icon.png"]) {
    const src = path.join(repoRoot, f);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(pkgRoot, f));
        console.log("kopyalandı:", f);
    }
}

console.log("Tamam — Netlify yayın klasörü hazır.");
