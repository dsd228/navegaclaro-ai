# NavegaClaro AI

> **Decís qué querés hacer. NavegaClaro encuentra el camino mínimo dentro de la página y te guía una acción por vez.**

Proyecto funcional para **CoderCup AI 2026**.

**Producción:** `https://navegaclaro-codercup-live-2026.vercel.app`

## El problema

Muchas tareas digitales simples —pedir un turno, encontrar un servicio, completar un trámite o pagar una factura— obligan primero a entender navegación, banners, formularios y decisiones simultáneas. Para una persona que se distrae, se abruma o tiene dificultades de atención o comprensión, esa complejidad puede convertirse en una barrera.

NavegaClaro invierte esa relación: la persona expresa el objetivo en lenguaje natural y la interfaz se convierte en un recorrido claro sobre **controles reales de la página**.

Ejemplo:

> “Quiero encontrar un dermatólogo en Córdoba.”

## Por qué no es un chatbot ni un wrapper

```text
Objetivo de la persona
        ↓
DOM vivo de la página
        ↓
Controles visibles + IDs creados por NavegaClaro
        ↓
Groq GPT-OSS 120B
        ↓
JSON Schema estricto
        ↓
Validación contra IDs reales
        ↓
Guía visual paso a paso sobre la web original
```

El modelo **no inventa selectores CSS** y no hace clic por la persona. NavegaClaro guía; la persona mantiene el control.

## Robustez de la versión 0.3

- Chrome Extension Manifest V3.
- Service Worker propio para aislar la llamada remota del contexto de la web visitada.
- Groq `openai/gpt-oss-120b` con Structured Outputs estrictos.
- IDs controlados y validación de cada `target_id`.
- Recuperación por texto/etiqueta si una SPA vuelve a renderizar un control.
- Highlight mediante una capa visual independiente: no modifica `position` ni layout del sitio.
- Fallback local si Groq, Vercel o la red fallan.
- Preselección semántica en páginas con cientos de controles para reducir ruido y tokens.
- Rate limiting y límite de payload en producción para proteger la cuota gratuita.
- Healthcheck versionado y smoke tests contra producción.

## Privacidad por diseño

NavegaClaro no envía `input.value`, `textarea.value` ni contraseñas. La versión 0.3 además:

- excluye controles sensibles por `type`, `autocomplete` y nombres típicos de credenciales/OTP/tarjetas;
- elimina query strings y fragments de la URL;
- redacta emails y secuencias numéricas largas del contexto;
- ya no envía el texto completo de la página: usa títulos/encabezados semánticos y contexto de controles;
- trata el contenido de la web como datos no confiables frente a prompt injection.

## Modo resiliente

Si la IA no responde, el producto no se cae. Un motor local prioriza controles relacionados con el objetivo, elimina ruido obvio y conserva el orden natural del formulario.

La IA es el modo principal; el fallback existe para que una falla externa no destruya la experiencia ni la demo.

## Instalar la extensión

1. Descargá o cloná este repositorio.
2. Abrí `chrome://extensions`.
3. Activá **Developer mode / Modo desarrollador**.
4. Elegí **Load unpacked / Cargar descomprimida**.
5. Seleccioná la carpeta `extension/`.
6. Recargá cualquier pestaña que ya estuviera abierta.
7. Abrí NavegaClaro, escribí tu objetivo y tocá **Guiarme paso a paso**.

No hace falta configurar endpoints ni claves dentro de la extensión.

## Tests

Requiere Node 20+.

```bash
npm test
```

Además, cada push a `main` ejecuta dos validaciones contra producción:

1. un flujo de turno médico;
2. un buscador de servicios estilo web externa.

El smoke test exige Groq real, IDs válidos y la versión esperada antes de aprobar.

## API

### `POST /api/analyze`

Recibe:

```json
{
  "goal": "Quiero encontrar un dermatólogo en Córdoba",
  "page": {
    "title": "Buscador de servicios",
    "url": "https://ejemplo.com/buscar",
    "text": "Buscar profesionales",
    "elements": []
  }
}
```

Devuelve un recorrido validado:

```json
{
  "goal": "Encontrar un dermatólogo en Córdoba",
  "steps": [
    {
      "instruction": "Elegí Dermatología en Especialidad.",
      "target_id": "cl-12",
      "target_text": "Especialidad",
      "action": "select",
      "why": "Define el tipo de profesional que querés encontrar."
    }
  ],
  "mode": "ai",
  "provider": "groq"
}
```

### `GET /api/health`

Expone estado, versión, proveedor y modelo sin revelar secretos.

## Configuración de producción

En Vercel:

```text
GROQ_API_KEY=<secret>
GROQ_MODEL=openai/gpt-oss-120b   # opcional
```

La API key nunca vive en la extensión ni en el frontend.

## Testing con usuarios

El protocolo está en `docs/TEST_PLAN.md`.

Para CoderCup se registran, sin inventar métricas:

- éxito de tarea;
- tiempo;
- errores críticos;
- pedidos de ayuda;
- facilidad percibida;
- citas textuales anónimas.

Con 5 participantes se reportará **señal inicial de usabilidad**, no significancia estadística.

## Alcance del MVP

### Implementado

- web demo pública;
- extensión Chrome funcional;
- DOM estructurado y controles reales;
- análisis con IA;
- guía secuencial;
- recuperación ante DOM dinámico;
- protección de datos de formularios;
- fallback local;
- API pública protegida;
- CI/CD y smoke tests de producción.

### Fuera del MVP

- cuentas de usuario;
- historial;
- voz;
- automatización de clicks irreversibles;
- perfiles persistentes;
- publicación en Chrome Web Store.

No se presentan funcionalidades de roadmap como si estuvieran implementadas.

## Documentación CoderCup

- `docs/WIN_STRATEGY_2026.md`
- `docs/CODERCUP_AUDIT.md`
- `docs/TEST_PLAN.md`
- `docs/PITCH_2_MIN.md`
- `docs/SUBMISSION.md`

## Referencias

- W3C WAI — Cognitive and learning barriers
- W3C COGA — Clear step-by-step instructions
- Groq — Structured Outputs / GPT-OSS 120B

**NavegaClaro no automatiza a la persona. Simplifica la interfaz para que pueda actuar por sí misma.**
