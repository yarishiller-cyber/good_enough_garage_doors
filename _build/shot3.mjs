import puppeteer from "puppeteer";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname } from "node:path";
const MIME={".html":"text/html",".css":"text/css",".js":"text/javascript",".webp":"image/webp",".avif":"image/avif",".svg":"image/svg+xml",".woff2":"font/woff2",".png":"image/png"};
const root=process.cwd();
const srv=createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";let f=root+p;if(existsSync(f)&&statSync(f).isDirectory())f+="/index.html";if(!existsSync(f)){r.writeHead(404);r.end();return;}r.writeHead(200,{"Content-Type":MIME[extname(f)]||"application/octet-stream"});r.end(readFileSync(f));});
await new Promise(r=>srv.listen(8093,r));
const b=await puppeteer.launch({args:["--no-sandbox"]});
async function shot(url,name,w,h,sel){const pg=await b.newPage();await pg.setViewport({width:w,height:h});await pg.goto("http://localhost:8093"+url,{waitUntil:"networkidle2"});await new Promise(r=>setTimeout(r,600));if(sel){const el=await pg.$(sel);if(el){await el.scrollIntoView();await new Promise(r=>setTimeout(r,400));await el.screenshot({path:`_build/shot-${name}.png`});}}else await pg.screenshot({path:`_build/shot-${name}.png`});console.log("shot",name);await pg.close();}
await shot("/","howitworks",1280,900,"#how");
await shot("/privacy-policy.html","legal-hero",1280,520,null);
await shot("/","topbar-mobile",390,260,null);
await b.close();srv.close();
