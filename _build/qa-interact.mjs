import puppeteer from "puppeteer";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname } from "node:path";
const MIME={".html":"text/html",".css":"text/css",".js":"text/javascript",".webp":"image/webp",".avif":"image/avif",".svg":"image/svg+xml",".woff2":"font/woff2",".png":"image/png"};
const root=process.cwd();
const srv=createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";let f=root+p;if(existsSync(f)&&statSync(f).isDirectory())f+="/index.html";if(!existsSync(f)){r.writeHead(404);r.end();return;}r.writeHead(200,{"Content-Type":MIME[extname(f)]||"application/octet-stream"});r.end(readFileSync(f));});
await new Promise(r=>srv.listen(8094,r));
const b=await puppeteer.launch({args:["--no-sandbox"]});
const pg=await b.newPage(); await pg.setViewport({width:1280,height:900});

// FAQ accordion on faq page
await pg.goto("http://localhost:8094/faq.html",{waitUntil:"networkidle2"});
const faq1=await pg.$eval(".faq details",d=>d.open);
await pg.$eval(".faq details summary",s=>s.click());
const faq2=await pg.$eval(".faq details",d=>d.open);
console.log("FAQ accordion: closed="+!faq1+" opensOnClick="+faq2);

// footer price details
const price1=await pg.$eval("#priceReveal",d=>d.open);
await pg.$eval("#priceReveal summary",s=>s.click());
const price2=await pg.$eval("#priceReveal",d=>d.open);
const priceVisible=await pg.$eval("#pricePanel",p=>p.offsetHeight>0);
console.log("Footer price <details>: closed="+!price1+" opensOnClick="+price2+" panelVisible="+priceVisible);

// opener "view more" details
await pg.goto("http://localhost:8094/garage-door-opener-installation.html",{waitUntil:"networkidle2"});
const more1=await pg.$eval("details.more-openers",d=>d.open);
await pg.$eval("details.more-openers summary",s=>s.click());
await new Promise(r=>setTimeout(r,300));
const moreImgs=await pg.evaluate(()=>{const d=document.querySelector("details.more-openers");return d.querySelectorAll(".opener").length;});
console.log("Opener 'view more': closed="+!more1+" revealsExtra="+moreImgs+" openers");

// form: honeypot blocks + button disables
await pg.goto("http://localhost:8094/contact.html",{waitUntil:"networkidle2"});
const action=await pg.$eval("form",f=>f.getAttribute("action"));
const hp=await pg.$eval("form .hp",i=>i.offsetParent===null||getComputedStyle(i).position==="absolute");
const reqFields=await pg.$$eval("form [required]",els=>els.length);
console.log("Contact form: action="+action+" honeypotHidden="+hp+" requiredFields="+reqFields);

await b.close();srv.close();
