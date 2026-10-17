const {chromium}=require('/opt/node-tools/node_modules/playwright');
const path=require('path'),fs=require('fs');
(async()=>{
  const {H}=JSON.parse(fs.readFileSync('credits.json'));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1920,height:H}});
  await p.goto('file://'+path.resolve('credits.html'));
  await p.screenshot({path:'generique_fin.png',omitBackground:true,clip:{x:0,y:0,width:1920,height:H}});
  await b.close();
})();
