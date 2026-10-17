const opentype=require('opentype.js');const fs=require('fs');
const font=opentype.loadSync('caprasimo.ttf');
function layout(text,size,baseline,spacing=0,line=0){
  const gl=font.stringToGlyphs(text);const sc=size/font.unitsPerEm;
  let x=0;const items=[];
  gl.forEach((g,i)=>{
    items.push({ch:text[i],g,x});
    let adv=g.advanceWidth*sc+spacing;
    if(i<gl.length-1)adv+=font.getKerningValue(g,gl[i+1])*sc;
    x+=adv;
  });
  const total=x-spacing;const x0=960-total/2;
  let w=0;const res=[];
  items.forEach(it=>{
    if(it.ch===' '){w++;return;}
    const p=it.g.getPath(x0+it.x,baseline,size);const bb=p.getBoundingBox();
    res.push({d:p.toPathData(2),bb:[bb.x1,bb.y1,bb.x2,bb.y2],line,word:w,ch:it.ch});
  });
  return res;
}
const out={
  title:[...layout('Une visite',230,415,0,0),...layout('à Strasbourg',230,650,0,1)],
  sub:layout('\u201cMusée zoologique\u201d',90,835,6,2)
};
fs.writeFileSync('glyphs.json',JSON.stringify(out));
console.log(out.title.length,out.sub.length);
