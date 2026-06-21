import puppeteer from "puppeteer";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname } from "node:path";

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".xml": "application/xml" };
const root = process.cwd();
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = root + p;
  if (existsSync(f) && statSync(f).isDirectory()) f += "/index.html";
  if (!existsSync(f)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8099, r));

const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const shots = [
  ["/", "home", 1280, 900, false],
  ["/", "home-mobile", 390, 844, true],
  ["/garage-door-spring-repair.html", "spring", 1280, 900, false],
  ["/garage-door-opener-installation.html", "openers-mobile", 390, 844, true],
  ["/service-areas/vancouver.html", "city", 1280, 900, false],
  ["/contact.html", "contact-mobile", 390, 844, true],
];
for (const [url, name, w, h, mobile] of shots) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: mobile, deviceScaleFactor: 1 });
  await page.goto("http://localhost:8099" + url, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `_build/shot-${name}.png`, fullPage: false });
  // also a full-page for home
  if (name === "home") await page.screenshot({ path: `_build/shot-home-full.png`, fullPage: true });
  console.log("shot", name);
  await page.close();
}
await browser.close();
server.close();
console.log("done");
