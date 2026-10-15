/** HIGHFLY R05.1: validate genuinely drawable native armor and bare head.
 * Green is structural/WebGL only, NOT artistic or physical Samsung approval.
 */
const {chromium}=require('playwright');
(async()=>{
 const url=process.env.HF_R052_URL||'http://127.0.0.1:4935/obsidian-r052/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  for(const cfg of [{width:1280,height:860},{width:915,height:412,isMobile:true,hasTouch:true}]){
   const ctx=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},isMobile:!!cfg.isMobile,
     hasTouch:!!cfg.hasTouch,deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__HIGHFLY_OBSIDIAN_R052__?.ready||window.__HIGHFLY_OBSIDIAN_R052__?.error,null,{timeout:110000});
   const state=await page.evaluate(()=>window.__HIGHFLY_OBSIDIAN_R052__);
   if(!state.ready||state.error||state.bones!==23||state.clips!==22||
      state.pieces.obsidian!==17||state.pieces.paladin!==17||state.effective.effectivelyVisibleArmor!==17)
      throw Error('R052_OBSIDIAN_NOT_RENDERING '+JSON.stringify(state)+' '+errors.join(' | '));
   const snapshot=async(type)=>{
     const data=await page.evaluate(()=>{
       const s=window.__HIGHFLY_OBSIDIAN_R052__,root=window.__HIGHFLY_R052_SOURCE__;
       let original=0,duplicate=0,visibleArmor=0,ancestorHides=0;
       const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
       root.traverse(o=>{
         if(o.isSkinnedMesh&&o.name.startsWith('Armor_paladin_')){
            original++;if(effective(o))visibleArmor++;else if(o.visible)ancestorHides++;
         }
         if(o.isMesh&&o.name.startsWith('HF91_OBSIDIAN_REALKNIGHT_'))duplicate++;
       });
       return {mode:s.mode,effective:s.effective,original,duplicate,visibleArmor,ancestorHides};
     });
     if(data.duplicate!==0||data.original!==17||(data.ancestorHides!==0&&type!=='bare'))
       throw Error('R052_DUPLICATES_OR_HIDDEN_PARENTS '+type+' '+JSON.stringify(data));
     if(type==='obsidian'&&data.visibleArmor!==17)throw Error('R052_NOT_DRAWN '+JSON.stringify(data));
     if(type==='bare'&&data.effective.visibleBareHead<1)throw Error('R052_HEADLESS_NAKED_WARRIOR '+JSON.stringify(data));
     if(type==='paladin'&&data.effective.effectivelyVisibleArmor!==17)throw Error('R052_PALADIN_HIDDEN '+JSON.stringify(data));
     if(process.env.HF_R052_SHOTS){
       const path=require('path').join(process.env.HF_R052_SHOTS,
         (cfg.isMobile?'android':'pc')+'-'+type+'.png');
       await page.screenshot({path,fullPage:true});
     }
     console.log('HIGHFLY_R052_TRUE_NATIVE_ARMOR_SCREEN_QA',JSON.stringify({mobile:!!cfg.isMobile,...data}));
   };
   await snapshot('obsidian');
   await page.locator('#bare').click();await snapshot('bare');
   await page.locator('#paladin').click();await snapshot('paladin');
   await page.locator('#obsidian').click();await snapshot('obsidian');
   await page.locator('#clip').selectOption('Idle');
   await page.locator('#relief').fill('140');
   await page.locator('#side').click();await page.locator('#head').click();
   await page.locator('#front').click();await page.locator('#full').click();
   if(await page.locator('#reliefVal').textContent()!=='140 %')throw Error('R052_RELIEF_SLIDER_BROKEN');
   if(errors.length)throw Error('R052_CONSOLE_ERRORS '+errors.join('\n'));
   console.log('HIGHFLY_R052_23_RIG_22_CLIPS_WARRIOR_HEAD_AND_NATIVE_ARMOR_GREEN',JSON.stringify({mobile:!!cfg.isMobile}));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
