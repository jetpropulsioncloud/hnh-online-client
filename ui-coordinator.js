(() => {
  const app=document.getElementById('app');
  if(!app)return;

  const NativeMutationObserver=window.MutationObserver;
  const appObservers=new Set();

  class CoordinatedMutationObserver {
    constructor(callback){
      this.callback=callback;
      this.native=null;
      this.appObserved=false;
    }
    observe(target,options){
      if(target===app){
        this.appObserved=true;
        appObservers.add(this.callback);
        return;
      }
      this.native=new NativeMutationObserver(this.callback);
      this.native.observe(target,options);
    }
    disconnect(){
      if(this.appObserved){appObservers.delete(this.callback);this.appObserved=false;}
      this.native?.disconnect();
    }
    takeRecords(){return this.native?.takeRecords?.()||[];}
  }

  // Enhancement scripts used to each watch the entire app subtree. Several of
  // them also mutated that same subtree, which could repeatedly wake every
  // other observer. Route app-render notifications through one coordinator
  // instead. Non-app observers still use the browser's native implementation.
  window.MutationObserver=CoordinatedMutationObserver;

  const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  let flushQueued=false;

  function syncVersion(){
    const el=document.querySelector('.brandBlock > span');
    if(el&&el.textContent!=='Client v0.7.3 · Rules v0.6.2')el.textContent='Client v0.7.3 · Rules v0.6.2';
  }

  function flushAppObservers(){
    flushQueued=false;
    for(const callback of [...appObservers]){
      try{callback([],null);}catch(error){console.error('H&H UI observer error',error);}
    }
    // Existing enhancement callbacks use requestAnimationFrame/setTimeout.
    // Set the presentation version after those one-shot syncs settle.
    requestAnimationFrame(()=>setTimeout(syncVersion,0));
  }

  function queueFlush(){
    if(flushQueued)return;
    flushQueued=true;
    queueMicrotask(flushAppObservers);
  }

  if(descriptor?.get&&descriptor?.set){
    Object.defineProperty(app,'innerHTML',{
      configurable:true,
      enumerable:false,
      get(){return descriptor.get.call(this);},
      set(value){descriptor.set.call(this,value);queueFlush();}
    });
  }else{
    // Extremely old-browser fallback: one native observer, still avoiding the
    // many competing subtree observers that caused the original churn.
    const fallback=new NativeMutationObserver(queueFlush);
    fallback.observe(app,{childList:true,subtree:false});
  }

  window.HNH_UI_COORDINATOR={flush:queueFlush,version:'0.7.3'};
  syncVersion();
})();
