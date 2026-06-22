import sharp from "sharp";
import { existsSync } from "node:fs";
const groups = {
  "montage-A": ["hero-desktop","hero-mobile","spring-repair","opener-repair","opener-install","cable-repair","off-track","new-door","maintenance"],
  "montage-B": ["emergency","area-vancouver","area-burnaby","area-surrey","area-richmond","area-coquitlam","about","partner","contact","faq"],
};
const CELL=320, COLS=3, PAD=8;
for (const [name,list] of Object.entries(groups)){
  const imgs=[]; for(const b of list){ const f=`assets/img/${b}-480.webp`; if(existsSync(f)) imgs.push({b,f}); }
  const rows=Math.ceil(imgs.length/COLS);
  const W=COLS*CELL+(COLS+1)*PAD, H=rows*(CELL+24)+(rows+1)*PAD;
  const comps=[];
  for(let i=0;i<imgs.length;i++){
    const r=Math.floor(i/COLS), c=i%COLS;
    const x=PAD+c*(CELL+PAD), y=PAD+r*(CELL+24+PAD);
    const buf=await sharp(imgs[i].f).resize(CELL,CELL,{fit:"cover"}).toBuffer();
    comps.push({input:buf,left:x,top:y});
    const label=Buffer.from(`<svg width="${CELL}" height="24"><rect width="100%" height="100%" fill="#34204f"/><text x="6" y="17" font-family="sans-serif" font-size="14" fill="#e0a82e">${imgs[i].b}</text></svg>`);
    comps.push({input:label,left:x,top:y+CELL});
  }
  await sharp({create:{width:W,height:H,channels:3,background:"#ffffff"}}).composite(comps).png().toFile(`_build/${name}.png`);
  console.log("wrote",name,imgs.length,"images");
}
