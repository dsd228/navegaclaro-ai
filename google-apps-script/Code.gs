const NC_SHEETS={
  TEST_USUARIOS:['timestamp','participant','condition','task','success','timeSeconds','errors','help','ease','quote','notes'],
  SESIONES:['timestamp','sessionId','event','goal','domain','controls','steps','mode','latencyMs','completed'],
  QA:['timestamp','web','goal','result','steps','validTargets','latencyMs','notes'],
  METRICAS:['timestamp','participants','withoutSuccessRate','withSuccessRate','withoutAvgTime','withAvgTime','withoutErrors','withErrors','withoutEase','withEase']
};

function doGet(e){try{assertSecret_(e&&e.parameter&&e.parameter.secret);ensureSheets_();const action=String((e&&e.parameter&&e.parameter.action)||'summary');if(action!=='summary')return json_({ok:false,error:'Unknown action'});return json_({ok:true,metrics:buildSummary_()});}catch(err){return json_({ok:false,error:String(err&&err.message||err)});}}

function doPost(e){try{const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');assertSecret_(body.secret);ensureSheets_();const kind=String(body.kind||'');const payload=body.payload||{};if(kind==='session')appendSession_(payload);else if(kind==='test')appendTest_(payload);else if(kind==='qa')appendQa_(payload);else throw new Error('Invalid kind');return json_({ok:true});}catch(err){return json_({ok:false,error:String(err&&err.message||err)});}}

function initializeNavegaClaro(){ensureSheets_();return 'NavegaClaro sheets ready';}

function ensureSheets_(){const ss=SpreadsheetApp.getActiveSpreadsheet();Object.keys(NC_SHEETS).forEach(name=>{let sheet=ss.getSheetByName(name);if(!sheet)sheet=ss.insertSheet(name);const headers=NC_SHEETS[name];if(sheet.getLastRow()===0)sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#11151a').setFontColor('#ffffff');sheet.setFrozenRows(1);});}

function assertSecret_(received){const expected=PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');if(!expected)throw new Error('SHARED_SECRET not configured');if(String(received||'')!==String(expected))throw new Error('Unauthorized');}

function appendSession_(p){append_('SESIONES',[new Date(),safe_(p.sessionId,100),safe_(p.event,40),safe_(p.goal,180),safe_(p.domain,120),num_(p.controls),num_(p.steps),safe_(p.mode,40),num_(p.latencyMs),Boolean(p.completed)]);}
function appendTest_(p){append_('TEST_USUARIOS',[new Date(),safe_(p.participant,40),safe_(p.condition,10),safe_(p.task,160),Boolean(p.success),num_(p.timeSeconds),num_(p.errors),num_(p.help),Math.min(5,Math.max(1,num_(p.ease))),safe_(p.quote,350),safe_(p.notes,500)]);}
function appendQa_(p){append_('QA',[new Date(),safe_(p.web,180),safe_(p.goal,180),safe_(p.result,10),num_(p.steps),Boolean(p.validTargets),num_(p.latencyMs),safe_(p.notes,500)]);}
function append_(name,row){const lock=LockService.getScriptLock();lock.waitLock(5000);try{SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name).appendRow(row);}finally{lock.releaseLock();}}

function buildSummary_(){const tests=rows_('TEST_USUARIOS');const sessions=rows_('SESIONES');const qa=rows_('QA');const without=aggregateTests_(tests.filter(r=>normalizeCondition_(r.condition)==='sin'));const withNc=aggregateTests_(tests.filter(r=>normalizeCondition_(r.condition)==='con'));const participants=new Set(tests.map(r=>String(r.participant||'').trim()).filter(Boolean)).size;const metrics={participants:participants,testRows:tests.length,without:without,with:withNc,sessions:aggregateSessions_(sessions),qa:aggregateQa_(qa)};snapshotMetrics_(metrics);return metrics;}

function rows_(name){const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!sheet||sheet.getLastRow()<2)return[];const values=sheet.getDataRange().getValues();const headers=values.shift().map(String);return values.filter(row=>row.some(cell=>cell!==''&&cell!==null)).map(row=>{const obj={};headers.forEach((h,i)=>obj[h]=row[i]);return obj;});}

function aggregateTests_(rows){const count=rows.length;if(!count)return{count:0,successRate:0,avgTime:0,errors:0,help:0,avgEase:0};const success=rows.filter(r=>truthy_(r.success)).length;return{count:count,successRate:round_((success/count)*100,1),avgTime:round_(avg_(rows.map(r=>num_(r.timeSeconds))),1),errors:sum_(rows.map(r=>num_(r.errors))),help:sum_(rows.map(r=>num_(r.help))),avgEase:round_(avg_(rows.map(r=>num_(r.ease))),2)};}
function aggregateSessions_(rows){if(!rows.length)return{rows:0,ai:0,fallback:0,avgLatency:0,completed:0};const ai=rows.filter(r=>String(r.mode||'').toLowerCase()==='ai').length;const fallback=rows.filter(r=>String(r.mode||'').toLowerCase()!=='ai').length;return{rows:rows.length,ai:ai,fallback:fallback,avgLatency:round_(avg_(rows.map(r=>num_(r.latencyMs)).filter(v=>v>0)),1),completed:rows.filter(r=>truthy_(r.completed)).length};}
function aggregateQa_(rows){return{rows:rows.length,passed:rows.filter(r=>String(r.result||'').toLowerCase()==='pass'&&truthy_(r.validTargets)).length};}
function snapshotMetrics_(m){const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('METRICAS');if(!sheet)return;sheet.appendRow([new Date(),m.participants,m.without.successRate,m.with.successRate,m.without.avgTime,m.with.avgTime,m.without.errors,m.with.errors,m.without.avgEase,m.with.avgEase]);if(sheet.getLastRow()>250)sheet.deleteRows(2,sheet.getLastRow()-250);}

function normalizeCondition_(value){const s=String(value||'').toLowerCase();if(s.indexOf('sin')===0)return'sin';if(s.indexOf('con')===0)return'con';return s;}
function truthy_(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1'||String(v).toLowerCase()==='si'||String(v).toLowerCase()==='sí';}
function safe_(value,max){return String(value==null?'':value).replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]').replace(/\b\d{7,}\b/g,'[numero]').slice(0,max);}
function num_(v){const n=Number(v);return isFinite(n)?n:0;}
function sum_(arr){return arr.reduce((a,b)=>a+num_(b),0);}
function avg_(arr){return arr.length?sum_(arr)/arr.length:0;}
function round_(v,d){const p=Math.pow(10,d||0);return Math.round(num_(v)*p)/p;}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
