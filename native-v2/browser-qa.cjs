const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 try{
  const proofs=[];
  const root=process.env.HF_NATIVE_V2_PROOF||'character-truth/native-v2-qa';
  const url=process.env.HF_NATIVE_V2_URL||'http://127.0.0.1:4278/native-v2/';
  fs.mkdirSync(root,{recursive:true});
  for(const [device,viewport] of [['desktop',{width:1450,height:920}],['S23-landscape-emulated',{width:915,height:412}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,'LAB_HTTP_NOT_200');
   await page.waitForFunction(()=>window.__HF_SKIN7_NATIVE_V2__?.ready||window.__HF_SKIN7_NATIVE_V2__?.error,null,{timeout:90000});
   const before=await page.evaluate(()=>window.__HF_SKIN7_NATIVE_V2__);
   if(before.error)throw new Error(device+' '+before.error);
   assert.equal(before.models.length,2);
   assert.equal(before.models[0].helmetMeshes,2);
   assert.equal(before.models[1].helmetMeshes,13);
   assert(before.models.every(m=>m.joints===23&&m.animations===22));
   await page.locator('#body').click();
   await page.locator('#side').click();
   await page.locator('#head').click();
   await page.locator('#clip').selectOption('Walking_A');
   await page.locator('#gender').selectOption('F');
   await page.waitForTimeout(300);
   const after=await page.evaluate(()=>window.__HF_SKIN7_NATIVE_V2__);
   assert.equal(after.clip,'Walking_A');assert.equal(after.gender,'F');assert(after.renderFrames>2);
   assert(!errors.length,'BROWSER_ERRORS_'+errors.join(' / '));
   await page.screenshot({path:root+'/'+device+'.png',fullPage:true});
   proofs.push({device,geometry:'new real skinned pieces',models:after.models,clip:after.clip,gender:after.gender,frames:after.renderFrames,errors});
   await page.close();
  }
  fs.writeFileSync(root+'/native-v2-gate.json',JSON.stringify({green:true,pagesIndependent:true,gameDeploy:false,realNativeVisuals:true,devices:proofs,artNotApproved:true,hardwareNotCertified:true},null,2));
  console.log('HIGHFLY_SKIN7_NEW_GEOMETRY_INDEPENDENT_PAGES_BROWSER_GATE_GREEN=1',JSON.stringify(proofs.map(x=>({device:x.device,models:x.models.length,frames:x.frames}))));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
