// Generate AVIF siblings for every hero webp (LCP wins) + a raster logo for schema/OG.
// Idempotent: skips existing .avif. Run: node _build/gen-avif.mjs
import sharp from "sharp";
import { readdirSync, existsSync, statSync } from "node:fs";

const dir = "assets/img";
const files = readdirSync(dir).filter((f) => f.endsWith(".webp"));
let made = 0, skip = 0;
for (const f of files) {
  const out = `${dir}/${f.replace(/\.webp$/, ".avif")}`;
  if (existsSync(out)) { skip++; continue; }
  await sharp(`${dir}/${f}`).avif({ quality: 52, effort: 4 }).toFile(out);
  made++;
}
console.log(`avif: made ${made}, skipped ${skip}`);

// raster logo (512) from favicon.svg for schema 'logo' + a social card logo
if (!existsSync("assets/img/logo-512.png")) {
  await sharp("favicon.svg", { density: 384 }).resize(512, 512).png().toFile("assets/img/logo-512.png");
  console.log("wrote assets/img/logo-512.png");
}
// report avif vs webp savings on the hero
for (const n of ["hero-desktop-960", "hero-mobile-480"]) {
  if (existsSync(`${dir}/${n}.avif`)) {
    const a = statSync(`${dir}/${n}.avif`).size, w = statSync(`${dir}/${n}.webp`).size;
    console.log(`  ${n}: webp ${(w/1024).toFixed(0)}KB -> avif ${(a/1024).toFixed(0)}KB`);
  }
}
