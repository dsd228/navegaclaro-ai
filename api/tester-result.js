const RATE_WINDOW_MS=60_000;const RATE_MAX=12;const buckets=globalThis.__ncTesterBuckets||new Map();globalThis.__ncTesterBuckets=buckets;
const TASKS={A:'Dermatología · Dra. Paula Gómez · próximos horarios',B:'Oftalmología · Dr. Martín Ruiz · próximos horarios'};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!allow(req))return res.status(429).json({error:'Demasiadas solicitudes'});
  const url=process.env.GOOGLE_SHEETS_WEBAPP_URL;const secret=process.env.GOOGLE_SHEETS_SHARED_SECRET;
  if(!url||!secret)return res.status(503).json({ok:false,configured:false,error:'Evidence storage not configured'});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});}catch{return res.status(400).json({error:'JSON inválido'});}
  const participant=String(body.participant||'').trim();const condition=String(body.condition||'');const taskCode=String(body.taskCode||'');
  if(!/^AUTO-[A-Z2-9]{8}$/.test(participant))return res.status(400).json({error:'Participant inválido'});
  if(!['sin','con'].includes(condition)||!TASKS[taskCode])return res.status(400).json({error:'Prueba inválida'});
  const payload={participant,condition,task:TASKS[taskCode],success:Boolean(body.success),timeSeconds:bounded(body.timeSeconds,1,600),errors:bounded(body.errors,0,50),help:bounded(body.help,0,50),ease:null,quote:'',notes:redact(String(body.notes||'').slice(0,400))};
  try{
    // Use the long-standing `test` kind for backwards compatibility with an
    // already-published Apps Script deployment. Current Code.gs accepts both
    // `test` and `auto_test`, but older /exec versions may only know `test`.
    const response=await fetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({secret,kind:'test',payload}),signal:AbortSignal.timeout(9000)});
    if(!response.ok)throw new Error(`Sheets ${response.status}`);
    const data=await response.json();
    if(data?.ok===false)throw new Error(data?.error||'Rejected');
    return res.status(200).json({ok:true,stored:true});
  }catch(error){
    console.error('Tester result write failed',error?.message||error);
    return res.status(502).json({ok:false,error:'No se pudo registrar la prueba'});
  }
}
function bounded(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):min;}
function redact(v){return v.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]').replace(/\b\d{7,}\b/g,'[numero]');}
function allow(req){const now=Date.now();const key=String(req.headers?.['x-forwarded-for']||req.headers?.['x-real-ip']||'unknown').split(',')[0].trim();const recent=(buckets.get(key)||[]).filter(t=>now-t<RATE_WINDOW_MS);if(recent.length>=RATE_MAX)return false;recent.push(now);buckets.set(key,recent);return true;}
