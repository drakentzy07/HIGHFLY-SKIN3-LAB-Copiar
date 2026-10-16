#!/usr/bin/env python3
"""HIGHFLY PR3: audited unsigned clearance candidates over all 22 source clips.
Using world-space REAL CPU-skinned triangle surfaces, not local normalized bboxes.
Do NOT label low distance as penetration; only exact signed/collision tests can.
"""
import sys,json,csv
from pathlib import Path
import numpy as np
import trimesh
from trimesh.proximity import closest_point
root=Path(sys.argv[1]);output=Path(sys.argv[2])
metadata=json.loads((root/'metadata.json').read_text())
topology=json.loads((root/'topology.json').read_text())
records=json.loads((root/'index.json').read_text())
assert metadata['rigBones']==23 and metadata['paladinPrimitives']==17 and metadata['clipCount']==22
assert len(records)==67 and records[0]['clip']=='__SOURCE_REST__'
matches=metadata['slots']
expected_slots={'Head','Chest','Back','ArmL','ArmR','HandL','HandR','LegL','LegR','FootL','FootR'}
assert set(matches)==expected_slots
def vertices(key, positions):
 p=np.asarray(positions[key],dtype=np.float64).reshape(-1,3)
 assert np.isfinite(p).all() and len(p)==len(topology[key]['positions'])//3
 return p
def mesh(key,positions):
 v=vertices(key,positions)
 f=np.asarray(topology[key]['faces'],dtype=np.int64).reshape(-1,3)
 assert f.max()<len(v) and f.min()>=0
 return trimesh.Trimesh(vertices=v,faces=f,process=False,validate=False)
def stats(vals):
 x=np.asarray(vals)
 assert len(x)>0 and np.isfinite(x).all() and x.min()>=0
 return {k:float(z) for k,z in (
  ('minimum',x.min()),('p05',np.percentile(x,5)),
  ('median',np.median(x)),('p95',np.percentile(x,95)),
  ('maximum',x.max())
 )}
def nearest(armor,body):
 _,distance,_=closest_point(body,armor.vertices)
 return np.asarray(distance,dtype=np.float64)
report={'schema':'highfly.pr3.original-paladin-animated-surface-distance/v1',
 'mode':'AUDIT ONLY: NO SKIN CREATED, NO ORIGINAL MODEL MODIFIED',
 'source':'ClaudeCraft original Warrior GLB 9b57e49 fixed',
 'samplesPerClip':3,'clipsExpected':22,'clipCount':22,'frameCount':67,
 'nativeBones':23,'paladinSubmeshes':17,
 'units':'native source model units, not centimetres',
 'sampleFractions':[.10,.50,.90],
 'method':'CPU skin each Paladin and corresponding body surface at 10%, 50%, 90% of each native animation; nearest armor vertex to body TRIANGLES (unsigned)',
 'warning':'A low/zero unsigned distance is a proximity/collision CANDIDATE, NOT certified mesh penetration. Non-watertight gear, layered armor, nearby body zones and motion between samples make exhaustive collision guarantees impossible here.',
 'riskThresholdsNativeModelUnits':{'contactCandidate':0.01,'nearContact':0.025},
 'samples':[],'perSlot':{},'clips':[],'passedPipeline':False,
 'geometryMayBeResculptedWithoutNewChecks':False,'artApproved':False}
restPositions=json.loads((root/'frame-000.json').read_text())['positions']
rest={};restHead=vertices('M_Head',restPositions)
for slot,bodyKey in matches.items():
 aKey='Armor_paladin_'+slot
 distances=nearest(mesh(aKey,restPositions),mesh(bodyKey,restPositions))
 rest[slot]=stats(distances)
 report['perSlot'][slot]={'rest':rest[slot],'worstNearProximity':None,
                         'worstMedian':float('inf'),'sampledContactCandidates':0,
                         'sampledArmorVertices':0}
motionClips=set()
for entry in records:
 frame=json.loads((root/('frame-'+str(entry['id']).zfill(3)+'.json')).read_text())
 assert frame['clip']==entry['clip'] and frame['fraction']==entry['fraction']
 positions=frame['positions']
 head=vertices('M_Head',positions)
 # Distinguish actual morph/bone movement from identical pose sampling.
 maxMotion=float(np.linalg.norm(head-restHead,axis=1).max())
 if entry['clip']!='__SOURCE_REST__' and maxMotion>0.0005:
  motionClips.add(entry['clip'])
 frameResult={'clip':entry['clip'],'fraction':entry['fraction'],
              'headMaxDisplacementFromSourceRest':maxMotion,'slots':{}}
 bodyCache={}
 for slot,bodyKey in matches.items():
  aKey='Armor_paladin_'+slot
  if bodyKey not in bodyCache: bodyCache[bodyKey]=mesh(bodyKey,positions)
  a=mesh(aKey,positions)
  dist=nearest(a,bodyCache[bodyKey])
  st=stats(dist)
  st['sourceVertexSamples']=len(dist)
  st['contactCandidatesLt0p01']=int((dist<0.01).sum())
  st['nearCandidatesLt0p025']=int((dist<0.025).sum())
  frameResult['slots'][slot]=st
  pr=report['perSlot'][slot]
  pr['sampledContactCandidates']+=st['contactCandidatesLt0p01']
  pr['sampledArmorVertices']+=len(dist)
  if pr['worstNearProximity'] is None or st['minimum']<pr['worstNearProximity']['minimum']:
   pr['worstNearProximity']={'minimum':st['minimum'],'clip':entry['clip'],
                             'fraction':entry['fraction']}
  if st['median']<pr['worstMedian']:pr['worstMedian']=st['median']
 report['samples'].append(frameResult)
 if entry['id']%8==0:
  print('HIGHFLY_PR3_ANALYSED_FRAMES',entry['id']+1,'/67',flush=True)
assert len(report['samples'])==67
assert len(motionClips)>=10,'too few genuinely moved animations: '+str(len(motionClips))
report['clipsWithHeadBoneVertexMotionAbove0p0005']=sorted(motionClips)
report['sourceClipsWithMeasurableHeadMotion']=len(motionClips)
for c in metadata['clips']:
 cframes=[x for x in report['samples'] if x['clip']==c['name']]
 assert len(cframes)==3
 ranked=sorted(
  [(s, min(x['slots'][s]['minimum'] for x in cframes)) for s in matches],
  key=lambda item:item[1])
 report['clips'].append({'name':c['name'],'duration':c['duration'],
                          'sampleTimes':[float(c['duration']*f) for f in metadata['samplingFractions']],
                          'closestArmorBodyPairsAtSampledFrames':[
                            {'slot':s,'smallestUnsignedDistance':n} for s,n in ranked[:5]],
                          'overallLowestUnsignedDistance':ranked[0][1]})
report['passedPipeline']=True
output.mkdir(parents=True,exist_ok=True)
(output/'HIGHFLY_PR3_CLIP_SURFACE_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
with (output/'HIGHFLY_PR3_WORST_DISTANCE_PER_ANIMATION.csv').open('w',newline='') as fh:
 w=csv.writer(fh);w.writerow(['clip','duration_seconds','nearest_slot','nearest_unsigned_distance_native_units','is_penetration_proven'])
 for c in report['clips']:
  x=c['closestArmorBodyPairsAtSampledFrames'][0]
  w.writerow([c['name'],c['duration'],x['slot'],x['smallestUnsignedDistance'],'NO'])
with (output/'HIGHFLY_PR3_SUMMARY_ES.md').open('w') as fh:
 fh.write('# HIGHFLY · PR-3 · Auditoría de movimiento Paladin original\n\n')
 fh.write('**Prueba técnica sobre ClaudeCraft original: 23 huesos, 22 clips, 17 submallas de Paladin.**\n\n')
 fh.write('Muestreo: reposo + 10 %, 50 %, 90 % de cada animación = **67 posturas**.\n\n')
 fh.write('Medición: distancia **sin signo** desde cada vértice de armadura a la superficie triangular del cuerpo. No demuestra penetración ni garantiza ausencia de clipping entre fotogramas.\n\n')
 fh.write('## Candidatos de contacto cercanos al cuerpo\n\n')
 fh.write('| Zona | Mínimo medido | Clip de menor distancia | Mediana en reposo |\n|---|---:|---|---:|\n')
 for slot,stat in report['perSlot'].items():
  q=stat['worstNearProximity']
  fh.write(f"| {slot} | {q['minimum']:.5f} | {q['clip']} @ {q['fraction']:.0%} | {stat['rest']['median']:.5f} |\n")
 fh.write('\n## Interpretación\n\n')
 fh.write('Un valor cercano a cero indica superficies muy próximas (posible rozamiento o intersección), no confirmación de colisión. Se requieren comprobaciones de normales/superficies y más fotogramas al transformar cualquier pieza.\n')
 fh.write(f"\nClips con movimiento de cabeza medible frente a reposo: **{len(motionClips)}/22**.\n")
 fh.write('\n**Próxima decisión:** diseñar casco y coraza únicamente después de validar la reproducción 1:1 (PR-2) y revisar zonas críticas de PR-3, sin tocar rig, pesos ni matrices nativas.\n')
print('HIGHFLY_PR3_ORIGINAL_22_CLIPS_67_POSES_DISTANCE_AUDIT_GREEN slots='+str(len(matches))+
      ' movementClips='+str(len(motionClips)),flush=True)
for slot,x in report['perSlot'].items():
 print(slot,'worst proximity',x['worstNearProximity'],flush=True)
