/**
 * Harita oluşturma — ARSA ANALİZ için illerin sınır GeoJSON dosyalarını üretir.
 * Çıktı: ../boundaries/<il>.json (ör. karabük.json, bartın.json)
 *
 * Kullanım: bu klasörde `npm install` sonra `npm run olustur`
 * Node.js 18+ gerekir.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import osmtogeojson from "osmtogeojson";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "boundaries");
const OVERPASS_UCLER = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
];
const BEKLE_ILER_ARASI_MS = 8000;
const DENEME_SAYISI = 4;
const DENEME_BEKLE_MS = 8000;

const ILLER = [
    { city: "Samsun", plate: "55", osmAreaNames: ["Samsun"] },
    { city: "Sinop", plate: "57", osmAreaNames: ["Sinop"] },
    { city: "Kastamonu", plate: "37", osmAreaNames: ["Kastamonu"] },
    { city: "Karabük", plate: "78", osmAreaNames: ["Karabük", "Karabuk"] },
    { city: "Bartın", plate: "74", osmAreaNames: ["Bartın", "Bartin"] },
    { city: "Zonguldak", plate: "67", osmAreaNames: ["Zonguldak"] }
];

function geoJsonPolygonsOnly(geoData) {
    if (!geoData || !geoData.features) return geoData;
    const features = geoData.features.filter((f) => {
        const t = f.geometry && f.geometry.type;
        return t === "Polygon" || t === "MultiPolygon";
    });
    return { type: "FeatureCollection", features };
}

function getAdminLevel(f) {
    const p = f.properties || {};
    if (p.admin_level != null) return String(p.admin_level);
    if (p.tags && p.tags.admin_level != null) return String(p.tags.admin_level);
    return "";
}

function splitProvinceDistrictGeoJson(gj) {
    const cleaned = geoJsonPolygonsOnly(gj);
    const province = { type: "FeatureCollection", features: [] };
    const districts = { type: "FeatureCollection", features: [] };
    for (const f of cleaned.features || []) {
        const al = getAdminLevel(f);
        if (al === "4") province.features.push(f);
        else if (al === "6") districts.features.push(f);
        else districts.features.push(f);
    }
    return { province, districts };
}

/** Plaka (ref) birden fazla ülkede var; mutlaka Türkiye sınırı içinde sorgula. */
function overpassQueryVariantsForProvince(item) {
    const names = item.osmAreaNames || [item.city];
    const plate = item.plate;
    const qs = [];
    if (plate) {
        qs.push(`
[out:json][timeout:120];
area["wikidata"="Q43"]->.tr;
area["admin_level"="4"]["ref"="${plate}"](area.tr)->.searchArea;
(
  relation["admin_level"="6"](area.searchArea);
  relation["admin_level"="4"]["boundary"="administrative"](area.searchArea);
);
out geom;
`);
        qs.push(`
[out:json][timeout:120];
area["wikidata"="Q43"]->.tr;
area["admin_level"="4"]["ref"="${plate}"](area.tr)->.searchArea;
(
  relation["admin_level"="6"](area.searchArea);
);
out geom;
`);
    }
    for (const name of names) {
        qs.push(`
[out:json][timeout:120];
area["wikidata"="Q43"]->.tr;
area["name"="${name}"]["admin_level"="4"]["boundary"="administrative"](area.tr)->.searchArea;
(
  relation["admin_level"="6"](area.searchArea);
  relation["admin_level"="4"]["boundary"="administrative"](area.searchArea);
);
out geom;
`);
        qs.push(`
[out:json][timeout:120];
area["wikidata"="Q43"]->.tr;
area["name:tr"="${name}"]["admin_level"="4"]["boundary"="administrative"](area.tr)->.searchArea;
(
  relation["admin_level"="6"](area.searchArea);
);
out geom;
`);
    }
    return qs;
}

function featureRoughCentroid(f) {
    const g = f.geometry;
    if (!g || !g.coordinates) return null;
    let ring = null;
    if (g.type === "Polygon") ring = g.coordinates[0];
    else if (g.type === "MultiPolygon") ring = g.coordinates[0] && g.coordinates[0][0];
    if (!ring || !ring.length) return null;
    let sx = 0;
    let sy = 0;
    const n = Math.min(ring.length, 80);
    for (let i = 0; i < n; i++) {
        sx += ring[i][0];
        sy += ring[i][1];
    }
    return { lng: sx / n, lat: sy / n };
}

function splitLikelyTurkey(split) {
    const f = split.districts.features[0];
    if (!f) return false;
    const c = featureRoughCentroid(f);
    if (!c) return false;
    return c.lat >= 35.5 && c.lat <= 42.5 && c.lng >= 25 && c.lng <= 46;
}

function dosyaAdi(city) {
    return city.toLowerCase() + ".json";
}

async function overpassIstek(url, body) {
    const res = await fetch(url, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        const err = new Error("HTTP " + res.status);
        err.gecici = true;
        throw err;
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
}

async function overpassSorgula(item) {
    let lastErr;
    for (const q of overpassQueryVariantsForProvince(item)) {
        const body = "data=" + encodeURIComponent(q);
        for (const baseUrl of OVERPASS_UCLER) {
            for (let deneme = 0; deneme < DENEME_SAYISI; deneme++) {
                try {
                    const osm = await overpassIstek(baseUrl, body);
                    const gj = osmtogeojson(osm);
                    const split = splitProvinceDistrictGeoJson(gj);
                    if (split.districts.features.length && splitLikelyTurkey(split)) return split;
                    break;
                } catch (e) {
                    lastErr = e;
                    if (e.gecici && deneme < DENEME_SAYISI - 1) {
                        await bekle(DENEME_BEKLE_MS * (deneme + 1));
                        continue;
                    }
                    break;
                }
            }
        }
    }
    throw lastErr || new Error("İlçe bulunamadı: " + item.city);
}

function bekle(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log("Çıktı klasörü:", OUT_DIR);
    console.log("İller arası bekleme:", BEKLE_ILER_ARASI_MS, "ms (Overpass kotası için)\n");

    const ozet = [];

    for (let i = 0; i < ILLER.length; i++) {
        const item = ILLER[i];
        const file = dosyaAdi(item.city);
        const target = path.join(OUT_DIR, file);

        process.stdout.write(`[${i + 1}/${ILLER.length}] ${item.city} (${file}) ... `);
        try {
            const split = await overpassSorgula(item);
            const payload = {
                province: split.province,
                districts: split.districts,
                _meta: {
                    sehir: item.city,
                    kaynak: "OpenStreetMap (Overpass API)",
                    uretim: new Date().toISOString(),
                    ilceSayisi: split.districts.features.length,
                    ilSiniri: split.province.features.length > 0
                }
            };
            fs.writeFileSync(target, JSON.stringify(payload), "utf8");
            const kb = (fs.statSync(target).size / 1024).toFixed(1);
            console.log("tamam (" + kb + " KB)");
            ozet.push({ city: item.city, file, ok: true, kb });
        } catch (e) {
            console.log("HATA:", e.message || e);
            ozet.push({ city: item.city, file, ok: false, err: String(e.message || e) });
        }

        if (i < ILLER.length - 1) await bekle(BEKLE_ILER_ARASI_MS);
    }

    console.log("\n--- Özet ---");
    for (const o of ozet) {
        console.log(o.ok ? `  OK  ${o.file} (${o.kb} KB)` : `  X   ${o.file} — ${o.err}`);
    }
    console.log("\nBu dosyaları GitHub’daki `boundaries/` klasörüne yükleyebilirsiniz.");
    console.log("ARSA_ANALIZ.html içinde BOUNDARY_REMOTE_BASE_URL adresini ayarlayın.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
