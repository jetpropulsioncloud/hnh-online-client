(() => {
  const fieldRail=document.querySelector('.fieldDeckRail');
  const blueprintRail=document.querySelector('.blueprintDeckRail');
  if(!fieldRail||!blueprintRail)return;

  let tutorialDone=false;
  let wasInGame=false;
  let syncTimer=null;

  const coach=document.createElement('div');
  coach.className='blueprintCoach';
  coach.innerHTML='<strong>Start here ✨</strong><span>Open your Blueprint Deck to build your village.</span>';
  document.body.appendChild(coach);

  function phase(){return document.querySelector('.phasePip.on')?.textContent?.trim()||'';}
  function inGame(){return Boolean(document.querySelector('.client'));}
  function playerCanAct(){return !document.querySelector('.aiThinking');}

  function positionRails(){
    if(!inGame())return;
    const table=document.querySelector('.tableSurface');
    if(!table)return;

    // Keep both piles just OUTSIDE the playmat instead of covering Village/Field lanes.
    // The 16px gap keeps them visually attached to the table without stealing board space.
    const rect=table.getBoundingClientRect();
    const gap=16;
    const fw=fieldRail.getBoundingClientRect().width||142;
    const bw=blueprintRail.getBoundingClientRect().width||142;
    const left=Math.max(8,rect.left-fw-gap);
    const right=Math.min(window.innerWidth-bw-8,rect.right+gap);

    fieldRail.style.left=`${Math.round(left)}px`;
    fieldRail.style.right='auto';
    blueprintRail.style.left=`${Math.round(right)}px`;
    blueprintRail.style.right='auto';
  }

  function positionCoach(){
    if(!coach.classList.contains('show'))return;
    const r=blueprintRail.getBoundingClientRect();
    const w=coach.getBoundingClientRect().width||230;
    let left=r.left+r.width/2-w/2;
    left=Math.max(8,Math.min(window.innerWidth-w-8,left));
    const top=Math.max(8,r.top-(coach.getBoundingClientRect().height||62)-15);
    coach.style.left=`${Math.round(left)}px`;
    coach.style.top=`${Math.round(top)}px`;
  }

  function syncTutorial(){
    const playing=inGame();
    if(playing&&!wasInGame)tutorialDone=false;
    if(!playing)tutorialDone=false;

    // If the Build Book is already open, the player found it; stop coaching this match.
    if(document.querySelector('.blueprintGrid'))tutorialDone=true;

    // Teach the system the first time the human reaches Build, rather than glowing forever.
    const show=playing&&!tutorialDone&&phase()==='Build'&&playerCanAct();
    blueprintRail.classList.toggle('newPlayerGuide',show);
    coach.classList.toggle('show',show);
    if(show)positionCoach();
    wasInGame=playing;
  }

  function sync(){
    positionRails();
    syncTutorial();
  }

  blueprintRail.addEventListener('click',()=>{
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

  window.addEventListener('resize',()=>requestAnimationFrame(sync));
  window.addEventListener('scroll',()=>requestAnimationFrame(()=>{positionRails();positionCoach();}),{passive:true});

  sync();
})();
