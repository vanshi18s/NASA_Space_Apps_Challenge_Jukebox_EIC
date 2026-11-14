/* Earth Jukebox – sonification logic (rule-based, no ML).
   Data property -> sound parameter, all on FIXED ranges so years and datasets are comparable.
   Latitude -> pitch | light -> loudness | longitude -> scan time + stereo pan | change sign -> glide direction */
window.Sonify=(function(){
"use strict";
const PW=1024,PH=576,STEPS=256,COLW=PW/STEPS,BANDS=12,BAND_TOP=64,BAND_H=32; /* 70°N to 50°S */
const LUM_FLOOR=40,LUM_SPAN=160;   /* gray land tops out near 36; city lights start near 40 */
const CH_POS=0.15,CH_NEG=0.41;     /* (B-R)/(B+R) at the purple and orange ends of NASA’s colour bar */
const F_MAX=0.10,HUB_AMP=0.53,MAX_HUBS=48,GAP=10,VOICE=0.14,SCALE=[0,3,5,7,10]; /* A minor pentatonic, base 110 Hz */

/* Add a dataset = add frames + one entry here. Only Night Lights has frames prepared so far. */
const YEARS=[2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023];
const DATASETS=[
 {id:"night",name:"Night Lights 2012 vs 2023 (SVS 5313)",ready:true,svs:"https://svs.gsfc.nasa.gov/5313/",
  folder:"data/nightlights/keyframes/",years:YEARS,modes:["Single year","Compare 2012 and 2023"]},
 {id:"lightning",name:"Lightning from the ISS (SVS 5011)",ready:false,svs:"https://svs.gsfc.nasa.gov/5011/"},
 {id:"aerosols",name:"GEOS Aerosols (SVS 5669)",ready:false,svs:"https://svs.gsfc.nasa.gov/5669/"},
 {id:"co2",name:"DYAMOND Global CO₂ (SVS 5196)",ready:false,svs:"https://svs.gsfc.nasa.gov/5196/"},
 {id:"ocean",name:"Perpetual Ocean 2 (SVS 5425)",ready:false,svs:"https://svs.gsfc.nasa.gov/5425/"},
 {id:"forest",name:"GEDI Forest Height (SVS 4950)",ready:false,svs:"https://svs.gsfc.nasa.gov/4950/"}];

/* ---- image -> numbers ---- */
/* light density f (share of lit pixels in a 4x32 px cell) -> loudness 0..1. Fixed scale: f=0.10 is full loudness (about the 99.5th percentile of 2023). */
const amp=f=>{const a=Math.pow(Math.min(1,f/F_MAX),.6);return a<0.04?0:a};
function analyze(img,isChange){
  const k=img.naturalWidth/2048,c=document.createElement("canvas");c.width=PW;c.height=PH;
  const x=c.getContext("2d",{willReadFrequently:true});
  x.drawImage(img,0,0,PW*k,img.naturalHeight,0,0,PW,PH);          /* LEFT map copy only: the year label is in the right copy */
  x.fillStyle=isChange?"#fff":"#000";x.fillRect(995,308,PW-995,40); /* colour-bar sliver (masked as "no light/no change") */
  const d=x.getImageData(0,0,PW,PH).data,out=new Float32Array(STEPS*BANDS*2),cnt=COLW*BAND_H,py=new Uint16Array(STEPS*BANDS);
  for(let s=0;s<STEPS;s++)for(let b=0;b<BANDS;b++){
    let p=0,n=0,bv=0,by=BAND_TOP+b*BAND_H+BAND_H/2;
    for(let y=BAND_TOP+b*BAND_H;y<BAND_TOP+(b+1)*BAND_H;y++)for(let xx=s*COLW;xx<(s+1)*COLW;xx++){
      const i=(y*PW+xx)*4,r=d[i],g=d[i+1],bl=d[i+2];
      if(!isChange){const v=Math.min(1,Math.max(0,(0.2126*r+0.7152*g+0.0722*bl-LUM_FLOOR)/LUM_SPAN));p+=v;if(v>bv){bv=v;by=y}}
      else{const w=Math.min(1,Math.max(0,(Math.max(r,g,bl)-40)/120)),sg=(bl-r)/(bl+r+1);
        p+=w*Math.min(1,Math.max(0,sg)/CH_POS);n+=w*Math.min(1,Math.max(0,-sg)/CH_NEG)}
    }
    out[(s*BANDS+b)*2]=amp(p/cnt);out[(s*BANDS+b)*2+1]=amp(n/cnt);py[s*BANDS+b]=by;
  }
  /* bright hubs: local maxima of loudness (window 7 steps x 3 bands) above a fixed threshold; works on any dataset's grid */
  const hubs=[];
  for(let s=0;s<STEPS;s++)for(let b=0;b<BANDS;b++){const v=out[(s*BANDS+b)*2];if(v<HUB_AMP)continue;let top=true;
    for(let a=-3;a<=3&&top;a++)for(let c=-1;c<=1;c++){const s2=s+a,b2=b+c;if((!a&&!c)||s2<0||s2>=STEPS||b2<0||b2>=BANDS)continue;
      const w=out[(s2*BANDS+b2)*2];if(w>v||(w===v&&(a<0||(a===0&&c<0)))){top=false;break}}
    if(top)hubs.push({s,b,y:py[s*BANDS+b],a:v})}
  hubs.sort((p,q)=>q.a-p.a);hubs.length=Math.min(hubs.length,MAX_HUBS);
  /* 3-column moving average (about 1 degree of longitude) so the sound glides instead of fluttering */
  const sm=new Float32Array(out.length),W=BANDS*2;
  for(let s=0;s<STEPS;s++)for(let j=0;j<W;j++)sm[s*W+j]=.25*out[Math.max(0,s-1)*W+j]+.5*out[s*W+j]+.25*out[Math.min(STEPS-1,s+1)*W+j];
  sm.hubs=hubs;
  return sm;
}

/* ---- audio engine ---- */
let vbus,ctx,master,cueBus,panner,oA=[],gA=[],oB=[],gB=[],freq=[],timer=0,run=null;
function ensure(inten){
  if(ctx){if(ctx.state==="suspended")ctx.resume();return}
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=20;comp.ratio.value=3;comp.attack.value=.01;comp.release.value=.25;
  const lim=ctx.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.003;lim.release.value=.1;
  master=ctx.createGain();master.gain.value=inten;comp.connect(master);master.connect(lim);lim.connect(ctx.destination);
  cueBus=ctx.createGain();cueBus.connect(comp);
  const bus=vbus=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2000;
  panner=ctx.createStereoPanner();bus.connect(lp);lp.connect(panner);panner.connect(comp);
  const conv=ctx.createConvolver(),n=ctx.sampleRate*2,ir=ctx.createBuffer(2,n,ctx.sampleRate);
  for(let c=0;c<2;c++){const a=ir.getChannelData(c);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,3)}
  conv.buffer=ir;const wet=ctx.createGain();wet.gain.value=.3;panner.connect(conv);conv.connect(wet);wet.connect(comp);
  for(let b=0;b<BANDS;b++){
    const nn=BANDS-1-b,f=110*Math.pow(2,(12*Math.floor(nn/5)+SCALE[nn%5])/12);freq.push(f);
    [["triangle",oA,gA],["sine",oB,gB]].forEach(([type,os,gs])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.value=0;
      o.connect(g);g.connect(bus);o.start();os.push(o);gs.push(g)});
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
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.10+.30*a,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+.9);
  o.connect(g);o2.connect(g2);g2.connect(g);g.connect(vbus);o.start(t);o2.start(t);o.stop(t+.95);o2.stop(t+.95);
}
function schedule(i){
  const {segs,data,t0,dt,L}=run,seg=Math.floor(i/L),s=i%L,t=t0+i*dt,key=segs[seg],live=s<STEPS,d=data[key];
  if(s===0){const base=seg===0?330:523;for(let j=0;j<=seg&&segs.length>1;j++)blip(base,.14,.1,"sine",Math.max(0,t-ctx.currentTime)+j*.2)}
  for(let b=0;b<BANDS;b++){
    const a=live?d[(s*BANDS+b)*2]:0,n=live?(key==="chg"?d[(s*BANDS+b)*2+1]:a*.6):0; /* lights modes: bank B is a soft octave-below pad */
    gA[b].gain.linearRampToValueAtTime(a*VOICE,t+dt*.8);gB[b].gain.linearRampToValueAtTime(n*VOICE,t+dt*.8);
    if(key==="chg"&&live){ /* purple = more light = rising glide, orange = less light = falling glide */
      oA[b].frequency.setValueAtTime(freq[b],t);oA[b].frequency.exponentialRampToValueAtTime(freq[b]*1.06,t+dt*.9);
      oB[b].frequency.setValueAtTime(freq[b],t);oB[b].frequency.exponentialRampToValueAtTime(freq[b]/1.06,t+dt*.9);}
  }
  if(live)panner.pan.linearRampToValueAtTime(-.85+1.7*s/STEPS,t+dt);
  if(live)for(const h of d.hubs)if(h.s===s)bell(freq[h.b]*2,t,h.a);
}
function play(segs,data,seconds){
  stop();const L=STEPS+GAP,dt=seconds/STEPS,t0=ctx.currentTime+.15;
  run={segs,data,t0,dt,L,total:segs.length*L,next:0};
  for(let b=0;b<BANDS;b++)[[oA,gA],[oB,gB]].forEach(([os,gs])=>{
    gs[b].gain.cancelScheduledValues(0);gs[b].gain.setValueAtTime(0,t0);
    os[b].frequency.cancelScheduledValues(0);os[b].frequency.setValueAtTime(freq[b]*(os===oB&&!segs.includes("chg")?.5:1),t0)});
  panner.pan.cancelScheduledValues(0);panner.pan.setValueAtTime(-.85,t0);
  timer=setInterval(()=>{while(run.next<run.total&&t0+run.next*dt<ctx.currentTime+.15){schedule(run.next);run.next++}},25);
  return {steps:STEPS,L,dt,total:run.total};
}
function stop(){
  clearInterval(timer);run=null;
  if(ctx){const n=ctx.currentTime;[gA,gB].forEach(gs=>gs.forEach(g=>{g.gain.cancelScheduledValues(n);g.gain.setTargetAtTime(0,n,.03)}))}
}
/* seconds since playback start, corrected for output latency, so the visual scanline stays locked to the sound */
const clock=()=>run?ctx.currentTime-(ctx.outputLatency||0)-run.t0:0;

return {GEO:{BANDS,BAND_TOP,BAND_H,STEPS,COLW},DATASETS,YEARS,analyze,ensure,setIntensity,play,stop,clock,tick,bump,chime,blip};
})();