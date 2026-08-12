# NavegaClaro AI

> **La web, paso a paso.** Una extensión de Chrome + backend serverless que transforma una página web compleja en un recorrido guiado según el objetivo de la persona.

Proyecto creado para **CoderCup AI 2026**.

## Qué problema resuelve

Muchas tareas digitales —pedir un turno, completar un trámite, pagar, registrarse— presentan navegación, banners, formularios y decisiones simultáneas. Para personas con dificultades de atención, memoria de trabajo o comprensión, esa complejidad puede bloquear una tarea que debería ser simple.

NavegaClaro recibe un objetivo en lenguaje natural, por ejemplo:

> “Quiero sacar un turno con dermatología.”

Luego convierte la interfaz en una guía de pocas acciones, una por vez, resaltando el control real que corresponde a cada paso.

## Diferencial técnico

NavegaClaro **no pide al LLM que invente selectores CSS**. Antes de llamar al modelo, el navegador asigna IDs controlados a los elementos interactivos visibles. El modelo solo puede elegir entre esos IDs y devuelve un JSON estructurado. El navegador valida la respuesta antes de ejecutarla.

Esto evita uno de los fallos más frecuentes de los agentes web: alucinaciones de selectores.

Además:

- no se envían valores escritos en `input`, `textarea` o contraseñas;
- query strings y fragments se eliminan de la URL antes del análisis;
- el contenido del sitio se trata como datos no confiables para reducir prompt injection;
- existe un fallback heurístico determinístico si el modelo o la red fallan;
- si un target desaparece, el paso sigue siendo legible en lugar de romper toda la experiencia.

## Arquitectura

```text
Página web
  ↓
Chrome Extension / Web Demo
  ↓
Snapshot seguro
  ├─ texto visible limitado
  ├─ etiquetas / roles
  └─ IDs generados por NavegaClaro
  ↓
POST /api/analyze (Vercel)
  ↓
Groq GPT-OSS 120B + Structured Outputs (JSON Schema estricto)
  ↓
JSON validado
  ↓
Guía paso a paso + highlight del target real
```

## Estructura del repo

```text
api/                  Vercel Functions
  analyze.js           motor IA + fallback
  health.js            healthcheck sin exponer secretos
lib/
  analyzer.js          sanitización, scoring y validación
extension/             extensión Chrome Manifest V3
index.html              demo web pública
app.js                  motor de demo
styles.css              interfaz
public/                 assets descargables
tests/                  tests unitarios sin dependencias
docs/                   auditoría, pitch, testing y submission
vercel.json
```

## Ejecutar tests

Requiere Node 20+.

```bash
npm test
```

## Ejecutar demo estática local

```bash
npm run serve
```

La UI se abrirá en `http://localhost:8080`. El endpoint `/api/analyze` requiere Vercel o un runtime equivalente; en producción se despliega como Vercel Function.

## Configurar IA

En Vercel, crear la variable:

```text
GROQ_API_KEY=<tu clave>
```

Opcional:

```text
GROQ_MODEL=openai/gpt-oss-120b
```

Si no existe `GROQ_API_KEY`, el producto no se cae: responde en **modo resiliente** con análisis heurístico determinístico. Ese fallback es una protección operativa, no el modo principal de la demo de concurso.

## Instalar la extensión

1. Descargar `navegaclaro-extension.zip` o usar la carpeta `extension/`.
2. Abrir `chrome://extensions`.
3. Activar **Developer mode**.
4. Elegir **Load unpacked** y seleccionar `extension/`.
5. En Configuración del popup, verificar el endpoint de producción.
6. Abrir una página web y escribir el objetivo.

> Después de instalar una extensión en modo desarrollo, recargar las pestañas que ya estaban abiertas.

## Evidencia y accesibilidad

El producto se apoya en patrones de W3C WAI COGA: instrucciones paso a paso, estructura comprensible, foco en la tarea y personalización. La evidencia propia de CoderCup debe venir de tests reales; este repositorio deliberadamente **no inventa métricas ni testimonios**.

Referencias:

- W3C WAI — Cognitive and learning barriers: https://www.w3.org/WAI/people-use-web/abilities-barriers/cognitive/
- W3C COGA — Clear step-by-step instructions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/
- W3C COGA — Make each step clear: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/
- Groq GPT-OSS 120B Structured Outputs: https://console.groq.com/docs/structured-outputs

## Alcance MVP

### Implementado

- demo web pública;
- extensión Chrome Manifest V3;
- extracción estructurada del DOM visible;
- redacción de valores de formulario;
- IDs controlados antes del LLM;
- backend Vercel;
- salida JSON estructurada;
- validación anti-target inventado;
- highlight + scroll + guía secuencial;
- fallback resiliente;
- healthcheck;
- tests unitarios.

### Roadmap — no se presenta como implementado

- perfiles persistentes de adaptación;
- modos Concentración y Visión;
- voz;
- personalización por preferencias guardadas;
- publicación en Chrome Web Store;
- validación longitudinal con población objetivo.

## Estado CoderCup

Antes de la entrega se revisará este scope contra la consigna y las bases vigentes de CoderCup. El framing se ajustará sin fingir funcionalidades ni métricas.

Ver `docs/CODERCUP_AUDIT.md` y `docs/PITCH_2_MIN.md`.
