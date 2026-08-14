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
  A:{
    code:'A',specialty:'Dermatología',professional:'Dra. Paula Gómez',location:'Norte',dateText:'20 de agosto',time:'10:00',channel:'whatsapp',
    label:'Seleccioná Dermatología con la Dra. Paula Gómez, elegí sede Norte para el 20 de agosto a las 10:00 y dejá elegidos los recordatorios por WhatsApp.',
    goal:'Quiero seleccionar Dermatología con la Dra. Paula Gómez, elegir el turno de sede Norte del 20 de agosto a las 10:00 y dejar recordatorios por WhatsApp.'
  },
  B:{
    code:'B',specialty:'Oftalmología',professional:'Dr. Martín Ruiz',location:'Norte',dateText:'20 de agosto',time:'14:30',channel:'email',
    label:'Seleccioná Oftalmología con el Dr. Martín Ruiz, elegí sede Norte para el 20 de agosto a las 14:30 y dejá elegidos los recordatorios por Email.',
    goal:'Quiero seleccionar Oftalmología con el Dr. Martín Ruiz, elegir el turno de sede Norte del 20 de agosto a las 14:30 y dejar recordatorios por Email.'
  }
};

const participant=`AUTO-${randomId(8)}`;
const runs=randomBit()===0?
  [{condition:'sin',task:TASKS.A},{condition:'con',task:TASKS.B}]:
  [{condition:'con',task:TASKS.A},{condition:'sin',task:TASKS.B}];

let index=0;
let state=null;
let idleTimer=null;
let pollTimer=null;
let timeoutTimer=null;
let pendingSave=null;
let storageReady=false;
let checkingStorage=false;

const storageNote=document.createElement('small');
storageNote.id='storageNote';
startBtn.insertAdjacentElement('afterend',storageNote);

const liveStatus=document.createElement('div');
liveStatus.id='testerLiveStatus';
liveStatus.style.marginTop='8px';
liveStatus.style.fontSize='.76rem';
liveStatus.style.lineHeight='1.45';
liveStatus.style.color='#d7dee7';
liveStatus.setAttribute('aria-live','polite');
taskHint?.insertAdjacentElement('afterend',liveStatus);

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
  taskHint.textContent=run.condition==='con'
    ?'Usá NavegaClaro para orientarte. La tarea termina al seleccionar el horario y el canal de recordatorio; no ingreses datos personales ni confirmes el turno.'
    :'Hacé la tarea usando solamente el portal. La tarea termina al seleccionar el horario y el canal de recordatorio; no ingreses datos personales ni confirmes el turno.';
  liveStatus.textContent='Estado: preparando la tarea…';

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
  if(goal)goal.value=run.task.goal;
  try{win.scrollTo({top:0,left:0,behavior:'auto'});}catch{win.scrollTo(0,0);}
}

function track(run){
  const doc=frame.contentDocument;
  if(!doc)return;
  state={run,start:performance.now(),last:performance.now(),errors:0,help:0,idle:0,idleOpen:false,guideUses:0,guideShown:false,guideSteps:0,finished:false,completionQueued:false};

  const touch=()=>{if(!state)return;state.last=performance.now();state.idleOpen=false;};

  doc.addEventListener('click',e=>{
    if(!state||state.finished)return;
    touch();
    if(e.target.closest('.portal-chat'))state.help++;
    if(e.target.closest('#simplifyBtn'))state.guideUses++;
    if(e.target.closest('#nextStep,#prevStep'))state.guideSteps++;
    const slot=e.target.closest('.nc-slot');
    if(slot&&!slotMatchesTask(slot,run.task))state.errors++;
    setTimeout(check,0);
  },true);

  doc.addEventListener('change',e=>{
    if(!state||state.finished)return;
    touch();
    const el=e.target;
    if(el.id==='especialidad'&&el.value&&el.value!==run.task.specialty)state.errors++;
    if(el.id==='profesional'&&el.value&&el.value!==run.task.professional)state.errors++;
    if(el.name==='ncReminderChannel'&&el.checked&&el.value!==run.task.channel)state.errors++;
    setTimeout(check,0);
  },true);

  doc.addEventListener('scroll',touch,{passive:true,capture:true});

  idleTimer=setInterval(()=>{
    if(!state||state.finished)return;
    if(performance.now()-state.last>=15000&&!state.idleOpen){state.idle++;state.idleOpen=true;}
  },1000);

  // Polling makes completion robust against dynamic controls created after clicks.
  pollTimer=setInterval(check,250);
  timeoutTimer=setTimeout(()=>finish(false),240000);
  setTimeout(check,500);
}

function readState(){
  const doc=frame.contentDocument;
  const task=state?.run?.task;
  if(!doc||!task)return null;

  const specialty=doc.querySelector('#especialidad')?.value||'';
  const professional=doc.querySelector('#profesional')?.value||'';
  const selectedSlot=doc.querySelector('.nc-slot[aria-pressed="true"]');
  const consent=doc.querySelector('.portal-terms input[type="checkbox"]');
  const channel=doc.querySelector('input[name="ncReminderChannel"]:checked')?.value||'';
  const guide=doc.querySelector('#guide');
  if(state.run.condition==='con'&&guide&&!guide.hidden)state.guideShown=true;

  return{
    specialty:specialty===task.specialty,
    professional:professional===task.professional,
    slot:Boolean(selectedSlot)&&slotMatchesTask(selectedSlot,task),
    consent:Boolean(consent?.checked),
    channel:channel===task.channel,
    guide:state.run.condition==='sin'||(state.guideUses>0&&state.guideShown)
  };
}

function check(){
  if(!state||state.finished)return;
  const s=readState();
  if(!s)return;

  const parts=[
    `${s.specialty?'✓':'○'} especialidad`,
    `${s.professional?'✓':'○'} profesional`,
    `${s.slot?'✓':'○'} horario`,
    `${s.consent&&s.channel?'✓':'○'} recordatorio`
  ];
  if(state.run.condition==='con')parts.push(`${s.guide?'✓':'○'} NavegaClaro`);
  liveStatus.textContent=`Estado: ${parts.join(' · ')}`;

  const complete=s.specialty&&s.professional&&s.slot&&s.consent&&s.channel&&s.guide;
  if(complete&&!state.completionQueued){
    state.completionQueued=true;
    liveStatus.textContent='Estado: tarea completa ✓ Guardando resultado…';
    setTimeout(()=>{if(state&&!state.finished)finish(true);},300);
  }
}

function slotMatchesTask(slot,task){
  if(!slot)return false;
  const text=norm(slot.textContent);
  const day=norm(slot.closest('.nc-day')?.querySelector('.nc-day-title strong')?.textContent||'');
  return text.includes(norm(task.time))&&text.includes(norm(task.location))&&day.includes(norm(task.dateText));
}

async function finish(success){
  if(!state||state.finished)return;
  state.finished=true;
  clearInterval(idleTimer);clearInterval(pollTimer);clearTimeout(timeoutTimer);
  const seconds=Math.max(1,Math.round((performance.now()-state.start)/1000));
  pendingSave={
    participant,
    condition:state.run.condition,
    taskCode:state.run.task.code,
    success,
    timeSeconds:seconds,
    errors:state.errors,
    help:state.help,
    notes:`AUTO_TEST_V4; idle15s=${state.idle}; guideUses=${state.guideUses}; guideShown=${state.guideShown?1:0}; guideSteps=${state.guideSteps}; target=${state.run.task.time}-${state.run.task.location}-${state.run.task.channel}`
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
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'
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
    hideTransition();taskbar.hidden=true;frame.src='about:blank';
    const panel=done.querySelector('.panel');
    if(panel)panel.innerHTML=`<h2>Prueba terminada</h2><p>Las dos pruebas se guardaron correctamente en la evidencia del proyecto.</p><small>Código anónimo: ${participant}</small>`;
    done.classList.remove('hidden');
    return;
  }
  showNextTransition();
  setTimeout(()=>{hideTransition();startRun();},900);
}

function showSaving(label='Guardando resultado…'){
  transition.innerHTML=`<div class="panel"><div class="spinner"></div><h2>${label}</h2><p>Esperá un momento. La prueba continúa cuando el registro quede confirmado.</p></div>`;
  transition.classList.remove('hidden');
}
function showSaveError(){
  transition.innerHTML=`<div class="panel"><h2>No pudimos guardar esta prueba</h2><p>No cierres esta pestaña. Tus datos siguen en memoria y podemos reintentar sin repetirla.</p><button class="start" id="retrySaveBtn" type="button">Reintentar guardado</button><small>La prueba no se marcará como terminada hasta que Google Sheets confirme el registro.</small></div>`;
  transition.classList.remove('hidden');
  transition.querySelector('#retrySaveBtn')?.addEventListener('click',retryPendingSave,{once:true});
}
function showNextTransition(){
  transition.innerHTML='<div class="panel"><div class="spinner"></div><h2>Preparando la siguiente tarea…</h2><p>No tenés que completar ningún formulario.</p></div>';
  transition.classList.remove('hidden');
}
function hideTransition(){transition.classList.add('hidden');}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function cleanup(){clearInterval(idleTimer);clearInterval(pollTimer);clearTimeout(timeoutTimer);state=null;}
function norm(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function randomId(n){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const a=new Uint8Array(n);crypto.getRandomValues(a);return[...a].map(x=>chars[x%chars.length]).join('');}
function randomBit(){const a=new Uint8Array(1);crypto.getRandomValues(a);return a[0]%2;}
