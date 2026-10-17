const opentype=require('opentype.js');const fs=require('fs');
const font=opentype.loadSync('caprasimo.ttf');
const W=1920;
const YEL={fill:'#ffd51a'}, CRE={fill:'#fff3c8'};
const blocks=[
 [ ['Projet Master 1 de',56,CRE], ['Médiation et de',100,YEL], ['Communication scientifique',100,YEL] ],
 [ ['Remerciements au',56,CRE], ['Musée zoologique',116,YEL], ['de Strasbourg',116,YEL], ['pour son accueil',56,CRE] ],
 [ ['Remerciements à mes camarades',56,CRE], ['Marc GOERGES',116,YEL], ['et',56,CRE], ['Norah POMAREDE',116,YEL] ],
 [ ['Réalisation, montage et script',56,CRE], ['Paul LAROSE',136,YEL] ]
];
const BLOCK_GAP=230, PAD_TOP=60, PAD_BOTTOM=60;
function linePath(text,size,baseline){
  const gl=font.stringToGlyphs(text), sc=size/font.unitsPerEm;
  let x=0;const items=[];
  gl.forEach((g,i)=>{items.push({g,x,ch:text[i]});let adv=g.advanceWidth*sc;if(i<gl.length-1)adv+=font.getKerningValue(g,gl[i+1])*sc;x+=adv;});
  const x0=W/2-x/2; let d='';
  items.forEach(it=>{ if(it.ch===' ')return; d+=it.g.getPath(x0+it.x,baseline,size).toPathData(2)+' '; });
  return {d,width:x};
}
let y=PAD_TOP; const lines=[]; const blockInfo=[];
blocks.forEach((b,bi)=>{
  const top=y;
  b.forEach(([t,s,col],li)=>{
    if(li>0){ y+= (b[li-1][1]<s?20:12); }
    const base=y+s*0.92;
    const lp=linePath(t,s,base);
    lines.push({t,s,col,d:lp.d,w:lp.width,base});
    y=base+s*0.28;
  });
  blockInfo.push({top,bottom:y});
  y+=BLOCK_GAP;
});
const H=Math.ceil((y-BLOCK_GAP+PAD_BOTTOM)/2)*2;
const last=blockInfo[blockInfo.length-1];
const cLast=(last.top+last.bottom)/2;
console.log(JSON.stringify({H,cLast,maxW:Math.max(...lines.map(l=>l.w)),blocks:blockInfo}));
fs.writeFileSync('credits.json',JSON.stringify({H,cLast,blocks:blockInfo}));
// svg
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
lines.forEach(l=>{
  const k=l.s/230, dm=Math.max(3.2,13*k), sw=Math.max(1.6,3.2*k), K=Math.max(4,Math.round(12*Math.min(1,l.s/110)));
  for(let i=K;i>=1;i--){const o=dm*i/K;svg+=`<path d="${l.d}" fill="#e8202c" stroke="#e8202c" stroke-width="${sw}" stroke-linejoin="round" transform="translate(${o.toFixed(2)} ${o.toFixed(2)})"/>`;}
  svg+=`<path d="${l.d}" fill="${l.col.fill}" stroke="#111" stroke-width="${sw}" stroke-linejoin="round"/>`;
});
svg+='</svg>';
fs.writeFileSync('credits.svg',svg);
fs.writeFileSync('credits.html',`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`);
