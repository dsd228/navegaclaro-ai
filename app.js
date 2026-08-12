const portal = document.querySelector('#portal');
const goalInput = document.querySelector('#goalInput');
const simplifyBtn = document.querySelector('#simplifyBtn');
const resetBtn = document.querySelector('#resetBtn');
const guide = document.querySelector('#guide');
const stepCounter = document.querySelector('#stepCounter');
const confidence = document.querySelector('#confidence');
const guideTitle = document.querySelector('#guideTitle');
const guideWhy = document.querySelector('#guideWhy');
const prevStep = document.querySelector('#prevStep');
const nextStep = document.querySelector('#nextStep');
const engineBadge = document.querySelector('#engineBadge');

let plan = null;
let stepIndex = 0;
let tagged = [];

simplifyBtn.addEventListener('click', analyzePortal);
resetBtn.addEventListener('click', resetGuide);
prevStep.addEventListener('click', () => showStep(stepIndex - 1));
nextStep.addEventListener('click', () => {
  if (!plan) return;
  if (stepIndex >= plan.steps.length - 1) {
    resetGuide();
    return;
  }
  showStep(stepIndex + 1);
});

async function analyzePortal() {
  const goal = goalInput.value.trim();
  if (!goal) {
    goalInput.focus();
    return;
  }

  resetHighlights();
  simplifyBtn.disabled = true;
  simplifyBtn.textContent = 'Analizando…';
  engineBadge.textContent = 'Procesando';

  const page = extractPage(portal);
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, page })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    plan = await response.json();
    if (!Array.isArray(plan.steps) || !plan.steps.length) throw new Error('Plan vacío');
    stepIndex = 0;
    portal.classList.add('clarity-active');
    guide.hidden = false;
    engineBadge.textContent = plan.mode === 'ai' ? 'IA activa' : 'Resiliente';
    showStep(0);
  } catch (error) {
    plan = clientFallback(goal, page);
    stepIndex = 0;
    portal.classList.add('clarity-active');
    guide.hidden = false;
    engineBadge.textContent = 'Resiliente local';
    showStep(0);
  } finally {
    simplifyBtn.disabled = false;
    simplifyBtn.textContent = 'Simplificar esta página';
  }
}

function extractPage(root) {
  tagged = [];
  const candidates = [...root.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="link"],[tabindex]')]
    .filter(isVisible)
    .slice(0, 120);

  const elements = candidates.map((el, index) => {
    const id = `cl-demo-${index + 1}`;
    el.dataset.clId = id;
    tagged.push(el);
    const label = getLabel(el);
    return {
      id,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || '',
      type: el.getAttribute('type') || '',
      label,
      text: clean(el.innerText || el.textContent || ''),
      placeholder: el.getAttribute('placeholder') || '',
      name: el.getAttribute('name') || '',
      context: clean(el.closest('label,fieldset,.portal-card')?.innerText || '').slice(0, 220),
      disabled: Boolean(el.disabled)
    };
  });

  return {
    title: 'Salud Central — Portal de pacientes',
    url: `${location.origin}/demo/portal-turnos`,
    text: clean(root.innerText).slice(0, 10000),
    elements
  };
}

function showStep(nextIndex) {
  if (!plan) return;
  stepIndex = Math.max(0, Math.min(nextIndex, plan.steps.length - 1));
  const step = plan.steps[stepIndex];
  resetHighlights();
  const target = portal.querySelector(`[data-cl-id="${cssEscape(step.target_id)}"]`);
  if (target) {
    target.classList.add('clarity-target');
    target.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' });
    if (step.action === 'focus' || step.action === 'type' || step.action === 'select') {
      setTimeout(() => target.focus({ preventScroll: true }), 450);
    }
  }
  stepCounter.textContent = `Paso ${stepIndex + 1} de ${plan.steps.length}`;
  confidence.textContent = `${Math.round((plan.confidence || 0) * 100)}% confianza`;
  guideTitle.textContent = step.instruction;
  guideWhy.textContent = step.why || plan.summary || '';
  prevStep.disabled = stepIndex === 0;
  nextStep.textContent = stepIndex === plan.steps.length - 1 ? 'Finalizar' : 'Siguiente';
}

function resetGuide() {
  plan = null;
  stepIndex = 0;
  portal.classList.remove('clarity-active');
  guide.hidden = true;
  engineBadge.textContent = 'Listo';
  resetHighlights();
  for (const el of tagged) delete el.dataset.clId;
  tagged = [];
}

function resetHighlights() {
  portal.querySelectorAll('.clarity-target').forEach((el) => el.classList.remove('clarity-target'));
}

function isVisible(el) {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
}

function getLabel(el) {
  const aria = el.getAttribute('aria-label');
  if (aria) return clean(aria);
  if (el.labels?.length) return clean([...el.labels].map((x) => x.innerText).join(' '));
  if (el.id) {
    const label = portal.querySelector(`label[for="${cssEscape(el.id)}"]`);
    if (label) return clean(label.innerText);
  }
  return clean(el.innerText || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || '');
}

function clean(value) { return String(value || '').replace(/\s+/g,' ').trim(); }
function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g,'\\$&'); }


function clientFallback(goal, page) {
  const ng = normalize(goal);
  const intentWords = ng.includes('turno') || ng.includes('cita')
    ? ['especialidad','profesional','sede','fecha','horario'] : [];
  const tokens = ng.split(' ').filter((x) => x.length > 3);
  const scored = page.elements.map((el, order) => {
    const text = normalize([el.label, el.text, el.placeholder, el.context].filter(Boolean).join(' '));
    let score = intentWords.some((w) => text.includes(w)) ? 6 : 0;
    for (const token of tokens) if (text.includes(token)) score += 3;
    return { el, score, order };
  }).filter((x) => x.score > 0).sort((a,b) => b.score - a.score || a.order - b.order);
  const selected = scored.slice(0,5).sort((a,b) => a.order - b.order).map((x) => x.el);
  const steps = selected.map((el) => ({
    target_id: el.id,
    target_text: el.label || el.text,
    action: el.tag === 'select' ? 'select' : (el.tag === 'input' ? 'type' : 'click'),
    instruction: el.tag === 'select' ? `Elegí una opción en “${el.label || el.text}”.` : (el.tag === 'input' ? `Completá “${el.label || el.text}”.` : `Seleccioná “${el.label || el.text}”.`),
    why: 'Este paso forma parte del recorrido mínimo detectado en la página.'
  }));
  if (!steps.length && page.elements[0]) {
    const el = page.elements[0];
    steps.push({ target_id:el.id, target_text:el.label||el.text, action:'focus', instruction:`Revisá “${el.label || el.text || 'este control'}”.`, why:'Es el primer control disponible para continuar.' });
  }
  return { goal, summary:'Modo de contingencia en el navegador.', steps, confidence:.5, warnings:['El backend no respondió; se usó el motor de contingencia del navegador.'], mode:'client-fallback' };
}
function normalize(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ\s]/gi,' '); }
