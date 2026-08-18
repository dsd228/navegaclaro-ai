(() => {
  if (globalThis.__navegaClaroLoaded) return;
  globalThis.__navegaClaroLoaded = true;

  const INTERACTIVE_SELECTOR = 'button,a[href],input,select,textarea,[contenteditable="true"],[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="combobox"],[tabindex]';
  let plan = null;
  let stepIndex = 0;
  let tagged = [];
  let root = null;
  let activeTarget = null;
  let rafPending = false;
  let verificationCleanup = null;
  let mutationObserver = null;
  let domVersion = 0;
  let stepVerified = false;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'CLARITY_RESET') {
      reset();
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'CLARITY_ANALYZE') {
      analyze(message.goal)
        .then((result) => sendResponse({ ok: true, mode: result.mode, latencyMs: result.latencyMs || 0 }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || 'Analyze failed' }));
      return true;
    }
  });

  async function analyze(goal) {
    const cleanGoal = clean(goal).slice(0, 500);
    if (!cleanGoal) throw new Error('Falta el objetivo.');

    reset();
    const page = extractPage(cleanGoal);
    let result;

    try {
      const remote = await chrome.runtime.sendMessage({
        type: 'NC_REMOTE_ANALYZE',
        payload: { goal: cleanGoal, page }
      });
      if (!remote?.ok || !Array.isArray(remote?.data?.steps) || !remote.data.steps.length) {
        throw new Error(remote?.error || 'Remote analyze failed');
      }
      result = { ...remote.data, latencyMs: remote.latencyMs || 0 };
    } catch {
      result = clientFallback(cleanGoal, page);
    }

    plan = result;
    stepIndex = 0;
    renderPanel();
    showStep(0);
    return result;
  }

  function extractPage(goal) {
    const raw = [...document.querySelectorAll(INTERACTIVE_SELECTOR)]
      .filter((el) => !el.closest('#claritylayer-root'))
      .filter(isVisible)
      .filter((el) => !isSensitive(el))
      .slice(0, 450)
      .map((el, order) => ({ el, order, meta: elementMeta(el), score: localRelevance(goal, el) }));

    const selected = raw.length <= 140
      ? raw
      : raw
          .sort((a, b) => b.score - a.score || a.order - b.order)
          .slice(0, 140)
          .sort((a, b) => a.order - b.order);

    tagged = [];
    const elements = selected.map((item, index) => {
      const id = `cl-${index + 1}`;
      item.el.setAttribute('data-clarity-id', id);
      tagged.push(item.el);
      return { id, ...item.meta, disabled: Boolean(item.el.disabled) };
    });

    return {
      title: scrub(document.title).slice(0, 200),
      url: `${location.origin}${location.pathname}`,
      text: extractSemanticSummary(),
      elements
    };
  }

  function elementMeta(el) {
    return {
      tag: el.tagName.toLowerCase(),
      role: scrub(el.getAttribute('role') || '').slice(0, 50),
      type: scrub(el.getAttribute('type') || '').slice(0, 30),
      label: scrub(getLabel(el)).slice(0, 220),
      text: scrub(el.innerText || el.textContent || '').slice(0, 220),
      placeholder: scrub(el.getAttribute('placeholder') || '').slice(0, 160),
      name: scrub(el.getAttribute('name') || '').slice(0, 100),
      context: scrub(getContext(el)).slice(0, 280)
    };
  }

  function extractSemanticSummary() {
    const nodes = [...document.querySelectorAll('h1,h2,h3,legend,[role="heading"]')]
      .filter((el) => !el.closest('#claritylayer-root'))
      .filter(isVisible)
      .slice(0, 45)
      .map((el) => scrub(el.innerText || el.textContent || ''))
      .filter(Boolean);
    return clean(nodes.join(' · ')).slice(0, 5000);
  }

  function localRelevance(goal, el) {
    const ng = normalize(goal);
    const meta = elementMeta(el);
    const haystack = normalize(`${meta.label} ${meta.text} ${meta.placeholder} ${meta.context}`);
    const tokens = ng.split(' ').filter((token) => token.length > 3);
    let score = 0;
    for (const token of tokens) if (haystack.includes(token)) score += token.length > 6 ? 5 : 3;

    const intentGroups = [
      ['turno','cita','reservar','agendar','especialidad','profesional','sede','fecha','horario'],
      ['buscar','encontrar','search','filtro','categoria','provincia','localidad','resultados'],
      ['pagar','pago','factura','importe','medio de pago','continuar'],
      ['comprar','producto','carrito','cantidad','entrega','checkout'],
      ['contactar','contacto','consulta','mensaje','whatsapp','email']
    ];
    for (const group of intentGroups) {
      if (group.some((word) => ng.includes(normalize(word))) && group.some((word) => haystack.includes(normalize(word)))) score += 8;
    }

    if (['SELECT','INPUT','BUTTON'].includes(el.tagName)) score += 1;
    if (el.disabled) score -= 20;
    return score;
  }

  function isSensitive(el) {
    const type = String(el.getAttribute('type') || '').toLowerCase();
    const autocomplete = String(el.getAttribute('autocomplete') || '').toLowerCase();
    const name = String(el.getAttribute('name') || '').toLowerCase();
    if (['password','hidden'].includes(type)) return true;
    if (/(password|current-password|new-password|one-time-code|cc-number|cc-csc|cc-exp)/.test(autocomplete)) return true;
    return /(password|passwd|token|otp|cvv|cvc|cardnumber|tarjeta)/.test(name);
  }

  function getLabel(el) {
    const aria = el.getAttribute('aria-label');
    if (aria) return clean(aria);
    if (el.labels?.length) return clean([...el.labels].map((x) => x.innerText).join(' '));
    if (el.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return clean(label.innerText);
      } catch {}
    }
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || '').join(' ');
      if (clean(text)) return clean(text);
    }
    return clean(el.innerText || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || '');
  }

  function getContext(el) {
    const owner = el.closest('label,fieldset,form,section,article,[role="group"],[role="region"]');
    return clean(owner?.innerText || '').slice(0, 360);
  }

  function renderPanel() {
    root = document.createElement('div');
    root.id = 'claritylayer-root';
    root.innerHTML = `
      <div class="claritylayer-focus-ring" data-cl-ring aria-hidden="true"></div>
      <section class="claritylayer-panel" role="dialog" aria-label="Guía NavegaClaro" aria-live="polite">
        <div class="claritylayer-head">
          <span class="claritylayer-mark" aria-hidden="true">N</span>
          <div class="claritylayer-brand"><strong>NavegaClaro</strong><small>Verified Guide · una acción por vez</small></div>
          <button class="claritylayer-close" aria-label="Cerrar NavegaClaro">×</button>
        </div>
        <div class="claritylayer-progress" aria-hidden="true"><span data-cl-progress></span></div>
        <div class="claritylayer-meta"><span data-cl-counter></span><span data-cl-mode></span></div>
        <h2 data-cl-title></h2>
        <p class="claritylayer-target-name" data-cl-target></p>
        <p data-cl-why></p>
        <p class="claritylayer-verification" data-cl-verification role="status">Esperando la acción indicada.</p>
        <div class="claritylayer-actions">
          <button class="claritylayer-prev">Anterior</button>
          <button class="claritylayer-next" disabled>Esperando acción…</button>
        </div>
        <p class="claritylayer-control-note">Vos hacés la acción. NavegaClaro sólo avanza cuando puede detectar que ocurrió.</p>
        <div class="claritylayer-live" aria-live="polite" data-cl-live></div>
      </section>`;

    document.documentElement.appendChild(root);
    root.querySelector('.claritylayer-close').addEventListener('click', reset);
    root.querySelector('.claritylayer-prev').addEventListener('click', () => showStep(stepIndex - 1));
    root.querySelector('.claritylayer-next').addEventListener('click', () => {
      if (!stepVerified) return;
      if (stepIndex >= plan.steps.length - 1) reset();
      else showStep(stepIndex + 1);
    });

    mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => !(record.target instanceof Element && record.target.closest('#claritylayer-root')))) {
        domVersion += 1;
      }
    });
    if (document.body) mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('scroll', scheduleRingUpdate, true);
    window.addEventListener('resize', scheduleRingUpdate, true);
    document.addEventListener('keydown', onKeydown, true);
  }

  function showStep(index) {
    if (!plan || !root) return;
    cleanupVerification();
    stepIndex = Math.max(0, Math.min(index, plan.steps.length - 1));
    const step = plan.steps[stepIndex];
    activeTarget = findTarget(step);
    stepVerified = false;

    root.querySelector('[data-cl-counter]').textContent = `Paso ${stepIndex + 1} de ${plan.steps.length}`;
    const modeText = plan.mode === 'ai'
      ? `IA${plan.latencyMs ? ` · ${(plan.latencyMs / 1000).toFixed(1)} s` : ''}`
      : 'Modo resiliente';
    root.querySelector('[data-cl-mode]').textContent = modeText;
    root.querySelector('[data-cl-progress]').style.width = `${((stepIndex + 1) / plan.steps.length) * 100}%`;
    root.querySelector('[data-cl-title]').textContent = step.instruction;
    root.querySelector('[data-cl-target]').textContent = step.target_text ? `En la página: ${step.target_text}` : '';
    root.querySelector('[data-cl-why]').textContent = activeTarget
      ? (step.why || plan.summary || '')
      : `${step.why || ''} El control cambió o ya no está visible; no vamos a marcar el paso como cumplido hasta reencontrarlo.`.trim();
    root.querySelector('.claritylayer-prev').disabled = stepIndex === 0;
    const next = root.querySelector('.claritylayer-next');
    next.disabled = true;
    next.textContent = 'Esperando acción…';
    root.querySelector('[data-cl-live]').textContent = `Paso ${stepIndex + 1}: ${step.instruction}`;

    const verification = root.querySelector('[data-cl-verification]');
    const verifier = globalThis.NCStepVerifier;
    const risk = verifier?.classifyRisk ? verifier.classifyRisk(step) : 'safe';
    verification.dataset.level = 'waiting';
    verification.dataset.risk = risk;
    verification.textContent = risk === 'irreversible'
      ? 'Acción importante: NavegaClaro no la ejecutará por vos. Hacela personalmente para continuar.'
      : risk === 'sensitive'
        ? 'Paso sensible: completalo personalmente. No guardamos el valor del campo.'
        : 'Esperando la acción indicada.';

    if (activeTarget) {
      installStepVerification(step, activeTarget);
      activeTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      if (['focus','type','select'].includes(step.action)) setTimeout(() => safeFocus(activeTarget), 300);
      setTimeout(updateRing, 180);
      setTimeout(updateRing, 520);
    } else {
      hideRing();
    }
  }

  function installStepVerification(step, target) {
    const verifier = globalThis.NCStepVerifier;
    const verification = root?.querySelector('[data-cl-verification]');
    if (!verifier?.snapshot || !verifier?.evaluate || !verification) {
      verification.textContent = 'El verificador local no está disponible. Este paso no puede avanzar automáticamente.';
      return;
    }

    const before = verifier.snapshot(target, { url: location.href, domVersion });
    const action = String(step.action || 'focus');
    const eventTypes = action === 'select'
      ? ['change']
      : action === 'type'
        ? ['input', 'change']
        : action === 'click'
          ? ['click']
          : ['focus'];

    let lastEventType = '';
    let pendingTimer = null;

    const check = (eventType) => {
      lastEventType = eventType;
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        if (!root || step !== plan?.steps?.[stepIndex]) return;
        const after = verifier.snapshot(target, {
          url: location.href,
          domVersion,
          active: document.activeElement === target,
        });
        const outcome = verifier.evaluate({ step, before, after, eventType: lastEventType });
        verification.dataset.level = outcome.level;
        verification.dataset.risk = outcome.risk;
        verification.textContent = outcome.verified
          ? `${outcome.level === 'state-verified' ? 'Estado verificado' : 'Acción detectada'} · ${outcome.message}`
          : outcome.message;

        if (outcome.verified) {
          stepVerified = true;
          const next = root.querySelector('.claritylayer-next');
          next.disabled = false;
          next.textContent = stepIndex >= plan.steps.length - 1 ? 'Finalizar recorrido' : 'Continuar · paso verificado';
          root.querySelector('[data-cl-live]').textContent = `Paso ${stepIndex + 1} verificado. ${outcome.message}`;
        }
      }, action === 'click' ? 180 : 30);
    };

    for (const eventType of eventTypes) target.addEventListener(eventType, () => check(eventType), true);

    const handlers = eventTypes.map((eventType) => {
      const handler = () => check(eventType);
      return { eventType, handler };
    });

    for (const { eventType, handler } of handlers) {
      target.removeEventListener(eventType, () => check(eventType), true);
      target.addEventListener(eventType, handler, true);
    }

    verificationCleanup = () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      for (const { eventType, handler } of handlers) target.removeEventListener(eventType, handler, true);
    };
  }

  function cleanupVerification() {
    if (verificationCleanup) {
      try { verificationCleanup(); } catch {}
    }
    verificationCleanup = null;
  }

  function findTarget(step) {
    if (step?.target_id) {
      const exact = document.querySelector(`[data-clarity-id="${attributeEscape(step.target_id)}"]`);
      if (exact && isVisible(exact)) return exact;
    }

    const wanted = normalize(step?.target_text || '');
    if (!wanted) return null;
    let best = null;
    let bestScore = -1;
    const live = [...document.querySelectorAll(INTERACTIVE_SELECTOR)]
      .filter((el) => !el.closest('#claritylayer-root'))
      .filter(isVisible)
      .filter((el) => !isSensitive(el));

    for (const el of live) {
      const text = normalize(`${getLabel(el)} ${el.innerText || el.textContent || ''} ${el.getAttribute('placeholder') || ''}`);
      const current = similarity(wanted, text);
      if (current > bestScore) {
        bestScore = current;
        best = el;
      }
    }
    return bestScore >= 0.34 ? best : null;
  }

  function updateRing() {
    rafPending = false;
    const ring = root?.querySelector('[data-cl-ring]');
    if (!ring || !activeTarget || !isVisible(activeTarget)) {
      hideRing();
      return;
    }
    const rect = activeTarget.getBoundingClientRect();
    const pad = 7;
    ring.style.display = 'block';
    ring.style.left = `${Math.max(4, rect.left - pad)}px`;
    ring.style.top = `${Math.max(4, rect.top - pad)}px`;
    ring.style.width = `${Math.max(12, Math.min(innerWidth - 8, rect.width + pad * 2))}px`;
    ring.style.height = `${Math.max(12, Math.min(innerHeight - 8, rect.height + pad * 2))}px`;
  }

  function scheduleRingUpdate() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(updateRing);
  }

  function hideRing() {
    const ring = root?.querySelector('[data-cl-ring]');
    if (ring) ring.style.display = 'none';
  }

  function onKeydown(event) {
    if (!root) return;
    if (event.key === 'Escape') reset();
    if (event.altKey && event.key === 'ArrowRight' && stepVerified && stepIndex < plan.steps.length - 1) showStep(stepIndex + 1);
    if (event.altKey && event.key === 'ArrowLeft' && stepIndex > 0) showStep(stepIndex - 1);
  }

  function clientFallback(goal, page) {
    const ng = normalize(goal);
    const tokens = ng.split(' ').filter((x) => x.length > 3);
    const groups = [
      ['turno','cita','reservar','agendar','especialidad','profesional','sede','fecha','horario'],
      ['buscar','encontrar','search','filtro','categoria','provincia','localidad','resultados'],
      ['pagar','pago','factura','importe','continuar'],
      ['comprar','producto','carrito','cantidad','entrega'],
      ['contactar','contacto','consulta','mensaje','whatsapp','email']
    ];
    const activeGroups = groups.filter((group) => group.some((word) => ng.includes(normalize(word))));
    const scored = page.elements.map((el, order) => {
      const text = normalize(`${el.label} ${el.text} ${el.placeholder} ${el.context}`);
      let score = 0;
      for (const group of activeGroups) if (group.some((word) => text.includes(normalize(word)))) score += 7;
      for (const token of tokens) if (text.includes(token)) score += token.length > 6 ? 4 : 2;
      if (el.disabled) score -= 20;
      return { el, score, order };
    }).filter((item) => item.score > 0);

    const selected = scored
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, 5)
      .sort((a, b) => a.order - b.order)
      .map((item) => item.el);

    if (!selected.length && page.elements[0]) selected.push(page.elements[0]);
    const steps = selected.map((el) => ({
      target_id: el.id,
      target_text: el.label || el.text || el.placeholder,
      action: el.tag === 'select' ? 'select' : (el.tag === 'input' || el.tag === 'textarea' ? 'type' : 'click'),
      instruction: el.tag === 'select'
        ? `Elegí una opción en “${el.label || el.text}”.`
        : (el.tag === 'input' || el.tag === 'textarea'
            ? `Completá “${el.label || el.text || el.placeholder}”.`
            : `Seleccioná “${el.label || el.text}”.`),
      why: 'Este control es uno de los más relacionados con tu objetivo.'
    }));

    return {
      goal,
      summary: 'Modo de contingencia local: la guía sigue funcionando aunque el servicio de IA no responda.',
      steps,
      confidence: 0.5,
      warnings: ['El servicio de IA no respondió; se usó análisis local.'],
      mode: 'client-fallback',
      latencyMs: 0
    };
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (b.includes(a) || a.includes(b)) return 0.96;
    const aa = new Set(a.split(' ').filter(Boolean));
    const bb = new Set(b.split(' ').filter(Boolean));
    let common = 0;
    aa.forEach((word) => { if (bb.has(word)) common += 1; });
    return common / Math.max(aa.size, 1);
  }

  function reset() {
    cleanupVerification();
    mutationObserver?.disconnect();
    mutationObserver = null;
    domVersion = 0;
    window.removeEventListener('scroll', scheduleRingUpdate, true);
    window.removeEventListener('resize', scheduleRingUpdate, true);
    document.removeEventListener('keydown', onKeydown, true);
    if (root) root.remove();
    root = null;
    plan = null;
    stepIndex = 0;
    activeTarget = null;
    rafPending = false;
    stepVerified = false;
    for (const el of tagged) {
      try { el.removeAttribute('data-clarity-id'); } catch {}
    }
    tagged = [];
  }

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 1 && rect.height > 1;
  }

  function safeFocus(el) {
    try { el.focus({ preventScroll: true }); } catch {}
  }

  function scrub(value) {
    return clean(value)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo]')
      .replace(/(?:\+?\d[\s().-]*){8,}/g, '[número]')
      .replace(/\b\d{8,11}\b/g, '[dato numérico]');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalize(value) {
    return clean(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9ñ\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function attributeEscape(value) {
    return String(value).replace(/["\\]/g, '\\$&');
  }
})();
