const frame=document.querySelector('#appFrame');
const intro=document.querySelector('#intro');
const transition=document.querySelector('#transition');
const done=document.querySelector('#done');
const taskbar=document.querySelector('#taskbar');
const progress=document.querySelector('#progress');
const taskText=document.querySelector('#taskText');
const startBtn=document.querySelector('#startBtn');

const TASKS={
  A:{code:'A',specialty:'Dermatología',professional:'Dra. Paula Gómez',label:'Encontrá los próximos horarios disponibles de Dermatología con la Dra. Paula Gómez.'},
  B:{code:'B',specialty:'Oftalmología',professional:'Dr. Martín Ruiz',label:'Encontrá los próximos horarios disponibles de Oftalmología con el Dr. Martín Ruiz.'}
};
const participant=`AUTO-${randomId(8)}`;
const runs=randomBit()===0?
  [{condition:'sin',task:TASKS.A},{condition:'con',task:TASKS.B}]:
  [{condition:'con',task:TASKS.A},{condition:'sin',task:TASKS.B}];
let index=0;let state=null;let idleTimer=null;let timeout=null;let observer=null;

startBtn.addEventListener('click',()=>{
  intro.classList.add('hidden');
  taskbar.hidden=false;
  startRun();
});

function startRun(){
  cleanup();
  const run=runs[index];
  progress.textContent=`Prueba ${index+1} de 2`;
  taskText.textContent=run.task.label;
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
  try{win.scrollTo({top:0,left:0,behavior:'auto'});}catch{win.scrollTo(0,0);}
}

function track(run){
  const doc=frame.contentDocument;
  const win=frame.contentWindow;
  if(!doc||!win)return;
  state={run,start:performance.now(),last:performance.now(),errors:0,help:0,idle:0,idleOpen:false,guideUses:0,finished:false};
  const touch=()=>{if(!state)return;state.last=performance.now();state.idleOpen=false;};
  doc.addEventListener('click',e=>{
    if(!state||state.finished)return;
    touch();
    if(e.target.closest('.portal-chat'))state.help++;
    if(e.target.closest('#simplifyBtn'))state.guideUses++;
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
  observer=new win.MutationObserver(check);
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
  if(specialty===state.run.task.specialty&&professional===state.run.task.professional&&slots.length>0){
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
  await fetch('/api/tester-result',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      participant,
      condition:state.run.condition,
      taskCode:state.run.task.code,
      success,
      timeSeconds:seconds,
      errors:state.errors,
      help:state.help,
      notes:`AUTO_TEST; idle15s=${state.idle}; guideUses=${state.guideUses}`
    })
  }).catch(()=>{});
  index++;
  if(index>=runs.length){
    taskbar.hidden=true;
    frame.src='about:blank';
    done.classList.remove('hidden');
    return;
  }
  transition.classList.remove('hidden');
  setTimeout(()=>{transition.classList.add('hidden');startRun();},1200);
}

function cleanup(){clearInterval(idleTimer);clearTimeout(timeout);observer?.disconnect();state=null;}
function randomId(n){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const a=new Uint8Array(n);crypto.getRandomValues(a);return[...a].map(x=>chars[x%chars.length]).join('');}
function randomBit(){const a=new Uint8Array(1);crypto.getRandomValues(a);return a[0]%2;}
