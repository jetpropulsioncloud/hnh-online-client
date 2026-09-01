(() => {
  const fieldRail=document.querySelector('.fieldDeckRail');
  const blueprintRail=document.querySelector('.blueprintDeckRail');
  if(!fieldRail||!blueprintRail)return;

  const STORAGE_PREFIX='hnh.deckRail.v2.';
  const DRAG_THRESHOLD=6;
  const EDGE_PAD=8;
  let tutorialDone=false;
  let wasInGame=false;
  let syncTimer=null;
  let activeDrag=null;
  const suppressClickUntil=new WeakMap();

  [fieldRail,blueprintRail].forEach(rail=>{
    rail.draggable=false;
    rail.setAttribute('aria-describedby','deck-drag-help');
    if(!rail.querySelector('.deckDragHandle')){
      const hint=document.createElement('span');
      hint.className='deckDragHandle';
      hint.textContent='↕ drag';
      rail.appendChild(hint);
    }
  });

  const blueprintSmall=blueprintRail.querySelector('.sideDeckLabel small');
  if(blueprintSmall)blueprintSmall.textContent='plans remaining';
  const buildCallout=blueprintRail.querySelector('.buildBookCallout');
  if(buildCallout)buildCallout.textContent='CLICK TO OPEN';

  const dragHelp=document.createElement('span');
  dragHelp.id='deck-drag-help';
  dragHelp.className='srOnlyDeckHelp';
  dragHelp.textContent='Drag this deck pile to move it. Right-click or double-click to reset its position.';
  document.body.appendChild(dragHelp);

  const coach=document.createElement('div');
  coach.className='blueprintCoach';
  coach.innerHTML='<strong>Start here ✨</strong><span>Open your Blueprint Deck to build your village.</span>';
  document.body.appendChild(coach);

  function phase(){return document.querySelector('.phasePip.on')?.textContent?.trim()||'';}
  function inGame(){return Boolean(document.querySelector('.client'));}
  function playerCanAct(){return !document.querySelector('.aiThinking');}
  function keyFor(rail){return `${STORAGE_PREFIX}${rail===fieldRail?'field':'blueprint'}`;}

  function readStored(rail){
    try{
      const raw=localStorage.getItem(keyFor(rail));
      if(!raw)return null;
      const pos=JSON.parse(raw);
      if(!Number.isFinite(pos?.x)||!Number.isFinite(pos?.y))return null;
      return pos;
    }catch{return null;}
  }

  function saveStored(rail,x,y){
    try{localStorage.setItem(keyFor(rail),JSON.stringify({x:Math.round(x),y:Math.round(y)}));}catch{}
  }

  function clearStored(rail){
    try{localStorage.removeItem(keyFor(rail));}catch{}
  }

  function clampPoint(rail,x,y){
    const r=rail.getBoundingClientRect();
    const width=r.width||150,height=r.height||236;
    return {
      x:Math.max(EDGE_PAD,Math.min(Math.max(EDGE_PAD,window.innerWidth-width-EDGE_PAD),x)),
      y:Math.max(EDGE_PAD,Math.min(Math.max(EDGE_PAD,window.innerHeight-height-EDGE_PAD),y))
    };
  }

  function setUserPosition(rail,x,y,{save=false}={}){
    const p=clampPoint(rail,x,y);
    rail.classList.add('deckRailUserPositioned');
    rail.style.left=`${Math.round(p.x)}px`;
    rail.style.top=`${Math.round(p.y)}px`;
    rail.style.right='auto';
    rail.style.bottom='auto';
    if(save)saveStored(rail,p.x,p.y);
    if(rail===blueprintRail)positionCoach();
  }

  function restoreStoredPosition(rail){
    const stored=readStored(rail);
    if(!stored)return false;
    setUserPosition(rail,stored.x,stored.y);
    return true;
  }

  function resetRail(rail){
    clearStored(rail);
    rail.classList.remove('deckRailUserPositioned','deckRailDragging','deckRailPressed');
    rail.style.left='';
    rail.style.top='';
    rail.style.right='';
    rail.style.bottom='';
    positionRails();
    if(rail===blueprintRail)positionCoach();
  }

  function positionRails(){
    if(!inGame())return;
    const table=document.querySelector('.tableSurface');
    if(!table)return;
    const rect=table.getBoundingClientRect();
    const gap=16;

    if(!fieldRail.classList.contains('deckRailUserPositioned')){
      const fw=fieldRail.getBoundingClientRect().width||150;
      fieldRail.style.left=`${Math.round(Math.max(EDGE_PAD,rect.left-fw-gap))}px`;
      fieldRail.style.right='auto';
    }

    if(!blueprintRail.classList.contains('deckRailUserPositioned')){
      const bw=blueprintRail.getBoundingClientRect().width||150;
      blueprintRail.style.left=`${Math.round(Math.min(window.innerWidth-bw-EDGE_PAD,rect.right+gap))}px`;
      blueprintRail.style.right='auto';
    }
  }

  function clampUserRails(){
    [fieldRail,blueprintRail].forEach(rail=>{
      if(!rail.classList.contains('deckRailUserPositioned'))return;
      const r=rail.getBoundingClientRect();
      setUserPosition(rail,r.left,r.top,{save:true});
    });
  }

  function positionCoach(){
    if(!coach.classList.contains('show'))return;
    const r=blueprintRail.getBoundingClientRect();
    const cr=coach.getBoundingClientRect();
    const w=cr.width||230,h=cr.height||62;
    let left=r.left+r.width/2-w/2;
    left=Math.max(EDGE_PAD,Math.min(window.innerWidth-w-EDGE_PAD,left));
    let top=r.top-h-15;
    if(top<EDGE_PAD)top=Math.min(window.innerHeight-h-EDGE_PAD,r.bottom+15);
    coach.style.left=`${Math.round(left)}px`;
    coach.style.top=`${Math.round(top)}px`;
  }

  function syncTutorial(){
    const playing=inGame();
    if(playing&&!wasInGame)tutorialDone=false;
    if(!playing)tutorialDone=false;
    if(document.querySelector('.blueprintGrid'))tutorialDone=true;
    const show=playing&&!tutorialDone&&phase()==='Build'&&playerCanAct();
    blueprintRail.classList.toggle('newPlayerGuide',show);
    coach.classList.toggle('show',show);
    if(show)positionCoach();
    wasInGame=playing;
  }

  function beginDrag(event,rail){
    if(event.button!==0||!inGame())return;
    const r=rail.getBoundingClientRect();
    activeDrag={
      rail,
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      offsetX:event.clientX-r.left,
      offsetY:event.clientY-r.top,
      dragging:false
    };
    rail.classList.add('deckRailPressed');
    try{rail.setPointerCapture(event.pointerId);}catch{}
    event.preventDefault();
  }

  function moveDrag(event){
    const d=activeDrag;
    if(!d||event.pointerId!==d.pointerId)return;
    const distance=Math.hypot(event.clientX-d.startX,event.clientY-d.startY);
    if(!d.dragging&&distance<DRAG_THRESHOLD)return;

    if(!d.dragging){
      d.dragging=true;
      const r=d.rail.getBoundingClientRect();
      d.rail.classList.add('deckRailUserPositioned','deckRailDragging');
      d.rail.classList.remove('deckRailPressed');
      d.rail.style.left=`${Math.round(r.left)}px`;
      d.rail.style.top=`${Math.round(r.top)}px`;
      d.rail.style.right='auto';
      d.rail.style.bottom='auto';
      document.body.classList.add('deckRailDragActive');
    }

    event.preventDefault();
    setUserPosition(d.rail,event.clientX-d.offsetX,event.clientY-d.offsetY);
  }

  function endDrag(event){
    const d=activeDrag;
    if(!d)return;
    if(event&&event.pointerId!==undefined&&event.pointerId!==d.pointerId)return;

    if(d.dragging){
      const r=d.rail.getBoundingClientRect();
      setUserPosition(d.rail,r.left,r.top,{save:true});
      suppressClickUntil.set(d.rail,Date.now()+450);
    }

    d.rail.classList.remove('deckRailDragging','deckRailPressed');
    try{d.rail.releasePointerCapture(d.pointerId);}catch{}
    document.body.classList.remove('deckRailDragActive');
    activeDrag=null;
  }

  function installDrag(rail){
    rail.title='Drag to move · right-click or double-click to reset';
    rail.addEventListener('pointerdown',event=>beginDrag(event,rail));

    rail.addEventListener('click',event=>{
      if(Date.now()<(suppressClickUntil.get(rail)||0)){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);

    const resetEvent=event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil.set(rail,Date.now()+450);
      resetRail(rail);
    };
    rail.addEventListener('dblclick',resetEvent,true);
    rail.addEventListener('contextmenu',resetEvent,true);
  }

  document.addEventListener('pointermove',moveDrag,{capture:true,passive:false});
  document.addEventListener('pointerup',endDrag,true);
  document.addEventListener('pointercancel',endDrag,true);
  window.addEventListener('blur',()=>endDrag());

  function sync(){
    positionRails();
    syncTutorial();
    const brandVersion=document.querySelector('.brandBlock > span');
    if(brandVersion)brandVersion.textContent='Client v0.6.6 · Rules v0.6.2';
  }

  installDrag(fieldRail);
  installDrag(blueprintRail);
  restoreStoredPosition(fieldRail);
  restoreStoredPosition(blueprintRail);

  blueprintRail.addEventListener('click',()=>{
    if(Date.now()<(suppressClickUntil.get(blueprintRail)||0))return;
    tutorialDone=true;
    blueprintRail.classList.remove('newPlayerGuide');
    coach.classList.remove('show');
  },true);

  document.addEventListener('click',event=>{
    const btn=event.target.closest('.utilityButtons button');
    if(btn&&btn.textContent.includes('Blueprints')){
      tutorialDone=true;
      blueprintRail.classList.remove('newPlayerGuide');
      coach.classList.remove('show');
    }
  },true);

  const observer=new MutationObserver(()=>{
    clearTimeout(syncTimer);
    syncTimer=setTimeout(sync,0);
  });
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});

  window.addEventListener('resize',()=>requestAnimationFrame(()=>{
    clampUserRails();
    positionRails();
    positionCoach();
  }));
  window.addEventListener('scroll',()=>requestAnimationFrame(()=>{positionRails();positionCoach();}),{passive:true});

  sync();
})();
