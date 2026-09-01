(() => {
  const E=window.HNH_ENGINE;
  const app=document.getElementById('app');
  if(!E||!app)return;
  let overlay=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const icon=c=>c?.type==='Critter'?'🐾':c?.subtype==='Tool'?'🧰':c?.subtype==='Reaction'?'⚡':c?.subtype==='Supply'?'🎒':'🏡';

  function game(){return window.HNH_CURRENT_GAME||null;}
  function cardHTML(card){
    if(!card)return '';
    const type=card.type==='Critter'?`Muster — ${(card.musterClasses||[]).join(' · ')}`:(card.subtype||card.type||'Card');
    const stats=card.type==='Critter'?`<div class="abilityCardStats"><span>💪 ${card.might??'-'}</span><span>❤️ ${card.grit??'-'}</span>${card.advanced?'<span>ADVANCED</span>':''}</div>`:'';
    return `<div class="abilityCardArt">${icon(card)}</div><div class="abilityCardBody"><b>${esc(card.name)}</b><small>${esc(type)}</small>${stats}<p>${esc(card.text||'')}</p></div>`;
  }

  function choose(id,selection){
    const g=game(),choice=g&&E.pendingAbilityChoice?.(g);if(!g||!choice)return;
    const result=E.resolveAbilityChoice(g,choice.playerIndex,id,String(selection));
    if(result?.ok===false){console.warn(result.reason);return;}
    if(window.UI?.drawer)window.UI.drawer(null);
    else sync();
  }

  function syncVersion(){
    const el=document.querySelector('.brandBlock > span');
    if(el)el.textContent='Client v0.7.0 · Rules v0.6.2';
  }

  function sync(){
    syncVersion();
    const g=game(),choice=g&&E.pendingAbilityChoice?.(g);
    const humanChoice=choice&&!(g.mode==='ai'&&choice.playerIndex===g.aiIndex)?choice:null;
    if(!humanChoice){
      if(overlay){overlay.remove();overlay=null;document.body.classList.remove('abilityChoiceOpen');}
      return;
    }
    if(overlay?.dataset.choiceId===humanChoice.id)return;
    overlay?.remove();
    overlay=document.createElement('div');overlay.className='abilityChoiceBack';overlay.dataset.choiceId=humanChoice.id;
    const options=humanChoice.options.map(o=>{
      if(o.id==='skip')return `<button class="abilityOption abilityOptionSkip" data-choice="${esc(o.id)}">${esc(o.label)}</button>`;
      if(o.card)return `<button class="abilityOption abilityOptionCard" data-choice="${esc(o.id)}">${cardHTML(o.card)}</button>`;
      return `<button class="abilityOption" data-choice="${esc(o.id)}"><b>${esc(o.label)}</b></button>`;
    }).join('');
    overlay.innerHTML=`<section class="abilityChoicePanel" role="dialog" aria-modal="true" aria-labelledby="ability-choice-title"><span class="abilityChoiceEyebrow">CARD ABILITY · CHOOSE</span><h2 id="ability-choice-title">${esc(humanChoice.title)}</h2><p>${esc(humanChoice.prompt)}</p><div class="abilityOptions">${options}</div><div class="abilityChoiceHint">The game is paused until this printed choice is resolved.</div></section>`;
    overlay.addEventListener('click',e=>{
      const btn=e.target.closest('[data-choice]');if(btn)choose(humanChoice.id,btn.dataset.choice);
    });
    document.body.appendChild(overlay);document.body.classList.add('abilityChoiceOpen');
  }

  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!overlay)return;
    const g=game(),choice=g&&E.pendingAbilityChoice?.(g),skip=choice?.options?.find(o=>o.id==='skip');
    if(skip){e.preventDefault();choose(choice.id,'skip');}
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(app,{childList:true,subtree:true});
  window.HNH_ABILITY_UI={sync,choose};
  sync();
})();
