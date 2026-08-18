import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../extension/step-verifier.js', import.meta.url), 'utf8');
const context = {
  location: { href: 'https://demo.local/turnos' },
  document: { activeElement: null },
};
context.globalThis = context;
vm.runInNewContext(source, context);
const verifier = context.NCStepVerifier;

function target(overrides = {}) {
  return {
    value: '',
    selectedIndex: 0,
    checked: false,
    disabled: false,
    innerText: '',
    textContent: '',
    ...overrides,
  };
}

test('clasifica acciones irreversibles sin IA', () => {
  assert.equal(verifier.classifyRisk({ instruction: 'Confirmar pago' }), 'irreversible');
  assert.equal(verifier.classifyRisk({ instruction: 'Ingresá tu DNI' }), 'sensitive');
  assert.equal(verifier.classifyRisk({ instruction: 'Elegí una especialidad' }), 'safe');
});

test('select sólo verifica si cambió de verdad', () => {
  const beforeTarget = target({ value: '', selectedIndex: 0 });
  const before = verifier.snapshot(beforeTarget, { domVersion: 1 });
  const afterTarget = target({ value: 'dermatologia', selectedIndex: 2 });
  const after = verifier.snapshot(afterTarget, { domVersion: 1 });
  const outcome = verifier.evaluate({
    step: { action: 'select', instruction: 'Elegí especialidad' },
    before,
    after,
    eventType: 'change',
  });
  assert.equal(outcome.verified, true);
  assert.equal(outcome.level, 'state-verified');
});

test('input vacío no se marca como completado', () => {
  const before = verifier.snapshot(target({ value: '' }), { domVersion: 1 });
  const after = verifier.snapshot(target({ value: '' }), { domVersion: 1 });
  const outcome = verifier.evaluate({
    step: { action: 'type', instruction: 'Completá fecha' },
    before,
    after,
    eventType: 'input',
  });
  assert.equal(outcome.verified, false);
  assert.equal(outcome.level, 'waiting');
});

test('click con mutación DOM produce state-verified', () => {
  const button = target({ innerText: 'Buscar horarios' });
  const before = verifier.snapshot(button, { url: 'https://demo.local/turnos', domVersion: 1 });
  const after = verifier.snapshot(button, { url: 'https://demo.local/turnos', domVersion: 2 });
  const outcome = verifier.evaluate({
    step: { action: 'click', instruction: 'Buscar horarios' },
    before,
    after,
    eventType: 'click',
  });
  assert.equal(outcome.verified, true);
  assert.equal(outcome.level, 'state-verified');
});

test('click real sin estado observable no inventa verificación de estado', () => {
  const button = target({ innerText: 'Continuar' });
  const before = verifier.snapshot(button, { url: 'https://demo.local', domVersion: 1 });
  const after = verifier.snapshot(button, { url: 'https://demo.local', domVersion: 1 });
  const outcome = verifier.evaluate({
    step: { action: 'click', instruction: 'Continuar' },
    before,
    after,
    eventType: 'click',
  });
  assert.equal(outcome.verified, true);
  assert.equal(outcome.level, 'action-verified');
});
