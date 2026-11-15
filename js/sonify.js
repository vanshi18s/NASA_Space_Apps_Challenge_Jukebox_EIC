
/* Earth Jukebox – sonification logic (rule-based, no ML).
   Data property -> sound parameter, all on FIXED ranges so years and datasets are comparable.
   Latitude -> pitch | light -> loudness | longitude -> scan time + stereo pan | change sign -> glide direction */
window.Sonify=(function(){
"use strict";
const PW=1024,PH=576,STEPS=256,COLW=PW/STEPS,BANDS=12,BAND_TOP=64,BAND_H=32; /* 70°N to 50°S */
const LUM_FLOOR=40,LUM_SPAN=160;   /* gray land tops out near 36; city lights start near 40 */
const CH_POS=0.15,CH_NEG=0.41;     /* (B-R)/(B+R) at the purple and orange ends of NASA’s colour bar */
const DIFF_FULL=0.125,SST_S=0.40,SST_V=0.10,COVER_MIN=0.10,COVER_FULL=0.30,HUB_SST=0.85,F_MAX=0.10,HUB_AMP=0.45,MAX_HUBS=48,GAP=10,VOICE=0.22,SCALE=[0,3,5,7,10]; /* A minor pentatonic, base 110 Hz */

/* The two active NASA datasets used by this experience. */
const YEARS=[2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023];
const DATASETS=[
 {id:"night",kind:"lights",unit:"Year",name:"Night Lights 2012 vs 2023 (SVS 5313)",ready:true,svs:"https://svs.gsfc.nasa.gov/5313/",hubLabel:"bright hubs",
  folder:"data/nightlights/keyframes/",crop:[0,0,.5,1],mask:[[995,308,29,40]],
  frames:YEARS.map(y=>({k:"y"+y,label:String(y),file:"year_"+y+".jpg"})),modes:["Single year","Compare 2012 with another year (2013 to 2023)"]},
 {id:"ocean",kind:"sst",unit:"Date",name:"Global Sea Surface Currents and Temperature (SVS 3912)",ready:true,svs:"https://svs.gsfc.nasa.gov/3912/",hubLabel:"warm-water bells",
  folder:"data/ocean/keyframes/",config:"data/ocean/config.json",lutFile:"data/ocean/lut.json",modes:["Single date","Compare first date with another date"]}
];

/* ---- image -> numbers ---- */
/* light density f (share of lit pixels in a 4x32 px cell) -> loudness 0..1. Fixed scale: f=0.10 is full loudness (about the 99.5th percentile of 2023). */
const GATE=0.15; /* below this the cell is treated as dark: true silence, no hiss */
const amp=f=>{const a=Math.pow(Math.min(1,f/F_MAX),.6);return a<GATE?0:(a-GATE)/(1-GATE)};
function grab(img,d){ /* crop of the picture that is the whole globe, resampled to the fixed 1024x576 grid */
  const c=d.crop,nw=img.naturalWidth,nh=img.naturalHeight,cv=document.createElement("canvas");cv.width=PW;cv.height=PH;
  const x=cv.getContext("2d",{willReadFrequently:true});x.drawImage(img,c[0]*nw,c[1]*nh,c[2]*nw,c[3]*nh,0,0,PW,PH);
  (d.mask||[]).forEach(m=>{x.fillStyle="#000";x.fillRect(m[0],m[1],m[2],m[3])}); /* e.g. the colour-bar sliver */
  return x.getImageData(0,0,PW,PH).data}
function post(out,py,thr,extra){
  /* bright hubs: local maxima of loudness (window 7 steps x 3 bands) above a fixed threshold */
  const hubs=[];
  for(let s=0;s<STEPS;s++)for(let b=0;b<BANDS;b++){const v=out[(s*BANDS+b)*2];if(v<thr)continue;let top=true;
    for(let a=-3;a<=3&&top;a++)for(let c=-1;c<=1;c++){const s2=s+a,b2=b+c;if((!a&&!c)||s2<0||s2>=STEPS||b2<0||b2>=BANDS)continue;
      const w=out[(s2*BANDS+b2)*2];if(w>v||(w===v&&(a<0||(a===0&&c<0)))){top=false;break}}
    if(top)hubs.push({s,b,y:py[s*BANDS+b],a:v})}
  hubs.sort((p,q)=>q.a-p.a);hubs.length=Math.min(hubs.length,MAX_HUBS);
  /* 3-step moving average (1-2-1 weights, about 4° of longitude because 1 step = 360/256 = 1.4°) so the sound glides */
  const sm=new Float32Array(out.length),W=BANDS*2;
  for(let s=0;s<STEPS;s++)for(let j=0;j<W;j++)sm[s*W+j]=.25*out[Math.max(0,s-1)*W+j]+.5*out[s*W+j]+.25*out[Math.min(STEPS-1,s+1)*W+j];
  sm.hubs=hubs;{let t=0,l=0;for(let i=0;i<sm.length;i+=2){t+=sm[i];if(sm[i]>0)l++}sm.level=t/(sm.length/2);sm.lit=l/(sm.length/2)}
  return Object.assign(sm,extra||{})}
function analyze(img,d){return d.kind==="sst"?analyzeSST(img,d):analyzeLights(img,d)}
function analyzeLights(img,d){
  const px=grab(img,d),out=new Float32Array(STEPS*BANDS*2),cnt=COLW*BAND_H,py=new Uint16Array(STEPS*BANDS);
  for(let s=0;s<STEPS;s++)for(let b=0;b<BANDS;b++){
    let p=0,bv=0,by=BAND_TOP+b*BAND_H+BAND_H/2;
    for(let y=BAND_TOP+b*BAND_H;y<BAND_TOP+(b+1)*BAND_H;y++)for(let xx=s*COLW;xx<(s+1)*COLW;xx++){
      const i=(y*PW+xx)*4,v=Math.min(1,Math.max(0,(0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2]-LUM_FLOOR)/LUM_SPAN));p+=v;if(v>bv){bv=v;by=y}}
    out[(s*BANDS+b)*2]=amp(p/cnt);py[s*BANDS+b]=by}
  const result=post(out,py,HUB_AMP);
  /* Fixed 0–1 tone mapping keeps a year sonically consistent without loading every year up front. */
  result.tone=result.level;
  return result}
/* Sea surface temperature: colour (hue) -> degrees C through the table built from NASA's own colour bar (tools/build_lut.py). Brightness is ignored for temperature. */
function hueTable(l){const T=new Float32Array(421);for(let i=0;i<421;i++){const h=i-60; /* hue -60..360 deg */
  const hs=l.hue,ts=l.temp;let t=h>=hs[0]?ts[0]:h<=hs[hs.length-1]?ts[ts.length-1]:0;
  if(h<hs[0]&&h>hs[hs.length-1])for(let k=1;k<hs.length;k++)if(h>=hs[k]){t=ts[k-1]+(ts[k]-ts[k-1])*(hs[k-1]-h)/(hs[k-1]-hs[k]);break}
  T[i]=t}return T}
function analyzeSST(img,d){
  const px=grab(img,d),HT=d.hueT||(d.hueT=hueTable(d.lutData)),t0=d.lutData.tmin,t1=d.lutData.tmax;
  const out=new Float32Array(STEPS*BANDS*2),temp=new Float32Array(STEPS*BANDS),py=new Uint16Array(STEPS*BANDS),cnt=COLW*BAND_H;
  let sT=0,sW=0;
  for(let s=0;s<STEPS;s++)for(let b=0;b<BANDS;b++){
    let n=0,tS=0;const cl=Math.cos((70-10*b-5)*Math.PI/180);
    for(let y=BAND_TOP+b*BAND_H;y<BAND_TOP+(b+1)*BAND_H;y++)for(let xx=s*COLW;xx<(s+1)*COLW;xx++){
      const i=(y*PW+xx)*4,r=px[i],g=px[i+1],bl=px[i+2],mx=Math.max(r,g,bl),mn=Math.min(r,g,bl);
      if(!mx||(mx-mn)/mx<SST_S||mx/255<SST_V)continue;                      /* land is gray, background is black: both skipped */
      const dd=mx-mn;let h=mx===r?((g-bl)/dd)%6:mx===g?(bl-r)/dd+2:(r-g)/dd+4;h*=60;if(h<0)h+=360;if(h>300)h-=360;
      tS+=HT[Math.round(h)+60];n++}
    const cov=n/cnt,T=n?tS/n:(t0+t1)/2;sT+=tS*cl;sW+=n*cl;
    out[(s*BANDS+b)*2]=cov<COVER_MIN?0:Math.min(1,Math.max(0,(T-t0)/(t1-t0)))*Math.min(1,cov/COVER_FULL);
    temp[s*BANDS+b]=T;py[s*BANDS+b]=BAND_TOP+b*BAND_H+BAND_H/2}
  return post(out,py,HUB_SST,{temp,meanT:sT/sW})}

/* Optional batch normalizer retained for callers that analyse a complete year set. */
function normalize(data,keys){const v=keys.map(k=>data[k].level),lo=Math.min(...v),hi=Math.max(...v);keys.forEach((k,i)=>data[k].tone=hi>lo?(v[i]-lo)/(hi-lo):.5)}
/* Change of year `a` versus year `b`: bank A = more light (rising glide), bank B = less light (falling glide). Differences are small, so they are boosted. */
function diff(a,b){const o=new Float32Array(a.length),g=x=>x<.005?0:Math.pow(Math.min(1,x/DIFF_FULL),.6);
  for(let i=0;i<a.length;i+=2){o[i]=g(a[i]-b[i]);o[i+1]=g(b[i]-a[i])}o.hubs=[];o.chg=true;return o}

/* ---- audio engine ---- */
let fl=[],lpf,vbus,ctx,master,cueBus,panner,oA=[],gA=[],oB=[],gB=[],freq=[],timer=0,run=null;
function ensure(inten){
  if(ctx){if(ctx.state==="suspended")ctx.resume();return}
  ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"playback"}); /* larger buffer = no crackle */
  const comp=ctx.createGain(); /* plain mix bus: no compressor, so loudness differences in the data stay intact */
  const lim=ctx.createDynamicsCompressor();lim.threshold.value=-2;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.003;lim.release.value=.1;
  master=ctx.createGain();master.gain.value=inten;comp.connect(master);master.connect(lim);lim.connect(ctx.destination);
  cueBus=ctx.createGain();cueBus.connect(comp);
  const bus=vbus=ctx.createGain(),lp=lpf=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2000;
  panner=ctx.createStereoPanner();bus.connect(lp);lp.connect(panner);panner.connect(comp);
  {const n=Math.floor(ctx.sampleRate*1.8),ir=ctx.createBuffer(2,n,ctx.sampleRate); /* smooth, dark room: input silence gives output silence */
   for(let c=0;c<2;c++){const a=ir.getChannelData(c);let p=0;for(let i=0;i<n;i++){p+=.06*((Math.random()*2-1)-p);a[i]=p*Math.pow(1-i/n,4)*6}}
   const cvb=ctx.createConvolver();cvb.buffer=ir;const w=ctx.createGain();w.gain.value=.16;panner.connect(cvb);cvb.connect(w);w.connect(comp)}
  const pw=ctx.createPeriodicWave(new Float32Array(5),new Float32Array([0,1,.28,.1,.04])); /* soft organ-like tone: no harsh buzz */
  for(let b=0;b<BANDS;b++){
    const nn=BANDS-1-b,f=110*Math.pow(2,(12*Math.floor(nn/5)+SCALE[nn%5])/12);freq.push(f);
    [["soft",oA,gA],["sine",oB,gB]].forEach(([type,os,gs])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();if(type==="soft")o.setPeriodicWave(pw);else o.type=type;o.frequency.value=f;g.gain.value=0;
      o.connect(g);{let tg=bus;if(type==="soft"){tg=ctx.createBiquadFilter();tg.type="lowpass";tg.Q.value=.5;tg.frequency.value=12000;tg.connect(bus);fl.push(tg)}g.connect(tg)}o.start();os.push(o);gs.push(g)});
  }
}
function setIntensity(v){if(master)master.gain.setTargetAtTime(v,ctx.currentTime,.05)}
function blip(f,dur,vol,type,when){
  if(!ctx)return;const t=ctx.currentTime+(when||0),o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type||"triangle";o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);
  g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(cueBus);o.start(t);o.stop(t+dur+.02);
}
const tick=(i,n)=>{const d=Math.round(i/Math.max(1,n-1)*9);blip(262*Math.pow(2,(12*Math.floor(d/5)+SCALE[d%5])/12),.18,.16)};
const bump=()=>blip(85,.16,.25,"sine");
const chime=()=>{blip(523,.25,.14);blip(784,.35,.12,"triangle",.14)};

function bell(f,t,a){ /* accent for a bright hub: a bell-like tone, louder for brighter hubs */
  const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();
  o.frequency.value=f;o2.frequency.value=f*2.76;g2.gain.value=.25;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12+.35*a,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+.9);
  o.connect(g);o2.connect(g2);g2.connect(g);g.connect(vbus);o.start(t);o2.start(t);o.stop(t+.95);o2.stop(t+.95);
}
const CUT=T=>500*Math.pow(2,Math.min(32,Math.max(0,T))/8);
function setTone(d,t){const k=d.chg?.5:(d.tone==null?.5:d.tone);lpf.frequency.setValueAtTime(d.temp?9000:1800+5200*k,t)}
function schedule(i){
  const {segs,data,t0,dt,L}=run,seg=Math.floor(i/L),s=i%L,t=t0+i*dt,key=segs[seg],live=s<STEPS,d=data[key];
  if(s===0){setTone(d,t);const base=seg===0?330:523;for(let j=0;j<=seg&&segs.length>1;j++)blip(base,.14,.1,"sine",Math.max(0,t-ctx.currentTime)+j*.2)}
  for(let b=0;b<BANDS;b++){
    const a=live?d[(s*BANDS+b)*2]:0,n=live?(d.chg?d[(s*BANDS+b)*2+1]:a*.35):0; /* lights modes: bank B is a soft octave-below pad */
    gA[b].gain.linearRampToValueAtTime(a*VOICE,t+dt*.8);gB[b].gain.linearRampToValueAtTime(n*VOICE,t+dt*.8);
    if(d.chg&&live){ /* purple = more light = rising glide, orange = less light = falling glide */
      oA[b].frequency.setValueAtTime(freq[b],t);oA[b].frequency.exponentialRampToValueAtTime(freq[b]*1.06,t+dt*.9);
      oB[b].frequency.setValueAtTime(freq[b],t);oB[b].frequency.exponentialRampToValueAtTime(freq[b]/1.06,t+dt*.9);}
  }
  if(live&&d.temp)for(let b=0;b<BANDS;b++)fl[b].frequency.linearRampToValueAtTime(CUT(d.temp[s*BANDS+b]),t+dt*.8); /* warmer water = brighter tone: 500 Hz at 0 C to 8000 Hz at 32 C */
  if(live)panner.pan.linearRampToValueAtTime(-.85+1.7*s/STEPS,t+dt);
  if(live)for(const h of d.hubs)if(h.s===s)bell(freq[h.b]*2,t,h.a);
}
function play(segs,data,seconds,from){ /* from = step index to start at (resume) */
  stop();from=from||0;const L=STEPS+GAP,dt=seconds/STEPS,t00=ctx.currentTime+.15,t0=t00-from*dt;
  run={segs,data,t0,dt,L,total:segs.length*L,next:from};
  for(let b=0;b<BANDS;b++)[[oA,gA],[oB,gB]].forEach(([os,gs])=>{
    gs[b].gain.cancelScheduledValues(0);gs[b].gain.setValueAtTime(0,t00);
    os[b].frequency.cancelScheduledValues(0);os[b].frequency.setValueAtTime(freq[b]*(os===oB&&!data[segs[0]].chg?.5:1),t00)});
  fl.forEach(f=>{f.frequency.cancelScheduledValues(0);f.frequency.setValueAtTime(12000,t00)});setTone(data[segs[Math.floor(from/L)]],t00);
  panner.pan.cancelScheduledValues(0);panner.pan.setValueAtTime(-.85+1.7*Math.min(from%L,STEPS)/STEPS,t00);
  timer=setInterval(()=>{while(run.next<run.total&&t0+run.next*dt<ctx.currentTime+.3){schedule(run.next);run.next++}},25);
  return {steps:STEPS,L,dt,total:run.total};
}
function stop(){
  clearInterval(timer);run=null;
  if(ctx){const n=ctx.currentTime;[gA,gB].forEach(gs=>gs.forEach(g=>{g.gain.cancelScheduledValues(n);g.gain.setTargetAtTime(0,n,.03)}))}
}
/* seconds since playback start, corrected for output latency, so the visual scanline stays locked to the sound */
const clock=()=>run?ctx.currentTime-(ctx.outputLatency||0)-run.t0:0;

return {GEO:{BANDS,BAND_TOP,BAND_H,STEPS,COLW},DATASETS,YEARS,analyze,normalize,diff,ensure,setIntensity,play,stop,clock,tick,bump,chime,blip};
})();
