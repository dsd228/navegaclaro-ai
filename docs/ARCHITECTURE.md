# Arquitectura y threat model — NavegaClaro AI

## Data flow

```text
Browser DOM
  │
  ├─ filter: visibles + interactivos
  ├─ reject: password/hidden
  ├─ omit: input.value / textarea.value / select.value
  ├─ strip: URL query + fragment
  └─ assign: cl-1..cl-N
  ↓
Vercel /api/analyze
  │
  ├─ redact/limit nuevamente en servidor
  ├─ prompt: page content = untrusted data
  ├─ Groq GPT-OSS 120B
  └─ Structured Outputs · JSON Schema strict
  ↓
Validator
  ├─ 1..6 steps
  └─ every target_id ∈ IDs sent
  ↓
Content script
  ├─ exact ID match
  ├─ text similarity fallback
  └─ textual instruction if target vanished
```

## Amenazas consideradas

### 1. Selector hallucination
**Control:** el modelo no genera selectors. Selecciona IDs de conjunto cerrado.

### 2. Prompt injection desde una página
**Control:** instrucciones explícitas para tratar la página como datos no confiables + schema cerrado. Aun así, no se afirma inmunidad total.

### 3. Exposición de API key
**Control:** key solo en Vercel Environment Variable. Nunca en extensión ni frontend.

### 4. PII de formularios
**Control:** no se serializan valores de inputs/textareas/selects. Password y hidden se excluyen.

### 5. PII ya visible en la página
**Riesgo residual:** el texto visible puede contener datos personales. Para el MVP se usa una demo sintética. Una versión productiva necesita redacción semántica adicional o ejecución on-device.

### 6. API/Internet caído
**Control:** fallback heurístico y UX explícita de modo resiliente.

### 7. DOM mutante
**Control:** ID exacto primero; luego matching textual; finalmente instrucción sin highlight.

## No cubierto en MVP

- iframes cross-origin;
- Shadow DOM cerrado;
- automatización de clicks sin usuario;
- autenticación y cuentas;
- datos médicos reales;
- persistencia del contenido de páginas.
