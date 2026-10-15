/* HIGHFLY R05 browser regression gate: source-native fit, toggles and 22 clips.
   Green means interaction and structure work, NOT premium art / physical Samsung.
*/
const {chromium}=require('playwright');
(async()=>{
 const url=process.env.HF_R05_URL||'http://127.0.0.1:4933/obsidian-r05/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const pages=[];
 try{
  for(const cfg of [{width:1320,height:900},{width:915,height:412,isMobile:true,hasTouch:true}]){
   const context=await browser.newContext({viewport:cfg,deviceScaleFactor:1,ignoreHTTPSErrors:false});
   const page=await context.newPage();pages.push(page);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__HIGHFLY_OBSIDIAN_R05__?.ready||window.__HIGHFLY_OBSIDIAN_R05__?.error,{timeout:120000});
   const s=await page.evaluate(()=>window.__HIGHFLY_OBSIDIAN_R05__);
   if(!s.ready||s.error||s.bones!==23||s.clips!==22||s.pieces.obsidian!==12||s.pieces.paladin!==17){
      throw Error('NATIVE_R05_SCENE_LOAD_OR_23_BONE_22_CLIP_GATE '+JSON.stringify(s)+'\n'+errors.join('\n'));
   }
   await page.locator('#bare').click();
   if(await page.locator('#bare').getAttribute('aria-pressed')!=='true')throw Error('BARE_MODE_RED');
   await page.locator('#paladin').click();
   if(await page.locator('#paladin').getAttribute('aria-pressed')!=='true')throw Error('PALADIN_MODE_RED');
   await page.locator('#obsidian').click();
   if(await page.locator('#obsidian').getAttribute('aria-pressed')!=='true')throw Error('OBSIDIAN_MODE_RED');
   await page.locator('#clip').selectOption({label:'Idle'}).catch(()=>null);
   await page.locator('#side').click();
   await page.locator('#head').click();
   await page.locator('#full').click();
   await page.locator('#front').click();
   await page.locator('#relief').fill('140');
   if(await page.locator('#reliefVal').textContent()!=='140 %')throw Error('RELIEF_INTERACTION_RED');
   if(errors.length)throw Error('BROWSER_PAGE_ERRORS '+errors.join('\n'));
   if(process.env.HF_R05_SCREENSHOT_DIR){
     const p=require('path').join(process.env.HF_R05_SCREENSHOT_DIR,cfg.isMobile?'android-landscape.png':'desktop.png');
     await page.screenshot({path:p,fullPage:true});
   }
   console.log('HIGHFLY_R05_ONE_WARRIOR_BARE_PALADIN_OBSIDIAN_NATIVE_WEBGL_GREEN',JSON.stringify({mobile:!!cfg.isMobile,bones:s.bones,clips:s.clips,counts:s.pieces,frames:s.frames}));
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
