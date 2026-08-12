export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(200).json({
    ok: true,
    service: 'navegaclaro-ai',
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    provider: process.env.GROQ_API_KEY ? 'groq' : 'fallback',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
  });
}
