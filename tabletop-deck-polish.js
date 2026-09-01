(() => {
  const fieldRail=document.querySelector('.fieldDeckRail');
  const blueprintRail=document.querySelector('.blueprintDeckRail');
  if(!fieldRail||!blueprintRail)return;

  const STORAGE_PREFIX='hnh.deckRail.v1.';
  const DRAG_THRESHOLD=5;
  const EDGE_PAD=8;
  let tutorialDone=false;
  let wasInGame=false;
  let syncTimer=null;
  let suppressClickUntil=0;

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
    const width=r.width||142,height=r.height||226;
    return {
      x:Math.max(EDGE_PAD,Math.min(window.innerWidth-width-EDGE_PAD,x)),
      y:Math.max(EDGE_PAD,Math.min(window.innerHeight-height-EDGE_PAD,y))
    };
  }

  function setUserPosition(rail,x,y,{save=false}={}){
    const p=clampPoint(rail,x,y);
    rail.classList.add('deckRailUserPositioned');
    rail.style.left=`${Math.round(p.x)}px`;
    rail.style.top=`${Math.round(p.y)}px`;
    rail.style.right='auto';
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
    rail.classList.remove('deckRailUserPositioned','deckRailDragging');
    rail.style.left='';
    rail.style.top='';
    rail.style.right='';
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
      const fw=fieldRail.getBoundingClientRect().width||142;
      const left=Math.max(EDGE_PAD,rect.left-fw-gap);
      fieldRail.style.left=`${Math.round(left)}px`;
      fieldRail.style.right='auto';
    }

    if(!blueprintRail.classList.contains('deckRailUserPositioned')){
      const bw=blueprintRail.getBoundingClientRect().width||142;
      const left=Math.min(window.innerWidth-bw-EDGE_PAD,rect.right+gap);
      blueprintRail.style.left=`${Math.round(left)}px`;
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
    const w=coach.getBoundingClientRect().width||230;
    let left=r.left+r.width/2-w/2;
    left=Math.max(EDGE_PAD,Math.min(window.innerWidth-w-EDGE_PAD,left));
    let top=r.top-(coach.getBoundingClientRect().height||62)-15;
    if(top<EDGE_PAD)top=Math.min(window.innerHeight-(coach.getBoundingClientRect().height||62)-EDGE_PAD,r.bottom+15);
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

  function installDrag(rail){
    let pointerId=null,startX=0,startY=0,offsetX=0,offsetY=0,dragging=false;

    rail.title='Drag to move · double-click to reset';

    rail.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      pointerId=event.pointerId;
      const r=rail.getBoundingClientRect();
      startX=event.clientX;startY=event.clientY;
      offsetX=event.clientX-r.left;offsetY=event.clientY-r.top;
      dragging=false;
      try{rail.setPointerCapture(pointerId);}catch{}
    });

    rail.addEventListener('pointermove',event=>{
      if(pointerId===null||event.pointerId!==pointerId)return;
      const distance=Math.hypot(event.clientX-startX,event.clientY-startY);
      if(!dragging&&distance<DRAG_THRESHOLD)return;
      if(!dragging){
        dragging=true;
        const r=rail.getBoundingClientRect();
        rail.classList.add('deckRailUserPositioned','deckRailDragging');
        rail.style.left=`${Math.round(r.left)}px`;
        rail.style.top=`${Math.round(r.top)}px`;
        rail.style.right='auto';
      }
      event.preventDefault();
      setUserPosition(rail,event.clientX-offsetX,event.clientY-offsetY);
    });

    const finish=event=>{
      if(pointerId===null||event.pointerId!==pointerId)return;
      if(dragging){
        const r=rail.getBoundingClientRect();
        setUserPosition(rail,r.left,r.top,{save:true});
        suppressClickUntil=Date.now()+300;
      }
      rail.classList.remove('deckRailDragging');
      try{rail.releasePointerCapture(pointerId);}catch{}
      pointerId=null;dragging=false;
    };

    rail.addEventListener('pointerup',finish);
    rail.addEventListener('pointercancel',finish);

    rail.addEventListener('click',event=>{
      if(Date.now()<suppressClickUntil){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);

    rail.addEventListener('dblclick',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil=Date.now()+300;
      resetRail(rail);
    },true);
  }

  function sync(){
    positionRails();
    syncTutorial();
    const brandVersion=document.querySelector('.brandBlock > span');
    if(brandVersion)brandVersion.textContent='Client v0.6.5 · Rules v0.6.2';
  }

  installDrag(fieldRail);
  installDrag(blueprintRail);
  restoreStoredPosition(fieldRail);
  restoreStoredPosition(blueprintRail);

  blueprintRail.addEventListener('click',()=>{
    if(Date.now()<suppressClickUntil)return;
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
    if(fieldRail.classList.contains('deckRailUserPositioned')||blueprintRail.classList.contains('deckRailUserPositioned'))clampUserRails();
    positionRails();
    positionCoach();
  }));
  window.addEventListener('scroll',()=>requestAnimationFrame(()=>{positionRails();positionCoach();}),{passive:true});

  sync();
})();
