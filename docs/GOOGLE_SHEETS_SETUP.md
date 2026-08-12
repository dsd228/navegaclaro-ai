# Google Sheets Evidence Layer — NavegaClaro

Esta integración convierte Google Sheets en la fuente de verdad para las métricas de CoderCup sin poner credenciales de Google en el navegador.

## Arquitectura

```text
Web app / Test Lab
      ↓
Vercel /api/evidence
      ↓ (secret server-side)
Apps Script Web App
      ↓
Google Sheets
  ├─ TEST_USUARIOS
  ├─ SESIONES
  ├─ QA
  └─ METRICAS
```

El frontend nunca recibe `GOOGLE_SHEETS_SHARED_SECRET`.

## 1. Crear la hoja

Crear un spreadsheet nuevo llamado `NavegaClaro — Evidencia CoderCup`.

Luego abrir **Extensiones → Apps Script** y reemplazar el contenido de `Code.gs` con el archivo:

`google-apps-script/Code.gs`

Guardar.

## 2. Crear el secreto del Apps Script

En Apps Script:

**Project Settings → Script Properties → Add script property**

```text
SHARED_SECRET=<una cadena larga aleatoria>
```

No usar la API key de Groq.

## 3. Inicializar pestañas

Ejecutar manualmente una vez:

```js
initializeNavegaClaro()
```

Autorizar el script cuando Google lo solicite. Se crearán:

- `TEST_USUARIOS`
- `SESIONES`
- `QA`
- `METRICAS`

## 4. Publicar Apps Script como Web App

**Deploy → New deployment → Web app**

- Execute as: `Me`
- Who has access: `Anyone`

Copiar la URL terminada en `/exec`.

La seguridad no depende de que el endpoint sea secreto: todas las operaciones requieren `SHARED_SECRET`, que solo conoce Vercel.

## 5. Variables en Vercel

Agregar al proyecto de producción:

```text
GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/.../exec
GOOGLE_SHEETS_SHARED_SECRET=<el mismo SHARED_SECRET>
EVIDENCE_ADMIN_TOKEN=<otro token largo para Test Lab>
```

`EVIDENCE_ADMIN_TOKEN` sirve únicamente para registrar manualmente tests/QA desde `/test-lab.html`. No debe ser igual a `SHARED_SECRET`.

Después hacer redeploy.

## 6. Verificación

Abrir:

```text
/api/health
```

Debe devolver:

```json
{
  "ok": true,
  "version": "0.4.0",
  "aiConfigured": true,
  "evidenceConfigured": true
}
```

Luego abrir `/test-lab.html`, cargar un registro de prueba real y confirmar que aparece en `TEST_USUARIOS`.

## Datos que NO se guardan

- nombre real;
- email;
- teléfono;
- DNI;
- diagnóstico;
- valores de formularios del sitio visitado;
- contraseñas/OTP/tarjetas.

Para participantes usar IDs como `P01`, `P02`, etc.

## Métricas calculadas automáticamente

El dashboard usa:

- participantes únicos;
- tasa de éxito con/sin NavegaClaro;
- tiempo promedio con/sin;
- errores y pedidos de ayuda;
- facilidad promedio;
- sesiones de demo;
- QA pass/fail.

Con n=5 se presenta como **señal inicial de usabilidad**, no como significancia estadística.
