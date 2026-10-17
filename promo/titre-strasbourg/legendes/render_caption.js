const {chromium}=require('/opt/node-tools/node_modules/playwright');
const path=require('path'),fs=require('fs');
const name=process.argv[2]||'caption1', FPS=30;
(async()=>{
  const meta=JSON.parse(fs.readFileSync(name+'.json'));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:meta.W,height:meta.H}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.resolve(name+'.html'));
  await p.evaluate(()=>document.fonts.ready);
  const total=await p.evaluate(()=>TOTAL), n=Math.round(total*FPS);
  const dir='frames_'+name;fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);
  for(let i=0;i<n;i++){
    await p.evaluate(t=>setT(t),i/FPS);
    await p.screenshot({path:`${dir}/f${String(i).padStart(4,'0')}.png`,omitBackground:true});
  }
  console.log('frames',n,'total',total);
  await b.close();
})();
