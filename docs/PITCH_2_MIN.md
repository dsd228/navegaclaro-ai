# Pitch CoderCup — 2 minutos máximo

Objetivo de grabación: **1:45–1:55**, nunca 2:00 exactos.

La prioridad del video es: **problema real → transformación visible → evidencia → cierre**. La arquitectura técnica aparece solo como prueba de ejecución, no como protagonista.

## 0:00–0:12 — problema real

Visual: una web pública real o el portal de demo ya abierto; nada de slide inicial.

> “Encontrar un médico o completar un trámite debería ser simple. Pero muchas interfaces obligan a procesar demasiadas opciones al mismo tiempo. Cuando una persona se distrae, se abruma o simplemente no sabe por dónde empezar, la tarea se frena.”

## 0:12–0:22 — propuesta

Mostrar NavegaClaro y escribir el objetivo.

> “NavegaClaro convierte lo que querés hacer en una guía clara, una acción por vez.”

Ejemplo:

> Quiero encontrar un dermatólogo en Córdoba.

Click **Simplificar**.

## 0:22–0:58 — momento wow

Dejar que aparezca el primer highlight.

> “La IA identifica solo los controles relevantes y construye el recorrido mínimo sobre la página real.”

Avanzar 3–4 pasos. No explicar código mientras ocurre la transformación.

## 0:58–1:22 — evidencia

### Si ya existen los 10 registros reales

Usar exactamente las mismas métricas que en `docs/CODERCUP_TALLY_DRAFT.md`:

> “Lo probamos con cinco participantes usando tareas equivalentes y orden contrabalanceado. La finalización pasó de {{FINALIZACION_SIN}} a {{FINALIZACION_CON}} y el tiempo medio pasó de {{TIEMPO_SIN}} a {{TIEMPO_CON}}.”

Visual: máximo dos métricas grandes.

- Finalización: `{{FINALIZACION_SIN}} → {{FINALIZACION_CON}}`
- Tiempo medio: `{{TIEMPO_SIN}} → {{TIEMPO_CON}}`

Opcional, solo si aporta una señal clara y real:

- Errores: `{{ERRORES_SIN}} → {{ERRORES_CON}}`
- Facilidad: `{{FACILIDAD_SIN}} → {{FACILIDAD_CON}}`

**No reemplazar estos tokens hasta que `TEST_USUARIOS` tenga 10 registros reales.**

### Si todavía no hay población objetivo específica

> “Esta primera validación mide usabilidad general. No la presentamos como evidencia clínica.”

## 1:22–1:32 — ejecución técnica en una frase

> “No es un chatbot que explica una captura: trabaja sobre el DOM vivo, usa IDs controlados y valida cada paso antes de mostrarlo.”

Visual: DOM → IDs → IA → guía. Máximo 10 segundos.

## 1:32–1:50 — cierre

> “NavegaClaro no hace el trámite por vos. Reduce el ruido para que puedas hacerlo vos. No obligamos a la persona a adaptarse a la interfaz; hacemos que la interfaz se adapte a su objetivo.”

Visual: antes → NavegaClaro → tarea encaminada.

## Demo recomendada

1. **Principal:** web pública real, sin login ni datos personales. Candidato: cartilla médica pública de PAMI.
2. **Respaldo:** portal Salud Central del proyecto, probado 20 veces y grabado previamente.
3. Si la web real cambia o rompe la demo, usar el respaldo sin improvisar.

## Reglas de grabación

- UI visible en los primeros 3 segundos.
- Sin presentación personal larga.
- No gastar más de 10 segundos en stack técnico.
- No mostrar roadmap.
- Subtítulos obligatorios en el video final.
- Cursor grande y zoom suficiente para verse desde móvil.
- Grabar una toma de respaldo antes de la entrega.
- Objetivo final: **que un juez entienda problema, solución y prueba sin leer el README**.
