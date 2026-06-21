import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const css = readFileSync("assets/fonts/google.css", "utf8");
// Split into @font-face blocks, each preceded by a /* subset */ comment
const blocks = css.split("@font-face").slice(1);
const want = []; // {family, weight, url, file}
let prevComment = "";
// re-scan with comments: iterate over the raw css capturing comment then block
const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*{([^}]+)}/g;
let m, idx = {};
while ((m = re.exec(css))) {
  const subset = m[1];
  if (subset !== "latin") continue;
  const body = m[2];
  const fam = (body.match(/font-family:\s*'([^']+)'/) || [])[1];
  const wght = (body.match(/font-weight:\s*([0-9 ]+)/) || [])[1].trim();
  const url = (body.match(/url\(([^)]+)\)/) || [])[1];
  const famSlug = fam.toLowerCase().replace(/\s+/g, "-");
  const wKey = wght.replace(/\s+/g, "-");
  const file = `${famSlug}-${wKey}.woff2`;
  if (idx[file]) continue;
  idx[file] = 1;
  want.push({ fam, wght, url, file });
}
console.log("latin faces:", want.length);
let out = "/* self-hosted fonts (latin) — generated from Google Fonts woff2, see _build/fonts.mjs */\n";
for (const w of want) {
  execSync(`curl -s -m 30 -o "assets/fonts/${w.file}" "${w.url}"`);
  const bytes = readFileSync(`assets/fonts/${w.file}`).length;
  console.log(`  ${w.file}  ${w.fam} ${w.wght}  ${(bytes/1024).toFixed(0)}KB`);
  out += `@font-face{font-family:'${w.fam}';font-style:normal;font-weight:${w.wght};font-display:swap;src:url('/assets/fonts/${w.file}') format('woff2');}\n`;
}
writeFileSync("assets/fonts/fonts.css", out);
console.log("wrote assets/fonts/fonts.css");
