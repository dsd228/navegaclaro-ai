const frame=document.querySelector('#appFrame');
const intro=document.querySelector('#intro');
const transition=document.querySelector('#transition');
const done=document.querySelector('#done');
const taskbar=document.querySelector('#taskbar');
const progress=document.querySelector('#progress');
const taskText=document.querySelector('#taskText');
const taskHint=document.querySelector('#taskHint');
const startBtn=document.querySelector('#startBtn');

const TASKS={
  A:{code:'A',specialty:'Dermatología',professional:'Dra. Paula Gómez',label:'Encontrá los próximos horarios disponibles de Dermatología con la Dra. Paula Gómez.'},
  B:{code:'B',specialty:'Oftalmología',professional:'Dr. Martín Ruiz',label:'Encontrá los próximos horarios disponibles de Oftalmología con el Dr. Martín Ruiz.'}
};
const participant=`AUTO-${randomId(8)}`;
const runs=randomBit()===0?
  [{condition:'sin',task:TASKS.A},{condition:'con',task:TASKS.B}]:
  [{condition:'con',task:TASKS.A},{condition:'sin',task:TASKS.B}];
let index=0;let state=null;let idleTimer=null;let timeout=null;let observer=null;let pendingSave=null;let storageReady=false;let checkingStorage=false;

const storageNote=document.createElement('small');
storageNote.id='storageNote';
startBtn.insertAdjacentElement('afterend',storageNote);
startBtn.disabled=true;
startBtn.textContent='Verificando registro…';
checkStorage();

startBtn.addEventListener('click',async()=>{
  if(!storageReady){await checkStorage();return;}
  intro.classList.add('hidden');
  taskbar.hidden=false;
  startRun();
});

async function checkStorage(){
  if(checkingStorage)return false;
  checkingStorage=true;
  startBtn.disabled=true;
  startBtn.textContent='Verificando registro…';
  storageNote.textContent='Comprobando que la evidencia pueda guardarse antes de empezar.';
  storageNote.style.color='';
  try{
    const response=await fetch('/api/health',{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    storageReady=response.ok&&data.ok===true&&data.evidenceConfigured===true;
  }catch{storageReady=false;}
  checkingStorage=false;
  startBtn.disabled=false;
  if(storageReady){
    startBtn.textContent='Comenzar prueba';
    storageNote.textContent='Registro de evidencia conectado.';
    storageNote.style.color='#b8ff5a';
    return true;
  }
  startBtn.textContent='Reintentar conexión';
  storageNote.textContent='La evidencia no está conectada. No iniciamos la prueba para no perder tus resultados.';
  storageNote.style.color='#ff9b9b';
  return false;
}

function startRun(){
  cleanup();
  hideTransition();
  const run=runs[index];
  progress.textContent=`Prueba ${index+1} de 2`;
  taskText.textContent=run.task.label;
  if(taskHint){
    taskHint.textContent=run.condition==='con'
      ?'Usá NavegaClaro: primero tocá “Mostrarme qué tocar” y seguí la guía para completar la tarea.'
      :'Hacé la tarea usando solamente el portal, como lo harías normalmente.';
  }
  frame.src=`/tester-app.html?condition=${encodeURIComponent(run.condition)}&task=${run.task.code}&v=${Date.now()}`;
  frame.addEventListener('load',()=>{
    configure(run);
    track(run);
  },{once:true});
}

function configure(run){
  const doc=frame.contentDocument;
  const win=frame.contentWindow;
  if(!doc||!win)return;
  const goal=doc.querySelector('#goalInput');
  if(goal)goal.value=`Quiero encontrar horarios de ${run.task.specialty} con ${run.task.professional}`;
  if(run.condition==='con')lockPortalUntilGuide(doc);
  try{win.scrollTo({top:0,left:0,behavior:'auto'});}catch{win.scrollTo(0,0);}
}

function lockPortalUntilGuide(doc){
  const portal=doc.querySelector('#portal');
  if(!portal)return;
  portal.setAttribute('inert','');
  portal.setAttribute('aria-disabled','true');
  portal.style.pointerEvents='none';
  portal.style.opacity='.55';
  portal.style.filter='grayscale(.2)';
  const note=doc.createElement('p');
  note.id='testerGuideRequirement';
  note.textContent='Primero activá “Mostrarme qué tocar”. El portal se habilita cuando NavegaClaro prepare la guía.';
  note.style.margin='10px 0 0';
  note.style.fontSize='.82rem';
  note.style.lineHeight='1.45';
  note.style.color='#b8ff5a';
  doc.querySelector('#simplifyBtn')?.insertAdjacentElement('afterend',note);
}

function unlockPortal(doc){
  const portal=doc.querySelector('#portal');
  if(!portal)return;
  portal.removeAttribute('inert');
  portal.removeAttribute('aria-disabled');
  portal.style.pointerEvents='';
  portal.style.opacity='';
  portal.style.filter='';
  doc.querySelector('#testerGuideRequirement')?.remove();
}

function track(run){
  const doc=frame.contentDocument;
  const win=frame.contentWindow;
  if(!doc||!win)return;
  state={run,start:performance.now(),last:performance.now(),errors:0,help:0,idle:0,idleOpen:false,guideUses:0,guideShown:false,guideSteps:0,finished:false};
  const touch=()=>{if(!state)return;state.last=performance.now();state.idleOpen=false;};
  doc.addEventListener('click',e=>{
    if(!state||state.finished)return;
    touch();
    if(e.target.closest('.portal-chat'))state.help++;
    if(e.target.closest('#simplifyBtn'))state.guideUses++;
    if(e.target.closest('#nextStep,#prevStep'))state.guideSteps++;
    check();
  },true);
  doc.addEventListener('change',e=>{
    if(!state||state.finished)return;
    touch();
    const el=e.target;
    if(el.id==='especialidad'&&el.value&&el.value!==run.task.specialty)state.errors++;
    if(el.id==='profesional'&&el.value&&el.value!==run.task.professional)state.errors++;
    check();
  },true);
  doc.addEventListener('scroll',touch,{passive:true,capture:true});
  observer=new win.MutationObserver(()=>{
    if(!state||state.finished)return;
    if(run.condition==='con'){
      const guide=doc.querySelector('#guide');
      if(guide&&!guide.hidden){
        state.guideShown=true;
        unlockPortal(doc);
      }
    }
    check();
  });
  observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-pressed']});
  idleTimer=setInterval(()=>{
    if(!state||state.finished)return;
    if(performance.now()-state.last>=15000&&!state.idleOpen){state.idle++;state.idleOpen=true;}
  },1000);
  timeout=setTimeout(()=>finish(false),180000);
  setTimeout(check,700);
}

function check(){
  if(!state||state.finished)return;
  const doc=frame.contentDocument;
  if(!doc)return;
  const specialty=doc.querySelector('#especialidad')?.value||'';
  const professional=doc.querySelector('#profesional')?.value||'';
  const slots=[...doc.querySelectorAll('.nc-slot')].filter(el=>el.offsetParent!==null);
  const taskReached=specialty===state.run.task.specialty&&professional===state.run.task.professional&&slots.length>0;
  const treatmentValid=state.run.condition==='sin'||(state.guideUses>0&&state.guideShown);
  if(taskReached&&treatmentValid){
    setTimeout(()=>{
      if(state&&!state.finished)finish(true);
    },650);
  }
}

async function finish(success){
  if(!state||state.finished)return;
  state.finished=true;
  clearInterval(idleTimer);clearTimeout(timeout);observer?.disconnect();
  const seconds=Math.max(1,Math.round((performance.now()-state.start)/1000));
  pendingSave={
    participant,
    condition:state.run.condition,
    taskCode:state.run.task.code,
    success,
    timeSeconds:seconds,
    errors:state.errors,
    help:state.help,
    notes:`AUTO_TEST_V2; idle15s=${state.idle}; guideUses=${state.guideUses}; guideShown=${state.guideShown?1:0}; guideSteps=${state.guideSteps}`
  };

  showSaving();
  const saved=await saveResult(pendingSave);
  if(!saved){showSaveError();return;}
  pendingSave=null;
  advanceAfterSavedRun();
}

async function saveResult(payload){
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch('/api/tester-result',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        cache:'no-store'
      });
      const data=await response.json().catch(()=>({}));
      if(response.ok&&data.ok===true&&data.stored!==false)return true;
    }catch{}
    if(attempt<3)await wait(900*attempt);
  }
  return false;
}

async function retryPendingSave(){
  if(!pendingSave)return;
  showSaving('Reintentando guardado…');
  const saved=await saveResult(pendingSave);
  if(!saved){showSaveError();return;}
  pendingSave=null;
  advanceAfterSavedRun();
}

function advanceAfterSavedRun(){
  index++;
  if(index>=runs.length){
    hideTransition();
    taskbar.hidden=true;
    frame.src='about:blank';
    const panel=done.querySelector('.panel');
    if(panel)panel.innerHTML=`<h2>Prueba terminada</h2><p>Las dos pruebas se guardaron correctamente en la evidencia del proyecto.</p><small>Código anónimo: ${participant}</small>`;
    done.classList.remove('hidden');
    return;
  }
  showNextTransition();
  setTimeout(()=>{hideTransition();startRun();},1200);
}

function showSaving(label='Guardando resultado…'){
  transition.innerHTML=`<div class="panel"><div class="spinner"></div><h2>${label}</h2><p>Esperá un momento. La prueba continúa cuando el registro quede confirmado.</p></div>`;
  transition.classList.remove('hidden');
}

function showSaveError(){
  transition.innerHTML=`<div class="panel"><h2>No pudimos guardar esta prueba</h2><p>No cierres esta pestaña. Tus datos de esta tarea siguen en memoria y podemos reintentar sin repetirla.</p><button class="start" id="retrySaveBtn" type="button">Reintentar guardado</button><small>La prueba no se marcará como terminada hasta que Google Sheets confirme el registro.</small></div>`;
  transition.classList.remove('hidden');
  transition.querySelector('#retrySaveBtn')?.addEventListener('click',retryPendingSave,{once:true});
}

function showNextTransition(){
  transition.innerHTML='<div class="panel"><div class="spinner"></div><h2>Preparando la siguiente tarea…</h2><p>No tenés que completar ningún formulario.</p></div>';
  transition.classList.remove('hidden');
}
function hideTransition(){transition.classList.add('hidden');}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function cleanup(){clearInterval(idleTimer);clearTimeout(timeout);observer?.disconnect();state=null;}
function randomId(n){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const a=new Uint8Array(n);crypto.getRandomValues(a);return[...a].map(x=>chars[x%chars.length]).join('');}
function randomBit(){const a=new Uint8Array(1);crypto.getRandomValues(a);return a[0]%2;}
