/**
 * Üst klasördeki web uygulamasını www/ içine kopyalar (Capacitor giriş: index.html).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const www = path.join(mobileRoot, "www");

function rmrf(dir) {
    if (!fs.existsSync(dir)) return;
    fs.rmSync(dir, { recursive: true, force: true });
}

rmrf(www);
fs.mkdirSync(www, { recursive: true });

const htmlSrc = path.join(projectRoot, "ARSA_ANALIZ.html");
if (!fs.existsSync(htmlSrc)) {
    console.error("Bulunamadı:", htmlSrc);
    process.exit(1);
}
fs.copyFileSync(htmlSrc, path.join(www, "index.html"));
console.log("index.html ← ARSA_ANALIZ.html");

const copyDirs = ["boundaries", "data"];
for (const d of copyDirs) {
    const src = path.join(projectRoot, d);
    if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(www, d), { recursive: true });
        console.log("kopyalandı:", d + "/");
    }
}

for (const f of ["il-ilce-tr.json"]) {
    const p = path.join(projectRoot, f);
    if (fs.existsSync(p)) {
        fs.copyFileSync(p, path.join(www, f));
        console.log("kopyalandı:", f);
    }
}

const iconRoot = path.join(projectRoot, "icon.png");
if (fs.existsSync(iconRoot)) {
    fs.copyFileSync(iconRoot, path.join(www, "icon.png"));
    console.log("icon.png → www/icon.png");
}

console.log("Tamam — www hazır.");
