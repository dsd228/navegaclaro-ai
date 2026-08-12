const STOPWORDS = new Set([
  'quiero','necesito','hacer','para','una','uno','unos','unas','del','las','los','que','con','por','como','mi','me','un','de','la','el','en','al','y','o',
  'i','want','need','to','a','an','the','my','for','and','of','in'
]);

const NOISE_WORDS = ['inicio','home','promociones','beneficios','newsletter','publicidad','ayuda','faq','preguntas frecuentes','redes sociales'];

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
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
  buscar: ['buscar','encontrar','search','find','filtro','filtrar','categoria','especialidad','provincia','localidad','ubicacion','resultados'],
  tramite: ['tramite','gestion','solicitud','formulario','iniciar','continuar','confirmar','documentacion','requisito'],
  comprar: ['comprar','compra','carrito','producto','checkout','buy','cart','cantidad','entrega'],
  pagar: ['pagar','pago','factura','tarjeta','pay','payment','importe','total','medio de pago'],
  ingresar: ['ingresar','entrar','login','acceder','cuenta','sign in'],
  registrar: ['registrar','crear cuenta','alta','sign up','register'],
  contactar: ['contactar','contacto','mensaje','consulta','whatsapp','email','enviar']
};

function activeIntentWords(goal) {
  const ng = normalizeText(goal);
  const words = new Set();
  for (const [intent, synonyms] of Object.entries(GOAL_SYNONYMS)) {
    if (ng.includes(intent) || synonyms.some((word) => ng.includes(normalizeText(word)))) {
      synonyms.forEach((word) => words.add(normalizeText(word)));
    }
  }
  return [...words];
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
  const intentWords = activeIntentWords(goal);
  let score = 0;

  for (const token of tokens) {
    if (normalized.includes(token)) score += token.length >= 6 ? 4 : 2.5;
  }
  if (intentWords.some((word) => normalized.includes(word))) score += 6;

  const tag = normalizeText(element.tag);
  const role = normalizeText(element.role);
  if (score > 0 && (['button','select','input','textarea','a'].includes(tag) || ['button','link','combobox'].includes(role))) score += 1;
  if (NOISE_WORDS.some((word) => normalized === word || normalized.startsWith(`${word} `))) score -= 4;
  if (element.disabled) score -= 20;
  return score;
}

export function heuristicPlan(goal, page = {}) {
  const elements = Array.isArray(page.elements) ? page.elements : [];
  const scored = elements
    .map((element, order) => ({ ...element, _score: scoreElement(goal, element), _order: order }))
    .filter((element) => element._score > 1)
    .sort((a, b) => b._score - a._score || a._order - b._order)
    .slice(0, 5)
    .sort((a, b) => a._order - b._order);

  const selected = [];
  const seen = new Set();
  for (const item of scored) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    selected.push(item);
  }

  if (!selected.length) {
    for (const item of elements.filter((el) => el?.id && !el.disabled).slice(0, 3)) {
      selected.push({ ...item, _score: 0 });
    }
  }

  const steps = selected.map((item, index) => ({
    instruction: instructionFor(item, index),
    target_id: item.id,
    target_text: item.label || item.text || item.placeholder || `Paso ${index + 1}`,
    action: inferAction(item),
    why: index === 0 ? 'Es uno de los controles más relacionados con tu objetivo.' : 'Forma parte del recorrido mínimo detectado en la página.'
  }));

  return {
    goal: String(goal || 'Completar la tarea'),
    summary: steps.length
      ? `Encontré ${steps.length} acciones relevantes y mantuve su orden natural en la página.`
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
  if ((tag === 'input' || tag === 'textarea') && ['text','email','tel','number','date','time','search',''].includes(type)) return 'type';
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
  const seen = new Set();
  return plan.steps.every((step) => {
    if (!step || typeof step.instruction !== 'string' || !step.instruction.trim()) return false;
    if (!step.target_id || typeof step.target_id !== 'string') return false;
    if (validIds.size && !validIds.has(step.target_id)) return false;
    if (seen.has(step.target_id)) return false;
    seen.add(step.target_id);
    return true;
  });
}

export function redactPage(page = {}) {
  return {
    title: String(page.title || '').slice(0, 200),
    url: safeUrl(page.url),
    text: String(page.text || '').slice(0, 5000),
    elements: (Array.isArray(page.elements) ? page.elements : []).slice(0, 140).map((el) => ({
      id: String(el.id || '').slice(0, 80),
      tag: String(el.tag || '').slice(0, 30),
      role: String(el.role || '').slice(0, 50),
      type: String(el.type || '').slice(0, 30),
      label: String(el.label || '').slice(0, 220),
      text: String(el.text || '').slice(0, 220),
      placeholder: String(el.placeholder || '').slice(0, 160),
      name: String(el.name || '').slice(0, 100),
      context: String(el.context || '').slice(0, 280),
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
