(() => {
  function syncFixedTabletop(){
    const brandVersion=document.querySelector('.brandBlock > span');
    if(brandVersion)brandVersion.textContent='Client v0.6.8 · Rules v0.6.2';
  }

  const app=document.getElementById('app');
  if(app){
    const observer=new MutationObserver(()=>requestAnimationFrame(syncFixedTabletop));
    observer.observe(app,{childList:true,subtree:true});
  }

  // The match should behave like a fixed game canvas, not a webpage.
  // Keep accidental browser-level scroll position pinned at the origin.
  window.addEventListener('scroll',()=>{
    if(document.querySelector('.client')&&(window.scrollX!==0||window.scrollY!==0))window.scrollTo(0,0);
  },{passive:true});

  syncFixedTabletop();
})();
