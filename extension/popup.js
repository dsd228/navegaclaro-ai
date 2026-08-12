const goal = document.querySelector('#goal');
const run = document.querySelector('#run');
const reset = document.querySelector('#reset');
const status = document.querySelector('#status');
const statusText = document.querySelector('#statusText');
const serviceBadge = document.querySelector('#serviceBadge');
const examples = [...document.querySelectorAll('[data-goal]')];

boot();

function boot() {
  chrome.storage.local.get(['lastGoal'], (data) => {
    if (data.lastGoal) goal.value = data.lastGoal;
  });
  checkHealth();
}

examples.forEach((button) => {
  button.addEventListener('click', () => {
    goal.value = button.dataset.goal || '';
    goal.focus();
    goal.setSelectionRange(goal.value.length, goal.value.length);
  });
});

goal.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    run.click();
  }
});

run.addEventListener('click', async () => {
  const userGoal = goal.value.trim();
  if (!userGoal) {
    setStatus('error', 'Escribí primero qué querés hacer.');
    goal.focus();
    return;
  }

  run.disabled = true;
  setStatus('busy', 'Leyendo la estructura de esta página…');
  await chrome.storage.local.set({ lastGoal: userGoal });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/i.test(tab.url || '')) throw new Error('unsupported-tab');

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'CLARITY_ANALYZE',
      goal: userGoal
    });

    if (!response?.ok) throw new Error(response?.error || 'analyze-failed');

    const label = response.mode === 'ai'
      ? `Guía creada con IA${response.latencyMs ? ` en ${(response.latencyMs / 1000).toFixed(1)} s` : ''}.`
      : 'Guía creada en modo resiliente.';
    setStatus('success', label);
    setTimeout(() => window.close(), 650);
  } catch (error) {
    const message = error?.message === 'unsupported-tab'
      ? 'Abrí una página web normal (http/https) para usar NavegaClaro.'
      : 'No pude iniciar la guía en esta pestaña. Si acabás de instalar la extensión, recargá la página y probá de nuevo.';
    setStatus('error', message);
  } finally {
    run.disabled = false;
  }
});

reset.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'CLARITY_RESET' });
    setStatus('success', 'Guía retirada. La página quedó como estaba.');
  } catch {
    setStatus('error', 'No había una guía activa en esta pestaña.');
  }
});

async function checkHealth() {
  serviceBadge.dataset.state = 'checking';
  serviceBadge.textContent = 'Comprobando';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'NC_HEALTH' });
    if (response?.ok && response.configured) {
      serviceBadge.dataset.state = 'online';
      serviceBadge.textContent = 'IA conectada';
    } else {
      serviceBadge.dataset.state = 'offline';
      serviceBadge.textContent = 'Modo resiliente';
    }
  } catch {
    serviceBadge.dataset.state = 'offline';
    serviceBadge.textContent = 'Modo resiliente';
  }
}

function setStatus(state, text) {
  status.dataset.state = state;
  statusText.textContent = text;
}
