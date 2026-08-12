const goal = document.querySelector('#goal');
const run = document.querySelector('#run');
const reset = document.querySelector('#reset');
const status = document.querySelector('#status');
const apiUrl = document.querySelector('#apiUrl');
const save = document.querySelector('#save');

chrome.storage.local.get(['clarityApiUrl','lastGoal'], (data) => {
  if (data.clarityApiUrl) apiUrl.value = data.clarityApiUrl;
  if (data.lastGoal) goal.value = data.lastGoal;
});

save.addEventListener('click', async () => {
  const value = apiUrl.value.trim();
  if (!/^https:\/\//i.test(value)) {
    status.textContent = 'El endpoint debe usar HTTPS.';
    return;
  }
  await chrome.storage.local.set({ clarityApiUrl: value });
  status.textContent = 'Endpoint guardado.';
});

run.addEventListener('click', async () => {
  const userGoal = goal.value.trim();
  if (!userGoal) {
    status.textContent = 'Escribí primero qué querés hacer.';
    goal.focus();
    return;
  }
  run.disabled = true;
  status.textContent = 'Analizando la página…';
  await chrome.storage.local.set({ lastGoal: userGoal, clarityApiUrl: apiUrl.value.trim() });

  try {
    const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
    if (!tab?.id) throw new Error('No active tab');
    const response = await chrome.tabs.sendMessage(tab.id, {
      type:'CLARITY_ANALYZE',
      goal:userGoal,
      apiUrl:apiUrl.value.trim()
    });
    if (!response?.ok) throw new Error(response?.error || 'No se pudo analizar la página');
    status.textContent = response.mode === 'ai' ? 'Guía creada con IA.' : 'Guía creada en modo resiliente.';
    setTimeout(() => window.close(), 450);
  } catch (error) {
    status.textContent = 'No funciona en esta pestaña. Probá una página web normal y recargala tras instalar la extensión.';
  } finally {
    run.disabled = false;
  }
});

reset.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type:'CLARITY_RESET' });
    status.textContent = 'Página restaurada.';
  } catch {
    status.textContent = 'No había una guía activa.';
  }
});
