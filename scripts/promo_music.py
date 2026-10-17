"""Original instrumental score and dialogue-first mix; no songs, samples or network.
Python standard library synthesizes every oscillator. Uses existing imageio-ffmpeg.
Run after promo_narration.py: python scripts/promo_music.py
"""
from pathlib import Path
import sys, math, array, wave, subprocess, json, shutil, re, hashlib
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT/'.promo-tools'))
import imageio_ffmpeg
OUT=ROOT/'artifacts'; FF=imageio_ffmpeg.get_ffmpeg_exe(); SR=48000; N=SR*24
def run(args):
 p=subprocess.run([FF,'-hide_banner','-y',*map(str,args)],capture_output=True,text=True,encoding='utf-8',errors='replace')
 if p.returncode: raise RuntimeError(p.stderr)
 return p
def smooth(x):
 x=max(0,min(1,x)); return x*x*(3-2*x)
def hz(midi): return 440*2**((midi-69)/12)
def write_wav(path,channels,data):
 with wave.open(str(path),'wb') as f: f.setparams((channels,2,SR,0,'NONE','not compressed')); f.writeframes(data.tobytes())
def samples(path):
 with wave.open(str(path),'rb') as f: return f.getnchannels(),array.array('h',f.readframes(f.getnframes()))
def measure(path):
 p=run(['-i',path,'-vn','-af','ebur128=peak=true','-f','null','-'])
 loud=re.search(r'Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS',p.stderr)
 peak=re.search(r'True peak:\s+Peak:\s+(-?[\d.]+) dBFS',p.stderr)
 return {'integrated_lufs':float(loud.group(1)),'true_peak_dbfs':float(peak.group(1))},p.stderr
def synthesize():
 left=array.array('f',[0])*N; right=array.array('f',[0])*N
 chords=[('Dm9',[38,50,57,60,64]),('Bbmaj7',[34,50,53,57,58]),('Fadd9',[41,53,57,60,67]),('Csus2',[36,48,55,60,62])]
 for j,(name,notes) in enumerate(chords):
  start=j*6; stop=min(24,start+6.7)
  for k,note in enumerate(notes):
   f=hz(note); pan=.18+.16*k; gl=math.sqrt(1-pan); gr=math.sqrt(pan)
   for i in range(int(start*SR),int(stop*SR)):
    t=i/SR; dt=t-start
    env=smooth(dt/.75)*smooth((stop-t)/.9)
    # All sustained partials remain well below the speech presence region.
    value=.037*env*(math.sin(2*math.pi*f*dt+k*.4)+.15*math.sin(2*math.pi*f*2*dt))*(.88+.12*math.sin(2*math.pi*.13*t+k))
    left[i]+=value*gl; right[i]+=value*gr
  # Sparse, clear two-note arpeggio: two plucks per bar, not an EDM lead.
  for b,offset in enumerate([.75,3.75]):
   onset=start+offset; f=hz(notes[2]+12)
   for i in range(int(onset*SR),min(N,int((onset+1.8)*SR))):
    dt=i/SR-onset; env=smooth(dt/.009)*math.exp(-3.2*dt)
    v=.027*env*(math.sin(2*math.pi*f*dt)+.13*math.sin(2*math.pi*f*2*dt))
    left[i]+=v*(.8 if b==0 else .45); right[i]+=v*(.45 if b==0 else .8)
  print(f'Synthesized {name}',flush=True)
 # Almost subliminal quarter-note pulse at 80 BPM, with no sampled drums.
 for beat in range(32):
  onset=beat*.75
  for i in range(int(onset*SR),min(N,int((onset+.25)*SR))):
   dt=i/SR-onset; v=.012*smooth(dt/.012)*math.exp(-22*dt)*math.sin(2*math.pi*65*dt)
   left[i]+=v; right[i]+=v
 pcm=array.array('h')
 for i in range(N):
  t=i/SR; fade=smooth(t/.8)*smooth((24-t)/1.8)
  pcm.append(round(max(-1,min(1,left[i]*fade))*32767)); pcm.append(round(max(-1,min(1,right[i]*fade))*32767))
 raw=OUT/'promo-music-synthesis.wav'; write_wav(raw,2,pcm)
 # Additional spectral protection leaves 2-4 kHz empty for narration.
 run(['-i',raw,'-af','highpass=f=40,lowpass=f=1700,loudnorm=I=-29:TP=-9:LRA=5','-ar',SR,'-ac','2','-c:a','pcm_s16le',OUT/'promo-music.wav'])
 raw.unlink()
 return [name for name,_ in chords]
def main():
 progression=synthesize()
 voice_info=json.loads((OUT/'promo-narration-manifest.json').read_text(encoding='utf-8'))
 windows=[(x['start_seconds'],x['end_seconds']) for x in voice_info['timing']]
 channels,pcm=samples(OUT/'promo-music.wav'); _,voice=samples(OUT/'promo-narration.wav')
 ducked=array.array('h'); voiced_v=voiced_m=0.; count=0
 for i in range(N):
  t=i/SR; amount=0
  for start,end in windows:
   if start-.12<t<end+.42:
    amount=max(amount,smooth((t-(start-.12))/.12) if t<start else (1 if t<=end else 1-smooth((t-end)/.42)))
  gain=10**(-10*amount/20)
  a=round(pcm[i*2]*gain); b=round(pcm[i*2+1]*gain); ducked.extend([a,b])
  if any(start<=t<=end for start,end in windows):
   voiced_v+=voice[i]**2; voiced_m+=(a*a+b*b)/2; count+=1
 write_wav(OUT/'promo-music-ducked.wav',2,ducked)
 voice_only=OUT/'promo-voice-only.mp4'
 if not voice_only.exists(): shutil.copy2(OUT/'promo.mp4',voice_only)
 mixwav=OUT/'promo-final-mix.wav'
 run(['-i',OUT/'promo-narration.wav','-i',OUT/'promo-music-ducked.wav','-filter_complex','[0:a]pan=stereo|c0=c0|c1=c0[v];[v][1:a]amix=inputs=2:normalize=0,loudnorm=I=-17.5:TP=-1.8:LRA=7,aresample=48000[out]','-map','[out]','-ar',SR,'-ac','2','-c:a','pcm_s16le',mixwav])
 final=OUT/'promo-scored.mp4'
 run(['-i',OUT/'promo-silent.mp4','-i',mixwav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-ar',SR,'-t','24','-movflags','+faststart',final])
 metrics,levels=measure(final); music_metrics,music_levels=measure(OUT/'promo-music.wav'); duck_metrics,_=measure(OUT/'promo-music-ducked.wav')
 if not -18.1<=metrics['integrated_lufs']<=-16.9 or metrics['true_peak_dbfs']>-1: raise RuntimeError(f'Mix levels failed: {metrics}')
 decoded=run(['-i',final,'-f','null','-'])
 srcmd5=run(['-i',OUT/'promo-silent.mp4','-map','0:v:0','-f','framemd5','-']).stdout
 newmd5=run(['-i',final,'-map','0:v:0','-f','framemd5','-']).stdout
 if srcmd5!=newmd5: raise RuntimeError('Video frame identity failed')
 _,mix=samples(mixwav); clipping=sum(abs(x)>=32767 for x in mix)
 if clipping: raise RuntimeError('PCM clipping detected')
 for destination in [OUT/'promo.mp4',ROOT/'public/promo/promo.mp4',ROOT/'dist/promo/promo.mp4']:
  shutil.copy2(final,destination)
 assets={}
 for folder in ['public/promo','dist/promo']:
  for filename in ['index.html','promo.mp4','poster.jpg','narration.zh-TW.vtt','narration.zh-TW.wav']:
   path=ROOT/folder/filename; assets[f'{folder}/{filename}']=path.is_file() and path.stat().st_size>0
 if not all(assets.values()): raise RuntimeError(f'Missing public playback asset: {assets}')
 report={'composition':'Original procedural synthesis; no third-party songs, samples, loops or sound libraries','synthesizer':'Python standard library sine oscillators; no network','bpm':80,'meter':'4/4','chords':progression,'chord_duration_seconds':6,'duration_seconds':24,'sample_rate_hz':SR,'channels':2,'music_loudness':music_metrics,'ducked_music_loudness':duck_metrics,'duck_db':-10,'duck_attack_seconds':.12,'duck_release_seconds':.42,'duck_source':'actual narration segment start/end timings','fade_in_seconds':.8,'fade_out_seconds':1.8,'speech_frequency_protection':'Sine-based voices and 1700Hz lowpass, 40Hz highpass','final_encoded_audio':metrics,'final_mix_clipped_samples':clipping,'dialogue_window_voice_rms_dbfs':20*math.log10(math.sqrt(voiced_v/count)/32768),'dialogue_window_music_rms_dbfs':20*math.log10(math.sqrt(voiced_m/count)/32768),'dialogue_over_music_rms_db':10*math.log10(voiced_v/voiced_m),'video_frames_identical_to_silent':True,'decode_exit_code':decoded.returncode,'playback_assets':assets,'sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
 (OUT/'promo-music-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 (OUT/'promo-music-validation.txt').write_text(decoded.stderr+'\nFINAL MIX LEVELS\n'+levels+'\nMUSIC STEM LEVELS\n'+music_levels,encoding='utf-8')
 p=OUT/'promo-manifest.json'; manifest=json.loads(p.read_text(encoding='utf-8')); manifest['audio']=True; manifest['music']=report; manifest['audio_details']['bgm']=True; manifest['audio_details']['voice_source_channels']=1; manifest['audio_details']['channels']=2; manifest['audio_details']['mix_channels']=2; manifest['audio_details']['target_loudness_lufs']=-17.5; manifest['audio_details']['target_true_peak_dbtp']=-1.8; manifest['audio_details']['encoded_integrated_lufs']=metrics['integrated_lufs']; manifest['audio_details']['encoded_true_peak_dbfs']=metrics['true_peak_dbfs']; manifest['audio_details']['sha256']=report['sha256']; p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,indent=2),flush=True)
if __name__=='__main__': main()
