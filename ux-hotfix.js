(()=>{
  const init=()=>{
    const portal=document.querySelector('#portal');
    const guide=document.querySelector('#guide');
    const next=document.querySelector('#nextStep');
    if(!portal||!guide||!next)return;

    const style=document.createElement('style');
    style.textContent=`
      .nc-live-guide-note{margin:8px 0 10px;padding:9px 10px;border:1px solid rgba(184,255,90,.28);border-radius:10px;background:rgba(184,255,90,.08);color:#f4f8ef;font-size:.76rem;line-height:1.4}
      .nc-live-guide-note b{color:#b8ff5a}
      #ncEmailWrap[hidden],#ncWhatsappWrap[hidden],.nc-channel-summary{display:none!important}
      @media(max-width:760px){
        body:has(#guide:not([hidden])){padding-bottom:300px}
        #guide:not([hidden]){position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:3000;max-height:42vh;overflow:auto;margin:0!important;padding:14px!important;border:2px solid #b8ff5a!important;border-radius:16px!important;background:#0e1217!important;box-shadow:0 24px 60px rgba(0,0,0,.62)!important}
        #guide:not([hidden]) h3{font-size:1.18rem!important;margin:8px 0 6px!important}
        #guide:not([hidden]) p{min-height:0!important;margin:0 0 8px!important;font-size:.82rem!important}
        #guide:not([hidden]) .guide-actions{grid-template-columns:.8fr 1.2fr!important}
        #guide:not([hidden]) .button{min-height:48px!important}
      }
    `;
    document.head.appendChild(style);

    if(!guide.querySelector('.nc-live-guide-note')){
      const note=document.createElement('div');
      note.className='nc-live-guide-note';
      note.innerHTML='<b>Guía en vivo:</b> hacé la acción marcada en verde. NavegaClaro detecta el cambio y avanza solo al siguiente paso. “Siguiente” queda como respaldo.';
      const actions=guide.querySelector('.guide-actions');
      actions?.insertAdjacentElement('beforebegin',note);
    }

    const syncBookingReminderUi=()=>{
      const emailWrap=portal.querySelector('#ncEmailWrap');
      const whatsappWrap=portal.querySelector('#ncWhatsappWrap');
      const confirm=portal.querySelector('#ncConfirm');
      const selected=portal.querySelector('input[name="ncReminderChannel"]:checked')?.value||'';
      if(emailWrap)emailWrap.hidden=selected!=='email';
      if(whatsappWrap)whatsappWrap.hidden=selected!=='whatsapp';
      if(confirm&&!confirm.disabled)confirm.textContent='Confirmar turno';
      const summary=portal.querySelector('.nc-channel-summary');
      if(summary)summary.hidden=true;
    };

    portal.addEventListener('change',(event)=>{
      if(event.target?.matches('input[name="ncReminderChannel"],.nc-reminder-consent input[type="checkbox"]'))queueMicrotask(syncBookingReminderUi);
    });

    let controller=null;
    let boundTarget=null;

    const bindTarget=()=>{
      syncBookingReminderUi();
      if(guide.hidden)return;
      const target=portal.querySelector('.clarity-target');
      if(!target||target===boundTarget)return;
      controller?.abort();
      controller=new AbortController();
      boundTarget=target;
      const signal=controller.signal;
      let advanced=false;
      const advance=()=>{
        if(advanced||guide.hidden)return;
        advanced=true;
        window.setTimeout(()=>{
          if(!guide.hidden)next.click();
        },450);
      };
      const tag=target.tagName.toLowerCase();
      const type=String(target.getAttribute('type')||'').toLowerCase();
      if(tag==='select'||tag==='input'||tag==='textarea'){
        target.addEventListener('change',advance,{signal});
        if(tag==='input'&&!['checkbox','radio','date'].includes(type)){
          target.addEventListener('blur',()=>{if(String(target.value||'').trim())advance();},{signal});
        }
      }else{
        target.addEventListener('click',advance,{signal});
      }
    };

    const observer=new MutationObserver(()=>queueMicrotask(bindTarget));
    observer.observe(portal,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
    observer.observe(guide,{attributes:true,attributeFilter:['hidden']});
    bindTarget();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
