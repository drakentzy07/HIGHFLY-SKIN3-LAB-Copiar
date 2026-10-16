/**
 * HIGHFLY PR-3: REAL original Paladin weighted animation surfaces:
 * 22 original clips, 0.10 / 0.50 / 0.90 duration plus source rest.
 * No new skin, no modified source game; fail closed on any missing sample.
 */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{
 const url=process.env.HF_PR3_URL||'http://127.0.0.1:4945/paladin-pr3-motion/';
 const destination=process.env.HF_PR3_EXPORT||'/tmp/highfly-pr3-samples';
 fs.mkdirSync(destination,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1160,height:830},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__HIGHFLY_PR3__?.ready||window.__HIGHFLY_PR3__?.error,null,{timeout:120000});
  const meta=await page.evaluate(()=>window.__HIGHFLY_PR3__);
  if(!meta.ready||meta.error||meta.boneCount!==23||meta.meshCount!==17||meta.clips.length!==22)
    throw Error('PR3_NOT_REAL_CLAUDECRAFT_SOURCE '+JSON.stringify(meta)+' errors='+errors.join(';'));
  const topology=await page.evaluate(()=>window.__HF_PR3_TOPOLOGY__());
  const expected=22;
  if(Object.keys(topology).length!==expected)throw Error('PR3_EXPECT_BODY_ARMOR_22_SLOTS '+Object.keys(topology).join(','));
  const slots={
    Head:'M_Head',Chest:'M_Torso',Back:'M_Torso',
    ArmL:'M_ArmL',ArmR:'M_ArmR',HandL:'M_HandL',HandR:'M_HandR',
    LegL:'M_LegL',LegR:'M_LegR',FootL:'M_FootL',FootR:'M_FootR'};
  for(const [slot,body] of Object.entries(slots)){
    if(!topology['Armor_paladin_'+slot]||!topology[body])throw Error('PR3_MISSING_PART_'+slot);
  }
  let nPositions=0;
  for(const [name,t] of Object.entries(topology)){
    if(t.positions.length%3||t.faces.length%3||t.positions.length<60||t.faces.length<60)
      throw Error('PR3_INVALID_TOPOLOGY_'+name);
    if(t.faces.some(x=>x>=t.positions.length/3||x<0))
      throw Error('PR3_FACE_INDEX_OUT_OF_RANGE_'+name);
    nPositions+=t.positions.length/3;
  }
  fs.writeFileSync(path.join(destination,'topology.json'),JSON.stringify(topology));
  fs.writeFileSync(path.join(destination,'metadata.json'),JSON.stringify({
    source:'world-of-claudecraft pinned 9b57e49',rigBones:23,paladinPrimitives:17,
    clipCount:22,clips:meta.clips,slots,sourceMeshRestCount:nPositions,
    samplingFractions:[.10,.50,.90],
    method:'native source mesh.applyBoneTransform(index) + mesh.matrixWorld, exact animation clips at three time fractions',
    limitations:'Three samples/clip do not prove no clipping between samples; unsigned surface distances are not penetration tests',
    userArtModified:false,originalGameModified:false
  },null,2));
  if(process.env.HF_PR3_SCREENSHOT)await page.screenshot({path:process.env.HF_PR3_SCREENSHOT,fullPage:true});
  const samplings=[{clip:'',fraction:0}];
  for(const clip of meta.clips)for(const fraction of [.10,.50,.90])samplings.push({clip:clip.name,fraction});
  const records=[];
  for(let i=0;i<samplings.length;i++){
    const {clip,fraction}=samplings[i];
    const v=await page.evaluate(({clip,fraction})=>window.__HF_PR3_SAMPLE__(clip,fraction),{clip,fraction});
    if(Object.keys(v.positions).length!==22)throw Error('PR3_INCOMPLETE_DYNAMIC_SAMPLE '+clip);
    for(const [part,p] of Object.entries(v.positions)){
      if(p.length!==topology[part].positions.length)throw Error('PR3_PART_VERTEX_COUNT_CHANGED '+part);
      if(p.some(x=>!Number.isFinite(x)))throw Error('PR3_NON_FINITE_ANIMATED_VERTEX '+part);
    }
    fs.writeFileSync(path.join(destination,'frame-'+String(i).padStart(3,'0')+'.json'),JSON.stringify(v));
    records.push({id:i,clip:v.clip,fraction,sourceFrames:meta.clips.length});
    if(i%8===0)console.log('HIGHFLY_PR3_GPU_FREE_CPU_SKINNING_FRAMES='+i+'/'+samplings.length);
  }
  if(errors.length)throw Error('PR3_PAGE_JS_ERRORS '+errors.join(';'));
  fs.writeFileSync(path.join(destination,'index.json'),JSON.stringify(records,null,2));
  if(records.length!==67)throw Error('PR3_EXPECT_67_SOURCE_FRAME_SNAPSHOTS '+records.length);
  console.log('HIGHFLY_PR3_ALL_22_NATIVE_CLIPS_3_SAMPLES_EACH_PLUS_REST_EXPORTED_GREEN frames='+records.length+
     ' sourceVerticesPerFrame='+nPositions);
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
