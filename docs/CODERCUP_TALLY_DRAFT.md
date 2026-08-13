# CoderCup 2026 — borrador para formulario Tally

> Fuente única de métricas: Google Sheets `NavegaClaro AI — Evidencia CoderCup 2026` → pestaña `TEST_USUARIOS` / `DASHBOARD`.
>
> No reemplazar los tokens `{{...}}` hasta que existan **10 registros reales** (5 participantes × 2 condiciones).

## Descripción del problema y la solución

Muchas tareas web que deberían ser simples —encontrar un profesional, ubicar un trámite, buscar un horario o llegar a una acción concreta— se vuelven difíciles cuando una interfaz presenta demasiadas opciones, menús, banners, formularios y decisiones al mismo tiempo. NavegaClaro AI busca reducir esa carga convirtiendo el objetivo de la persona en un recorrido mínimo sobre la página que ya está usando. La persona expresa qué quiere hacer en lenguaje natural; NavegaClaro analiza los controles interactivos reales del DOM, les asigna identificadores verificables y usa IA para seleccionar únicamente los pasos necesarios. Después guía una acción por vez, resaltando el control correspondiente sin hacer clic ni completar acciones a escondidas. El usuario mantiene el control durante todo el proceso. La solución incluye además una capa de evidencia: pruebas comparativas con y sin NavegaClaro, registro de éxito, tiempo, errores, ayudas y facilidad percibida, y automatización opcional de acciones posteriores como confirmaciones y recordatorios de turnos.

## Evidencia de testing — completar solo con datos reales

En pruebas con cinco participantes y tareas equivalentes con orden contrabalanceado, la finalización pasó de **{{FINALIZACION_SIN}}** sin NavegaClaro a **{{FINALIZACION_CON}}** con NavegaClaro. El tiempo medio pasó de **{{TIEMPO_SIN}}** a **{{TIEMPO_CON}}**. Los errores registrados pasaron de **{{ERRORES_SIN}}** a **{{ERRORES_CON}}**, y la facilidad media fue **{{FACILIDAD_SIN}}/5** sin NavegaClaro frente a **{{FACILIDAD_CON}}/5** con NavegaClaro.

Con n=5, estos resultados se presentan como una **señal inicial de usabilidad**, no como significancia estadística ni evidencia clínica.

## Link al proyecto

https://navegaclaro-codercup-live-2026.vercel.app

## Link al video

{{VIDEO_URL}}

## Checklist antes de copiar al formulario

- [ ] `TEST_USUARIOS` contiene exactamente 10 registros reales.
- [ ] `DASHBOARD` indica 5 participantes completos.
- [ ] Los números del formulario coinciden exactamente con los del video.
- [ ] No hay métricas inventadas ni redondeos contradictorios.
- [ ] El video dura menos de 2:00.
- [ ] El link del proyecto abre sin login.
- [ ] Se auditó el texto contra la consigna oficial recibida el 15/08/2026.
