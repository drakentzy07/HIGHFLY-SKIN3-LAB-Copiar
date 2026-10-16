/* HIGHFLY PR4 — fail closed, actual native Paladin chest world-space sculpt proof.
 * PC and Android: 0% MUST be pixel-identical, 100% visually distinguishable;
 * 22 original clips × 3 poses verify weighted animated displacement stays finite.
 * No artistic or collision-free claims.
 */
const {chromium}=require('playwright'),{PNG}=require('pngjs');
const fs=require('fs'),path=require('path');
function decode(data){return PNG.sync.read(Buffer.from(data.split(',')[1],'base64'))}
function delta(a,b){
 if(a.width!==b.width||a.height!==b.height)throw Error('CANVAS_DIMENSIONS_NOT_IDENTICAL');
 let n=0,max=0,total=a.width*a.height;
 for(let i=0;i<a.data.length;i+=4){
  const d=Math.max(...[0,1,2].map(k=>Math.abs(a.data[i+k]-b.data[i+k])));
  max=Math.max(max,d);if(d>20)n++;
 }
 return {differentPixelCount:n,largestRGBDifference:max,totalPixels:total};
}
(async()=>{
 const url=process.env.HF_PR4_URL||'http://127.0.0.1:4954/paladin-pr4-chest/';
 const out=process.env.HF_PR4_REPORT||'/tmp/highfly-pr4-report';
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const report=[];
 try{
  for(const mobile of [false,true]){
   const ctx=await browser.newContext({viewport:mobile?{width:915,height:412}:{width:1350,height:900},
     isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__HIGHFLY_PALADIN_PR4__?.ready||window.__HIGHFLY_PALADIN_PR4__?.error,
      null,{timeout:100000});
   const state=await page.evaluate(()=>window.__HIGHFLY_PALADIN_PR4__);
   if(!state.ready||state.error||state.boneCount!==23||state.clipCount!==22||
    state.cloneGeometryCount!==17||state.pr4?.nativeChestMeshes<1||
    state.pr4.changedChestVertices<state.pr4.chestSourceVertices*.85||state.pr4.changedChestVertices>state.pr4.chestSourceVertices||
    state.pr4.intendedWorldDeltaMax<.003||state.pr4.intendedWorldDeltaMax>.048||
    state.pr4.worldRoundtripMaxError>3e-5||
    state.pr4.anyImportedArmorMeshes!==false||state.pr4.otherNativeArmorPartsChanged!==false)
     throw Error('PR4_REAL_SOURCE_GEOMETRY_GATE_RED '+JSON.stringify(state));
   await page.locator('#identity').click();await page.locator('#front').click();
   await page.waitForTimeout(250);
   const same=await page.evaluate(()=>[
       document.querySelector('#left canvas').toDataURL('image/png'),
       document.querySelector('#right canvas').toDataURL('image/png')
   ]);
   const baseline=delta(decode(same[0]),decode(same[1]));
   if(baseline.differentPixelCount!==0||baseline.largestRGBDifference!==0)
      throw Error('PR4_0_STRENGTH_MUST_BE_PIXEL_PERFECT '+JSON.stringify(baseline));
   await page.locator('#controlled').click();
   await page.waitForTimeout(300);
   const visually=await page.evaluate(()=>[
       document.querySelector('#left canvas').toDataURL('image/png'),
       document.querySelector('#right canvas').toDataURL('image/png')
   ]);
   const changed=delta(decode(visually[0]),decode(visually[1]));
   if(changed.differentPixelCount<35)
      throw Error('PR4_CHEST_GEOMETRY_NOT_VISIBLY_MODIFIED '+JSON.stringify(changed));
   await page.screenshot({path:path.join(out,mobile?'android-chest-pr4.png':'pc-chest-pr4.png'),fullPage:true});
   await page.locator('#side').click();
   await page.waitForTimeout(150);
   await page.screenshot({path:path.join(out,mobile?'android-profile-pr4.png':'pc-profile-pr4.png'),fullPage:true});
   const motion=await page.evaluate(()=>{
     const root=window.__HF_PR4_SCENE__,state=window.__HIGHFLY_PALADIN_PR4__,A=root.A,B=root.B;
     const clips=A.gltf.animations;
     const orig=A.armors.filter(o=>o.name.startsWith('Armor_paladin_Chest'));
     const edit=B.armors.filter(o=>o.name.startsWith('Armor_paladin_Chest'));
     const list=[];
     const names=new Set(orig.map(x=>x.name));
     if(names.size!==orig.length||edit.length!==orig.length)throw Error('CHEST_MATCHING_FAIL');
     const space=(mesh,i)=>{
       const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),i);
       mesh.applyBoneTransform(i,v);return v.applyMatrix4(mesh.matrixWorld);
     };
     // Three is module-scoped, not global. Use objects' constructors for vectors.
     const vectorCtor=orig[0].position.constructor;
     const point=(mesh,i)=>{
       const v=new vectorCtor().fromBufferAttribute(mesh.geometry.getAttribute('position'),i);
       mesh.applyBoneTransform(i,v);return v.applyMatrix4(mesh.matrixWorld);
     };
     const restA=A.gltf.scene,restB=B.gltf.scene;
     let max=0,highestClip='',checked=0;
     // First establish that both independent rigs render IDENTICAL poses with
     // zero deformation, not just at the original rest. This identifies a rig
     // test-sync problem vs genuine shape amplification.
     for(const strength of [0,1]){
      window.__HF_PR4_SET_STRENGTH__(strength);
      for(const clip of clips){
      let peak=0;
      for(const fraction of [.1,.5,.9]){
       A.mixer.stopAllAction();B.mixer.stopAllAction();
       A.mixer.clipAction(clip).reset().play();
       const cloneClip=B.gltf.animations.find(c=>c.name===clip.name);
       if(!cloneClip)throw Error('CLONE_CLIP_MISSING '+clip.name);
       B.mixer.clipAction(cloneClip).reset().play();
       A.mixer.setTime(clip.duration*fraction);B.mixer.setTime(clip.duration*fraction);
       restA.updateMatrixWorld(true);restB.updateMatrixWorld(true);
       for(const a of orig){a.skeleton.update();const b=edit.find(m=>m.name===a.name);b.skeleton.update();}
       for(const a of orig){
        const b=edit.find(m=>m.name===a.name);
        for(let i=0;i<a.geometry.getAttribute('position').count;i++){
         const v=point(a,i),w=point(b,i),difference=v.distanceTo(w);
         if(!Number.isFinite(difference))throw Error('PR4_NONFINITE_SKIN_DEFORMATION');
         max=Math.max(max,difference);peak=Math.max(peak,difference);checked++;
        }
       }
       if(strength===0 && peak>0.0001)
         throw Error('PR4_SOURCE_VS_CLONE_ANIMATED_BASELINE_NOT_IDENTICAL '+JSON.stringify({clip:clip.name,peak,source:state.pr4}));
       if(strength===1 && peak>.12)
         throw Error('PR4_SCULPT_INFLATES_ON_ANIMATION '+JSON.stringify({clip:clip.name,peak,source:state.pr4}));
      }
      if(strength===1)list.push({name:clip.name,maximumChestDifferenceInWorldUnits:peak});
      if(strength===1&&peak>=max)highestClip=clip.name;
     }
     }
     window.__HF_PR4_SET_STRENGTH__(1);
     A.mixer.stopAllAction();B.mixer.stopAllAction();
     // restore bind pose when test completes to avoid clipping accidental UI state
     return {clipsTested:list.length,sampledPoses:clips.length*3,verticesChecked:checked,
       maximumAnimatedWorldChestChange:max,clipWithLargestDifference:highestClip,clips:list};
   });
   if(motion.clipsTested!==22||motion.sampledPoses!==66||motion.verticesChecked<10000)
     throw Error('PR4_ALL_22_SOURCE_MOTIONS_NOT_VALIDATED '+JSON.stringify(motion));
   if(errors.length)throw Error('PR4_PAGE_ERRORS '+errors.join(';'));
   report.push({mobile,baseline,changed,motion,source:state.pr4,
     note:'Dynamic deformation length checked, collisions/penetrations NOT certified'});
   console.log('HIGHFLY_PR4_TRUE_REST_WORLD_INVERTIBLE_NATIVE_CHEST_VISUAL_PASS',
       JSON.stringify({mobile,baseline,changed,motion:{clips:motion.clipsTested,poses:motion.sampledPoses,
         checked:motion.verticesChecked,worldMax:motion.maximumAnimatedWorldChestChange}}));
   await ctx.close();
  }
  fs.writeFileSync(path.join(out,'HIGHFLY_PR4_CONTROLLED_CHEST_QA.json'),JSON.stringify(report,null,2));
  console.log('HIGHFLY_PR4_23_BONES_22_CLIPS_NATIVE_CHEST_GEOMETRY_PASS_NO_COLLISION_CLAIMS=1');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
