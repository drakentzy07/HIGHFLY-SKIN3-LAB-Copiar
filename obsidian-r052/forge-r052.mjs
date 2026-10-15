/**
 * HIGHFLY R05.2 — Obsidian directly from the 17 ACTUALLY RENDERED
 * original Paladin skinned primitives, without external geometry, clones, or
 * alternate Knight skin matrices. Reversible in-memory material/geometry swap.
 * ZERO edits to upstream source/game. All original 23 bones and 22 clips intact.
 */
import * as THREE from 'three';
const C={obsidian:new THREE.Color(0x151423),silver:new THREE.Color(0xb9c0cc),
         deep:new THREE.Color(0x080a12),purple:new THREE.Color(0x8436ff)};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const targets=['Head','Chest','Back','ArmL','ArmR','HandL','HandR','LegL','LegR','FootL','FootR'];
export function equipObsidianR052(gltf){
 if(gltf.animations?.length!==22)throw Error('R052_ORIGINAL_22_CLIPS_REQUIRED');
 const parts=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh&&o.name.startsWith('Armor_paladin_'))parts.push(o);});
 if(parts.length!==17||parts.some(o=>o.skeleton.bones.length!==23))
   throw Error('R052_EXPECT_17_REAL_PALADIN_SKINNED_PRIMITIVES '+parts.length);
 const unique=new Set(parts.map(o=>o.name.slice('Armor_paladin_'.length).split('_')[0]));
 if(targets.some(t=>![...unique].some(x=>x.startsWith(t))))throw Error('R052_MISSING_ARMOR_PARTS '+[...unique].join(','));
 const edits=parts.map(original=>{
  const slot=targets.find(t=>original.name.slice('Armor_paladin_'.length).startsWith(t));
  if(!slot)throw Error('R052_UNEXPECTED_PALADIN_SLOT '+original.name);
  const pristineGeometry=original.geometry,pristineMaterial=original.material;
  const modified=pristineGeometry.clone();
  const position=modified.getAttribute('position');
  const box=new THREE.Box3().setFromBufferAttribute(position);
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const before=Float32Array.from(position.array);
  const after=Float32Array.from(before);
  const colors=new Float32Array(position.count*3);
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
   const u=(x-center.x)/Math.max(size.x,1e-6),
         v=(y-center.y)/Math.max(size.y,1e-6),
         w=(z-center.z)/Math.max(size.z,1e-6);
   const front=smooth(.04,.46,w),top=smooth(-.12,.47,v),
         edge=Math.max(Math.abs(u),Math.abs(v));
   let X=x,Y=y,Z=z;
   if(slot==='Head'){
     // Carve a crown and raised closed metallic face plate from real helmet mesh.
     const crown=smooth(.09,.45,v),mask=front*Math.exp(-Math.pow(v/.24,2));
     X=center.x+(x-center.x)*(1+.11*crown);
     Y=y+size.y*.095*crown*(.60+.40*Math.abs(u));
     Z=z+size.z*(.065*mask+.020*front);
   }else if(slot==='Chest'){
     // Angular V-breastplate with wider upper half, tight waist.
     const bevel=front*Math.max(0,1-Math.abs(v-(.12-.54*Math.abs(u)))/.22);
     X=center.x+(x-center.x)*(1+.085*top-.025*(1-top));
     Z=z+size.z*(.075*bevel+.014*front);
   }else if(slot==='Back'){
     Z=center.z+(z-center.z)*(1+.042*top);
   }else if(slot.startsWith('Arm')){
     const flare=smooth(-.03,.43,v);
     X=center.x+(x-center.x)*(1+.105*flare);
     Y=y+size.y*.018*flare;
     Z=center.z+(z-center.z)*(1+.075*flare);
   }else if(slot.startsWith('Hand')){
     X=center.x+(x-center.x)*(1+.048*top);
     Z=center.z+(z-center.z)*(1+.042);
   }else if(slot.startsWith('Leg')){
     Z=center.z+(z-center.z)*(1+.085*Math.exp(-Math.pow((v-.06)/.23,2)));
   }else if(slot.startsWith('Foot')){
     Z=center.z+(z-center.z)*1.065;
   }
   after.set([X,Y,Z],3*i);
   const col=C.obsidian.clone();
   col.lerp(C.silver,.08+.52*smooth(.31,.51,edge));
   if(w<-.14)col.lerp(C.deep,.27);
   if(slot==='Head'&&front>.55&&Math.abs(v-.03)<.14)col.lerp(C.purple,.86);
   if(slot==='Chest'&&front>.58&&Math.abs(u)<.11&&Math.abs(v)<.20)col.lerp(C.purple,.88);
   if(slot.startsWith('Arm')&&front>.64&&v>.06&&v<.28)col.lerp(C.silver,.60);
   if(slot.startsWith('Leg')&&front>.62&&Math.abs(v-.06)<.13)col.lerp(C.purple,.49);
   colors.set([col.r,col.g,col.b],3*i);
  }
  modified.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,
   metalness:.78,roughness:.32,flatShading:true,side:THREE.DoubleSide});
  function strength(s){
   const f=Math.max(0,Math.min(1.5,Number(s)||0));
   for(let j=0;j<before.length;j++)position.array[j]=before[j]+(after[j]-before[j])*f;
   position.needsUpdate=true;modified.computeVertexNormals();modified.computeBoundingSphere();
  }
  strength(1);
  if(!modified.getAttribute('skinIndex')||!modified.getAttribute('skinWeight')||
     modified.getAttribute('skinWeight').count!==pristineGeometry.getAttribute('skinWeight').count)
   throw Error('R052_ORIGINAL_SKIN_WEIGHTS_NOT_RETAINED '+original.name);
  return {original,slot,pristineGeometry,pristineMaterial,modified,mat,strength,
     vertices:position.count,modifiedPositionCount:before.length};
 });
 let mode='bare';
 function setMode(next){
  if(!['bare','paladin','obsidian'].includes(next))throw Error('R052_INVALID_MODE');
  for(const item of edits){
   const skinBefore=item.original.skinIndex;
   if(next==='obsidian'){
    item.original.geometry=item.modified;
    item.original.material=item.mat;
   }else{
    item.original.geometry=item.pristineGeometry;
    item.original.material=item.pristineMaterial;
   }
   // Skin object / bind matrix / skeleton itself never replaced.
   if(item.original.skeleton.bones.length!==23)throw Error('R052_RIG_CORRUPTED');
  }
  mode=next;
 }
 function setRelief(s){for(const item of edits)item.strength(s);}
 function validate(expected){
  if(mode!==expected)throw Error('R052_MODE_SWITCH_NOT_CALLED '+mode+'/'+expected);
  let shown=0;
  const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  for(const e of edits){
   if(effective(e.original))shown++;
   if((expected==='obsidian')!==(e.original.geometry===e.modified))
     throw Error('R052_WRONG_MATERIAL_GEOMETRY_MODE '+e.original.name);
  }
  if(expected!=='bare'&&shown!==17)throw Error('R052_REAL_PALADIN_NODES_NOT_DRAWN '+shown);
  const bareHead=[];
  gltf.scene.traverse(o=>{if(o.isMesh&&effective(o)&&(o.name==='M_Head'||o.name.startsWith('M_Head_')))bareHead.push(o)});
  if(expected==='bare'&&!bareHead.length)throw Error('R052_BARE_HEAD_MISSING');
  return {mode,skinnedArmorMeshes:edits.length,effectivelyVisibleArmor:shown,visibleBareHead:bareHead.length,
    genuineNativeArmorModified:expected==='obsidian',noAddedArmature:true};
 }
 setMode('obsidian');
 return {setMode,setRelief,validate,proof:{schema:'highfly.skinlab.native-paladin-r052',
  authenticPaladinDonorMeshes:17,slots:targets.length,
  sourceWeightedVertices:edits.reduce((a,x)=>a+x.vertices,0),sourceRigBones:23,sourceClips:22,
  materialsReversible:true,originalWeightsAndSkeletonReused:true,
  newActorCreated:false,newFloatingArmorNodes:0,actualNewArmorGeometryFromAI:false,
  artisticFidelityApproved:false,physicalAndroidTested:false,
  method:'Direct original Paladin mesh geometry/material swap, no imported armor; no changed 23-bone skin'}}
}
