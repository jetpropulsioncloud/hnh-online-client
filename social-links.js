(() => {
  const LINKS = [
    {site:'reddit', label:'Reddit', handle:'r/HearthAndHollow', url:'https://www.reddit.com/r/HearthAndHollow/'},
    {site:'bluesky', label:'Bluesky', handle:'@hearth-n-hollow.bsky.social', url:'https://bsky.app/profile/hearth-n-hollow.bsky.social'},
    {site:'itch', label:'itch.io', handle:'hearth-and-hollow.itch.io', url:'https://hearth-and-hollow.itch.io/hearth-hollow'}
  ];

  function anchor(link, compact=false){
    const a=document.createElement('a');
    a.href=link.url;
    a.target='_blank';
    a.rel='noopener noreferrer';
    a.dataset.site=link.site;
    a.setAttribute('aria-label',`${link.label}: ${link.handle}`);
    if(compact){
      a.textContent=link.label;
      a.title=`${link.label} · ${link.handle}`;
    }else{
      const b=document.createElement('b');b.textContent=link.label;
      const span=document.createElement('span');span.textContent=link.handle;
      a.append(b,span);
    }
    return a;
  }

  function ensureSetupLinks(){
    const card=document.querySelector('.setupCard');
    if(!card)return;
    if(card.querySelector('.communitySetup'))return;
    const wrap=document.createElement('div');
    wrap.className='communitySetup';
    const title=document.createElement('small');
    title.textContent='Follow Hearth & Hollow';
    const row=document.createElement('div');
    row.className='communitySetupLinks';
    LINKS.forEach(link=>row.appendChild(anchor(link,false)));
    wrap.append(title,row);
    card.appendChild(wrap);
  }

  function ensureGameLinks(){
    const utilities=document.querySelector('.utilityButtons');
    if(!utilities)return;
    const topbar=utilities.closest('.tableTopbar')||utilities.parentElement;
    if(topbar?.querySelector('.communityMini'))return;
    const mini=document.createElement('div');
    mini.className='communityMini';
    mini.setAttribute('aria-label','Hearth & Hollow community links');
    LINKS.forEach(link=>mini.appendChild(anchor(link,true)));
    utilities.prepend(mini);
  }

  function sync(){
    ensureSetupLinks();
    ensureGameLinks();
  }

  const app=document.getElementById('app');
  if(app){
    const observer=new MutationObserver(()=>requestAnimationFrame(sync));
    observer.observe(app,{childList:true,subtree:true});
  }
  sync();
})();
