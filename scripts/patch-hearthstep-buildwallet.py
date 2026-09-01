from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old, new, 1)

# ---- client.js ----
client_path=Path('client.js')
client=client_path.read_text()

client=client.replace('Client v0.7.6 · Rules v0.6.2','Client v0.7.7 · Rules v0.6.2')
client=client.replace("version:'0.7.6'","version:'0.7.7'")

old="""return `<div class=\"drawerHeader\"><div><span class=\"eyebrow\">BUILD BOOK</span><h2>Blueprints <small>${12-p.usedBlueprints.length}/12</small></h2></div><button class=\"closeButton\" onclick=\"UI.drawer(null)\">×</button></div><p class=\"drawerLead\">Your twelve known village plans. Build from here during Build.</p><div class=\"blueprintGrid\">${f.blueprints.map(bp=>{"""
new="""return `<div class=\"drawerHeader\"><div><span class=\"eyebrow\">BUILD BOOK</span><h2>Blueprints <small>${12-p.usedBlueprints.length}/12</small></h2></div><button class=\"closeButton\" onclick=\"UI.drawer(null)\">×</button></div><p class=\"drawerLead\">Your twelve known village plans. Build from here during Build.</p><div class=\"buildWallet\"><span class=\"buildWalletLabel\">YOUR RESOURCES</span>${resources(p)}</div><div class=\"blueprintGrid\">${f.blueprints.map(bp=>{"""
client=replace_once(client,old,new,'Blueprint resource wallet')

hearthstep = r'''

/* ===== Hearthstep tabletop fidget ===== */
(() => {
  const app=document.getElementById('app');
  if(!app)return;

  const trail=document.createElement('div');
  trail.className='hearthstepTrail';
  trail.setAttribute('aria-label','Hearthstep fidget. No gameplay effect.');
  trail.innerHTML=`
    <div class="hearthstepTitle"><b>Hearthstep</b><small>fidget · no game effect</small></div>
    <div class="hearthstepCourse" role="group" aria-label="Hearthstep trail">
      <button class="hearthstepStep" type="button" aria-label="Hop to stump">🪵</button>
      <button class="hearthstepStep" type="button" aria-label="Hop to stone">🪨</button>
      <button class="hearthstepStep" type="button" aria-label="Hop to mushroom">🍄</button>
      <button class="hearthstepStep" type="button" aria-label="Hop to moss">🌿</button>
      <span class="hearthstepAcorn" role="button" tabindex="0" aria-label="Little acorn. Drag it or use arrow keys.">🌰</span>
    </div>`;
  document.body.appendChild(trail);

  const course=trail.querySelector('.hearthstepCourse');
  const acorn=trail.querySelector('.hearthstepAcorn');
  const steps=[...trail.querySelectorAll('.hearthstepStep')];
  let position=0;
  let dragging=false;

  function stepCenter(index){
    const step=steps[index],cr=course.getBoundingClientRect(),sr=step.getBoundingClientRect();
    return {x:sr.left-cr.left+sr.width/2,y:sr.top-cr.top+sr.height/2};
  }

  function place(index,{hop=true}={}){
    position=Math.max(0,Math.min(steps.length-1,index));
    const {x,y}=stepCenter(position);
    acorn.style.left=`${x}px`;
    acorn.style.top=`${y}px`;
    steps.forEach((step,i)=>step.classList.toggle('landed',i===position));
    if(hop){
      acorn.classList.remove('hop');
      void acorn.offsetWidth;
      acorn.classList.add('hop');
      steps[position].classList.remove('tap');
      void steps[position].offsetWidth;
      steps[position].classList.add('tap');
    }
  }

  steps.forEach((step,index)=>step.addEventListener('click',()=>place(index)));

  acorn.addEventListener('pointerdown',event=>{
    dragging=true;
    acorn.classList.add('dragging');
    event.preventDefault();
  });

  document.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const r=course.getBoundingClientRect();
    const x=Math.max(12,Math.min(r.width-12,event.clientX-r.left));
    const y=Math.max(10,Math.min(r.height-10,event.clientY-r.top));
    acorn.style.left=`${x}px`;
    acorn.style.top=`${y}px`;
  });

  function finishDrag(event){
    if(!dragging)return;
    dragging=false;
    acorn.classList.remove('dragging');
    const r=course.getBoundingClientRect();
    const x=event.clientX-r.left;
    let best=0,bestDist=Infinity;
    steps.forEach((_,i)=>{
      const d=Math.abs(stepCenter(i).x-x);
      if(d<bestDist){bestDist=d;best=i;}
    });
    place(best);
  }
  document.addEventListener('pointerup',finishDrag);
  document.addEventListener('pointercancel',finishDrag);

  acorn.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();
      place(position+(event.key==='ArrowRight'?1:-1));
    }else if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      place(position);
    }
  });

  function sync(){
    const inGame=Boolean(document.querySelector('.client'));
    trail.classList.toggle('visible',inGame);
    if(inGame)requestAnimationFrame(()=>place(position,{hop:false}));
  }
  window.addEventListener('resize',()=>{if(trail.classList.contains('visible'))place(position,{hop:false});});
  new MutationObserver(sync).observe(app,{childList:true,subtree:true});
  sync();
})();
'''
if '/* ===== Hearthstep tabletop fidget ===== */' not in client:
    client += hearthstep
client_path.write_text(client)

# ---- styles.css ----
styles_path=Path('styles.css')
styles=styles_path.read_text()
styles += r'''

/* ===== Build Book resource wallet ===== */
.buildWallet{position:sticky;top:0;z-index:8;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0 12px;padding:9px 11px;border:1px solid #b9a274;border-radius:12px;background:linear-gradient(180deg,#fffaf0,#eee4cf);box-shadow:0 5px 14px rgba(39,34,25,.14)}
.buildWalletLabel{font-size:8px;letter-spacing:.13em;font-weight:900;color:#746a55;white-space:nowrap}
.buildWallet .resourceRow{justify-content:flex-end}
.buildWallet .resourceChip{min-width:52px;background:#fff9e8;box-shadow:inset 0 1px #fff,0 1px 3px rgba(47,41,30,.08)}
.buildWallet .resourceChip span{font-size:18px}.buildWallet .resourceChip b{font-size:15px}

/* ===== Hearthstep fidget ===== */
.hearthstepTrail{position:fixed;left:50%;bottom:246px;z-index:34;width:286px;transform:translate(-50%,10px);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease;filter:drop-shadow(0 5px 8px rgba(24,24,19,.2))}
.hearthstepTrail.visible{opacity:.88;transform:translate(-50%,0);pointer-events:auto}
.hearthstepTrail:hover,.hearthstepTrail:focus-within{opacity:1}
.hearthstepTitle{display:flex;justify-content:center;align-items:baseline;gap:6px;margin-bottom:3px;color:#efe6d0;text-shadow:0 1px 2px rgba(0,0,0,.45)}
.hearthstepTitle b{font:800 10px Georgia,serif;letter-spacing:.04em}.hearthstepTitle small{font-size:7px;opacity:.72}
.hearthstepCourse{position:relative;height:42px;border:1px solid rgba(231,218,187,.22);border-radius:999px;background:rgba(43,48,39,.62);backdrop-filter:blur(4px);box-shadow:inset 0 1px rgba(255,255,255,.05);display:grid;grid-template-columns:repeat(4,1fr);align-items:center;padding:0 18px}
.hearthstepCourse::before{content:'';position:absolute;left:36px;right:36px;top:50%;border-top:1px dashed rgba(225,211,175,.22)}
.hearthstepStep{position:relative;z-index:1;justify-self:center;width:30px;height:30px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(245,235,211,.12);border:1px solid rgba(238,222,186,.18);font-size:16px;box-shadow:none;filter:none;transition:transform .12s ease,background .12s ease}
.hearthstepStep:hover:not(:disabled){transform:translateY(-2px) scale(1.05);filter:none;background:rgba(245,235,211,.2)}
.hearthstepStep.landed{background:rgba(219,203,162,.18)}
.hearthstepStep.tap{animation:hearthstepPad .28s ease}
.hearthstepAcorn{position:absolute;z-index:3;left:0;top:0;transform:translate(-50%,-50%);font-size:21px;line-height:1;cursor:grab;user-select:none;touch-action:none;filter:drop-shadow(0 2px 1px rgba(0,0,0,.3));outline:none}
.hearthstepAcorn:focus-visible{border-radius:50%;box-shadow:0 0 0 2px #f5e2a8}
.hearthstepAcorn.dragging{cursor:grabbing;transform:translate(-50%,-50%) scale(1.1)}
.hearthstepAcorn.hop{animation:hearthstepHop .34s cubic-bezier(.2,.8,.2,1)}
@keyframes hearthstepHop{0%{transform:translate(-50%,-50%) scale(1)}42%{transform:translate(-50%,-95%) scale(1.08,.92)}72%{transform:translate(-50%,-56%) scale(.95,1.06)}100%{transform:translate(-50%,-50%) scale(1)}}
@keyframes hearthstepPad{0%,100%{transform:scale(1)}50%{transform:scale(.88)}}
@media (max-width:760px){.hearthstepTrail{width:238px;bottom:232px}.hearthstepCourse{padding:0 10px}.hearthstepTitle small{display:none}}
@media (max-height:700px){.hearthstepTrail{bottom:205px;transform:translate(-50%,10px) scale(.9);transform-origin:bottom center}.hearthstepTrail.visible{transform:translate(-50%,0) scale(.9)}}
'''
styles_path.write_text(styles)

# ---- index.html ----
index_path=Path('index.html')
index=index_path.read_text().replace('v0.7.6','v0.7.7').replace('?v=076','?v=077')
index_path.write_text(index)

# ---- tests ----
smoke_path=Path('tests/smoke-test.js')
smoke=smoke_path.read_text().replace('?v=076','?v=077').replace('Tabletop Client v0.7.6','Tabletop Client v0.7.7')
smoke_path.write_text(smoke)

ui_path=Path('tests/ui-coordinator-test.js')
ui=ui_path.read_text().replace('?v=076','?v=077').replace("version:'0.7.6'","version:'0.7.7'").replace('Tabletop Client v0.7.6','Tabletop Client v0.7.7')
if "const styles=fs.readFileSync('styles.css','utf8');" not in ui:
    ui=ui.replace("const client=fs.readFileSync('client.js','utf8');","const client=fs.readFileSync('client.js','utf8');\nconst styles=fs.readFileSync('styles.css','utf8');")
checks="""
assert(client.includes('buildWallet')&&client.includes('YOUR RESOURCES'),'Build Book must show the active player resource wallet');
assert(styles.includes('.buildWallet'),'Build Book resource wallet styling missing');
assert(client.includes('Hearthstep tabletop fidget')&&client.includes('hearthstepTrail'),'Hearthstep fidget runtime missing');
assert(styles.includes('.hearthstepTrail')&&styles.includes('@keyframes hearthstepHop'),'Hearthstep fidget styling/animation missing');
console.log('✓ Build Book resource wallet and Hearthstep fidget');
"""
if 'Build Book resource wallet and Hearthstep fidget' not in ui:
    ui += checks
ui_path.write_text(ui)

print('v0.7.7 Hearthstep + Build Book wallet patch complete')
