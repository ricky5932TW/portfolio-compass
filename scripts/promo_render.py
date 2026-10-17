"""Reproduce the 24-second Portfolio Compass film. No network or user data used.
python -m pip install --target .promo-tools pillow imageio-ffmpeg
python scripts/promo_render.py
"""
from pathlib import Path
import sys, math, subprocess, shutil, json
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.promo-tools'))
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

W,H,FPS,DURATION = 1920,1080,24,24
NAVY='#0b1728'; PANEL='#10243a'; MINT='#69d5bd'; WHITE='#ecf4fa'; MUTED='#95aabd'; LINE='#284157'; BLUE='#7db4ff'; AMBER='#ffc073'
OUT=ROOT/'artifacts'; PUBLIC=ROOT/'public/promo'
OUT.mkdir(exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)
FONT=Path('C:/Windows/Fonts/msjh.ttc'); BOLD=Path('C:/Windows/Fonts/msjhbd.ttc')
fonts={}
def font(n,b=False):
    key=(n,b)
    if key not in fonts: fonts[key]=ImageFont.truetype(str(BOLD if b else FONT),n)
    return fonts[key]
def txt(d,xy,s,n=28,c=WHITE,b=False): d.text(xy,s,font=font(n,b),fill=c)
def panel(d,box,fill=PANEL,r=28): d.rounded_rectangle(box,r,fill=fill,outline=LINE,width=2)
def smooth(v):
    v=max(0,min(1,v)); return v*v*(3-2*v)
def compass(d,x,y,r=120,a=0):
    for k in [1,.73]: d.ellipse((x-r*k,y-r*k,x+r*k,y+r*k),outline=LINE,width=2)
    for i in range(24):
        q=i*math.pi/12
        d.line((x+math.cos(q)*r*.92,y+math.sin(q)*r*.92,x+math.cos(q)*r,y+math.sin(q)*r),fill=MINT if i%6==0 else LINE,width=3)
    q=a-.7
    dx,dy=math.cos(q),math.sin(q)
    d.polygon([(x+dx*r*.77,y+dy*r*.77),(x-dy*r*.18,y+dx*r*.18),(x+dy*r*.18,y-dx*r*.18)],fill=MINT)
    d.polygon([(x-dx*r*.77,y-dy*r*.77),(x-dy*r*.18,y+dx*r*.18),(x+dy*r*.18,y-dx*r*.18)],fill='#365a70')
    d.ellipse((x-8,y-8,x+8,y+8),fill=WHITE)

BG=Image.new('RGB',(W,H),NAVY)
bd=ImageDraw.Draw(BG)
for y in range(H):
    q=y/H; bd.line((0,y,W,y),fill=(11+int(3*q),23+int(8*q),40+int(11*q)))
for x in range(80,W,80): bd.line((x,0,x,H),fill='#112338')
for y in range(20,H,80): bd.line((0,y,W,y),fill='#112338')
# The grid remains quiet enough for subtitles and screen recording.

def shell(t,idx):
    im=BG.copy(); d=ImageDraw.Draw(im)
    d.ellipse((100,64,132,96),outline=MINT,width=3)
    d.polygon([(115,69),(109,89),(124,79)],fill=MINT)
    txt(d,(150,55),'持倉羅盤',30,b=True)
    txt(d,(150,96),'PORTFOLIO COMPASS',15,MUTED)
    txt(d,(1460,73),'配置清楚 · 行動有據',22,MUTED)
    d.line((100,151,1820,151),fill=LINE,width=2)
    txt(d,(100,1002),'示意資料，非即時行情 · 配置試算不會自動下單',21,MUTED)
    for i in range(5):
        x=1500+i*64; d.rounded_rectangle((x,1014,x+42,1019),3,fill=MINT if i==idx else LINE)
    txt(d,(1760,994),f'{idx+1:02d} / 05',16,MUTED)
    return im

def scene(idx,t):
    im=shell(t,idx); d=ImageDraw.Draw(im)
    if idx==0:
        txt(d,(112,261),'你的資產，',86,b=True)
        txt(d,(112,375),'散在不同市場？',86,MINT,True)
        txt(d,(118,532),'跨市場、跨幣別，配置卻難以一眼看懂。',29,MUTED)
        txt(d,(118,751),'先看清全貌，再決定下一步。',31)
        compass(d,1380,518,250,t*.08)
        for j,(title,label,pos) in enumerate([('台股','TW / TWO',(1055,270)),('美股','US',(1490,440)),('日股','JP',(1100,710))]):
            x,y=pos; y+=int(math.sin(t*.8+j)*9)
            panel(d,(x,y,x+250,y+126)); txt(d,(x+25,y+20),title,30,b=True); txt(d,(x+25,y+70),label,20,MINT)
    elif idx==1:
        txt(d,(112,235),'一張畫面，',74,b=True); txt(d,(112,333),'匯聚你的投資版圖。',74,MINT,True)
        txt(d,(118,479),'台股上市 / 上櫃 · 美股 · 日股',29)
        for j,label in enumerate(['TWD 新臺幣','USD 美元','JPY 日圓']):
            x=118+j*240; panel(d,(x,570,x+217,640),r=15); txt(d,(x+23,586),label,24,MINT)
        txt(d,(118,705),'多幣別資產，統一換算為新臺幣。',28,MUTED)
        panel(d,(970,232,1810,852))
        txt(d,(1015,274),'資產總覽',26,MUTED); txt(d,(1015,329),'NT$ 1,000,000',57,b=True)
        txt(d,(1015,421),'目前配置',25)
        vals=[.40,.20,.20,.20]; colors=[MINT,'#80acdc','#a6b7cf','#546e85']; labels=['台股','美股','日股','現金']
        x=1015
        for v,c in zip(vals,colors):
            d.rectangle((x,479,x+int(v*740)-4,507),fill=c); x+=int(v*740)
        for j,(label,v,c) in enumerate(zip(labels,vals,colors)):
            y=548+j*63; d.ellipse((1016,y+9,1031,y+24),fill=c); txt(d,(1052,y),label,25); txt(d,(1642,y),f'{v:.0%}',26,b=True)
    elif idx==2:
        txt(d,(112,209),'從配置差距，到整股試算。',66,b=True)
        txt(d,(116,310),'目前與目標並列，讓每一步都有依據。',29,MUTED)
        panel(d,(110,397,1810,857))
        xs=[150,500,740,1000,1290,1545]
        for x,s in zip(xs,['資產','目前 → 目標','配置差額','每股折合 TWD','整股試算','試算金額']): txt(d,(x,430),s,23,MUTED)
        rows=[('台股', '40% → 35%', '+50,000', '1,000', '賣出 50 股','50,000',AMBER),('美股', '20% → 25%', '-50,000','5,000','買入 10 股','50,000',BLUE)]
        for j,row in enumerate(rows):
            y=507+j*130; d.line((148,y-16,1770,y-16),fill=LINE,width=2)
            for k,s in enumerate(row[:6]): txt(d,(xs[k],y+13),s,29,row[6] if k in [2,4] else WHITE,k==4)
        txt(d,(152,790),'總資產 NT$ 1,000,000 · 日股 20% 與現金 20% 維持目標',23,MUTED)
        txt(d,(116,900),'差額 = 目前金額 - 目標金額；以整股試算，未計手續費及交易稅。',22,MUTED)
    elif idx==3:
        txt(d,(112,271),'持倉留在本機，',77,b=True); txt(d,(112,378),'備份由你掌控。',77,MINT,True)
        txt(d,(118,527),'資料儲存在目前瀏覽器。',30)
        txt(d,(118,593),'匯出 JSON 備份，隨時保留自己的副本。',28,MUTED)
        txt(d,(118,732),'不自動跨裝置同步 · 清除瀏覽器資料前請先備份',23,MUTED)
        panel(d,(1110,265,1740,799))
        compass(d,1424,420,100,t*.035)
        txt(d,(1254,563),'你的持倉資料',37,b=True)
        panel(d,(1194,649,1656,729),fill='#183d43',r=18)
        txt(d,(1275,666),'匯出 JSON 備份',29,MINT,True)
    else:
        compass(d,960,327,135,t*.025)
        s='持倉羅盤'; f=font(78,True); width=d.textlength(s,font=f); txt(d,((W-width)/2,506),s,78,b=True)
        s='看懂配置，讓每一步更有方向。'; f=font(42); width=d.textlength(s,font=f); txt(d,((W-width)/2,630),s,42,MINT)
        d.rounded_rectangle((720,749,1200,843),22,fill=MINT)
        txt(d,(798,770),'開啟持倉羅盤',36,NAVY,True)
        txt(d,(770,879),'台股 · 美股 · 日股 · 多幣別配置',24,MUTED)
    return im

BOUNDARIES=[0,4,9,15,19,24]
def render(t):
    idx=next((i for i in range(5) if t<BOUNDARIES[i+1]),4)
    current=scene(idx,t)
    if idx>0 and t<BOUNDARIES[idx]+.4:
        elapsed=t-BOUNDARIES[idx]
        quiet=shell(t,idx)
        if elapsed<.2:
            current=Image.blend(scene(idx-1,t),quiet,smooth(elapsed/.2))
        else:
            current=Image.blend(quiet,current,smooth((elapsed-.2)/.2))
    return current

def main():
    exe=imageio_ffmpeg.get_ffmpeg_exe()
    cmd=[exe,'-y','-f','rawvideo','-vcodec','rawvideo','-s',f'{W}x{H}','-pix_fmt','rgb24','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'promo.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    for i in range(FPS*DURATION):
        proc.stdin.write(render(i/FPS).tobytes())
        if i%96==0: print(f'Render {i/FPS:.0f}s / {DURATION}s',flush=True)
    proc.stdin.close(); stderr=proc.stderr.read().decode('utf-8',errors='replace'); code=proc.wait()
    if code: raise RuntimeError(stderr)
    shutil.copy2(OUT/'promo.mp4',PUBLIC/'promo.mp4')
    render(22).save(PUBLIC/'poster.jpg',quality=94)
    # Acceptance stills are decoded FROM the finished MP4, not source renders.
    times=[0,5.5,11,16.5,22,23.9]
    frames=[]
    for j,t in enumerate(times):
        path=OUT/f'promo-frame-{j+1:02d}.png'
        subprocess.run([exe,'-y','-ss',str(t),'-i',str(OUT/'promo.mp4'),'-frames:v','1',str(path)],check=True,capture_output=True)
        frames.append(Image.open(path).convert('RGB'))
    sheet=Image.new('RGB',(1920,1170),NAVY); d=ImageDraw.Draw(sheet)
    for j,(frame,t) in enumerate(zip(frames,times)):
        x=(j%2)*960; y=(j//2)*390
        sheet.paste(frame.resize((960,540)).resize((640,360)),(x+160,y))
        txt(d,(x+165,y+362),f'MP4 decoded frame · {t:.1f}s',17,MUTED)
    sheet.save(OUT/'promo-contact-sheet.jpg',quality=93)
    transitions=Image.new('RGB',(1920,1150),NAVY); td=ImageDraw.Draw(transitions)
    for j,t in enumerate([4.25,9.25,15.25,19.25]):
        path=OUT/f'promo-transition-{j+1:02d}.png'
        subprocess.run([exe,'-y','-ss',str(t),'-i',str(OUT/'promo.mp4'),'-frames:v','1',str(path)],check=True,capture_output=True)
        x=(j%2)*960; y=(j//2)*575
        transitions.paste(Image.open(path).resize((960,540)),(x,y))
        txt(td,(x+20,y+542),f'Decoded transition: {t:.2f}s',24,MUTED)
    transitions.save(OUT/'promo-transitions.jpg',quality=94)
    check=subprocess.run([exe,'-i',str(OUT/'promo.mp4'),'-f','null','-'],capture_output=True,text=True)
    (OUT/'promo-validation.txt').write_text(check.stderr,encoding='utf-8')
    (OUT/'promo-manifest.json').write_text(json.dumps({'duration_seconds':24,'width':W,'height':H,'fps':FPS,'codec':'H264 / libx264','pixel_format':'yuv420p','audio':False,'frames':576,'decode_exit_code':check.returncode,'sample_seconds':times,'data':'fictional; not live quotes','arithmetic':{'total_twd':1000000,'tw_sell':{'current':400000,'target':350000,'price_twd':1000,'shares':50},'us_buy':{'current':200000,'target':250000,'price_twd':5000,'shares':10}}},indent=2),encoding='utf-8')
    print(f'Finished: {OUT / "promo.mp4"}; full-decode exit={check.returncode}',flush=True)
if __name__=='__main__': main()

