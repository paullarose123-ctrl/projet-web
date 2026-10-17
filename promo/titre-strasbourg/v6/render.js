const {chromium}=require('/opt/node-tools/node_modules/playwright');
const path=require('path'),fs=require('fs');
const FPS=30;
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.resolve('titre.html'));
  const only=process.argv[2]?process.argv[2].split(',').map(Number):null;
  const total=await p.evaluate(()=>TOTAL);
  const n=Math.round(FPS*total);
  fs.mkdirSync('frames',{recursive:true});
  for(let i=0;i<n;i++){
    if(only&&!only.includes(i))continue;
    await p.evaluate(t=>setT(t),i/FPS);
    await p.screenshot({path:`frames/f${String(i).padStart(4,'0')}.png`});
  }
  await b.close();
})();
