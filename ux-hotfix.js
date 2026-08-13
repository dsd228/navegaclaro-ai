(()=>{
  const specialty=document.querySelector('#especialidad');
  const professional=document.querySelector('#profesional');
  const form=document.querySelector('.form-grid');
  if(!specialty||!professional||!form||document.querySelector('.nc-manual-search'))return;

  const wrapper=document.createElement('div');
  wrapper.className='nc-manual-search';
  wrapper.innerHTML=`
    <strong>¿No encontrás lo que buscás?</strong>
    <p>Podés escribir manualmente otra especialidad o el nombre de un profesional. Las opciones del desplegable son sugerencias de esta demo, no significan que la clínica atienda únicamente esas especialidades.</p>
    <div class="nc-manual-grid">
      <label>Buscar otra especialidad
        <input id="ncManualSpecialty" type="search" placeholder="Ej.: Urología" autocomplete="off">
      </label>
      <label>Buscar profesional por nombre
        <input id="ncManualProfessional" type="search" placeholder="Ej.: Dra. Ana Pérez" autocomplete="off">
      </label>
    </div>
    <p id="ncManualStatus" class="nc-manual-status" role="status"></p>
  `;
  form.insertAdjacentElement('afterend',wrapper);

  const manualSpecialty=document.querySelector('#ncManualSpecialty');
  const manualProfessional=document.querySelector('#ncManualProfessional');
  const status=document.querySelector('#ncManualStatus');

  manualSpecialty.addEventListener('change',()=>{
    const value=manualSpecialty.value.trim();
    if(!value)return;
    ensureOption(specialty,value);
    specialty.value=value;
    specialty.dispatchEvent(new Event('change',{bubbles:true}));
    status.textContent=`Especialidad seleccionada: ${value}.`;
  });

  manualProfessional.addEventListener('change',()=>{
    const value=manualProfessional.value.trim();
    if(!value)return;
    ensureOption(professional,value);
    professional.value=value;
    professional.dispatchEvent(new Event('change',{bubbles:true}));
    status.textContent=`Profesional seleccionado: ${value}.`;
  });

  const style=document.createElement('style');
  style.textContent=`
    .nc-manual-search{margin:14px 0 4px;padding:14px;border:1px solid #9fb3c3;border-radius:10px;background:#f8fbfd;color:#17202a}
    .nc-manual-search>strong{display:block;color:#17202a;font-size:.86rem;margin-bottom:5px}
    .nc-manual-search>p{margin:0 0 11px;color:#3f4d5a;font-size:.78rem;line-height:1.45}
    .nc-manual-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nc-manual-grid label{display:flex;flex-direction:column;gap:6px;color:#334155;font-size:.75rem;font-weight:750}
    .nc-manual-grid input{min-height:44px;border:1px solid #7f91a2;border-radius:8px;background:#fff;color:#0f172a;padding:0 10px}
    .nc-manual-grid input::placeholder{color:#64748b}
    .nc-manual-status{min-height:18px!important;margin:8px 0 0!important;color:#235c35!important;font-weight:700!important}
    @media(max-width:620px){.nc-manual-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function ensureOption(select,value){
    const exists=[...select.options].some(option=>option.value.toLocaleLowerCase('es')===value.toLocaleLowerCase('es'));
    if(!exists)select.add(new Option(value,value));
  }
})();