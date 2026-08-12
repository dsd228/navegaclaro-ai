import test from 'node:test';
import assert from 'node:assert/strict';
import { heuristicPlan, normalizeText, redactPage, validatePlan } from '../lib/analyzer.js';

test('normaliza acentos y espacios', () => {
  assert.equal(normalizeText('  Sacar   un TurnÓ  '), 'sacar un turno');
});

test('prioriza elementos relacionados al objetivo', () => {
  const page = {
    elements: [
      { id: 'x1', tag: 'button', text: 'Promociones' },
      { id: 'x2', tag: 'button', text: 'Reservar turno' },
      { id: 'x3', tag: 'select', label: 'Especialidad' }
    ]
  };
  const plan = heuristicPlan('Quiero sacar un turno', page);
  assert.equal(plan.steps[0].target_id, 'x2');
});

test('redacta URLs y no conserva valores arbitrarios', () => {
  const page = redactPage({
    url: 'https://example.com/path?token=secret#x',
    elements: [{ id: 'a', tag: 'input', label: 'Email', value: 'persona@example.com' }]
  });
  assert.equal(page.url, 'https://example.com/path');
  assert.equal('value' in page.elements[0], false);
});

test('rechaza target ids inventados', () => {
  const plan = {
    steps: [{ instruction: 'Click', target_id: 'inventado' }]
  };
  assert.equal(validatePlan(plan, new Set(['real'])), false);
});

test('rechaza ids duplicados para no guiar dos veces al mismo control', () => {
  const plan = {
    steps: [
      { instruction: 'Primero', target_id: 'a' },
      { instruction: 'Otra vez', target_id: 'a' }
    ]
  };
  assert.equal(validatePlan(plan, new Set(['a'])), false);
});

test('fallback de turno prioriza el flujo del formulario y evita ruido', () => {
  const page = {
    elements: [
      { id: 'n1', tag: 'button', text: 'Inicio' },
      { id: 'n2', tag: 'button', text: 'Beneficios' },
      { id: 'f1', tag: 'select', label: 'Especialidad', text: 'Dermatología' },
      { id: 'f2', tag: 'select', label: 'Profesional' },
      { id: 'f3', tag: 'select', label: 'Sede' },
      { id: 'f4', tag: 'input', type: 'date', label: 'Fecha' },
      { id: 'f5', tag: 'button', text: 'Buscar horarios' }
    ]
  };
  const ids = heuristicPlan('Quiero sacar un turno con dermatología', page).steps.map((s) => s.target_id);
  assert.deepEqual(ids, ['f1', 'f2', 'f3', 'f4', 'f5']);
});

test('fallback genérico conserva el orden natural del formulario', () => {
  const page = {
    elements: [
      { id: 'nav', tag: 'a', text: 'Inicio' },
      { id: 'cat', tag: 'select', label: 'Categoría del servicio' },
      { id: 'prov', tag: 'select', label: 'Provincia' },
      { id: 'loc', tag: 'select', label: 'Localidad' },
      { id: 'search', tag: 'button', text: 'Buscar resultados' }
    ]
  };
  const ids = heuristicPlan('Quiero encontrar un servicio en Córdoba', page).steps.map((s) => s.target_id);
  assert.deepEqual(ids, ['cat', 'prov', 'loc', 'search']);
});
