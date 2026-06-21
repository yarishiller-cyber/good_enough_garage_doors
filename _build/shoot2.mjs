import puppeteer from "puppeteer";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname } from "node:path";
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json" };
const root = process.cwd();
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  let f = root + p; if (existsSync(f) && statSync(f).isDirectory()) f += "/index.html";
  if (!existsSync(f)) { res.writeHead(404); res.end("x"); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8098, r));
const b = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });

async function shot(url, name, w, h, sel, clickSel) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto("http://localhost:8098" + url, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 700));
  if (clickSel) { await page.click(clickSel).catch(()=>{}); await new Promise((r)=>setTimeout(r,500)); }
  if (sel) {
    const el = await page.$(sel);
    if (el) { await el.scrollIntoView(); await new Promise((r)=>setTimeout(r,500)); await el.screenshot({ path: `_build/shot-${name}.png` }).catch(async()=>{await page.screenshot({path:`_build/shot-${name}.png`})}); }
    else await page.screenshot({ path: `_build/shot-${name}.png` });
  } else await page.screenshot({ path: `_build/shot-${name}.png` });
  console.log("shot", name); await page.close();
}
await shot("/garage-door-spring-repair.html", "tiers", 1280, 1000, "#pricing");
await shot("/garage-door-opener-installation.html", "openers", 1100, 1200, "#openers");
await shot("/", "pricetoggle", 1280, 900, ".price-reveal", "#priceToggle");
await shot("/", "reviews", 1280, 1000, "#reviews");
await shot("/service-areas/vancouver.html", "city-body", 1280, 1000, ".prose");
await b.close(); server.close(); console.log("done");
