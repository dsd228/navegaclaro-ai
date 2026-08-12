# Auditoría CoderCup — NavegaClaro AI

**Fecha de auditoría:** 12/08/2026  
**Estado:** núcleo funcional construido antes de la consigna oficial del 15/08; falta redeploy desde Git, QA de producción y evidencia de usuarios.

## 1. Correcciones críticas al playbook original

### A. El video no debe durar 3 minutos
Las bases publicadas indican **video de máximo 2 minutos**. El pitch se rehízo a 110–115 segundos para dejar margen.

### B. La consigna todavía no fue publicada
Las bases indican que la consigna se envía por email el **15/08/2026**. Construir un núcleo reusable ahora es razonable, pero el framing final debe quedar congelado recién al recibir la consigna. No debemos asumir que la frase pública “resolver un problema real con IA” contiene todos los requisitos finales.

### C. Selectores CSS generados por LLM: descartados
El riesgo técnico más grave del plan original era pedir `target_selector`. Se reemplazó por:

1. la extensión enumera controles visibles;
2. les asigna IDs propios (`cl-1`, `cl-2`, ...);
3. esos IDs se envían al modelo;
4. el schema obliga al modelo a devolver un ID;
5. el backend valida que el ID exista.

Esto convierte un problema probabilístico de generación de selectores en uno de selección sobre un conjunto cerrado.

### D. No “ocultar DOM” según decisiones generadas
Ocultar selectores enteros puede romper navegación, estilos o accesibilidad. El MVP usa **highlight + reducción perceptual**, sin destruir la estructura de la página.

### E. No usar “usuarios proxy” como si fueran población objetivo
Un adulto mayor, una persona apurada o alguien sin diagnóstico puede aportar datos de usabilidad, pero no debe presentarse como evidencia directa de discapacidad cognitiva. Los resultados se etiquetarán correctamente.

### F. Nombre
El nombre inicial “ClarityLayer” podía confundirse con marcas y productos existentes. Para evitar ruido de marca en Originalidad se adoptó **NavegaClaro AI** como identidad del proyecto de competencia.

## 2. Rúbrica oficial

CoderCup declara cuatro criterios de 25 puntos:

| Criterio | Riesgo actual | Objetivo antes de entregar |
|---|---|---|
| Problema real | Medio: todavía falta evidencia propia | 23–25 |
| Ejecución | Bajo/medio: núcleo funcional y API key configurada; falta redeploy desde Git + QA browser real | 23–25 |
| Originalidad | Medio: existen asistentes web y proyectos de accesibilidad similares | 21–24 |
| Claridad | Bajo si mantenemos demo de una sola tarea | 24–25 |

**Desempate oficial:** primero Problema real, luego Ejecución, luego fecha/hora de entrega. Consecuencia: no conviene entregar a último minuto.

## 3. Competencia comparable y qué aprendemos

La investigación encontró un patrón fuerte en ganadores de concursos de IA:

- **Vite Vere** (Gemini Developer Competition) ganó Most Impactful + People’s Choice con guía personalizada paso a paso para personas con discapacidades cognitivas.
- **ViddyScribe** ganó Best Web App haciendo accesible contenido audiovisual.
- La propia descripción del jurado de Vite Vere destaca comprensión visual + prompting + guía paso a paso.

Esto valida el territorio, pero también genera un riesgo: **no podemos ser “Vite Vere para webs”**. El diferenciador debe quedar técnico y visible:

> NavegaClaro no explica una captura. Convierte el DOM vivo de una web en un flujo ejecutable, usando IDs controlados y validación para guiar sobre controles reales.

## 4. Problema real — evidencia sólida sin exagerar

W3C WAI documenta que para personas con dificultades cognitivas y de aprendizaje son barreras comunes:

- procesos complejos y multietapa;
- navegación y layouts difíciles de entender;
- contenido complejo;
- problemas de memoria y atención.

También recomienda:

- contenido claramente estructurado;
- etiquetas consistentes;
- lenguaje simple;
- instrucciones paso a paso;
- indicar paso actual y progreso.

NavegaClaro implementa directamente esos principios.

### Evidencia propia necesaria

Antes de enviar:

- mínimo 5 tests de tarea;
- guardar tiempo, éxito/fracaso, errores y solicitudes de ayuda;
- separar participantes generales de participantes pertenecientes a población objetivo;
- no publicar diagnósticos ni datos personales;
- comparar la misma dificultad, no tareas artificialmente desiguales.

Si no conseguimos personas de la población objetivo, la presentación debe decir:

> “Hicimos una primera prueba de usabilidad con 5 participantes generales. La validación específica con población neurodivergente es el siguiente paso.”

Eso es mejor que inventar representatividad.

## 5. Ejecución — arquitectura auditada

### Fortalezas

- Manifest V3.
- Backend aislado: la API key no vive en la extensión.
- Structured Output.
- IDs controlados + validación.
- Redacción de campos ingresados.
- URL sin query params.
- Límite de texto y elementos para latencia/costo.
- `AbortSignal.timeout` y fallback.
- Fallback no bloquea el producto si Groq falla.
- Demo web permite evaluar sin instalar la extensión.

### Riesgos que siguen abiertos

1. **SPA dinámica:** un target puede desaparecer entre snapshot y guía. Mitigado con fallback de texto.
2. **Shadow DOM / iframes cross-origin:** no cubiertos por MVP. Debe declararse.
3. **Webs con CSP extrema:** el content script funciona, pero el comportamiento visual debe probarse.
4. **Prompt injection desde texto de página:** mitigado por system-style rules, pero no es una garantía formal.
5. **Privacidad:** el texto visible puede contener información personal aunque no se envíen `input.value`. Para la competencia, usar demo sintética y explicar esta limitación.
6. **Dependencia de Groq:** fallback protege la demo, pero el concurso debe mostrar una ejecución IA real al menos una vez.

## 6. Originalidad — cómo defenderla

No decir:

> “Una IA que simplifica páginas.”

Decir:

> “Un adaptador cognitivo del navegador que transforma intención natural en una secuencia validada de acciones sobre el DOM vivo.”

Prueba técnica visible:

```text
DOM → IDs controlados → LLM elige IDs → JSON Schema → validación → highlight real
```

Esto separa el producto de:

- chatbots que explican qué hacer;
- herramientas que critican screenshots;
- auditores WCAG;
- agentes que actúan automáticamente por el usuario.

NavegaClaro **mantiene a la persona al mando**. Guía; no completa la tarea a escondidas.

## 7. Claridad — demo recomendada

Una sola tarea principal: **pedir un turno**.

1. Mostrar portal complejo 8–10 s.
2. Escribir “Quiero sacar un turno con dermatología”.
3. Click en Simplificar.
4. Mostrar el paso 1 resaltado.
5. Avanzar 2–3 pasos.
6. Mostrar arquitectura en una frase.
7. Mostrar evidencia real, solo si ya existe.

No meter Concentración, Visión, voz, historial ni cuentas.

## 8. Gate de entrega

No entregar mientras alguno de estos checks falle:

- [ ] consigna del 15/08 revisada palabra por palabra;
- [ ] demo pública abre en ventana incógnita;
- [ ] `/api/health` responde `ok: true`;
- [ ] demo devuelve `mode: ai` con API configurada;
- [ ] fallback funciona quitando temporalmente la API key;
- [ ] extensión carga sin errores en `chrome://extensions`;
- [ ] 20 ejecuciones seguidas en la página demo sin romperse;
- [ ] 5 tests de usuario documentados;
- [ ] métricas no exageradas;
- [ ] video ≤ 2:00;
- [ ] README puede seguirlo un juez sin asistencia;
- [ ] entrega hecha con horas de margen.

## Fuentes verificadas

- Coderhouse — términos de CoderCup AI (criterios, fechas, entregables y desempate): https://www.coderhouse.com/pe/legales
- Google Developers — Gemini Developer Competition winners: https://developers.googleblog.com/announcing-the-winners-of-the-gemini-api-developer-competition/
- W3C WAI — Cognitive and learning barriers: https://www.w3.org/WAI/people-use-web/abilities-barriers/cognitive/
- W3C COGA — Clear step-by-step instructions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/
- W3C COGA — Make each step clear: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/
- Groq — Structured Outputs: https://console.groq.com/docs/structured-outputs
- Groq — GPT-OSS 120B: https://console.groq.com/docs/model/openai/gpt-oss-120b
