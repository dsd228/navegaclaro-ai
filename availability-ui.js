(()=>{
  const button=document.querySelector('#buscarTurnos');
  if(!button||button.dataset.ncAvailabilityBound==='1')return;
  button.dataset.ncAvailabilityBound='1';

  const specialty=document.querySelector('#especialidad');
  const professional=document.querySelector('#profesional');
  const locationField=document.querySelector('#sede');
  const dateField=document.querySelector('#fecha');
  const consent=document.querySelector('.portal-terms input[type="checkbox"]');
  const actions=button.closest('.portal-actions');

  const PROFESSIONALS={
    'Clínica médica':['Dr. Martín Ruiz'],
    'Dermatología':['Dra. Paula Gómez'],
    'Oftalmología':['Dr. Martín Ruiz'],
    'Kinesiología':['Lic. Laura Sosa']
  };

  if(specialty&&!Array.from(specialty.options).some(o=>o.value==='Kinesiología')){
    specialty.add(new Option('Kinesiología','Kinesiología'));
  }
  syncProfessionals();
  specialty?.addEventListener('change',syncProfessionals);

  const consolePanel=document.querySelector('.clarity-console');
  const consoleHead=consolePanel?.querySelector('.console-head');
  if(consoleHead&&!document.querySelector('.nc-demo-purpose')){
    const purpose=document.createElement('div');
    purpose.className='nc-demo-purpose';
    purpose.innerHTML='<strong>NavegaClaro es tu guía.</strong><span>Podés pedir ayuda para cualquier gestión disponible en este portal. Después hacé las acciones en <b>Salud Central</b>; NavegaClaro no las hace por vos.</span><small>En esta demo: Clínica médica · Dermatología · Oftalmología · Kinesiología.</small>';
    consoleHead.insertAdjacentElement('afterend',purpose);
  }

  const portal=document.querySelector('#portal');
  if(portal&&!document.querySelector('.nc-portal-marker')){
    const marker=document.createElement('div');
    marker.className='nc-portal-marker';
    marker.innerHTML='<strong>ACÁ HACÉS LA TAREA</strong><span>Usá este portal siguiendo la indicación de NavegaClaro.</span>';
    portal.prepend(marker);
  }

  const guide=document.querySelector('#guide');
  if(guide&&!guide.querySelector('.nc-guide-action-label')){
    const label=document.createElement('div');
    label.className='nc-guide-action-label';
    label.textContent='AHORA HACÉ ESTA ACCIÓN EN SALUD CENTRAL ↓';
    guide.prepend(label);
  }

  const examples=[...document.querySelectorAll('.example-goals [data-goal]')];
  if(examples[0]){examples[0].textContent='Oftalmología';examples[0].dataset.goal='Quiero sacar un turno con oftalmología';}
  if(examples[1]){examples[1].textContent='Kinesiología';examples[1].dataset.goal='Quiero sacar un turno con kinesiología';}
  const examplesWrap=document.querySelector('.example-goals');
  if(examplesWrap&&!examplesWrap.querySelector('[data-nc-extra-example]')){
    const extra=document.createElement('button');extra.type='button';extra.dataset.ncExtraExample='1';extra.textContent='Buscar horarios';
    extra.addEventListener('click',()=>{const input=document.querySelector('#goalInput');if(input){input.value='Necesito buscar horarios para un turno';input.focus();}});
    examplesWrap.appendChild(extra);
  }

  const style=document.createElement('style');
  style.textContent=`
    .nc-demo-purpose{margin:12px 0 16px;padding:13px 14px;border:1px solid rgba(184,255,90,.28);border-radius:12px;background:rgba(184,255,90,.06);display:grid;gap:5px}
    .nc-demo-purpose strong{color:#f7f9fb;font-size:.86rem}.nc-demo-purpose span{color:#c4ccd5;font-size:.76rem;line-height:1.45}.nc-demo-purpose small{color:#b8ff5a;font-size:.7rem;line-height:1.4;font-weight:750}
    .nc-portal-marker{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#dff4ff;color:#123e5a;border-bottom:1px solid #b8d8e9;font-size:.72rem}
    .nc-portal-marker strong{font-size:.75rem;letter-spacing:.06em}.nc-portal-marker span{text-align:right;line-height:1.35}
    .nc-guide-action-label{margin:0 0 12px;padding:9px 10px;border-radius:9px;background:rgba(184,255,90,.10);color:#b8ff5a;font-size:.69rem;font-weight:900;letter-spacing:.06em;text-align:center}
    .nc-slots{margin-top:16px;border-top:1px solid #e1e6ea;padding-top:16px}
    .nc-slots[hidden]{display:none!important}
    .nc-slots-title{font-size:.85rem;font-weight:800;color:#26323d;margin:0 0 5px}
    .nc-slots-copy{font-size:.74rem;line-height:1.45;color:#687581;margin:0 0 12px}
    .nc-slot-list{display:flex;gap:8px;flex-wrap:wrap}
    .nc-slot{min-width:82px;min-height:44px;border:1px solid #9fb3c3;background:#fff;color:#174f78;border-radius:9px;font-weight:800;padding:8px 12px}
    .nc-slot[aria-pressed="true"]{background:#1261a0;color:#fff;border-color:#1261a0;box-shadow:0 0 0 3px rgba(18,97,160,.12)}
    .nc-booking{margin-top:14px;padding:14px;border:1px solid #d4dde5;border-radius:11px;background:#f8fafb}
    .nc-booking[hidden]{display:none!important}
    .nc-booking-summary{font-size:.76rem;line-height:1.5;color:#344451;margin:0 0 12px}
    .nc-booking-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nc-booking label{display:flex;flex-direction:column;gap:5px;font-size:.72rem;font-weight:700;color:#56616d}
    .nc-booking input,.nc-booking select{min-height:44px;border:1px solid #c9d1d8;border-radius:8px;padding:0 9px;background:#fff;color:#1d2730;font:inherit}
    .nc-booking button{width:100%;min-height:44px;margin-top:12px;border:0;border-radius:9px;background:#1261a0;color:#fff;font-weight:800}
    .nc-booking button:disabled{opacity:.55;cursor:wait}
    .nc-status{margin-top:10px;min-height:20px;font-size:.74rem;line-height:1.45;color:#5f6d79}
    .nc-status[data-state="error"]{color:#9a3131}.nc-status[data-state="success"]{color:#246b36;font-weight:700}
    @media(max-width:620px){.nc-booking-grid{grid-template-columns:1fr}.nc-slot{flex:1 1 28%}.nc-portal-marker{align-items:flex-start;flex-direction:column}.nc-portal-marker span{text-align:left}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('section');
  panel.className='nc-slots';panel.hidden=true;panel.setAttribute('aria-live','polite');
  panel.innerHTML='<p class="nc-slots-title">Horarios disponibles</p><p class="nc-slots-copy">Consultados desde Google Sheets.</p><div class="nc-slot-list"></div><div class="nc-booking" hidden><p class="nc-booking-summary"></p><div class="nc-booking-grid"><label>Nombre<input id="ncName" autocomplete="name" maxlength="80" placeholder="Tu nombre"></label><label>Recibir por<select id="ncChannel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label><label id="ncEmailWrap">Email<input id="ncEmail" type="email" autocomplete="email" maxlength="160" placeholder="nombre@correo.com"></label><label id="ncWhatsappWrap" hidden>WhatsApp<input id="ncWhatsapp" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="549351..."></label></div><button id="ncConfirm" type="button">Confirmar turno y recordatorios</button><div id="ncBookingStatus" class="nc-status" role="status"></div></div>';
  actions.insertAdjacentElement('afterend',panel);

  const list=panel.querySelector('.nc-slot-list');
  const booking=panel.querySelector('.nc-booking');
  const summary=panel.querySelector('.nc-booking-summary');
  const channel=panel.querySelector('#ncChannel');
  const emailWrap=panel.querySelector('#ncEmailWrap');
  const whatsappWrap=panel.querySelector('#ncWhatsappWrap');
  const confirm=panel.querySelector('#ncConfirm');
  const status=panel.querySelector('#ncBookingStatus');
  let selectedSlot=null;

  button.addEventListener('click',searchAvailability);
  channel.addEventListener('change',()=>{const email=channel.value==='email';emailWrap.hidden=!email;whatsappWrap.hidden=email;status.textContent='';});
  confirm.addEventListener('click',confirmAppointment);

  async function searchAvailability(){
    const query={specialty:specialty?.value||'',professional:professional?.value||'',location:locationField?.value||'',date:dateField?.value||''};
    const missing=!query.specialty||!query.professional||!query.location||!query.date;
    if(missing){showPanelMessage('Completá especialidad, profesional, sede y fecha para buscar horarios.','error');return;}
    selectedSlot=null;booking.hidden=true;list.innerHTML='';panel.hidden=false;panel.querySelector('.nc-slots-title').textContent='Buscando horarios…';panel.querySelector('.nc-slots-copy').textContent='Consultando la disponibilidad en Google Sheets.';
    button.disabled=true;button.setAttribute('aria-busy','true');const original=button.textContent;button.textContent='Buscando…';
    try{
      const response=await fetch('/api/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.ok===false)throw new Error(data.error||'No se pudo buscar disponibilidad.');
      renderSlots(Array.isArray(data.slots)?data.slots:[]);
    }catch(error){showPanelMessage(error?.message||'No se pudo consultar la disponibilidad.','error');}
    finally{button.disabled=false;button.removeAttribute('aria-busy');button.textContent=original;}
  }

  function renderSlots(slots){
    panel.hidden=false;list.innerHTML='';booking.hidden=true;selectedSlot=null;
    panel.querySelector('.nc-slots-title').textContent=slots.length?'Elegí un horario':'Sin horarios disponibles';
    panel.querySelector('.nc-slots-copy').textContent=slots.length?`${slots.length} horario${slots.length===1?'':'s'} encontrado${slots.length===1?'':'s'} en Google Sheets.`:'No encontramos disponibilidad para esa combinación. Probá otra fecha, sede o profesional.';
    slots.forEach(slot=>{const b=document.createElement('button');b.type='button';b.className='nc-slot';b.textContent=slot.time;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>selectSlot(slot,b));list.appendChild(b);});
  }

  function selectSlot(slot,control){
    selectedSlot=slot;list.querySelectorAll('.nc-slot').forEach(b=>b.setAttribute('aria-pressed',String(b===control)));
    summary.textContent=`${slot.specialty} · ${slot.professional} · ${slot.location} · ${formatDate(slot.date)} a las ${slot.time}`;
    booking.hidden=false;status.textContent='';booking.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }

  async function confirmAppointment(){
    if(!selectedSlot){setStatus('Primero elegí un horario.','error');return;}
    if(consent&&!consent.checked){setStatus('Aceptá los recordatorios y comunicaciones administrativas para continuar.','error');consent.focus();return;}
    const name=panel.querySelector('#ncName').value.trim();const email=panel.querySelector('#ncEmail').value.trim();const whatsapp=panel.querySelector('#ncWhatsapp').value.trim();
    if(!name){setStatus('Ingresá tu nombre.','error');panel.querySelector('#ncName').focus();return;}
    const payload={appointmentId:selectedSlot.slotId,appointmentAt:`${selectedSlot.date}T${selectedSlot.time}:00-03:00`,name,email,whatsapp,channel:channel.value,service:selectedSlot.specialty,professional:selectedSlot.professional,location:selectedSlot.location};
    confirm.disabled=true;confirm.textContent='Confirmando…';setStatus('Programando confirmación y recordatorios…','');
    try{
      const response=await fetch('/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));
      if(!response.ok||data.ok===false)throw new Error(data.error||'No se pudo confirmar el turno.');
      setStatus(`Turno confirmado. Recordatorios programados por ${channel.value==='email'?'email':'WhatsApp'}: 24 h y 2 h antes.`,'success');confirm.textContent='Turno confirmado';
    }catch(error){setStatus(error?.message||'No se pudo confirmar el turno.','error');confirm.disabled=false;confirm.textContent='Confirmar turno y recordatorios';}
  }

  function syncProfessionals(){
    if(!specialty||!professional)return;
    const current=specialty.value;
    const list=PROFESSIONALS[current]||['Dra. Paula Gómez','Dr. Martín Ruiz','Lic. Laura Sosa'];
    professional.innerHTML='<option value="">Seleccionar</option>';
    list.forEach(name=>professional.add(new Option(name,name)));
  }
  function showPanelMessage(message,state){panel.hidden=false;list.innerHTML='';booking.hidden=true;panel.querySelector('.nc-slots-title').textContent=state==='error'?'No pudimos buscar todavía':'Disponibilidad';panel.querySelector('.nc-slots-copy').textContent=message;}
  function setStatus(message,state){status.textContent=message;status.dataset.state=state||'';}
  function formatDate(value){try{return new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeZone:'America/Argentina/Cordoba'}).format(new Date(`${value}T12:00:00-03:00`));}catch{return value;}}
})();
