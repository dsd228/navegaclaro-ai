(()=>{
  'use strict';

  const $=(selector,root=document)=>root.querySelector(selector);
  const button=$('#buscarTurnos');
  if(!button||button.dataset.ncBound==='1')return;
  button.dataset.ncBound='1';

  const portal=$('#portal');
  const form=$('.form-grid');
  const actions=button.closest('.portal-actions');
  const consentWrap=$('.portal-terms');
  const consent=consentWrap?.querySelector('input[type="checkbox"]');
  if(!portal||!form||!actions)return;

  const CATALOG=[
    {specialty:'Cardiología',professionals:['Dra. Sofía Vega']},
    {specialty:'Clínica médica',professionals:['Dr. Martín Ruiz']},
    {specialty:'Dermatología',professionals:['Dra. Paula Gómez','Dr. Nicolás Ferrer','Dra. Lucía Herrera']},
    {specialty:'Ginecología',professionals:['Dra. Ana Pérez']},
    {specialty:'Kinesiología',professionals:['Lic. Laura Sosa']},
    {specialty:'Neurología',professionals:['Dr. Bruno Salas']},
    {specialty:'Oftalmología',professionals:['Dr. Martín Ruiz','Dra. Valentina Suárez','Dr. Pablo Castro']},
    {specialty:'Pediatría',professionals:['Dra. Camila López']},
    {specialty:'Traumatología',professionals:['Dr. Ignacio Torres']},
    {specialty:'Urología',professionals:['Dr. Federico Allende']}
  ];

  const specialty=replaceWithSelect($('#especialidad'),'Elegí una especialidad');
  const professional=replaceWithSelect($('#profesional'),'Primero elegí una especialidad');
  if(!specialty||!professional)return;

  hideField($('#sede'));
  hideField($('#fecha'));
  fillSpecialties();
  professional.disabled=true;

  const portalHelp=$('.portal-help');
  if(portalHelp)portalHelp.textContent='Elegí una especialidad y después un profesional. Recién entonces te mostramos sus próximos días, horarios y sedes disponibles.';

  if(!$('.nc-booking-intro')){
    const intro=document.createElement('div');
    intro.className='nc-booking-intro';
    intro.innerHTML='<strong>1. Elegí la especialidad</strong><span>2. Elegí un profesional entre los disponibles</span><span>3. Elegí el día, horario y sede.</span><span>4. Si querés recordatorios, elegí el medio.</span>';
    form.before(intro);
  }

  const goalLabel=$('label[for="goalInput"]');
  if(goalLabel)goalLabel.textContent='Escribí qué gestión querés hacer en Salud Central';
  const simplify=$('#simplifyBtn');
  if(simplify)simplify.textContent='Mostrarme qué tocar';
  const reset=$('#resetBtn');
  if(reset)reset.textContent='Empezar de nuevo';

  setupReminderPreference();
  injectStyles();

  const panel=document.createElement('section');
  panel.className='nc-slots';
  panel.hidden=true;
  panel.setAttribute('aria-live','polite');
  panel.innerHTML=`
    <p class="nc-slots-title">Próximos turnos disponibles</p>
    <p class="nc-slots-copy">Elegí especialidad y profesional para verlos.</p>
    <div class="nc-days"></div>
    <div class="nc-booking" hidden>
      <p class="nc-booking-summary"></p>
      <div class="nc-booking-grid">
        <p class="nc-channel-summary" id="ncChannelSummary">Si querés recordatorios, elegí el medio arriba.</p>
        <label>Nombre<input id="ncName" autocomplete="name" maxlength="80"></label>
        <label id="ncEmailWrap" hidden>Email<input id="ncEmail" type="email" autocomplete="email"></label>
        <label id="ncWhatsappWrap" hidden>WhatsApp<input id="ncWhatsapp" inputmode="tel" autocomplete="tel" placeholder="Ej.: 351..."></label>
      </div>
      <button id="ncConfirm" type="button">Confirmar turno</button>
      <div id="ncBookingStatus" class="nc-status" role="status"></div>
    </div>`;
  actions.insertAdjacentElement('afterend',panel);

  const days=$('.nc-days',panel);
  const booking=$('.nc-booking',panel);
  const summary=$('.nc-booking-summary',panel);
  const channelSummary=$('#ncChannelSummary',panel);
  const emailWrap=$('#ncEmailWrap',panel);
  const whatsappWrap=$('#ncWhatsappWrap',panel);
  const confirm=$('#ncConfirm',panel);
  const status=$('#ncBookingStatus',panel);
  let selectedSlot=null;
  let availabilityController=null;

  specialty.addEventListener('change',()=>{
    fillProfessionals();
    clearSlots();
    button.textContent='Buscar horarios';
  });

  professional.addEventListener('change',()=>{
    clearSlots();
    if(specialty.value&&professional.value)searchAvailability();
  });

  button.textContent='Buscar horarios';
  button.addEventListener('click',()=>{
    if(specialty.value&&professional.value)searchAvailability();
    else showMessage('Elegí una especialidad y después un profesional.','error');
  });

  confirm.addEventListener('click',confirmAppointment);
  syncReminderPreference();

  async function searchAvailability(){
    if(!specialty.value||!professional.value)return;
    if(availabilityController)availabilityController.abort();
    availabilityController=new AbortController();
    selectedSlot=null;
    booking.hidden=true;
    days.replaceChildren();
    panel.hidden=false;
    panel.dataset.state='';
    $('.nc-slots-title',panel).textContent='Buscando próximos turnos…';
    $('.nc-slots-copy',panel).textContent=`${specialty.value} · ${professional.value}`;
    button.disabled=true;
    const oldText=button.textContent;
    button.textContent='Buscando…';

    try{
      const response=await fetch('/api/availability',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({specialty:specialty.value,professional:professional.value}),
        signal:availabilityController.signal
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.ok===false)throw new Error(data.error||'No se pudo buscar disponibilidad.');
      renderSlots(Array.isArray(data.slots)?data.slots:[],data.source);
    }catch(error){
      if(error?.name!=='AbortError')showMessage(error?.message||'No se pudo consultar la disponibilidad.','error');
    }finally{
      button.disabled=false;
      button.textContent=oldText||'Buscar horarios';
    }
  }

  function renderSlots(slots,source){
    panel.hidden=false;
    panel.dataset.state='';
    days.replaceChildren();
    booking.hidden=true;
    selectedSlot=null;
    $('.nc-slots-title',panel).textContent=slots.length?'Elegí día y horario':'Sin turnos disponibles';
    $('.nc-slots-copy',panel).textContent=slots.length
      ?`Estos son los próximos turnos de ${professional.value} para ${specialty.value}.${source==='demo-fallback'?' Datos de demostración.':''}`
      :'No hay próximos turnos cargados para ese profesional.';

    const groups=slots.reduce((acc,slot)=>{
      (acc[slot.date]??=[]).push(slot);
      return acc;
    },{});

    Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).forEach(([date,dateSlots])=>{
      const wrap=document.createElement('div');
      wrap.className='nc-day';
      const head=document.createElement('div');
      head.className='nc-day-title';
      const strong=document.createElement('strong');
      strong.textContent=formatDate(date);
      const count=document.createElement('span');
      count.textContent=`${dateSlots.length} horario${dateSlots.length===1?'':'s'}`;
      head.append(strong,count);
      const list=document.createElement('div');
      list.className='nc-slot-list';

      dateSlots.forEach(slot=>{
        const control=document.createElement('button');
        control.type='button';
        control.className='nc-slot';
        control.setAttribute('aria-pressed','false');
        const time=document.createElement('span');
        time.textContent=slot.time;
        const location=document.createElement('small');
        location.textContent=slot.location;
        control.append(time,location);
        control.addEventListener('click',()=>selectSlot(slot,control));
        list.appendChild(control);
      });

      wrap.append(head,list);
      days.appendChild(wrap);
    });
  }

  function selectSlot(slot,control){
    selectedSlot=slot;
    days.querySelectorAll('.nc-slot').forEach(item=>item.setAttribute('aria-pressed',String(item===control)));
    summary.textContent=`${slot.specialty} · ${slot.professional} · ${slot.location} · ${formatDate(slot.date)} a las ${slot.time}`;
    booking.hidden=false;
    status.textContent='';
    syncReminderPreference();
  }

  async function confirmAppointment(){
    if(!selectedSlot){setStatus('Primero elegí un horario.','error');return;}
    const channel=getReminderChannel();
    const name=$('#ncName',panel).value.trim();
    const email=$('#ncEmail',panel).value.trim();
    const whatsapp=$('#ncWhatsapp',panel).value.trim();
    if(!name){setStatus('Ingresá tu nombre.','error');return;}
    if(channel==='email'&&!email){setStatus('Ingresá el email para recibir los recordatorios.','error');return;}
    if(channel==='whatsapp'&&!whatsapp){setStatus('Ingresá el WhatsApp para recibir los recordatorios.','error');return;}

    const payload={
      appointmentId:selectedSlot.slotId,
      appointmentAt:`${selectedSlot.date}T${selectedSlot.time}:00-03:00`,
      name,email,whatsapp,channel:channel||'email',
      service:selectedSlot.specialty,
      professional:selectedSlot.professional,
      location:selectedSlot.location
    };

    confirm.disabled=true;
    confirm.textContent='Confirmando…';
    try{
      const response=await fetch('/api/appointments',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.ok===false)throw new Error(data.error||'No se pudo confirmar el turno.');
      setStatus('Turno confirmado correctamente.','success');
      confirm.textContent='Turno confirmado';
    }catch(error){
      setStatus(error?.message||'No se pudo confirmar el turno.','error');
      confirm.disabled=false;
      confirm.textContent='Confirmar turno';
    }
  }

  function setupReminderPreference(){
    if(!consentWrap||!consent)return;
    consentWrap.classList.add('nc-reminder-consent');
    const label=consent.closest('label');
    if(label){
      const text=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
      if(text)text.textContent=' Quiero recibir confirmación y recordatorios de este turno.';
    }
    if($('.nc-reminder-preference',consentWrap))return;
    const preference=document.createElement('fieldset');
    preference.className='nc-reminder-preference';
    preference.hidden=!consent.checked;
    preference.innerHTML='<legend>¿Por dónde preferís recibirlos?</legend><div class="nc-channel-options"><label><input type="radio" name="ncReminderChannel" value="email"><span><strong>Email</strong><small>Confirmación y recordatorios por correo</small></span></label><label><input type="radio" name="ncReminderChannel" value="whatsapp"><span><strong>WhatsApp</strong><small>Confirmación y recordatorios por mensaje</small></span></label></div>';
    consentWrap.appendChild(preference);
    consent.addEventListener('change',()=>{
      preference.hidden=!consent.checked;
      if(!consent.checked)preference.querySelectorAll('input[type="radio"]').forEach(radio=>radio.checked=false);
      syncReminderPreference();
    });
    preference.addEventListener('change',syncReminderPreference);
  }

  function syncReminderPreference(){
    if(!channelSummary||!emailWrap||!whatsappWrap)return;
    const channel=getReminderChannel();
    if(!consent?.checked){
      channelSummary.textContent='Los recordatorios son opcionales.';
      emailWrap.hidden=true;
      whatsappWrap.hidden=true;
      return;
    }
    if(!channel){
      channelSummary.textContent='Elegí arriba si preferís Email o WhatsApp.';
      emailWrap.hidden=true;
      whatsappWrap.hidden=true;
      return;
    }
    channelSummary.textContent=`Vas a recibir confirmación y recordatorios por ${channel==='email'?'Email':'WhatsApp'}.`;
    emailWrap.hidden=channel!=='email';
    whatsappWrap.hidden=channel!=='whatsapp';
  }

  function getReminderChannel(){
    return consentWrap?.querySelector('input[name="ncReminderChannel"]:checked')?.value||'';
  }

  function fillSpecialties(){
    specialty.replaceChildren(new Option('Elegí una especialidad',''));
    CATALOG.forEach(item=>specialty.add(new Option(item.specialty,item.specialty)));
  }

  function fillProfessionals(){
    professional.replaceChildren(new Option('Elegí un profesional',''));
    const item=CATALOG.find(entry=>entry.specialty===specialty.value);
    (item?.professionals||[]).forEach(name=>professional.add(new Option(name,name)));
    professional.disabled=!item;
  }

  function replaceWithSelect(old,placeholder){
    if(!old)return null;
    const select=document.createElement('select');
    select.id=old.id;
    select.setAttribute('aria-label',placeholder);
    old.replaceWith(select);
    return select;
  }

  function hideField(field){
    const label=field?.closest('label');
    if(label)label.hidden=true;
  }

  function clearSlots(){
    selectedSlot=null;
    panel.hidden=true;
    booking.hidden=true;
    days.replaceChildren();
  }

  function showMessage(message,state){
    panel.hidden=false;
    panel.dataset.state=state||'';
    days.replaceChildren();
    booking.hidden=true;
    $('.nc-slots-title',panel).textContent=state==='error'?'Revisá la selección':'Disponibilidad';
    $('.nc-slots-copy',panel).textContent=message;
  }

  function setStatus(message,state){
    status.textContent=message;
    status.dataset.state=state||'';
  }

  function formatDate(value){
    try{
      return new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Argentina/Cordoba'}).format(new Date(`${value}T12:00:00-03:00`));
    }catch{return value;}
  }

  function injectStyles(){
    if($('#ncAvailabilityStyles'))return;
    const style=document.createElement('style');
    style.id='ncAvailabilityStyles';
    style.textContent=`
      .nc-booking-intro{margin:0 0 16px;padding:14px;border:1px solid #b7d7e8;border-radius:12px;background:#eef8fd;color:#163f58;display:grid;gap:5px;font-size:.82rem;line-height:1.4}
      .nc-booking-intro strong{font-size:.9rem;color:#0f3650}.nc-booking-intro span{color:#294f66}
      .form-grid select{min-height:48px;background:#fff;color:#17202a;border:1px solid #8fa0ae}
      .form-grid select:disabled{background:#f1f5f9;color:#64748b}
      .nc-slots{margin-top:16px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;padding:16px}
      .nc-slots[hidden],.nc-booking[hidden],.nc-reminder-preference[hidden]{display:none!important}
      .nc-slots[data-state="error"]{background:#fff7ed;border-color:#fdba74}
      .nc-slots-title{font-size:1rem;font-weight:850;color:#0f172a;margin:0 0 5px}.nc-slots-copy{font-size:.82rem;line-height:1.5;color:#334155;margin:0 0 14px}
      .nc-day{padding:12px 0;border-top:1px solid #e2e8f0}.nc-day:first-of-type{border-top:0;padding-top:0}.nc-day-title{display:flex;justify-content:space-between;gap:10px;margin-bottom:9px;color:#0f172a}.nc-day-title strong{font-size:.88rem}.nc-day-title span{font-size:.72rem;color:#475569}
      .nc-slot-list{display:flex;gap:8px;flex-wrap:wrap}.nc-slot{min-height:46px;border:1px solid #7f9aae;background:#fff;color:#0e4c78;border-radius:10px;font-weight:800;padding:8px 12px;display:flex;flex-direction:column}.nc-slot small{font-size:.68rem;color:#526579}.nc-slot[aria-pressed="true"]{background:#1261a0;color:#fff;border-color:#1261a0}.nc-slot[aria-pressed="true"] small{color:#fff}
      .nc-booking{margin-top:14px;padding:14px;border:1px solid #cbd5e1;border-radius:11px;background:#f8fafc}.nc-booking-summary{font-size:.82rem;line-height:1.5;color:#1e293b}.nc-booking-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nc-booking label{display:flex;flex-direction:column;gap:5px;font-size:.76rem;font-weight:750;color:#334155}.nc-booking input{min-height:44px;border:1px solid #94a3b8;border-radius:8px;padding:0 9px;background:#fff;color:#0f172a}.nc-booking button{width:100%;min-height:44px;margin-top:12px;border:0;border-radius:9px;background:#1261a0;color:#fff;font-weight:800}
      .nc-status{margin-top:10px;min-height:20px;font-size:.8rem;color:#334155}.nc-status[data-state="error"]{color:#991b1b;font-weight:700}.nc-status[data-state="success"]{color:#166534;font-weight:800}
      .nc-reminder-consent{margin-top:14px;padding:14px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc}.nc-reminder-preference{margin:12px 0 0;padding:0;border:0}.nc-reminder-preference legend{margin:0 0 9px;color:#0f172a;font-size:.82rem;font-weight:850}.nc-channel-options{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nc-channel-options label{display:flex;gap:9px;padding:11px;border:1px solid #94a3b8;border-radius:10px;background:#fff;color:#0f172a;cursor:pointer}.nc-channel-options span{display:grid;gap:2px}.nc-channel-options small{color:#475569;font-size:.7rem}.nc-channel-summary{grid-column:1/-1;margin:0;padding:10px 12px;border-radius:9px;background:#eef6fb;color:#204c68;font-size:.76rem;font-weight:750}
      .portal-actions .portal-secondary{display:none}.portal-actions .portal-primary{margin-left:auto}
      @media(max-width:620px){.nc-booking-grid,.nc-channel-options{grid-template-columns:1fr}.nc-slot{flex:1 1 44%}.portal-actions .portal-primary{width:100%;min-height:48px}}
    `;
    document.head.appendChild(style);
  }
})();