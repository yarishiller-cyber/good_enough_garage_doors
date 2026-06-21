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
  ["hero-mobile", "vertical portrait shot: a friendly average-looking female garage-door technician in plum uniform smiling slightly while carrying a torsion spring, the deep-plum wrapped service van behind her in a Metro Vancouver suburban driveway, open garage door, soft overcast light, " + BRAND + "; " + STYLE, [960, 480], VAN_REF],
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

// 1) Van reference first (establishes the brand) — generated WITHOUT a ref.
if (!existsSync(VAN_REF)) {
  console.log("→ van-ref (brand anchor)...");
  try {
    await gen("a recent Ford Transit service van cleanly wrapped in deep plum purple with a single warm sand-gold horizontal stripe, the brand name 'GOOD ENOUGH GARAGE DOORS' in clean sand lettering on the side panel and 'info@goodenoughgaragedoors.ca' in smaller text below it, parked in a Greater Vancouver suburban driveway, BC licence plate, three-quarter front view, overcast daylight; " + STYLE, VAN_REF, null);
    console.log("  ✓ van-ref");
  } catch (e) { console.error("  ✗ van-ref:", e.message); }
}

let ok = 0, skip = 0, failn = 0;
for (const [base, prompt, widths, ref] of jobs) {
  const finalFull = `${OUT}/${base}.webp`;
  if (existsSync(finalFull)) { skip++; continue; }
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
console.log(`\nDone. generated=${ok} skipped=${skip} failed=${failn}`);
