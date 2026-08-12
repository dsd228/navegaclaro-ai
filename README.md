# NavegaClaro AI

> **La web, paso a paso.** Una web app + extensión de Chrome que transforma interfaces complejas en recorridos guiados según el objetivo de la persona.

Proyecto para **CoderCup AI 2026**.

## Qué problema resuelve

Muchas tareas digitales —pedir un turno, completar un trámite, buscar un servicio— presentan navegación, banners, formularios y decisiones simultáneas. Para personas con dificultades de atención, memoria de trabajo o comprensión, esa complejidad puede bloquear una tarea que debería ser simple.

NavegaClaro recibe un objetivo en lenguaje natural, por ejemplo:

> “Quiero sacar un turno con dermatología.”

Luego identifica el recorrido mínimo y guía sobre los controles reales de la página, una acción por vez.

## Producto v0.4

### Web app

- landing/product experience completa;
- demo funcional con Groq real;
- health status en vivo;
- dashboard de evidencia;
- Test Lab para registrar pruebas reales;
- integración preparada con Google Sheets;
- estado vacío honesto si todavía no existen métricas.

### Extensión Chrome

- Manifest V3;
- captura estructurada del DOM visible;
- IDs controlados antes del LLM;
- guía secuencial sobre controles reales;
- recuperación por texto si una SPA vuelve a renderizar el target;
- fallback resiliente si falla red/modelo.

### Backend Vercel

- `/api/analyze` — Groq GPT-OSS 120B + Structured Outputs;
- `/api/health` — estado de IA/evidencia;
- `/api/evidence` — proxy seguro hacia Google Sheets/Apps Script;
- rate limiting y límites de payload.

## Diferencial técnico

NavegaClaro **no pide al LLM que invente selectores CSS**. El navegador asigna IDs controlados a elementos interactivos visibles. El modelo solo puede elegir entre esos IDs y devuelve JSON Schema estricto. El backend valida que todos los targets existan antes de usar el plan.

```text
Objetivo humano
      ↓
DOM vivo + controles visibles
      ↓
IDs controlados
      ↓
Groq GPT-OSS 120B
      ↓
JSON Schema estricto
      ↓
Validación
      ↓
Guía sobre el control real
```

## Privacidad

- no se envían valores de `input` / `textarea`;
- contraseñas, OTP y campos de tarjeta se excluyen;
- query strings/fragments se eliminan;
- emails y números largos se redactan en telemetría/evidencia;
- Google Sheets registra participantes anónimos (`P01`, `P02`...), no identidad real.

## Google Sheets como capa de evidencia

La web app puede mostrar métricas reales calculadas desde un spreadsheet:

```text
Google Sheets
  ├─ TEST_USUARIOS
  ├─ SESIONES
  ├─ QA
  └─ METRICAS
```

El frontend nunca ve el secreto de Google Sheets. La cadena es:

```text
Web app / Test Lab → Vercel /api/evidence → Apps Script → Google Sheets
```

Configuración completa: [`docs/GOOGLE_SHEETS_SETUP.md`](docs/GOOGLE_SHEETS_SETUP.md).

## Variables de entorno

### IA

```text
GROQ_API_KEY=<clave>
GROQ_MODEL=openai/gpt-oss-120b   # opcional
```

### Evidencia

```text
GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/.../exec
GOOGLE_SHEETS_SHARED_SECRET=<secreto Apps Script>
EVIDENCE_ADMIN_TOKEN=<token para Test Lab>
```

Si Google Sheets todavía no está conectado, la app sigue funcionando y muestra evidencia pendiente sin inventar métricas.

## Estructura

```text
api/
  analyze.js
  evidence.js
  health.js
lib/
extension/
google-apps-script/
  Code.gs
index.html
app.js
styles.css
test-lab.html
test-lab.js
tests/
docs/
```

## Tests

Requiere Node 20+.

```bash
npm test
```

GitHub Actions también valida sintaxis de la extensión, empaqueta el artifact instalable y ejecuta un smoke test contra producción con inferencia real de Groq.

## Instalar extensión

1. Abrir `chrome://extensions`.
2. Activar **Developer mode**.
3. Elegir **Load unpacked**.
4. Seleccionar `extension/`.
5. Recargar las pestañas abiertas.
6. Escribir un objetivo y usar NavegaClaro.

## Evidencia CoderCup

El producto no publica resultados ficticios. Las pruebas deben registrar:

- éxito;
- tiempo;
- errores críticos;
- pedidos de ayuda;
- facilidad 1–5;
- cita anónima opcional.

Con n=5 se comunica como **señal inicial de usabilidad**, no como significancia estadística.

## Alcance MVP

### Implementado

- web app pública;
- demo real;
- extensión Chrome;
- IA estructurada;
- validación anti-target inventado;
- fallback;
- dashboard de evidencia;
- Test Lab;
- adaptador Google Sheets;
- CI + smoke test.

### Roadmap — no se presenta como implementado

- perfiles persistentes;
- voz;
- publicación Chrome Web Store;
- validación longitudinal con población objetivo.

Ver también:

- [`docs/CODERCUP_AUDIT.md`](docs/CODERCUP_AUDIT.md)
- [`docs/WIN_STRATEGY_2026.md`](docs/WIN_STRATEGY_2026.md)
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md)
- [`docs/PITCH_2_MIN.md`](docs/PITCH_2_MIN.md)
