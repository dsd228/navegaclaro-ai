# Plan de testing — NavegaClaro AI

## Objetivo

Medir si NavegaClaro mejora la capacidad de completar una tarea digital compleja sin aumentar errores ni dependencia.

## Diseño

Usar un diseño **within-subject** contrabalanceado para reducir sesgo de aprendizaje.

- 5 participantes mínimos para la iteración de hackathon.
- Participantes A/C/E: tarea 1 sin NavegaClaro → tarea 2 con NavegaClaro.
- Participantes B/D: tarea 1 con NavegaClaro → tarea 2 sin NavegaClaro.
- Las dos tareas deben tener dificultad equivalente y no ser exactamente la misma para evitar memorizar el camino.

Ejemplo:

- Tarea A: reservar Dermatología, sede Centro.
- Tarea B: reservar Oftalmología, sede Norte.

## Métricas

1. **Task success:** completó / no completó.
2. **Time on task:** segundos desde consigna hasta resultado.
3. **Critical errors:** acciones que bloquean o desvían la tarea.
4. **Help requests:** cantidad de preguntas al moderador.
5. **Perceived ease:** escala 1–5 al finalizar cada tarea.

## Registro

| Participante | Condición | Tarea | Éxito | Tiempo s | Errores | Ayudas | Facilidad 1–5 |
|---|---|---|---:|---:|---:|---:|---:|
| P01 | Sin NC | A |  |  |  |  |  |
| P01 | Con NC | B |  |  |  |  |  |

No completar números hasta realizar pruebas reales.

## Población

Registrar solo información necesaria para interpretar resultados. No pedir diagnósticos clínicos si no son imprescindibles.

Si el participante se identifica voluntariamente como parte de una población neurodivergente, registrar únicamente una categoría amplia con consentimiento. No publicar identidad.

**Nunca** presentar usuarios generales como evidencia representativa de discapacidad cognitiva.

## Guion del moderador

1. “Estamos evaluando el producto, no tu capacidad.”
2. Leer la tarea exacta.
3. No explicar la interfaz.
4. Cronometrar.
5. Si el participante se bloquea, esperar 15 s antes de ofrecer ayuda.
6. Registrar el pedido de ayuda.
7. Al terminar: “Del 1 al 5, ¿qué tan fácil fue completar esta tarea?”
8. Pregunta abierta: “¿Qué fue lo que más te ayudó o te confundió?”

## Criterio de decisión

Para afirmar “mejoró la tarea” en la demo deben cumplirse al menos dos señales:

- más éxitos, o misma tasa de éxito con menos tiempo;
- menos errores/ayudas;
- mejor percepción de facilidad.

Con n=5 no afirmar significancia estadística. Hablar de **señal inicial de usabilidad**, no de prueba científica.
