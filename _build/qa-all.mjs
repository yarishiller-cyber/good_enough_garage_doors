import puppeteer from "puppeteer";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { extname } from "node:path";

const MIME = { ".html":"text/html",".css":"text/css",".js":"text/javascript",".webp":"image/webp",".avif":"image/avif",".svg":"image/svg+xml",".woff2":"font/woff2",".json":"application/json",".png":"image/png",".xml":"application/xml",".php":"text/html" };
const root = process.cwd();
const srv = createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";let f=root+p;if(existsSync(f)&&statSync(f).isDirectory())f+="/index.html";if(!existsSync(f)){r.writeHead(404);r.end("404");return;}r.writeHead(200,{"Content-Type":MIME[extname(f)]||"application/octet-stream"});r.end(readFileSync(f));});
await new Promise(r=>srv.listen(8095,r));

const pages = [
  "/index.html","/services.html","/garage-door-spring-repair.html","/garage-door-opener-repair.html",
  "/garage-door-opener-installation.html","/garage-door-cable-repair.html","/garage-door-off-track-repair.html",
  "/new-garage-door-installation.html","/garage-door-maintenance.html","/emergency-garage-door-repair.html",
  "/service-areas/vancouver.html","/service-areas/burnaby.html","/service-areas/surrey.html",
  "/service-areas/richmond.html","/service-areas/coquitlam.html","/about.html","/faq.html","/contact.html",
  "/become-a-partner.html","/thank-you.html","/privacy-policy.html","/terms-of-service.html","/404.html",
];

const b = await puppeteer.launch({ args:["--no-sandbox","--disable-setuid-sandbox"] });
const report = [];
for (const url of pages) {
  const name = url.replace(/^\//,"").replace(/\//g,"_").replace(".html","");
  const page = await b.newPage();
  const errors = [];
  page.on("console", m => { if (m.type()==="error") errors.push(m.text().slice(0,120)); });
  page.on("pageerror", e => errors.push("JS: "+e.message.slice(0,120)));
  page.on("requestfailed", r => { const u=r.url(); if(!u.includes("cdn.jsdelivr")) errors.push("REQFAIL: "+u.split("/").pop()); });
  await page.setViewport({ width:1280, height:900 });
  await page.goto("http://localhost:8095"+url, { waitUntil:"networkidle2", timeout:30000 }).catch(e=>errors.push("NAV: "+e.message.slice(0,60)));
  // scroll to trigger lazy images
  await page.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));} window.scrollTo(0,0); });
  await new Promise(r=>setTimeout(r,500));
  const broken = await page.evaluate(()=>[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc.split("/").pop()||i.src));
  const stats = await page.evaluate(()=>({
    h1: document.querySelectorAll("h1").length,
    imgsNoAlt: [...document.images].filter(i=>!i.hasAttribute("alt")).length,
    details: document.querySelectorAll("details").length,
    forms: document.querySelectorAll("form").length,
    stickyCta: !!document.querySelector(".sticky-cta"),
    tel: document.querySelectorAll('a[href^="tel:"]').length,
    sms: document.querySelectorAll('a[href^="sms:"]').length,
    title: document.title.length,
  }));
  await page.screenshot({ path:`_build/qa-${name}.png`, fullPage:true });
  report.push({ url, name, errors, broken, ...stats });
  await page.close();
}
await b.close(); srv.close();
console.log(JSON.stringify(report,null,1));
