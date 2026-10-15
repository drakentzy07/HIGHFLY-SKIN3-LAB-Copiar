/**
 * HIGHFLY R05.1 — fix real root cause of invisible Obsidian armor:
 * do NOT add replacement SkinnedMesh as another child of a hidden donor.
 * Move the deformed geometry+material onto the EXISTING native Knight mesh,
 * retaining its own transform, skin, 23 joint names, bind and ancestor chain.
 * This is a controlled repair of our own preview, not an art approval.
 */
import {equipObsidianR05} from '../obsidian-r05/forge-r05.mjs';
const SLOTS=['Head','Head1','Chest','Back','ArmL','ArmR','HandL','HandR','LegL','LegR','FootL','FootR'];
function rendered(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
export function equipObsidianR051(gltf){
 const trial=equipObsidianR05(gltf);
 const native=new Map(),temporary=new Map();
 gltf.scene.traverse(o=>{
  if(!o.isSkinnedMesh)return;
  if(o.name.startsWith('Armor_knight_'))native.set(o.name.slice('Armor_knight_'.length),o);
  if(o.name.startsWith('HF91_OBSIDIAN_REALKNIGHT_'))
    temporary.set(o.name.slice('HF91_OBSIDIAN_REALKNIGHT_'.length),o);
 });
 if(SLOTS.some(s=>!native.has(s)||!temporary.has(s))||native.size!==12||temporary.size!==12)
  throw Error('R051_NATIVE_12_PIECES_MISSING '+JSON.stringify({n:[...native.keys()],t:[...temporary.keys()]}));
 for(const slot of SLOTS){
  const host=native.get(slot),candidate=temporary.get(slot);
  if(host.skeleton.bones.length!==23||candidate.skeleton!==host.skeleton)
    throw Error('R051_JOINT_CHAIN_NOT_NATIVE '+slot);
  for(const attr of ['position','skinIndex','skinWeight']){
   const a=candidate.geometry.getAttribute(attr),b=host.geometry.getAttribute(attr);
   if(!a||!b||a.count!==b.count)throw Error('R051_ORIGINAL_SKIN_BUFFER_MISMATCH '+slot+' '+attr);
  }
  // Physically REPLACE geometry inside the SAME source SkinnedMesh.
  // No extra drawable 3D object, no guessed skin index/matrices.
  host.geometry=candidate.geometry;
  host.material=candidate.material;
  host.frustumCulled=false;
  host.visible=true;
  candidate.parent.remove(candidate);
 }
 const spare=[];
 gltf.scene.traverse(o=>{if(o.isMesh&&o.name.startsWith('HF91_OBSIDIAN_REALKNIGHT_'))spare.push(o.name)});
 if(spare.length)throw Error('R051_FLOATER_NODES_REMAIN '+JSON.stringify(spare));
 function validate(mode){
  const isNative=(o,name)=>o.isSkinnedMesh&&o.name.startsWith(name);
  const showing=[...native.values()].filter(rendered);
  const isPaladin=[];
  gltf.scene.traverse(o=>{if(isNative(o,'Armor_paladin_')&&rendered(o))isPaladin.push(o)});
  const visibleBody=[],seenHeads=[];
  gltf.scene.traverse(o=>{
   if(!o.isMesh||!rendered(o))return;
   if(/^M_/.test(o.name))visibleBody.push(o.name);
   if(o.name==='M_Head'||o.name.startsWith('M_Head_'))seenHeads.push(o.name);
  });
  if(mode==='obsidian'&&showing.length!==12)throw Error('R051_OBSIDIAN_EFFECTIVE_VISIBILITY_NOT_12 '+showing.length);
  if(mode==='paladin'&&isPaladin.length!==17)throw Error('R051_PALADIN_EFFECTIVE_VISIBILITY_NOT_17 '+isPaladin.length);
  if(mode==='bare'&&seenHeads.length===0)throw Error('R051_BARE_HEAD_HIDDEN');
  const expected=mode==='obsidian'?showing:mode==='paladin'?isPaladin:visibleBody;
  return {mode,nativeKnightEffective:showing.length,paladinEffective:isPaladin.length,
    visibleBodyMeshes:visibleBody.length,visibleBareHead:seenHeads.length,
    visibleMeshes:expected.map(x=>typeof x==='string'?x:x.name)};
 }
 function setRelief(value){trial.setRelief(value);}
 return {setRelief,validate,native,proof:{
  ...trial.proof,version:'R05.1_NATIVE_SLOT_GRAFT', nativeMeshesModifiedInPlace:12,
  newSceneArmorMeshes:0,sharedRig23NoNewSkins:true,
  wardrobeStates:['bare','paladin','obsidian'],clippingAndArtApproved:false,
  correction:'Deformed geometry grafted onto exact original Armor_knight_* skinned meshes; temporary clones removed'
 }};
}
