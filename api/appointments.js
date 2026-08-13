const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;
const buckets = globalThis.__navegaClaroAppointmentBuckets || new Map();
globalThis.__navegaClaroAppointmentBuckets = buckets;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowRequest(req, res)) return;

  const webhookUrl = process.env.N8N_APPOINTMENT_WEBHOOK_URL;
  const sharedSecret = process.env.N8N_SHARED_SECRET;
  if (!webhookUrl || !sharedSecret) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: 'La automatización de turnos todavía no está conectada.'
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const appointment = normalizeAppointment(body);
  const validation = validateAppointment(appointment);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NavegaClaro-Secret': sharedSecret
      },
      body: JSON.stringify(appointment),
      redirect: 'follow',
      signal: AbortSignal.timeout(9000)
    });

    if (!response.ok) throw new Error(`n8n ${response.status}`);
    let data = {};
    try { data = await response.json(); } catch {}

    return res.status(200).json({
      ok: true,
      configured: true,
      appointmentId: data.appointmentId || appointment.appointmentId,
      channel: appointment.channel,
      confirmationScheduled: true,
      reminders: ['24h', '2h']
    });
  } catch (error) {
    console.error('Appointment automation failed', error?.message || error);
    return res.status(502).json({
      ok: false,
      configured: true,
      error: 'No se pudo programar la confirmación y los recordatorios.'
    });
  }
}

function normalizeAppointment(body) {
  const channel = ['email', 'whatsapp'].includes(String(body.channel || '').toLowerCase())
    ? String(body.channel).toLowerCase()
    : '';
  const digits = String(body.whatsapp || '').replace(/\D/g, '').slice(0, 15);
  const appointmentId = text(body.appointmentId, 100) || `nc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    appointmentId,
    appointmentAt: text(body.appointmentAt, 40),
    name: text(body.name, 80),
    email: text(body.email, 160).toLowerCase(),
    whatsapp: digits,
    channel,
    service: text(body.service, 120),
    professional: text(body.professional, 120),
    location: text(body.location, 120),
    source: 'navegaclaro-webapp'
  };
}

function validateAppointment(a) {
  if (!a.channel) return { ok: false, error: 'Elegí email o WhatsApp para recibir recordatorios.' };
  const when = new Date(a.appointmentAt);
  if (!Number.isFinite(when.getTime())) return { ok: false, error: 'Fecha y hora del turno inválidas.' };
  const now = Date.now();
  if (when.getTime() <= now) return { ok: false, error: 'El turno debe estar en el futuro.' };
  if (when.getTime() > now + 366 * 24 * 60 * 60 * 1000) return { ok: false, error: 'El turno está demasiado lejos en el futuro.' };
  if (a.channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return { ok: false, error: 'Ingresá un email válido.' };
  if (a.channel === 'whatsapp' && !/^\d{8,15}$/.test(a.whatsapp)) return { ok: false, error: 'Ingresá un número de WhatsApp válido con código de país.' };
  return { ok: true };
}

function text(value, max) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function allowRequest(req, res) {
  const now = Date.now();
  const key = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim();
  const previous = (buckets.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (previous.length >= RATE_MAX) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Demasiadas solicitudes.' });
    return false;
  }
  previous.push(now);
  buckets.set(key, previous);
  return true;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
