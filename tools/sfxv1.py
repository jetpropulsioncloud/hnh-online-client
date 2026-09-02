from pathlib import Path

p=Path('client.js')
s=p.read_text()
s=s.replace("Client v0.8.0 · Rules v0.6.2","Client v0.8.1 · Rules v0.6.2")
s=s.replace("version:'0.8.0'","version:'0.8.1'")

s += r'''

/* ===== tactile SFX v1 ===== */
(() => {
  const STORAGE_KEY='hnh.sfx.v1';
  let ctx=null, master=null, muted=false, volume=.48;
  let dragKind=null;
  let lastResources=null,lastHearth=null;

  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if(typeof saved.muted==='boolean')muted=saved.muted;
    if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(1,saved.volume));
  }catch{}

  function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({muted,volume}));}catch{}}
  function ensureAudio(){
    if(!ctx){
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return null;
      ctx=new AudioCtx();master=ctx.createGain();master.connect(ctx.destination);
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.012);
    return ctx;
  }
  function tone({freq=360,endFreq=freq,dur=.08,type='sine',gain=.08,delay=0}={}){
    const c=ensureAudio();if(!c||muted||volume<=0)return;
    const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(35,endFreq),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.015);
  }
  function noise({dur=.06,gain=.035,filter=1400,delay=0}={}){
    const c=ensureAudio();if(!c||muted||volume<=0)return;
    const t=c.currentTime+delay,len=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,len,c.sampleRate),data=buf.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
    const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=buf;f.type='lowpass';f.frequency.value=filter;
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f);f.connect(g);g.connect(master);src.start(t);
  }
  const SFX={
    pickup(){noise({dur:.045,gain:.022,filter:1800});tone({freq:420,endFreq:520,dur:.045,type:'triangle',gain:.035});},
    drop(){noise({dur:.055,gain:.03,filter:900});tone({freq:180,endFreq:145,dur:.055,type:'triangle',gain:.045});},
    recruit(){tone({freq:410,endFreq:610,dur:.11,type:'sine',gain:.055});tone({freq:610,endFreq:760,dur:.09,type:'sine',gain:.035,delay:.05});},
    build(){noise({dur:.07,gain:.045,filter:720});tone({freq:145,endFreq:112,dur:.09,type:'triangle',gain:.06});tone({freq:205,endFreq:165,dur:.08,type:'triangle',gain:.045,delay:.055});},
    attack(){tone({freq:310,endFreq:115,dur:.16,type:'sawtooth',gain:.035});noise({dur:.07,gain:.025,filter:1700,delay:.06});},
    block(){tone({freq:260,endFreq:210,dur:.08,type:'square',gain:.035});tone({freq:190,endFreq:160,dur:.08,type:'triangle',gain:.045,delay:.045});},
    resource(){tone({freq:720,endFreq:860,dur:.07,type:'sine',gain:.035});},
    hearth(){noise({dur:.11,gain:.055,filter:650});tone({freq:105,endFreq:68,dur:.18,type:'triangle',gain:.07});},
    page(){noise({dur:.075,gain:.022,filter:2400});},
    fidget(){tone({freq:520,endFreq:470,dur:.035,type:'sine',gain:.018});},
    click(){tone({freq:390,endFreq:340,dur:.035,type:'triangle',gain:.018});}
  };

  function values(selector){return [...document.querySelectorAll(selector)].map(el=>Number((el.textContent.match(/-?\d+/)||[])[0]||0));}
  function watchState(){
    const res=values('.handResourceStrip .resourceChip b');
    const hearth=values('.hearthMedallion > b');
    if(lastResources&&res.length===lastResources.length&&res.some((v,i)=>v!==lastResources[i]))SFX.resource();
    if(lastHearth&&hearth.length===lastHearth.length&&hearth.some((v,i)=>v<lastHearth[i]))SFX.hearth();
    if(res.length)lastResources=res;if(hearth.length)lastHearth=hearth;
  }

  function mountControls(){
    const host=document.querySelector('.topControls');
    if(!host||host.querySelector('.audioControls')){watchState();return;}
    const wrap=document.createElement('div');wrap.className='audioControls';
    wrap.innerHTML=`<button type="button" class="sfxMute" title="Toggle sound effects" aria-label="Toggle sound effects">${muted?'🔇':'🔊'}</button><input class="sfxVolume" type="range" min="0" max="100" step="1" value="${Math.round(volume*100)}" aria-label="Sound effects volume" title="SFX volume">`;
    host.prepend(wrap);
    const muteBtn=wrap.querySelector('.sfxMute'),slider=wrap.querySelector('.sfxVolume');
    muteBtn.addEventListener('click',e=>{e.stopPropagation();ensureAudio();muted=!muted;muteBtn.textContent=muted?'🔇':'🔊';master?.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.012);save();});
    slider.addEventListener('input',()=>{ensureAudio();volume=Number(slider.value)/100;if(volume>0)muted=false;muteBtn.textContent=muted?'🔇':'🔊';master?.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.012);save();});
    watchState();
  }

  document.addEventListener('pointerdown',e=>{
    ensureAudio();
    const card=e.target.closest('.recruitDraggable,.attackDraggable,.blockDraggable');
    if(card){dragKind=card.classList.contains('recruitDraggable')?'recruit':card.classList.contains('blockDraggable')?'block':'attack';SFX.pickup();}
  },{passive:true});
  document.addEventListener('pointerup',()=>{
    if(!dragKind)return;
    const k=dragKind;dragKind=null;
    if(k==='recruit')SFX.recruit();else if(k==='block')SFX.block();else SFX.attack();
    SFX.drop();
  },{passive:true});
  document.addEventListener('click',e=>{
    const t=e.target;
    if(t.closest('.tableFidget')){SFX.fidget();return;}
    if(t.closest('.blueprintDeckRail,.utilityButtons button')){SFX.page();return;}
    const bp=t.closest('.blueprintCard button:not(:disabled)');if(bp){SFX.build();return;}
    const primary=t.closest('.primaryBtn');if(primary&&/declare attack/i.test(primary.textContent)){SFX.attack();return;}
    if(t.closest('.closeButton,.endTurnButton,.keeperChip,.resetButton'))SFX.click();
  });

  const app=document.getElementById('app');
  if(app){const observer=new MutationObserver(()=>mountControls());observer.observe(app,{childList:true,subtree:true});}
  window.HNH_SFX={play:name=>SFX[name]?.(),setMuted:v=>{muted=!!v;save();mountControls();},get settings(){return{muted,volume}}};
  mountControls();
})();
'''
p.write_text(s)

p=Path('styles.css')
s=p.read_text()
s += r'''

/* ===== tactile SFX controls ===== */
.audioControls{display:flex;align-items:center;gap:5px;padding:3px 6px;border:1px solid #c7b58d;border-radius:999px;background:rgba(255,248,229,.72)}
.audioControls .sfxMute{padding:4px 5px;min-width:28px;border:0;background:transparent;color:#2d332c;box-shadow:none;font-size:14px;line-height:1}
.audioControls .sfxMute:hover{transform:none;background:rgba(91,110,78,.1)}
.audioControls .sfxVolume{width:72px;height:4px;accent-color:#627a54;cursor:pointer}
@media(max-width:900px){.audioControls .sfxVolume{display:none}.audioControls{padding:2px 4px}}
'''
p.write_text(s)

p=Path('index.html')
s=p.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
s += r'''
assert(client.includes('tactile SFX v1')&&client.includes('window.HNH_SFX'),'SFX manager missing');
assert(client.includes("pickup(){")&&client.includes("recruit(){")&&client.includes("build(){")&&client.includes("attack(){")&&client.includes("block(){")&&client.includes("resource(){")&&client.includes("hearth(){"),'core tactile SFX palette incomplete');
assert(client.includes("localStorage.getItem(STORAGE_KEY)")&&client.includes('sfxVolume'),'SFX persistence or volume controls missing');
assert(styles.includes('.audioControls')&&styles.includes('.sfxVolume'),'SFX control styling missing');
console.log('✓ tactile SFX manager, event hooks, mute and volume controls present');
'''
p.write_text(s)

for tp in Path('tests').glob('*.js'):
    t=tp.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
    tp.write_text(t)
