"""Add Taiwanese Mandarin narration without re-encoding existing promo visuals.
Dependencies: python -m pip install --target .promo-tools edge-tts imageio-ffmpeg
Generate speech (network): python scripts/promo_narration.py --generate
Mix cached speech offline: python scripts/promo_narration.py
"""
from pathlib import Path
import sys, asyncio, subprocess, wave, json, shutil, hashlib, re, array, math
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.promo-tools'))
import imageio_ffmpeg
OUT=ROOT/'artifacts'; CACHE=OUT/'narration-source'; CACHE.mkdir(exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe()
VOICE='zh-TW-YunJheNeural'
SCENES=[
 (0,4,'資產分散在不同市場，配置不易一眼看清。'),
 (4,9,'台股、美股、日股，放進同一張配置圖。'),
 (9,15,'對照目標配置，整股試算，規劃下一步。'),
 (15,19,'資料留在本機。備份，由你掌控。'),
 (19,24,'持倉羅盤。看懂配置，讓每一步更有方向。'),
]
def run(args):
 p=subprocess.run([FF,'-hide_banner','-y',*map(str,args)],capture_output=True,text=True,encoding='utf-8',errors='replace')
 if p.returncode: raise RuntimeError(p.stderr)
 return p
async def generate():
 import edge_tts
 for i,(_,_,text) in enumerate(SCENES):
  target=CACHE/f'{i+1:02d}.mp3'
  if target.exists() and target.stat().st_size>1000: continue
  await edge_tts.Communicate(text,VOICE,rate='-2%',pitch='-2Hz',volume='+0%').save(str(target))
  print(f'Voice scene {i+1} generated',flush=True)
  await asyncio.sleep(2)
def timestamp(t,sep=','):
 ms=round(t*1000); return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}{sep}{ms%1000:03d}'
def main():
 if '--generate' in sys.argv: asyncio.run(generate())
 # Preserve exact original video bitstream and a replayable silent deliverable.
 silent=OUT/'promo-silent.mp4'
 if not silent.exists(): run(['-i',OUT/'promo.mp4','-map','0:v:0','-an','-c:v','copy',silent])
 timing=[]; segments=[]
 for i,(start,end,text) in enumerate(SCENES):
  raw=CACHE/f'{i+1:02d}-raw.wav'
  run(['-i',CACHE/f'{i+1:02d}.mp3','-af','silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-48dB,areverse','-ar','48000','-ac','1','-c:a','pcm_s16le',raw])
  with wave.open(str(raw),'rb') as f: duration=f.getnframes()/f.getframerate()
  delay=start+(.12 if i==0 else .3); capacity=end-.12-delay
  tempo=max(1,duration/capacity)
  if tempo>1.3: raise RuntimeError(f'Scene {i+1} requires excessive tempo {tempo:.2f}; regenerate faster speech')
  fitted=CACHE/f'{i+1:02d}-fitted.wav'
  run(['-i',raw,'-af',f'atempo={tempo:.8f},afade=t=in:d=0.012,afade=t=out:st={max(0,duration/tempo-.035):.6f}:d=0.035','-ar','48000','-ac','1','-c:a','pcm_s16le',fitted])
  with wave.open(str(fitted),'rb') as f: actual=f.getnframes()/f.getframerate()
  timing.append({'scene':i+1,'text':text,'start_seconds':delay,'end_seconds':round(delay+actual,5),'raw_seconds':duration,'tempo':tempo})
  segments.append(fitted)
  print(f'Scene {i+1}: {delay:.2f}-{delay+actual:.2f}s; raw {duration:.2f}s; tempo {tempo:.3f}',flush=True)
 args=[]; filters=[]
 for i,(path,item) in enumerate(zip(segments,timing)):
  args+=['-i',path]; filters.append(f'[{i}:a]adelay={round(item["start_seconds"]*1000)}:all=1[a{i}]')
 filters.append(''.join(f'[a{i}]' for i in range(5))+'amix=inputs=5:normalize=0,apad,atrim=duration=24,loudnorm=I=-17:TP=-2:LRA=7,aresample=48000[out]')
 wav=OUT/'promo-narration.wav'
 run([*args,'-filter_complex',';'.join(filters),'-map','[out]','-ar','48000','-ac','1','-c:a','pcm_s16le',wav])
 final=OUT/'promo-with-voice.mp4'
 run(['-i',silent,'-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-ar','48000','-t','24','-movflags','+faststart',final])
 # Check the encoded AAC, not just the WAV, for level and peak overshoot.
 decode=run(['-i',final,'-f','null','-'])
 level=run(['-i',final,'-vn','-af','ebur128=peak=true','-f','null','-'])
 (OUT/'promo-voice-validation.txt').write_text(decode.stderr+'\n\nENCODED AAC LEVELS\n'+level.stderr,encoding='utf-8')
 with wave.open(str(wav),'rb') as f:
  samples=array.array('h',f.readframes(f.getnframes())); audio_duration=f.getnframes()/f.getframerate()
 peak=max(abs(s) for s in samples)
 clipped=sum(abs(s)>=32767 for s in samples)
 # The decoded video framemd5 must be byte-identical after muxing.
 original_md5=run(['-i',silent,'-map','0:v:0','-f','framemd5','-']).stdout
 final_md5=run(['-i',final,'-map','0:v:0','-f','framemd5','-']).stdout
 if original_md5!=final_md5: raise RuntimeError('Visual frame identity check failed')
 for destination in [OUT/'promo.mp4',ROOT/'public/promo/promo.mp4',ROOT/'dist/promo/promo.mp4']:
  destination.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(final,destination)
 srt=[]; vtt=['WEBVTT','']
 for i,item in enumerate(timing):
  a,b=item['start_seconds'],item['end_seconds']; text=item['text']
  srt.extend([str(i+1),f'{timestamp(a)} --> {timestamp(b)}',text,''])
  vtt.extend([f'{timestamp(a,".")} --> {timestamp(b,".")}',text,''])
 (OUT/'promo-narration.srt').write_text('\n'.join(srt),encoding='utf-8-sig')
 (OUT/'promo-narration.vtt').write_text('\n'.join(vtt),encoding='utf-8')
 shutil.copy2(OUT/'promo-narration.vtt',ROOT/'public/promo/narration.zh-TW.vtt')
 shutil.copy2(OUT/'promo-narration.vtt',ROOT/'dist/promo/narration.zh-TW.vtt')
 report={'engine':'Microsoft Edge online neural TTS via edge-tts 7.3.1','voice':VOICE,'locale':'zh-TW','rate':'-2%','pitch':'-2Hz','bgm':False,'codec':'AAC LC','sample_rate_hz':48000,'channels':1,'target_loudness_lufs':-17,'target_true_peak_dbtp':-2,'duration_seconds':audio_duration,'wav_sample_peak_dbfs':20*math.log10(peak/32768),'wav_clipped_samples':clipped,'video_frames_identical_to_silent':True,'timing':timing,'sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
 loudness=re.search(r'Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS',level.stderr)
 truepeak=re.search(r'True peak:\s+Peak:\s+(-?[\d.]+) dBFS',level.stderr)
 if loudness: report['encoded_integrated_lufs']=float(loudness.group(1))
 if truepeak: report['encoded_true_peak_dbfs']=float(truepeak.group(1))
 (OUT/'promo-narration-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 manifest_path=OUT/'promo-manifest.json'; manifest=json.loads(manifest_path.read_text(encoding='utf-8')); manifest['audio']=True; manifest['audio_details']=report
 manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__': main()
