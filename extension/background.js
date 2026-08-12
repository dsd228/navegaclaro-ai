const DEFAULT_API = 'https://navegaclaro-codercup-live-2026.vercel.app/api/analyze';
const DEFAULT_HEALTH = 'https://navegaclaro-codercup-live-2026.vercel.app/api/health';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'NC_REMOTE_ANALYZE') {
    remoteAnalyze(message.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'No se pudo consultar la IA.' }));
    return true;
  }

  if (message?.type === 'NC_HEALTH') {
    healthCheck()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Servicio no disponible.' }));
    return true;
  }
});

async function remoteAnalyze(payload) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 13000);

  try {
    const response = await fetch(DEFAULT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit'
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.steps) || !data.steps.length) throw new Error('La IA no devolvió un recorrido utilizable.');

    return {
      data,
      latencyMs: Math.max(1, Math.round(performance.now() - started))
    };
  } finally {
    clearTimeout(timer);
  }
}

async function healthCheck() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(DEFAULT_HEALTH, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error(`Health ${response.status}`);
    const data = await response.json();
    return {
      configured: Boolean(data?.ok && data?.aiConfigured),
      provider: data?.provider || '',
      model: data?.model || ''
    };
  } finally {
    clearTimeout(timer);
  }
}
