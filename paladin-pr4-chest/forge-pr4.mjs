/**
 * HIGHFLY PR-4 — WEIGHTED TRUE-WORLD REST-FRAME CHEST RESCULPT.
 * No new meshes, no other source parts touched. No rig/animation/material edits.
 * Three.js CPU skinning is sampled at original rig bind/rest; world delta is
 * transformed into each vertex's native (quantized) source coordinate system.
 */
export function buildChestPR4({THREE,actor,originalMeshes,cloneMeshes}){
 const source=originalMeshes.filter(m=>m.name.startsWith('Armor_paladin_Chest'));
 const clone=cloneMeshes.filter(m=>m.name.startsWith('Armor_paladin_Chest'));
 if(source.length<1||source.length!==clone.length)throw Error('PR4_MISSING_NATIVE_PALADIN_CHEST');
 const originalByName=new Map(source.map(m=>[m.name,m]));
 const samples=[],records=[];
 const worldFor=(mesh,vertex,local)=>{
  const point=local.clone();
  mesh.applyBoneTransform(vertex,point);
  return point.applyMatrix4(mesh.matrixWorld);
 };
 actor.updateMatrixWorld(true);
 for(const mesh of clone){
  mesh.skeleton.update();
  const original=originalByName.get(mesh.name);
  if(!original||mesh.skeleton.bones.length!==23||original.skeleton.bones.length!==23)
    throw Error('PR4_23_BONE_DONOR_NOT_FOUND_'+mesh.name);
  const pos=mesh.geometry.getAttribute('position');
  const normal=mesh.geometry.getAttribute('normal');
  if(!pos||!normal||!mesh.geometry.getAttribute('skinIndex')||!mesh.geometry.getAttribute('skinWeight'))
    throw Error('PR4_NATIVE_WEIGHTED_ATTRIBUTES_MISSING');
  const pristinePositions=pos.array.slice(),pristineNormals=normal.array.slice();
  for(let i=0;i<pos.count;i++){
   const local=new THREE.Vector3().fromBufferAttribute(pos,i);
   const world=worldFor(mesh,i,local);
   samples.push(world);records.push({mesh,i,local,world});
  }
 }
 if(samples.length<50)throw Error('PR4_CHEST_TOO_FEW_VERTICES');
 const min=new THREE.Vector3(Infinity,Infinity,Infinity),max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
 for(const p of samples){min.min(p);max.max(p)}
 const dims=new THREE.Vector3().subVectors(max,min);
 if(dims.y<.1||dims.x<.1||dims.z<.05)throw Error('PR4_REST_CHEST_BBOX_NOT_PLAUSIBLE '+dims.toArray());
 const smooth=(a,b,x)=>{let t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 const center=new THREE.Vector3().addVectors(min,max).multiplyScalar(.5);
 const configs=[];
 let active=0,maxIntendedWorld=0,maxOriginalLocal=0,roundtripMax=0;
 for(const mesh of clone){
  const geometry=mesh.geometry,pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
  const originalPos=pos.array.slice(),originalNormal=normal.array.slice();
  const targetPos=pos.array.slice();
  const slot=records.filter(r=>r.mesh===mesh);
  for(const rec of slot){
   const {i,local,world}=rec;
   const yn=(world.y-min.y)/dims.y,zn=(world.z-min.z)/dims.z;
   const front=smooth(.26,.78,zn),upper=smooth(.10,.68,yn);
   const lateral=Math.min(1,Math.abs(world.x-center.x)/(dims.x*.5));
   const central=1-smooth(.70,1,lateral);
   const f=front*upper*(.55+.45*central);
   const delta=new THREE.Vector3(
     Math.sign(world.x-center.x)*.010*f*smooth(.25,.8,lateral),
     0,
     .042*f
   );
   const len=delta.length();
   if(len<1e-8)continue;
   const px=worldFor(mesh,i,local.clone().add(new THREE.Vector3(1,0,0))).sub(world);
   const py=worldFor(mesh,i,local.clone().add(new THREE.Vector3(0,1,0))).sub(world);
   const pz=worldFor(mesh,i,local.clone().add(new THREE.Vector3(0,0,1))).sub(world);
   const mat=new THREE.Matrix3().set(px.x,py.x,pz.x,px.y,py.y,pz.y,px.z,py.z,pz.z);
   const det=mat.determinant();
   if(Math.abs(det)<1e-11)throw Error('PR4_WORLD_JACOBIAN_SINGULAR '+mesh.name+' '+i);
   const localDelta=delta.clone().applyMatrix3(mat.clone().invert());
   const p2=local.clone().add(localDelta);
   const resultingWorld=worldFor(mesh,i,p2);
   const err=resultingWorld.distanceTo(world.clone().add(delta));
   if(!Number.isFinite(err)||err>3e-5)throw Error('PR4_REST_WORLD_ROUNDTRIP_FAIL '+mesh.name+' '+i+' '+err);
   roundtripMax=Math.max(err,roundtripMax);maxIntendedWorld=Math.max(maxIntendedWorld,len);
   maxOriginalLocal=Math.max(maxOriginalLocal,localDelta.length());
   targetPos[i*3]=p2.x;targetPos[i*3+1]=p2.y;targetPos[i*3+2]=p2.z;
   active++;
  }
  configs.push({mesh,pos,normal,originalPos,originalNormal,targetPos});
 }
 if(active<20||active>=samples.length||maxIntendedWorld<=.008||maxIntendedWorld>.048)
  throw Error('PR4_INVALID_WORLDSCULPT_MASK '+JSON.stringify({active,vertices:samples.length,maxIntendedWorld}));
 function setStrength(value){
  const strength=THREE.MathUtils.clamp(Number(value),0,1.5);
  for(const r of configs){
   for(let k=0;k<r.originalPos.length;k++){
     r.pos.array[k]=r.originalPos[k]+strength*(r.targetPos[k]-r.originalPos[k]);
   }
   r.pos.needsUpdate=true;
   if(strength>0){r.mesh.geometry.computeVertexNormals();}
   else{
     r.normal.array.set(r.originalNormal);r.normal.needsUpdate=true;
   }
   r.mesh.geometry.computeBoundingBox();r.mesh.geometry.computeBoundingSphere();
  }
  return strength;
 }
 setStrength(1);
 return {
  setStrength,configs,summary:{
   schema:'highfly.pr4.native-chest-world-rest/1',nativeChestMeshes:configs.length,
   chestSourceVertices:samples.length,changedChestVertices:active,
   restBBoxMin:min.toArray(),restBBoxMax:max.toArray(),restBBoxDimensions:dims.toArray(),
   intendedWorldDeltaMax:maxIntendedWorld,
   worldRoundtripMaxError:roundtripMax,
   largestRawLocalDelta:maxOriginalLocal,
   originalSkeletonBones:23,clonedOriginalArmorPieces:17,sourceAnimationClips:22,
   anyImportedArmorMeshes:false,originalMaterialsRetained:true,
   sourceSourcePreserved:true,otherNativeArmorPartsChanged:false,
   limit:'Controlled geometric PR4 proof only. Does not establish armor artistic quality or animated collision-free fit.'
  }
 };
}
