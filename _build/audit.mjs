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
await new Promise((r) => server.listen(8097, r));
const b = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });

// 1) Mobile nav open
let page = await b.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto("http://localhost:8097/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 600));
await page.click("#navToggle");
await new Promise((r) => setTimeout(r, 400));
const navOpen = await page.$eval("#siteHeader", (el) => el.classList.contains("is-open"));
const linksVisible = await page.$eval(".nav__links", (el) => getComputedStyle(el).display !== "none");
await page.screenshot({ path: "_build/shot-navopen.png" });
console.log("mobile nav: is-open=" + navOpen + " linksVisible=" + linksVisible);
await page.close();

// 2) Openers 98032 renders (expand details)
page = await b.newPage();
await page.setViewport({ width: 1100, height: 1000 });
await page.goto("http://localhost:8097/garage-door-opener-installation.html", { waitUntil: "networkidle2" });
await page.evaluate(() => { const d = document.querySelector("details.more-openers"); if (d) d.open = true; });
await new Promise((r) => setTimeout(r, 500));
const img98032 = await page.evaluate(() => {
  const im = [...document.images].find((i) => i.src.includes("98032"));
  return im ? { src: im.src.split("/").pop(), w: im.naturalWidth, h: im.naturalHeight } : null;
});
console.log("98032 image:", JSON.stringify(img98032));
const brokenImgs = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.split("/").pop()));
console.log("broken images on openers page:", JSON.stringify(brokenImgs));
await page.close();

// 3) No-JS: content still visible
page = await b.newPage();
await page.setJavaScriptEnabled(false);
await page.setViewport({ width: 1280, height: 900 });
await page.goto("http://localhost:8097/", { waitUntil: "networkidle2" });
const h1vis = await page.$eval("h1", (el) => { const s = getComputedStyle(el); return s.opacity !== "0" && s.visibility !== "hidden"; });
const cardsVis = await page.$$eval(".card", (els) => els.length && els.every((e) => getComputedStyle(e).opacity !== "0"));
await page.screenshot({ path: "_build/shot-nojs.png" });
console.log("no-JS: h1 visible=" + h1vis + " cards visible=" + cardsVis);
await page.close();

await b.close(); server.close(); console.log("done");
