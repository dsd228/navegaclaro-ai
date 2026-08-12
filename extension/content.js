(() => {
  if (globalThis.__clarityLayerLoaded) return;
  globalThis.__clarityLayerLoaded = true;

  let plan = null;
  let stepIndex = 0;
  let tagged = [];
  let root = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'CLARITY_RESET') {
      reset();
      sendResponse({ ok:true });
      return;
    }
    if (message?.type === 'CLARITY_ANALYZE') {
      analyze(message.goal, message.apiUrl)
        .then((result) => sendResponse({ ok:true, mode:result.mode }))
        .catch((error) => sendResponse({ ok:false, error:error?.message || 'Analyze failed' }));
      return true;
    }
  });

  async function analyze(goal, apiUrl) {
    if (!/^https:\/\//i.test(String(apiUrl || ''))) throw new Error('Invalid API URL');
    reset();
    const page = extractPage();
    let result;
    try {
      const response = await fetch(apiUrl, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ goal, page })
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      result = await response.json();
      if (!Array.isArray(result.steps) || !result.steps.length) throw new Error('Empty plan');
    } catch {
      result = clientFallback(goal, page);
    }
    plan = result;
    stepIndex = 0;
    renderPanel();
    showStep(0);
    return result;
  }

  function extractPage() {
    tagged = [];
    const selector = 'button,a,input,select,textarea,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[tabindex]';
    const candidates = [...document.querySelectorAll(selector)]
      .filter((el) => !el.closest('#claritylayer-root'))
      .filter(isVisible)
      .filter((el) => !isSensitive(el))
      .slice(0, 140);

    const elements = candidates.map((el, index) => {
      const id = `cl-${index + 1}`;
      el.setAttribute('data-clarity-id', id);
      tagged.push(el);
      return {
        id,
        tag:el.tagName.toLowerCase(),
        role:el.getAttribute('role') || '',
        type:el.getAttribute('type') || '',
        label:getLabel(el),
        text:clean(el.innerText || el.textContent || '').slice(0,220),
        placeholder:clean(el.getAttribute('placeholder') || '').slice(0,160),
        name:clean(el.getAttribute('name') || '').slice(0,100),
        context:getContext(el),
        disabled:Boolean(el.disabled)
      };
    });

    return {
      title:document.title,
      url:`${location.origin}${location.pathname}`,
      text:extractSafeVisibleText(),
      elements
    };
  }

  function extractSafeVisibleText() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,template,svg,canvas,input,textarea,select,#claritylayer-root').forEach((n) => n.remove());
    return clean(clone.innerText || clone.textContent || '').slice(0,12000);
  }

  function isSensitive(el) {
    const type = String(el.getAttribute('type') || '').toLowerCase();
    return ['password','hidden'].includes(type);
  }

  function getLabel(el) {
    const aria = el.getAttribute('aria-label');
    if (aria) return clean(aria).slice(0,220);
    if (el.labels?.length) return clean([...el.labels].map((x) => x.innerText).join(' ')).slice(0,220);
    if (el.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return clean(label.innerText).slice(0,220);
      } catch {}
    }
    return clean(el.innerText || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || '').slice(0,220);
  }

  function getContext(el) {
    const owner = el.closest('label,fieldset,form,section,article,[role="group"]');
    return clean(owner?.innerText || '').slice(0,260);
  }

  function renderPanel() {
    root = document.createElement('div');
    root.id = 'claritylayer-root';
    root.innerHTML = `
      <section class="claritylayer-panel" role="dialog" aria-label="Guía NavegaClaro">
        <div class="claritylayer-head">
          <span class="claritylayer-mark">N</span>
          <strong>NavegaClaro</strong>
          <button class="claritylayer-close" aria-label="Cerrar NavegaClaro">×</button>
        </div>
        <div class="claritylayer-meta"><span data-cl-counter></span><span data-cl-mode></span></div>
        <h2 data-cl-title></h2>
        <p data-cl-why></p>
        <div class="claritylayer-actions">
          <button class="claritylayer-prev">Anterior</button>
          <button class="claritylayer-next">Siguiente</button>
        </div>
        <div class="claritylayer-live" aria-live="polite" data-cl-live></div>
      </section>`;
    document.documentElement.appendChild(root);
    root.querySelector('.claritylayer-close').addEventListener('click', reset);
    root.querySelector('.claritylayer-prev').addEventListener('click', () => showStep(stepIndex - 1));
    root.querySelector('.claritylayer-next').addEventListener('click', () => {
      if (stepIndex >= plan.steps.length - 1) reset();
      else showStep(stepIndex + 1);
    });
  }

  function showStep(index) {
    if (!plan || !root) return;
    stepIndex = Math.max(0, Math.min(index, plan.steps.length - 1));
    document.querySelectorAll('.claritylayer-target').forEach((el) => el.classList.remove('claritylayer-target'));

    const step = plan.steps[stepIndex];
    const target = findTarget(step);
    if (target) {
      target.classList.add('claritylayer-target');
      target.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' });
      if (['focus','type','select'].includes(step.action)) setTimeout(() => safeFocus(target), 350);
    }

    root.querySelector('[data-cl-counter]').textContent = `Paso ${stepIndex + 1} de ${plan.steps.length}`;
    root.querySelector('[data-cl-mode]').textContent = plan.mode === 'ai' ? 'IA' : 'Resiliente';
    root.querySelector('[data-cl-title]').textContent = step.instruction;
    root.querySelector('[data-cl-why]').textContent = target ? (step.why || plan.summary || '') : `${step.why || ''} No pude resaltar el control, pero podés continuar con la instrucción.`;
    root.querySelector('.claritylayer-prev').disabled = stepIndex === 0;
    root.querySelector('.claritylayer-next').textContent = stepIndex === plan.steps.length - 1 ? 'Finalizar' : 'Siguiente';
    root.querySelector('[data-cl-live]').textContent = `Paso ${stepIndex + 1}: ${step.instruction}`;
  }

  function findTarget(step) {
    if (step?.target_id) {
      const exact = document.querySelector(`[data-clarity-id="${attributeEscape(step.target_id)}"]`);
      if (exact && isVisible(exact)) return exact;
    }
    const wanted = normalize(step?.target_text || '');
    if (!wanted) return null;
    let best = null;
    let score = -1;
    for (const el of tagged) {
      if (!isVisible(el)) continue;
      const text = normalize(`${getLabel(el)} ${el.innerText || el.textContent || ''}`);
      const current = similarity(wanted, text);
      if (current > score) { score = current; best = el; }
    }
    return score >= .28 ? best : null;
  }

  function similarity(a,b) {
    if (!a || !b) return 0;
    if (b.includes(a) || a.includes(b)) return .95;
    const aa = new Set(a.split(' ').filter(Boolean));
    const bb = new Set(b.split(' ').filter(Boolean));
    let common = 0;
    aa.forEach((x) => { if (bb.has(x)) common++; });
    return common / Math.max(aa.size,1);
  }


  function clientFallback(goal, page) {
    const ng = normalize(goal);
    const intentWords = ng.includes('turno') || ng.includes('cita')
      ? ['especialidad','profesional','sede','fecha','horario'] : [];
    const tokens = ng.split(' ').filter((x) => x.length > 3);
    const scored = page.elements.map((el, order) => {
      const text = normalize(`${el.label} ${el.text} ${el.placeholder} ${el.context}`);
      let score = intentWords.some((w) => text.includes(w)) ? 6 : 0;
      for (const token of tokens) if (text.includes(token)) score += 3;
      return { el, score, order };
    }).filter((x) => x.score > 0).sort((a,b) => b.score - a.score || a.order - b.order);
    const selected = scored.slice(0,5).sort((a,b) => a.order - b.order).map((x) => x.el);
    if (!selected.length && page.elements[0]) selected.push(page.elements[0]);
    const steps = selected.map((el) => ({
      target_id:el.id,
      target_text:el.label || el.text,
      action:el.tag === 'select' ? 'select' : (el.tag === 'input' ? 'type' : 'click'),
      instruction:el.tag === 'select' ? `Elegí una opción en “${el.label || el.text}”.` : (el.tag === 'input' ? `Completá “${el.label || el.text}”.` : `Seleccioná “${el.label || el.text}”.`),
      why:'Este paso forma parte del recorrido mínimo detectado en la página.'
    }));
    return { goal, summary:'Modo de contingencia en el navegador.', steps, confidence:.5, warnings:['El endpoint no respondió.'], mode:'client-fallback' };
  }

  function reset() {
    document.querySelectorAll('.claritylayer-target').forEach((el) => el.classList.remove('claritylayer-target'));
    if (root) root.remove();
    root = null;
    plan = null;
    stepIndex = 0;
    for (const el of tagged) el.removeAttribute('data-clarity-id');
    tagged = [];
  }

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 1 && rect.height > 1;
  }

  function safeFocus(el) { try { el.focus({ preventScroll:true }); } catch {} }
  function clean(value) { return String(value || '').replace(/\s+/g,' ').trim(); }
  function normalize(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ\s]/gi,' '); }
  function attributeEscape(value) { return String(value).replace(/["\\]/g,'\\$&'); }
})();
