(() => {
  const app=document.getElementById('app');
  if(!app)return;

  let raf=0;
  let resizeObserver=null;
  let observedStage=null;

  function unlockSetup(){
    document.documentElement.classList.remove('hhMatchLocked');
    document.body.classList.remove('hhMatchLocked');
  }

  function ensureStage(){
    const client=app.querySelector('.client');
    if(!client){unlockSetup();return null;}

    document.documentElement.classList.add('hhMatchLocked');
    document.body.classList.add('hhMatchLocked');

    let stage=client.querySelector(':scope > .hhViewportStage');
    if(!stage){
      stage=document.createElement('div');
      stage.className='hhViewportStage';
      const nodes=[
        client.querySelector(':scope > .tableTopbar'),
        client.querySelector(':scope > .tableSurface'),
        client.querySelector(':scope > .handDock')
      ].filter(Boolean);
      nodes.forEach(node=>stage.appendChild(node));
      client.insertBefore(stage,client.firstChild);
    }

    if(observedStage!==stage&&window.ResizeObserver){
      resizeObserver?.disconnect();
      resizeObserver=new ResizeObserver(()=>scheduleFit());
      resizeObserver.observe(stage);
      observedStage=stage;
    }
    return stage;
  }

  function visibleViewport(){
    const vv=window.visualViewport;
    return {
      width:Math.max(1,vv?.width||window.innerWidth||document.documentElement.clientWidth||1),
      height:Math.max(1,vv?.height||window.innerHeight||document.documentElement.clientHeight||1)
    };
  }

  function fit(){
    const stage=ensureStage();
    if(!stage)return;

    /* Measure at 1:1 so the chosen scale is stable and cannot feed back into
       its own measurement. */
    stage.style.setProperty('--hh-table-scale','1');
    const naturalWidth=Math.max(stage.scrollWidth,stage.offsetWidth,1);
    const naturalHeight=Math.max(stage.scrollHeight,stage.offsetHeight,1);
    const viewport=visibleViewport();
    const safeWidth=Math.max(1,viewport.width-8);
    const safeHeight=Math.max(1,viewport.height-6);
    const scale=Math.max(0.01,Math.min(1,safeWidth/naturalWidth,safeHeight/naturalHeight));
    stage.style.setProperty('--hh-table-scale',scale.toFixed(4));
    stage.dataset.tableScale=scale.toFixed(4);

    const brandVersion=stage.querySelector('.brandBlock > span');
    if(brandVersion)brandVersion.textContent='Client v0.7.1 · Rules v0.6.2';

    /* The deck-placement layer already knows how to anchor its fixed piles to
       the table's visible bounding box. A synthetic scroll event asks it to
       recalculate after the transform without moving the browser page. */
    requestAnimationFrame(()=>window.dispatchEvent(new Event('scroll')));
  }

  function scheduleFit(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(fit);
  }

  const observer=new MutationObserver(scheduleFit);
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('resize',scheduleFit,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleFit,{passive:true});

  /* Browser scroll is never used for an active match. Reset any pre-existing
     setup-page scroll once, then rely on overflow locking rather than stealing
     click/wheel/pointer events. */
  if(app.querySelector('.client'))window.scrollTo(0,0);
  scheduleFit();
})();
