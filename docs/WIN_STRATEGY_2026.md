# Estrategia para maximizar puntaje — CoderCup AI 2026

## Decisión

**No pivotar a una automatización genérica. Presentar NavegaClaro AI.**

La consigna acepta automatizaciones, agentes, mini-apps, webs o flujos, pero la rúbrica reparte 25 puntos iguales entre Problema real, Ejecución, Originalidad y Claridad. NavegaClaro ya tiene una ventaja fuerte en Ejecución y Originalidad; el trabajo restante debe concentrarse en Problema real y Claridad.

Una automatización de turnos, emails o contenidos podría demostrar ROI rápidamente, pero es un patrón muy común y sacrificaría Originalidad. Además, un proyecto anterior a la competencia no debe presentarse sin una reconstrucción sustancial, porque las bases exigen que el proyecto sea propio y desarrollado durante la competencia.

## Patrón observado en ganadores comparables

### Gemini API Developer Competition — Google

- **Vite Vere / Real Lives — Most Impactful + People's Choice:** guía personalizada, paso a paso, para ayudar a personas con discapacidades cognitivas a completar tareas y ganar independencia.
- **ViddyScribe — Best Web App:** hace contenido audiovisual accesible mediante descripciones generadas por IA.
- **Prospera — Most Useful:** coach de ventas en tiempo real que convierte conversaciones en feedback accionable.

Lección: problema humano específico + IA necesaria + resultado inmediatamente visible.

### GatewayGS Hackathon 2026

- **NeuroSketch — 1er puesto:** parte de un problema personal y concreto, define un usuario específico, usa varias señales para producir una decisión accionable y muestra un prototipo funcional.

Lección: la historia del problema importa tanto como la arquitectura; el producto debe transformar una situación concreta, no mostrar tecnología.

### Microsoft Agent Academy Hackathon 2026

- **VendorGuard — mayor puntaje del hackathon:** pipeline autónomo disparado por un evento real; IA extrae y clasifica; reglas estructuradas verifican; guarda resultados; notifica; deja trazabilidad.
- **Vehicle Insurance Self-Service Agent:** reconoce intención, consulta datos vivos, valida reglas, ejecuta acciones, confirma operaciones irreversibles y escala a humano cuando corresponde.

Lección: los ganadores no son simples chatbots. La IA hace trabajo semántico, el sistema valida, ejecuta y tiene guardrails.

### Microsoft AI Agents Hackathon 2025

- **RiskWise — Best Overall:** problema operativo claro, datos reales, insights accionables y experiencia end-to-end.
- **WorkWizee:** automatiza tareas repetitivas sobre herramientas reales y reduce trabajo manual.

Lección: utilidad + integración + fiabilidad superan a una demo de prompt bonito.

## Tesis ganadora de NavegaClaro

> **La web obliga a millones de personas a entender primero la interfaz antes de poder hacer lo que necesitan. NavegaClaro invierte esa relación: la persona dice su objetivo y la interfaz se convierte en un recorrido claro sobre controles reales.**

No venderlo como “IA que simplifica páginas”.

Venderlo como:

> **Una capa de comprensión para la web que transforma intención natural en una secuencia validada de acciones sobre el DOM vivo.**

## Diferenciador defendible

```text
objetivo del usuario
      ↓
DOM vivo + elementos interactivos
      ↓
IDs controlados por la extensión
      ↓
LLM selecciona solo entre IDs válidos
      ↓
JSON Schema estricto
      ↓
validación
      ↓
guía visual sobre la página real
      ↓
fallback si falla red/modelo
```

Esto evita depender de selectores CSS inventados y separa NavegaClaro de:

- chatbots que explican una captura;
- auditores WCAG;
- agentes que hacen todo sin el usuario;
- interfaces de “prompt + respuesta”.

## Cómo buscar 25/25 por criterio

### 1. Problema real — objetivo 25/25

Obligatorio antes de entregar:

- probar al menos una web pública que no controlemos;
- 5 sesiones con tareas equivalentes y orden contrabalanceado;
- medir éxito, tiempo, errores, ayudas y facilidad percibida;
- incluir 1–2 citas textuales anónimas;
- no presentar usuarios generales como representativos de una discapacidad;
- si conseguimos participante de población objetivo, registrarlo solo con consentimiento y categoría amplia.

Mensaje: no decir “demostramos científicamente”. Decir “observamos una señal inicial de usabilidad”.

### 2. Ejecución — objetivo 25/25

Gate técnico:

- producción pública sin login;
- `/api/health` OK;
- inferencia Groq real en producción;
- IDs devueltos siempre válidos;
- extensión carga sin errores en Chrome;
- 20 ejecuciones consecutivas en demo controlada;
- 5 ejecuciones en cada web externa seleccionada;
- fallback probado;
- errores de red no bloquean la UI;
- sin valores de inputs/passwords enviados al backend.

### 3. Originalidad — objetivo 23–25/25

La comparación con Vite Vere debe estar preparada:

- Vite Vere guía tareas desde comprensión visual.
- NavegaClaro trabaja sobre el **DOM vivo** de una web y apunta a **controles verificables**.
- NavegaClaro no actúa a escondidas: mantiene a la persona al mando.
- NavegaClaro no depende de que el sitio haya sido rediseñado ni de que el dueño del sitio lo implemente.

No inflar claims: el territorio de accesibilidad con IA existe; la originalidad está en el mecanismo y la aplicación al navegador vivo.

### 4. Claridad — objetivo 25/25

El juez debe entenderlo en menos de 15 segundos.

Pitch corto:

> “Decís qué querés hacer. NavegaClaro encuentra el camino mínimo en la página y te guía una acción por vez.”

Video:

1. 0:00–0:12 — problema visible.
2. 0:12–0:22 — objetivo natural.
3. 0:22–0:58 — transformación real.
4. 0:58–1:22 — evidencia propia.
5. 1:22–1:32 — una frase técnica para demostrar que no es wrapper.
6. 1:32–1:50 — cierre.

Nunca ocupar más de 10 segundos explicando stack.

## Webs para QA externo

Prioridad:

1. una web pública con formulario o buscador de servicios y sin login;
2. una segunda web de otro dominio para demostrar generalización;
3. mantener Salud Central como demo controlada y respaldo.

No usar una web real en el video final hasta verificar 20 veces el recorrido elegido.

## Qué NO construir

Hasta después de entregar:

- cuentas de usuario;
- historial;
- voz;
- modo visión;
- modo concentración separado;
- automatización autónoma de clicks irreversibles;
- dashboards administrativos;
- multi-agente por marketing.

Todo lo que no mejore uno de los cuatro criterios se posterga.

## Orden de ejecución final

1. QA externo sobre 2 webs.
2. Corregir edge cases encontrados.
3. 20/20 ejecuciones demo controlada.
4. 5 tests de usuario.
5. Procesar métricas y actualizar landing.
6. Grabar video 1:50–1:55.
7. Probar links en incógnito y en móvil.
8. Completar formulario.
9. Entregar con margen: nunca esperar a 23:59.

## Regla de decisión de pivot

Solo abandonar NavegaClaro si antes del cierre de QA ocurre alguno de estos eventos:

- no funciona de forma estable en ninguna web externa;
- los cinco tests no muestran ninguna señal de mejora;
- aparece un requisito oficial adicional que lo vuelva inelegible.

Si no ocurre uno de esos tres eventos, seguir con NavegaClaro y no dispersar esfuerzo.
