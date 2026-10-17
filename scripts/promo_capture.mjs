// Start the Vite dev server first (npm.cmd run dev -- --port 5175).
// Start Chrome headless with --remote-debugging-port=9225 --no-sandbox
// and a disposable --user-data-dir outside source files.
// node scripts/promo_capture.mjs http://127.0.0.1:5175
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:5175';
const tabs=await(await fetch('http://127.0.0.1:9225/json')).json();
const ws=new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);let seq=0;
const call=(method,params={})=>new Promise(resolve=>{const id=++seq;const fn=e=>{const m=JSON.parse(e.data);if(m.id===id){ws.removeEventListener('message',fn);resolve(m.result)}};ws.addEventListener('message',fn);ws.send(JSON.stringify({id,method,params}))});
for(const [width,height,path,out] of [[390,1000,'/','ui-mobile.png'],[1440,1100,'/','ui-desktop.png'],[1440,1200,'/promo/index.html?t=11','promo-browser.png']]){
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
 await call('Page.navigate',{url:base+path});await new Promise(r=>setTimeout(r,2400));
 const state=await call('Runtime.evaluate',{expression:`JSON.stringify({url:location.href,width:innerWidth,scroll:document.documentElement.scrollWidth,video:document.querySelector('video')?.currentTime,ready:document.querySelector('video')?.readyState})`,returnByValue:true});
 console.log(out,JSON.stringify(state));
 if(!state?.result?.value||JSON.parse(state.result.value).url.startsWith('chrome-error:'))throw new Error('Page unavailable; screenshot not saved');
 if(JSON.parse(state.result.value).scroll>width)throw new Error('Horizontal overflow; screenshot not saved');
 const s=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('artifacts/'+out,Buffer.from(s.data,'base64'));
}
ws.close();
