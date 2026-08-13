const RATE_WINDOW_MS=60_000;const RATE_MAX=30;const buckets=globalThis.__navegaClaroAvailabilityBuckets||new Map();globalThis.__navegaClaroAvailabilityBuckets=buckets;

const DEMO_SLOTS=[
  ['CLI-CEN-20260820-0930','Clínica médica','Dr. Martín Ruiz','Centro','2026-08-20','09:30'],
  ['DER-NOR-20260820-1000','Dermatología','Dra. Paula Gómez','Norte','2026-08-20','10:00'],
  ['OFT-NOR-20260820-1430','Oftalmología','Dr. Martín Ruiz','Norte','2026-08-20','14:30'],
  ['KIN-CEN-20260820-1015','Kinesiología','Lic. Laura Sosa','Centro','2026-08-20','10:15'],
  ['URO-CEN-20260820-1100','Urología','Dr. Federico Allende','Centro','2026-08-20','11:00'],
  ['CAR-CEN-20260820-0830','Cardiología','Dra. Sofía Vega','Centro','2026-08-20','08:30'],
  ['PED-CEN-20260820-1300','Pediatría','Dra. Camila López','Centro','2026-08-20','13:00'],
  ['TRA-CEN-20260821-0915','Traumatología','Dr. Ignacio Torres','Centro','2026-08-21','09:15'],
  ['GIN-NOR-20260821-1030','Ginecología','Dra. Ana Pérez','Norte','2026-08-21','10:30'],
  ['URO-NOR-20260821-1600','Urología','Dr. Federico Allende','Norte','2026-08-21','16:00'],
  ['NEU-CEN-20260822-1530','Neurología','Dr. Bruno Salas','Centro','2026-08-22','15:30'],
  ['CAR-NOR-20260822-1130','Cardiología','Dra. Sofía Vega','Norte','2026-08-22','11:30'],
  ['DER-CEN-20260827-1000','Dermatología','Dra. Paula Gómez','Centro','2026-08-27','10:00'],
  ['KIN-NOR-20260827-1330','Kinesiología','Lic. Laura Sosa','Norte','2026-08-27','13:30']
].map(([slotId,specialty,professional,location,date,time])=>({slotId,specialty,professional,location,date,time,available:true,source:'demo'}));

const CATALOG=[...new Set(DEMO_SLOTS.map(s=>s.specialty))].sort((a,b)=>a.localeCompare(b,'es')).map(specialty=>({specialty,professionals:[...new Set(DEMO_SLOTS.filter(s=>s.specialty===specialty).map(s=>s.professional))].sort((a,b)=>a.localeCompare(b,'es'))}));

export default async function handler(req,res){setCors(res);if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});if(!allowRequest(req,res))return;let body;try{body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});}catch{return res.status(400).json({error:'JSON inválido'});}if(body.action==='catalog')return res.status(200).json({ok:true,catalog:CATALOG,source:'demo-catalog'});const query=normalize(body);const validation=validate(query);if(!validation.ok)return res.status(400).json({error:validation.error});const url=process.env.GOOGLE_SHEETS_WEBAPP_URL;const secret=process.env.GOOGLE_SHEETS_SHARED_SECRET;if(url&&secret){try{const target=new URL(url);target.searchParams.set('action','availability');target.searchParams.set('secret',secret);if(query.specialty)target.searchParams.set('especialidad',query.specialty);if(query.professional)target.searchParams.set('profesional',query.professional);if(query.location)target.searchParams.set('sede',query.location);if(query.date)target.searchParams.set('fecha',query.date);const response=await fetch(target,{method:'GET',redirect:'follow',headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});if(response.ok){const data=await response.json();if(data?.ok!==false){const slots=(Array.isArray(data?.slots)?data.slots:[]).map(sanitizeSlot).filter(Boolean).slice(0,30);if(slots.length)return res.status(200).json({ok:true,configured:true,source:'google-sheets',slots});}}}catch(error){console.error('Availability Sheets lookup failed; using demo fallback',error?.message||error);}}
  const slots=filterDemo(query).slice(0,30);return res.status(200).json({ok:true,configured:Boolean(url&&secret),source:'demo-fallback',slots});}

function filterDemo(q){const key=v=>text(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return DEMO_SLOTS.filter(s=>(!q.specialty||key(s.specialty)===key(q.specialty))&&(!q.professional||key(s.professional)===key(q.professional))&&(!q.location||key(s.location)===key(q.location))&&(!q.date||s.date===q.date)).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));}
function normalize(body){return{specialty:text(body.specialty,120),professional:text(body.professional,120),location:text(body.location,120),date:text(body.date,10)}}
function validate(q){if(!q.specialty&&!q.professional)return{ok:false,error:'Elegí una especialidad o un profesional.'};if(q.date&&!/^\d{4}-\d{2}-\d{2}$/.test(q.date))return{ok:false,error:'La fecha no es válida.'};return{ok:true};}
function sanitizeSlot(value){const slotId=text(value?.slotId,100);const date=text(value?.date,10);const time=text(value?.time,8);if(!slotId||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{1,2}:\d{2}$/.test(time))return null;return{slotId,specialty:text(value?.specialty,120),professional:text(value?.professional,120),location:text(value?.location,120),date,time,available:value?.available!==false,source:text(value?.source,40)||'sheets'};}
function text(value,max){return String(value||'').replace(/[\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function allowRequest(req,res){const now=Date.now();const key=String(req.headers?.['x-forwarded-for']||req.headers?.['x-real-ip']||'unknown').split(',')[0].trim();const previous=(buckets.get(key)||[]).filter(time=>now-time<RATE_WINDOW_MS);if(previous.length>=RATE_MAX){res.setHeader('Retry-After','60');res.status(429).json({error:'Demasiadas búsquedas. Intentá nuevamente en un minuto.'});return false;}previous.push(now);buckets.set(key,previous);return true;}
function setCors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');}
