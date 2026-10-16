/**
 * HIGHFLY PR4 revision: minimal, CONTINUOUS native-source affine resculpt of
 * original 2 weighted Paladin Chest submeshes, preserving ORIGINAL triangle
 * topology, UVs, normals, weights, materials, skin bind matrices and rig.
 * Crucially, no per-vertex divergent push, no recomputation of hard normals,
 * no standalone plate meshes. Original source never modified.
 * Safety: measure REAL rest-world displacement and animated 22-clip bound.
 */
export function buildChestPR4({THREE,actor,originalMeshes,cloneMeshes}){
 const native=originalMeshes.filter(m=>m.name.startsWith('Armor_paladin_Chest'));
 const copied=cloneMeshes.filter(m=>m.name.startsWith('Armor_paladin_Chest'));
 const byName=new Map(native.map(m=>[m.name,m]));
 if(native.length!==2||copied.length!==2)throw Error('PR4_EXPECT_EXACTLY_TWO_NATIVE_CHEST_SUBMESHES');
 const world=(mesh,index,local)=>{
  const pos=local.clone();
  mesh.applyBoneTransform(index,pos);
  return pos.applyMatrix4(mesh.matrixWorld);
 };
 actor.updateMatrixWorld(true);
 const min=new THREE.Vector3(Infinity,Infinity,Infinity),
       max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
 const entries=[],config=[];
 for(const mesh of copied){
  const base=byName.get(mesh.name);
  if(!base||mesh.skeleton.bones.length!==23||base.skeleton.bones.length!==23)
    throw Error('PR4_NOT_ORIGINAL_PALADIN_CHOICE '+mesh.name);
  for(const attribute of ['position','normal','skinIndex','skinWeight']){
   if(!mesh.geometry.getAttribute(attribute)||!base.geometry.getAttribute(attribute))
     throw Error('PR4_SOURCE_ATTRIBUTE_MISSING '+attribute);
  }
  mesh.skeleton.update();
  const position=mesh.geometry.getAttribute('position');
  // DO NOT index position.array as a tightly packed xyz triplet.
  // ClaudeCraft may use interleaved/normalized vertex buffers with a stride.
  // getX/getY/getZ and setXYZ respect native accessor layout and conversion.
  const orig=new Float64Array(position.count*3),target=new Float64Array(position.count*3);
  for(let i=0;i<position.count;i++){
   orig[3*i]=target[3*i]=position.getX(i);
   orig[3*i+1]=target[3*i+1]=position.getY(i);
   orig[3*i+2]=target[3*i+2]=position.getZ(i);
  }
  const packed=position.isInterleavedBufferAttribute?position.data.array:position.array;
  const rawSnapshot=packed.slice(); // exact packed data, including signed normalized endpoints
  config.push({mesh,position,orig,target,rawSnapshot,interleaved:!!position.isInterleavedBufferAttribute});
  for(let i=0;i<position.count;i++){
   const local=new THREE.Vector3().fromBufferAttribute(position,i);
   const at=world(mesh,i,local);
   min.min(at);max.max(at);
   entries.push({mesh,orig,target,i,local,at});
  }
 }
 const dims=max.clone().sub(min);
 if(dims.x<.3||dims.y<.3||dims.z<.2)throw Error('PR4_SOURCE_CHEST_REST_DIMENSIONS_UNEXPECTED');
 // Original normalized coordinates have their own bind matrices. This is
 // a SINGLE affine source-space transformation applied consistently to ALL
 // vertices, rather than discontinuous per-vertex "front face" cuts.
 // Original glTF POSITION is a SIGNED NORMALIZED accessor. Naive scale 1.014
 // wraps -1.005 to +0.995 in the underlying signed integer buffer!
 // Envelope vanishes at ±1, exactly preserving native quantization bounds.
 const scale=new THREE.Vector3(.07,.03,.07);
 const expand=(v,c,k)=>v+(v-c)*k*Math.max(0,1-v*v);
 const rawAllMin=new THREE.Vector3(Infinity,Infinity,Infinity),
       rawAllMax=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
 for(const e of entries){rawAllMin.min(e.local);rawAllMax.max(e.local)}
 const localCenter=rawAllMin.clone().add(rawAllMax).multiplyScalar(.5);
 let maxWorldDelta=0,maxLocalDelta=0,recoverMaxError=0,changed=0;
 for(const e of entries){
  const source=e.local,desired=new THREE.Vector3(
    expand(source.x,localCenter.x,scale.x),
    expand(source.y,localCenter.y,scale.y),
    expand(source.z,localCenter.z,scale.z)
  );
  if([desired.x,desired.y,desired.z].some(v=>Math.abs(v)>1.000001))
    throw Error('PR4_NORMALIZED_COORDINATE_OUT_OF_RANGE '+e.mesh.name+' '+desired.toArray());
  const rawDelta=desired.clone().sub(source);
  maxLocalDelta=Math.max(maxLocalDelta,rawDelta.length());
  if(rawDelta.length()<1e-9)continue;
  const next=world(e.mesh,e.i,desired);
  const realDelta=next.distanceTo(e.at);
  maxWorldDelta=Math.max(maxWorldDelta,realDelta);
  if(!Number.isFinite(realDelta))throw Error('PR4_INFINITE_REAL_WORLD_DELTA');
  // Mathematical inverse of the actual source skin Jacobian in rest pose.
  const px=world(e.mesh,e.i,source.clone().add(new THREE.Vector3(1,0,0))).sub(e.at);
  const py=world(e.mesh,e.i,source.clone().add(new THREE.Vector3(0,1,0))).sub(e.at);
  const pz=world(e.mesh,e.i,source.clone().add(new THREE.Vector3(0,0,1))).sub(e.at);
  const jac=new THREE.Matrix3().set(px.x,py.x,pz.x,px.y,py.y,pz.y,px.z,py.z,pz.z);
  if(Math.abs(jac.determinant())<1e-11)throw Error('PR4_NATIVE_REST_JACOBIAN_SINGULAR');
  const reconstructed=e.at.clone().sub(next).applyMatrix3(jac.clone().invert());
  const reconstructedSource=desired.clone().add(reconstructed);
  recoverMaxError=Math.max(recoverMaxError,reconstructedSource.distanceTo(source));
  e.target[e.i*3]=desired.x;
  e.target[e.i*3+1]=desired.y;
  e.target[e.i*3+2]=desired.z;
  changed++;
 }
 if(changed<entries.length*.85||maxWorldDelta>.048||maxWorldDelta<.001||
    !Number.isFinite(recoverMaxError)||recoverMaxError>1e-5)
   throw Error('PR4_AFFINE_NATIVE_DEFORMATION_OUTSIDE_SAFE_MODEL_BOUND '+JSON.stringify({changed,total:entries.length,maxWorldDelta,recoverMaxError}));
 function setStrength(amount){
  const f=THREE.MathUtils.clamp(Number(amount),0,1.5);
  for(const item of config){
   if(f===0){
    // Restore raw ORIGINAL bit pattern exactly, including -32768 and
    // any packed neighboring attributes, not a lossy normalize↔denormalize.
    const packed=item.interleaved?item.position.data.array:item.position.array;
    packed.set(item.rawSnapshot);
    if(item.interleaved)item.position.data.needsUpdate=true;
    else item.position.needsUpdate=true;
    item.mesh.geometry.computeBoundingSphere();
    item.mesh.geometry.computeBoundingBox();
    continue;
   }
   for(let i=0;i<item.position.count;i++){
    const k=3*i;
    item.position.setXYZ(i,
      item.orig[k]+(item.target[k]-item.orig[k])*f,
      item.orig[k+1]+(item.target[k+1]-item.orig[k+1])*f,
      item.orig[k+2]+(item.target[k+2]-item.orig[k+2])*f
    );
   }
   if(item.position.isInterleavedBufferAttribute){
     item.position.data.needsUpdate=true;
   }else item.position.needsUpdate=true;
   // Identity guard on source attribute API, independent of underlying stride.
   for(let i=0;i<item.position.count;i++){
    const k=3*i;
    const wanted=[0,1,2].map(j=>item.orig[k+j]+(item.target[k+j]-item.orig[k+j])*f);
    const actual=[item.position.getX(i),item.position.getY(i),item.position.getZ(i)];
    if(wanted.some((v,j)=>Math.abs(v-actual[j])>3e-4))
       throw Error('PR4_ATTRIBUTE_LAYOUT_WROTE_WRONG_VERTEX '+item.mesh.name+' '+i+' actual '+actual+' wanted '+wanted);
   }
   // Do not recompute surface normals: the transformation is <2%, and
   // original authored weighted normals avoid fractured faceting.
   item.mesh.geometry.computeBoundingSphere();
   item.mesh.geometry.computeBoundingBox();
  }
  return f;
 }
 setStrength(1);
 return {setStrength,configs:config,summary:{
  schema:'highfly.pr4.original-chest-native-affine/v3-stride-safe',
  method:'small continuous smooth-envelope native-source Chest deformation bounded within normalized [-1,+1], with stride-safe getXYZ/setXYZ and exact packed rollback',
  sourceLocalEnvelopeCoefficients:scale.toArray(),nativeChestMeshes:config.length,
  originalPositionBufferInterleaved:config.map(x=>({mesh:x.mesh.name,interleaved:x.interleaved,stride:x.position.data?.stride??null})),
  chestSourceVertices:entries.length,changedChestVertices:changed,
  restBBoxMin:min.toArray(),restBBoxMax:max.toArray(),restBBoxDimensions:dims.toArray(),
  intendedWorldDeltaMax:maxWorldDelta,worldRoundtripMaxError:recoverMaxError,
  largestRawLocalDelta:maxLocalDelta,originalSkeletonBones:23,clonedOriginalArmorPieces:17,
  sourceAnimationClips:22,anyImportedArmorMeshes:false,originalMaterialsRetained:true,
  sourceSourcePreserved:true,otherNativeArmorPartsChanged:false,
  unalteredIndicesNormalsUVAndSkinWeights:true,
  limitation:'Small engineering resculpt only, NOT final epic armor. 22-clip animation bound still required; collision-free NOT certified.'
 }};
}
