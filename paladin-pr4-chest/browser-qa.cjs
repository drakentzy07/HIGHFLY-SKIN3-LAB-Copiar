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
   // Compare ORIGINAL vs CLONED at zero relief, then the SAME CLONE
   // at 0% vs 100% relief IN THE VERY SAME FRAME / skeleton transforms.
   // This prevents false 0.52 jumps from stale independent animation states.
   const motion=await page.evaluate(()=>{
     const {A,B}=window.__HF_PR4_SCENE__;
     const originals=A.armors.filter(o=>o.name.startsWith('Armor_paladin_Chest'));
     const clones=B.armors.filter(o=>o.name.startsWith('Armor_paladin_Chest'));
     const Vector3=originals[0].position.constructor;
     if(originals.length!==clones.length||!clones.length)throw Error('PR4_SOURCE_CHEST_PAIR_MISSING');
     const orig=new Map(originals.map(m=>[m.name,m]));
     const view=(mesh,i)=>{
       const point=new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),i);
       mesh.applyBoneTransform(i,point);
       return point.applyMatrix4(mesh.matrixWorld);
     };
     const list=[],sourceClips=A.gltf.animations;
     let n=0,max=0,identityMax=0,peakClip='',dataPoint=null;
     for(const clip of sourceClips){
       let clipMax=0;
       for(const fraction of [.1,.5,.9]){
         // Use BOTH actors' original clips with fixed absolute times.
         A.mixer.stopAllAction();B.mixer.stopAllAction();
         A.mixer.clipAction(clip).reset().play();
         const twin=B.gltf.animations.find(c=>c.name===clip.name);
         if(!twin)throw Error('PR4_NATIVE_CLIP_NOT_FOUND '+clip.name);
         B.mixer.clipAction(twin).reset().play();
         const when=fraction*clip.duration;
         A.mixer.setTime(when);B.mixer.setTime(when);
         A.gltf.scene.updateMatrixWorld(true);B.gltf.scene.updateMatrixWorld(true);
         for(const c of clones){c.skeleton.update();orig.get(c.name).skeleton.update();}
         window.__HF_PR4_SET_STRENGTH__(0);
         // Cache exact ORIGINAL geometry position ON THE SAME CLONE rig.
         const base=new Map();
         for(const c of clones){
           const a=orig.get(c.name);
           const vecs=[];
           for(let i=0;i<c.geometry.getAttribute('position').count;i++){
             const b0=view(c,i),a0=view(a,i),mismatch=b0.distanceTo(a0);
             identityMax=Math.max(identityMax,mismatch);
             if(mismatch>1e-4)throw Error('PR4_ZERO_STRENGTH_ANIMATED_BASELINE_DIVERGES '+JSON.stringify({clip:clip.name,fraction,mesh:c.name,vertex:i,mismatch}));
             vecs.push(b0.toArray());
           }
           base.set(c.name,vecs);
         }
         window.__HF_PR4_SET_STRENGTH__(1);
         // No skeleton changes or animation updates between the two reads.
         for(const c of clones){
           const b0=base.get(c.name);
           for(let i=0;i<b0.length;i++){
             const next=view(c,i),prev=new Vector3(...b0[i]);
             const moved=next.distanceTo(prev);
             if(!Number.isFinite(moved))throw Error('PR4_NONFINITE_SAME_RIG_MOVEMENT');
             if(moved>clipMax){clipMax=moved;peakClip=clip.name;
               dataPoint={clip:clip.name,fraction,mesh:c.name,index:i,
                 before:prev.toArray(),after:next.toArray(),
                 originalRaw:[...new Vector3().fromBufferAttribute(orig.get(c.name).geometry.getAttribute('position'),i).toArray()],
                 editedRaw:[...new Vector3().fromBufferAttribute(c.geometry.getAttribute('position'),i).toArray()],
                 boneWeights:[...Array(4)].map((_,k)=>c.geometry.getAttribute('skinWeight').getComponent(i,k)),
                 boneIndices:[...Array(4)].map((_,k)=>c.geometry.getAttribute('skinIndex').getComponent(i,k))};}
             max=Math.max(max,moved);n++;
           }
         }
         if(clipMax>.12)throw Error('PR4_ACTUAL_SAME_RIG_ANIMATED_GEOMETRY_EXCEEDS_SAFE_BOUND '+JSON.stringify({clip:clip.name,fraction,clipMax,point:dataPoint}));
       }
       list.push({name:clip.name,maximumActualWorldDelta:clipMax});
     }
     window.__HF_PR4_SET_STRENGTH__(1);
     A.mixer.stopAllAction();B.mixer.stopAllAction();
     return {clipsTested:list.length,sampledPoses:list.length*3,verticesChecked:n,
       baselineOriginalCloneMaxDifference:identityMax,
       maximumAnimatedWorldChestChange:max,clipWithLargestDifference:peakClip,
       maximumDifferenceVertex:dataPoint,clips:list};
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
