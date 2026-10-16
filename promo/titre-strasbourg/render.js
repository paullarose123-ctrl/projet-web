const {chromium}=require('/opt/node-tools/node_modules/playwright');
const path=require('path'),fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('file://'+path.resolve('titre.html'));
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
  fs.mkdirSync('frames',{recursive:true});
  const FPS=30,DUR=7.2,n=Math.round(FPS*DUR);
  for(let i=0;i<n;i++){
    await p.evaluate(t=>setT(t),i/FPS);
    await p.screenshot({path:`frames/f${String(i).padStart(4,'0')}.png`});
  }
  await b.close();
})();
