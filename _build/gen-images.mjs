#!/usr/bin/env node
/**
 * gen-images.mjs — idempotent Nano Banana image batch for Good Enough Garage Doors.
 * Generates a brand van reference once, then every page hero referencing it for a
 * consistent plum van / sand stripe / uniform across the whole site.
 *
 * Run: GEMINI_API_KEY=$GEMINI_API_KEY node _build/gen-images.mjs
 * Skips any target whose final .webp already exists, so reruns only fill gaps.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";
if (!API_KEY) { console.error("GEMINI_API_KEY missing"); process.exit(1); }

const STYLE = "photorealistic documentary photography, shot on 35mm, natural Pacific-Northwest daylight, soft bright overcast, realistic skin texture and worn materials, candid, true-to-life ordinary working people, slight film grain, no studio lighting, no retouching, no glamour, no extra text or watermarks";
const BRAND = "the technician wears a deep plum-purple work jacket with a small warm-sand chest logo and a plum ball cap; the service van (when shown) is a recent Ford Transit cleanly wrapped in deep plum purple with a warm sand gold stripe, brand colours plum purple and warm gold, BC licence plate; do NOT show any phone number anywhere";

const OUT = "assets/img";
mkdirSync(OUT, { recursive: true });
mkdirSync("assets/brand", { recursive: true });

// [outBaseName, prompt, widths[], refImage|null]
const VAN_REF = "assets/brand/van-ref.png";

const jobs = [
  // hero — desktop landscape + mobile portrait (the only true dual-orientation hero)
  ["hero-desktop", "wide landscape shot: a friendly average-looking middle-aged male garage-door technician standing beside a deep-plum wrapped Ford Transit service van in the driveway of a typical Greater Vancouver craftsman home with an open double garage door, soft overcast morning, evergreen trees and mountains faint in the background, " + BRAND + "; " + STYLE, [1600, 960], VAN_REF],
  ["hero-mobile", "vertical portrait composition: a friendly average-looking female garage-door technician in plum uniform standing in a Metro Vancouver suburban driveway, holding a tool, with BOTH a clearly visible large OPEN double sectional garage door behind her AND the deep-plum wrapped service van parked beside it, the open garage door must be prominent and fully in frame, soft overcast morning light, " + BRAND + "; " + STYLE, [960, 480], VAN_REF],
  // service heroes
  ["spring-repair", "close realistic shot of weathered gloved hands winding a new torsion spring onto the steel shaft above a residential garage door, real garage interior, work light, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["opener-repair", "a technician on a small ladder reaching up to a ceiling-mounted garage door opener motor unit inside a real suburban garage, troubleshooting, natural light from open door, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["opener-install", "a technician fitting a new white LiftMaster-style belt-drive opener rail to a garage ceiling, drill in hand, real garage, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["cable-repair", "close shot of hands threading a new steel lift cable onto the bottom bracket and drum of a residential garage door, frayed old cable visible, real garage, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["off-track", "a technician guiding a garage door roller back into a bent vertical track, hands on the door panel, real garage interior, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["new-door", "a freshly installed modern grey sectional garage door on a newer Greater Vancouver home, the plum wrapped van parked in the driveway, overcast daylight, clean finished look, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["maintenance", "a technician applying lubricant and checking the rollers and hinges of a residential garage door with a clipboard nearby, tidy real garage, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["emergency", "the plum wrapped service van parked at dusk outside a Metro Vancouver home with a single garage door half open, warm interior light spilling out, slightly wet driveway, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  // city heroes (distinct backdrops)
  ["area-vancouver", "the deep-plum wrapped service van parked on a leafy East Vancouver residential street with character craftsman houses and a mountain backdrop, overcast, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["area-burnaby", "the plum wrapped service van in front of a Burnaby hillside home with a double garage, newer build, evergreen slope behind, soft daylight, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["area-surrey", "the plum wrapped service van in the wide driveway of a large newer Surrey family home with a triple garage, flat suburban street, overcast, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["area-richmond", "the plum wrapped service van outside a flat Richmond suburban home with a double garage under a big open Lower-Mainland sky, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["area-coquitlam", "the plum wrapped service van outside a Coquitlam home set against a forested mountain slope, double garage, overcast, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  // misc
  ["about", "two average-looking blue-collar garage-door technicians in plum uniforms standing casually beside the plum wrapped van, friendly genuine half-smiles, Metro Vancouver residential street, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["partner", "two working tradespeople shaking hands beside the plum wrapped service van, genuine blue-collar, overcast Metro Vancouver driveway, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["contact", "friendly female dispatcher-technician in a plum jacket holding a phone and clipboard beside the plum wrapped van, candid, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
  ["faq", "a technician explaining something to a homeowner in a driveway, pointing at the garage door, both relaxed, plum van nearby, " + BRAND + "; " + STYLE, [1200, 480], VAN_REF],
];

// Reviewer headshots (§6 reviewer recipe). Match ethnicity + sex to the name origin.
// Output square ~256px webp, displayed circular. NOT models — ordinary Metro-Van people.
const PORTRAIT = "candid amateur smartphone headshot, ordinary everyday person (not a model), at home, natural window light, shot on a phone, slightly imperfect framing, true-to-life skin texture with visible pores and imperfections, slight grain, natural depth of field";
const PORTRAIT_NEG = "no plastic or waxy skin, no over-smoothing, no CGI or 3D render look, no cartoon, no warped hands or extra fingers, no unnatural symmetry, no text or watermark, no over-saturation, no HDR glow, not a stock photo, not a studio portrait";
const reviewers = [
  ["rev-priya", "a warm South-Asian (Indian-Canadian) woman in her late 30s, ordinary middle-class homeowner, slight friendly smile; " + PORTRAIT + "; " + PORTRAIT_NEG],
  ["rev-dave", "a friendly white Canadian man in his mid 40s, short greying hair, casual shirt, slight smile; " + PORTRAIT + "; " + PORTRAIT_NEG],
  ["rev-karen", "a friendly white Canadian woman in her early 50s, shoulder-length hair, casual sweater, gentle smile; " + PORTRAIT + "; " + PORTRAIT_NEG],
  ["rev-anthony", "a friendly white Canadian man in his late 30s, short dark hair, casual jacket, slight smile; " + PORTRAIT + "; " + PORTRAIT_NEG],
  ["rev-megan", "a friendly white Canadian woman in her early 30s, light brown hair, casual top, natural smile; " + PORTRAIT + "; " + PORTRAIT_NEG],
  ["rev-hassan", "a friendly Middle-Eastern (Iranian/Lebanese-Canadian) man in his early 40s, short dark hair and trimmed beard, casual shirt, slight smile; " + PORTRAIT + "; " + PORTRAIT_NEG],
];

async function gen(prompt, outPng, ref) {
  const parts = [{ text: prompt }];
  if (ref && existsSync(ref)) {
    const b64 = readFileSync(ref).toString("base64");
    parts.push({ inlineData: { mimeType: "image/png", data: b64 } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const img = (data?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
  if (!img) throw new Error("no image: " + JSON.stringify(data).slice(0, 200));
  writeFileSync(outPng, Buffer.from(img.inlineData.data, "base64"));
}

function webp(png, out, w) {
  execSync(`cwebp -q 82 -resize ${w} 0 "${png}" -o "${out}"`, { stdio: "ignore" });
}
// Center-crop to a square (or any w×h) and write webp — for reviewer avatars + OG.
import sharp from "sharp";
async function webpCrop(png, out, w, h = w) {
  await sharp(png).resize(w, h, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toFile(out);
}

// 1) Van reference first (establishes the brand) — generated WITHOUT a ref.
if (!existsSync(VAN_REF)) {
  console.log("→ van-ref (brand anchor)...");
  try {
    await gen("a recent Ford Transit service van cleanly wrapped in deep plum purple with a single warm sand-gold horizontal stripe, the brand name 'GOOD ENOUGH GARAGE DOORS' in clean sand lettering on the side panel and 'info@goodenoughgaragedoors.ca' in smaller text below it, parked in a Greater Vancouver suburban driveway, BC licence plate, three-quarter front view, overcast daylight; " + STYLE, VAN_REF, null);
    console.log("  ✓ van-ref");
  } catch (e) { console.error("  ✗ van-ref:", e.message); }
}

// Names listed here are regenerated even if a .webp already exists (set GEN_FORCE="a,b").
const FORCE = new Set((process.env.GEN_FORCE || "").split(",").map((s) => s.trim()).filter(Boolean));

let ok = 0, skip = 0, failn = 0;
for (const [base, prompt, widths, ref] of jobs) {
  const finalFull = `${OUT}/${base}.webp`;
  if (existsSync(finalFull) && !FORCE.has(base)) { skip++; continue; }
  const png = `${OUT}/${base}.png`;
  process.stdout.write(`→ ${base} ... `);
  try {
    await gen(prompt, png, ref);
    // full = first width, then suffixed variants
    webp(png, finalFull, widths[0]);
    for (const w of widths) webp(png, `${OUT}/${base}-${w}.webp`, w);
    unlinkSync(png);
    console.log("✓");
    ok++;
  } catch (e) {
    console.log("✗ " + e.message);
    failn++;
  }
}
console.log(`\nHeroes/sections: generated=${ok} skipped=${skip} failed=${failn}`);

// 2) Reviewer avatars — square 256px webp, displayed circular.
let rok = 0, rskip = 0, rfail = 0;
for (const [base, prompt] of reviewers) {
  const out = `${OUT}/${base}.webp`;
  if (existsSync(out) && !FORCE.has(base)) { rskip++; continue; }
  const png = `${OUT}/${base}.png`;
  process.stdout.write(`→ ${base} ... `);
  try {
    await gen(prompt, png, null); // no van ref — these are people, not branded scenes
    await webpCrop(png, out, 256);
    unlinkSync(png);
    console.log("✓"); rok++;
  } catch (e) { console.log("✗ " + e.message); rfail++; }
}
console.log(`Reviewers: generated=${rok} skipped=${rskip} failed=${rfail}`);

// 3) Real OG image (1200×630) cropped from the desktop hero source.
mkdirSync("og", { recursive: true });
const ogOut = "og/home.webp", ogJpg = "og/home.jpg";
if (FORCE.has("og") || !existsSync(ogOut)) {
  // Prefer the largest hero webp as the source for the OG crop.
  const heroSrc = ["assets/img/hero-desktop-1600.webp", "assets/img/hero-desktop-960.webp", "assets/img/hero-desktop.webp"].find(existsSync);
  if (heroSrc) {
    try {
      await sharp(heroSrc).resize(1200, 630, { fit: "cover", position: "attention" }).webp({ quality: 84 }).toFile(ogOut);
      await sharp(heroSrc).resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 84, mozjpeg: true }).toFile(ogJpg);
      console.log("OG: ✓ og/home.webp + og/home.jpg (1200×630 from hero)");
    } catch (e) { console.log("OG: ✗ " + e.message); }
  } else { console.log("OG: ✗ no hero source found"); }
} else { console.log("OG: skipped (exists)"); }
