/**
 * Üst dizindeki icon.png → assets/icon-only.png kopyalar ve @capacitor/assets ile Android ikonlarını üretir.
 * icon.png yoksa uyarı verir; cap sync yine çalışabilir (mevcut mipmap kalır).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const iconSrc = path.join(projectRoot, "icon.png");
const assetsDir = path.join(mobileRoot, "assets");
const iconOnly = path.join(assetsDir, "icon-only.png");

if (!fs.existsSync(iconSrc)) {
    console.warn(
        "[prepare-android-assets] Üst dizinde icon.png bulunamadı — Android ikonları yeniden üretilmedi.\n" +
            "  Yer: " +
            iconSrc
    );
    process.exit(0);
}

fs.mkdirSync(assetsDir, { recursive: true });
fs.copyFileSync(iconSrc, iconOnly);
console.log("[prepare-android-assets] assets/icon-only.png ← " + path.relative(mobileRoot, iconSrc));

try {
    execSync(
        'npx capacitor-assets generate --android --iconBackgroundColor "#1a252f"',
        {
            cwd: mobileRoot,
            stdio: "inherit",
            shell: true,
            env: process.env
        }
    );
    /** Adaptive icon XML (@mipmap-anydpi-v26/ic_launcher*.xml) @mipmap/ic_launcher_foreground ister; araç çoğu zaman yalnızca ic_launcher.png üretir. Eksik kalınca sistem drawable-v24/ic_launcher_foreground.xml (varsayılan Capacitor logosu) kullanılır. */
    const resMain = path.join(mobileRoot, "android", "app", "src", "main", "res");
    if (fs.existsSync(resMain)) {
        let n = 0;
        for (const name of fs.readdirSync(resMain)) {
            if (!/^mipmap-/i.test(name)) continue;
            const dir = path.join(resMain, name);
            if (!fs.statSync(dir).isDirectory()) continue;
            const src = path.join(dir, "ic_launcher.png");
            const dst = path.join(dir, "ic_launcher_foreground.png");
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dst);
                n++;
            }
        }
        if (n > 0) {
            console.log(
                "[prepare-android-assets] ic_launcher.png → ic_launcher_foreground.png (" + n + " yoğunluk) — adaptive icon için."
            );
        }
    }
    console.log("[prepare-android-assets] Tamam — Android kaynak ikonları güncellendi.");
} catch (e) {
    console.error("[prepare-android-assets] capacitor-assets başarısız:", e && e.message ? e.message : e);
    process.exit(1);
}
