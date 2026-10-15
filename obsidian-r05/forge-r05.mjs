/** HIGHFLY R05: pure native Knight resculpt enhancement, NO new external meshes. 
 * Original 12 weighted donor meshes and original 23 joints/22 clips preserved.
 * Source: upstream SKIN9.1 native forge pinned in the independent studio site.
 */
import * as THREE from 'three';
import {forgeObsidianKnight91} from '../skin91-wip/repertoire/obsidian_knight_native_91.mjs';
const smooth=(a,b,x)=>{let t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const round=x=>Math.round(x*1e6)/1e6;
export function equipObsidianR05(gltf){
 const base=forgeObsidianKnight91(gltf);
 const nodes=[];gltf.scene.traverse(x=>{
  if(x.isSkinnedMesh&&x.name.startsWith('HF91_OBSIDIAN_REALKNIGHT_'))nodes.push(x);
 });
 if(nodes.length!==12)throw Error('R05_REQUIRES_12_ACTUAL_ORIGINAL_KNIGHT_REFORGES '+nodes.length);
 const edits=[];
 for(const mesh of nodes){
  const slot=mesh.name.slice('HF91_OBSIDIAN_REALKNIGHT_'.length);
  const p=mesh.geometry.getAttribute('position');
  const bbox=new THREE.Box3().setFromBufferAttribute(p);
  const center=bbox.getCenter(new THREE.Vector3()),d=bbox.getSize(new THREE.Vector3());
  const orig=Float32Array.from(p.array),target=new Float32Array(orig.length);
  const colors=mesh.geometry.getAttribute('color');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const u=(x-center.x)/Math.max(d.x,.00001),v=(y-center.y)/Math.max(d.y,.00001),w=(z-center.z)/Math.max(d.z,.00001);
   const upper=smooth(-.10,.48,v),face=smooth(.03,.46,w);
   let a=x,b=y,c=z;
   if(slot.startsWith('Head')){
     const brow=Math.exp(-Math.pow((v-.11)/.14,2))*face;
     const crown=smooth(.13,.48,v);
     a=center.x+(x-center.x)*(1+.060*crown+.034*brow);
     c=z+d.z*(.036*brow+.021*face*smooth(-.30,.12,v));
     if(slot==='Head1') b=y+d.y*.085*crown*(.4+1.1*Math.abs(u));
   }else if(slot==='Chest'){
     const facets=Math.max(0,1-Math.abs(v-(.18-.58*Math.abs(u)))/.17)*face;
     a=center.x+(x-center.x)*(1+.058*upper);
     c=z+d.z*(.082*facets+.023*face);
   }else if(slot.startsWith('Arm')){
     const plate=smooth(-.02,.45,v);
     a=center.x+(x-center.x)*(1+.105*plate);
     b=y+d.y*.020*plate;
     c=center.z+(z-center.z)*(1+.065*plate);
   }else if(slot.startsWith('Hand')){
     a=center.x+(x-center.x)*(1+.055*smooth(.02,.45,v));
   }else if(slot.startsWith('Leg')){
     c=center.z+(z-center.z)*(1+.08*Math.exp(-Math.pow((v-.15)/.22,2)));
   }else if(slot.startsWith('Foot')){
     c=center.z+(z-center.z)*1.045;
   }
   target.set([a,b,c],i*3);
   const metal=new THREE.Color(0x141621),edge=new THREE.Color(0xbcc2d1),glow=new THREE.Color(0x7b31eb);
   let t=Math.max(Math.abs(u),Math.abs(v));
   metal.lerp(edge,.12+.36*smooth(.28,.48,t));
   if(slot.startsWith('Head')&&face>.56&&Math.abs(v-.045)<.10)metal.lerp(glow,.85);
   if(slot==='Chest'&&face>.35&&Math.abs(u)<.18&&Math.abs(v)<.25)metal.lerp(glow,.76);
   if(slot.startsWith('Arm')&&face>.5&&Math.abs(v-.10)<.10)metal.lerp(edge,.48);
   colors.setXYZ(i,metal.r,metal.g,metal.b);
  }
  colors.needsUpdate=true;
  if(!mesh.geometry.getAttribute('skinIndex')||!mesh.geometry.getAttribute('skinWeight')||mesh.skeleton.bones.length!==23)
   throw Error('R05_NATIVE_WEIGHTS_OR_BONES_MISSING '+slot);
  edits.push({mesh,slot,orig,target,verts:p.count});
 }
 function setRelief(strength=1){
  const f=Math.max(0,Math.min(1.5,Number(strength)||0));
  for(const {mesh,orig,target} of edits){
   const positions=mesh.geometry.getAttribute('position');
   for(let k=0;k<orig.length;k++)positions.array[k]=orig[k]+(target[k]-orig[k])*f;
   positions.needsUpdate=true;mesh.geometry.computeVertexNormals();
   mesh.geometry.computeBoundingSphere();
  }
 }
 setRelief(1);
 const proof={schema:'highfly.skinfactory.native-obsidian-r05',basedOn:'Original SKIN9.1 resculpt of native Knight 12 parts',
   originalBones:23,clips:gltf.animations.length,nativeKnightWearables:edits.length,
   deformedVertices:edits.reduce((a,x)=>a+x.verts,0),
   originalMeshSkinReused:edits.every(({mesh})=>mesh.skeleton.bones.length===23&&mesh.geometry.getAttribute('skinWeight')),
   zeroFloatingWorldExtras:true,anyGeneratedExternalArmor:false,
   artisticApproval:false,verifiedOnPhysicalAndroid:false,
   limitation:'No generative AI sculpting or faithful reproduction of user supplied concept; original Knight topology constrained'};
 if(proof.clips!==22||!proof.originalMeshSkinReused)throw Error('R05_RIG_GATE_RED');
 return {setRelief,proof,meshes:edits.map(x=>x.mesh),baseProof:base.proof};
}
