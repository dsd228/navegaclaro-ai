import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/analyze.js';

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

const page = {
  url: 'https://demo.local/turnos?token=secret',
  elements: [
    { id: 'n1', tag: 'button', text: 'Beneficios' },
    { id: 'f1', tag: 'select', label: 'Especialidad', text: 'Dermatología' },
    { id: 'f2', tag: 'select', label: 'Profesional' },
    { id: 'f3', tag: 'select', label: 'Sede' },
    { id: 'f4', tag: 'input', type: 'date', label: 'Fecha' },
    { id: 'f5', tag: 'button', text: 'Buscar horarios' }
  ]
};

test('API responde fallback válido sin clave y conserva CORS', async () => {
  const old = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const req = { method: 'POST', body: { goal: 'Quiero sacar un turno con dermatología', page } };
  const res = responseMock();
  await handler(req, res);
  if (old) process.env.GROQ_API_KEY = old;
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, 'fallback');
  assert.deepEqual(res.body.steps.map((s) => s.target_id), ['f1','f2','f3','f4','f5']);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

test('API rechaza objetivo vacío', async () => {
  const req = { method: 'POST', body: { goal: '', page } };
  const res = responseMock();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
});

test('API responde preflight', async () => {
  const req = { method: 'OPTIONS', body: {} };
  const res = responseMock();
  await handler(req, res);
  assert.equal(res.statusCode, 204);
});

test('ruta IA usa Groq Chat Completions con JSON Schema strict y valida IDs', async () => {
  const oldKey = process.env.GROQ_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = 'test-key';
  let calledUrl = '';
  let calledBody;
  globalThis.fetch = async (url, options) => {
    calledUrl = String(url);
    calledBody = JSON.parse(options.body);
    const output = {
      goal: 'Sacar un turno',
      summary: 'Recorrido mínimo',
      steps: [
        { instruction: 'Elegí una especialidad.', target_id: 'f1', target_text: 'Especialidad', action: 'select', why: 'Define el tipo de atención.' },
        { instruction: 'Elegí un profesional.', target_id: 'f2', target_text: 'Profesional', action: 'select', why: 'Define quién te atiende.' },
        { instruction: 'Elegí una sede.', target_id: 'f3', target_text: 'Sede', action: 'select', why: 'Define el lugar.' },
        { instruction: 'Elegí una fecha.', target_id: 'f4', target_text: 'Fecha', action: 'type', why: 'Define cuándo.' },
        { instruction: 'Buscá horarios.', target_id: 'f5', target_text: 'Buscar horarios', action: 'click', why: 'Muestra disponibilidad.' }
      ],
      confidence: 0.93,
      warnings: []
    };
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: JSON.stringify(output) } }] };
      }
    };
  };

  const req = { method: 'POST', body: { goal: 'Quiero sacar un turno', page } };
  const res = responseMock();
  await handler(req, res);

  globalThis.fetch = oldFetch;
  if (oldKey) process.env.GROQ_API_KEY = oldKey; else delete process.env.GROQ_API_KEY;

  assert.equal(calledUrl, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calledBody.model, 'openai/gpt-oss-120b');
  assert.equal(calledBody.response_format.type, 'json_schema');
  assert.equal(calledBody.response_format.json_schema.strict, true);
  assert.equal(calledBody.messages[0].role, 'system');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, 'ai');
  assert.equal(res.body.steps[0].target_id, 'f1');
});

test('target inventado por IA cae a fallback sin romper la tarea', async () => {
  const oldKey = process.env.GROQ_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = 'test-key';
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { choices: [{ message: { content: JSON.stringify({
        goal: 'Turno', summary: 'x',
        steps: [{ instruction: 'Click', target_id: 'inventado', target_text: 'x', action: 'click', why: 'x' }],
        confidence: 0.9, warnings: []
      }) } }] };
    }
  });
  const res = responseMock();
  await handler({ method: 'POST', body: { goal: 'Quiero sacar un turno', page } }, res);
  globalThis.fetch = oldFetch;
  if (oldKey) process.env.GROQ_API_KEY = oldKey; else delete process.env.GROQ_API_KEY;
  assert.equal(res.body.mode, 'fallback');
  assert.equal(res.body.steps.some((s) => s.target_id === 'inventado'), false);
});
