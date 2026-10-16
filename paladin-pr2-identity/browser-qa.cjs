/* PR2: real browser + pixel test of unchanged Paladin 1:1 geometry donor.
 * True verdict requires same geometry attributes and real pixel agreement.
 * This NEVER creates a user-facing new armor or changes the main game.
 */
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const fs=require('fs');
const path=require('path');
(async()=>{
 const url=process.env.HF_PR2_URL||'http://127.0.0.1:4943/paladin-pr2-identity/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const results=[];
 try{
  for(const size of [{width:1320,height:850,mobile:false},{width:915,height:412,mobile:true}]){
   const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},
      isMobile:size.mobile,hasTouch:size.mobile,deviceScaleFactor:1});
   const page=await ctx.newPage();let errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__HIGHFLY_PALADIN_PR2__?.ready||window.__HIGHFLY_PALADIN_PR2__?.error,
      null,{timeout:100000});
   const s=await page.evaluate(()=>window.__HIGHFLY_PALADIN_PR2__);
   if(!s.ready||s.error||s.boneCount!==23||s.clipCount!==22||s.cloneGeometryCount!==17||
      s.cloneAttributeArrayMismatch!==0||s.cloneNodeTransformMismatch!==0||
      s.visibility.left!==17||s.visibility.right!==17)
      throw Error('PR2_SOURCE_INTEGRITY_RED '+JSON.stringify(s));
   await page.locator('#front').click();
   await page.waitForTimeout(350);
   // Capture BOTH WebGL canvases during a single synchronous JS turn.
   // Separate Playwright locator screenshots scroll the mobile viewport
   // between left and right and can cause temporary mobile layout/raster variance.
   const pair=await page.evaluate(()=>{
     const left=document.querySelector('#left canvas'),right=document.querySelector('#right canvas');
     return [left.toDataURL('image/png'),right.toDataURL('image/png')];
   });
   const a=PNG.sync.read(Buffer.from(pair[0].split(',')[1],'base64'));
   const b=PNG.sync.read(Buffer.from(pair[1].split(',')[1],'base64'));
   if(a.width!==b.width||a.height!==b.height)throw Error('PR2_SCREENSHOT_SIZES_DIFFER');
   let touched=0,total=a.width*a.height,max=0,sum=0,mean=0;
   for(let i=0;i<a.data.length;i+=4){
     const difference=Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),
        Math.abs(a.data[i+2]-b.data[i+2]));
     max=Math.max(max,difference);sum+=difference;
     if(difference>20)touched++;
   }
   const fraction=touched/total;mean=sum/total;
   if(fraction>.005||mean>1.0)
     throw Error('PR2_TRUE_PALADIN_COPY_RENDER_MISMATCH '+JSON.stringify({fraction,mean,max,total}));
   if(process.env.HF_PR2_SHOTS){
     fs.mkdirSync(process.env.HF_PR2_SHOTS,{recursive:true});
     await page.screenshot({path:path.join(process.env.HF_PR2_SHOTS,(size.mobile?'android':'pc')+'-paladin-1to1.png'),fullPage:true});
   }
   await page.locator('#clip').selectOption('Idle');
   await page.locator('#animate').check();
   await page.waitForTimeout(700);
   await page.locator('#animate').uncheck();
   await page.locator('#side').click();
   await page.locator('#back').click();
   await page.locator('#head').click();
   await page.locator('#full').click();
   if(errors.length)throw Error('PR2_BROWSER_ERRORS '+errors.join('\n'));
   const summary={mobile:size.mobile,originalPieces:17,clonedPieces:17,
      sourceRigBones:23,clips:22,comparedPixels:total,
      fractionPixelsDifferentAbove20:fraction,meanPixelDifference:mean,maxPixelDifference:max,
      ZERO_CHANGE_RENDER_MATCH_GREEN:true};
   results.push(summary);
   console.log('HIGHFLY_PR2_TRUE_NATIVE_17_PART_PALADIN_PIXEL_IDENTITY_GREEN '+JSON.stringify(summary));
   await ctx.close();
  }
  if(process.env.HF_PR2_SHOTS)
   fs.writeFileSync(path.join(process.env.HF_PR2_SHOTS,'PR2_QA.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
