const STOPWORDS = new Set([
  'quiero','necesito','hacer','para','una','uno','unos','unas','del','las','los','que','con','por','como','mi','me','un','de','la','el',
  'i','want','need','to','a','an','the','my','for','and','of'
]);

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñáéíóúü\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function goalTokens(goal = '') {
  return normalizeText(goal)
    .split(' ')
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

const GOAL_SYNONYMS = {
  turno: ['turno','cita','reservar','reserva','agenda','agendar','appointment','booking','especialidad','profesional','sede','fecha','horario','horarios'],
  comprar: ['comprar','compra','carrito','producto','checkout','buy','cart'],
  pagar: ['pagar','pago','factura','tarjeta','pay','payment'],
  ingresar: ['ingresar','entrar','login','acceder','cuenta','sign in'],
  registrar: ['registrar','crear cuenta','alta','sign up','register'],
  contactar: ['contactar','contacto','mensaje','consulta','whatsapp','email'],
  buscar: ['buscar','encontrar','search','find']
};

function semanticBoost(goal, haystack) {
  const ng = normalizeText(goal);
  const nh = normalizeText(haystack);
  let boost = 0;
  for (const [intent, words] of Object.entries(GOAL_SYNONYMS)) {
    if (ng.includes(intent) || words.some((w) => ng.includes(normalizeText(w)))) {
      if (words.some((w) => nh.includes(normalizeText(w)))) boost += 4;
    }
  }
  return boost;
}

export function scoreElement(goal, element) {
  const haystack = [
    element.label,
    element.text,
    element.placeholder,
    element.name,
    element.role,
    element.tag,
    element.type,
    element.context
  ].filter(Boolean).join(' ');
  const normalized = normalizeText(haystack);
  const tokens = goalTokens(goal);
  let score = semanticBoost(goal, haystack);

  for (const token of tokens) {
    if (normalized.includes(token)) score += token.length >= 6 ? 3 : 2;
  }

  const tag = normalizeText(element.tag);
  const role = normalizeText(element.role);
  if (['button','select','input','a'].includes(tag) || ['button','link','combobox'].includes(role)) score += 0.5;
  if (element.disabled) score -= 5;
  return score;
}

export function heuristicPlan(goal, page = {}) {
  const elements = Array.isArray(page.elements) ? page.elements : [];
  const scored = elements
    .map((element) => ({ ...element, _score: scoreElement(goal, element) }))
    .filter((element) => element._score > 0)
    .sort((a, b) => b._score - a._score);

  const selected = [];
  const seen = new Set();
  for (const item of scored) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    selected.push(item);
    if (selected.length >= 5) break;
  }

  if (!selected.length) {
    for (const item of elements.slice(0, 3)) {
      if (item?.id) selected.push({ ...item, _score: 0 });
    }
  }

  const steps = selected.map((item, index) => ({
    instruction: instructionFor(item, index),
    target_id: item.id,
    target_text: item.label || item.text || item.placeholder || `Paso ${index + 1}`,
    action: inferAction(item),
    why: index === 0 ? 'Es el control más relacionado con tu objetivo.' : 'Te acerca al siguiente punto necesario del flujo.'
  }));

  return {
    goal: String(goal || 'Completar la tarea'),
    summary: steps.length
      ? `Encontré ${steps.length} acciones relevantes y oculté la complejidad innecesaria del recorrido.`
      : 'No pude identificar controles claros. Te muestro una guía textual para que puedas continuar.',
    steps,
    confidence: steps.length ? 0.62 : 0.25,
    warnings: steps.length ? ['Modo resiliente: la IA no estaba disponible y se usó análisis local.'] : ['No se encontraron objetivos interactivos claros.'],
    mode: 'fallback'
  };
}

function inferAction(item) {
  const tag = normalizeText(item.tag);
  const type = normalizeText(item.type);
  if (tag === 'select') return 'select';
  if (tag === 'input' && ['text','email','tel','number','date','time','search'].includes(type || 'text')) return 'type';
  if (tag === 'button' || tag === 'a') return 'click';
  return 'focus';
}

function instructionFor(item, index) {
  const label = item.label || item.text || item.placeholder || `el elemento del paso ${index + 1}`;
  const action = inferAction(item);
  if (action === 'select') return `Elegí una opción en “${label}”.`;
  if (action === 'type') return `Completá “${label}”.`;
  if (action === 'click') return `Seleccioná “${label}”.`;
  return `Revisá “${label}”.`;
}

export function validatePlan(plan, validIds = new Set()) {
  if (!plan || typeof plan !== 'object') return false;
  if (!Array.isArray(plan.steps)) return false;
  if (plan.steps.length < 1 || plan.steps.length > 6) return false;
  return plan.steps.every((step) => {
    if (!step || typeof step.instruction !== 'string') return false;
    if (step.target_id && validIds.size && !validIds.has(step.target_id)) return false;
    return true;
  });
}

export function redactPage(page = {}) {
  return {
    title: String(page.title || '').slice(0, 200),
    url: safeUrl(page.url),
    text: String(page.text || '').slice(0, 12000),
    elements: (Array.isArray(page.elements) ? page.elements : []).slice(0, 140).map((el) => ({
      id: String(el.id || '').slice(0, 80),
      tag: String(el.tag || '').slice(0, 30),
      role: String(el.role || '').slice(0, 50),
      type: String(el.type || '').slice(0, 30),
      label: String(el.label || '').slice(0, 220),
      text: String(el.text || '').slice(0, 220),
      placeholder: String(el.placeholder || '').slice(0, 160),
      name: String(el.name || '').slice(0, 100),
      context: String(el.context || '').slice(0, 260),
      disabled: Boolean(el.disabled)
    }))
  };
}

function safeUrl(raw) {
  try {
    const url = new URL(String(raw || 'https://example.invalid'));
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return '';
  }
}
