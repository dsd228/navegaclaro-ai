# NavegaClaro — Automatización n8n

## Turnos y recordatorios

Workflow importable: `n8n-navegaclaro-turnos-reminders.json`.

### Qué hace

1. Recibe un turno confirmado por webhook.
2. Valida secreto, canal y fecha/hora futura.
3. Guarda el turno en Google Sheets (`TURNOS`).
4. Envía confirmación inmediata por el canal elegido: email o WhatsApp.
5. Programa recordatorio 24 horas antes, si todavía corresponde.
6. Programa recordatorio 2 horas antes, si todavía corresponde.
7. Registra cada envío en `NOTIFICACIONES` con destino enmascarado.

La zona horaria del workflow es `America/Argentina/Cordoba`.

### Google Sheets

Spreadsheet: `NavegaClaro AI — Evidencia CoderCup 2026`

ID: `1TwFkfaJgNMk_bLT-VGb6c2I33eJMC-HBukECnKF9Klw`

Tabs usadas por este workflow:
- `TURNOS`
- `NOTIFICACIONES`

### Configuración de n8n

Después de importar el workflow en `automation.diazuxstudio.com.ar`:

- Asignar una credencial de Google Sheets a los nodos `Sheets · ...`.
- Asignar una credencial de Gmail a los nodos `Gmail · ...` si se utilizará email.
- Definir en el entorno de n8n:
  - `NAVEGACLARO_SHARED_SECRET`
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `META_GRAPH_API_VERSION` (opcional; el workflow tiene un valor de respaldo)
  - `WHATSAPP_CONFIRM_TEMPLATE`
  - `WHATSAPP_REMINDER_TEMPLATE`
- Para WhatsApp, usar plantillas de utilidad aprobadas por Meta para confirmaciones/recordatorios cuando las reglas de mensajería lo requieran.
- Activar el workflow y copiar la Production Webhook URL del nodo `Webhook · Turno confirmado`.

### Configuración de Vercel

Agregar al proyecto de NavegaClaro:

- `N8N_APPOINTMENT_WEBHOOK_URL` = Production Webhook URL de n8n.
- `N8N_SHARED_SECRET` = el mismo valor que `NAVEGACLARO_SHARED_SECRET` en n8n.

No guardar tokens o secretos en GitHub.

### Contrato del endpoint web

`POST /api/appointments`

```json
{
  "appointmentAt": "2026-08-20T14:30:00-03:00",
  "name": "Persona de prueba",
  "email": "persona@example.com",
  "whatsapp": "5493510000000",
  "channel": "email",
  "service": "Dermatología",
  "professional": "Dra. Paula Gómez",
  "location": "Sede Centro"
}
```

`channel` acepta `email` o `whatsapp`. La web no debe enviar ambos si el usuario no dio consentimiento para ambos canales.

### Privacidad

La automatización solo necesita los datos mínimos para gestionar el turno y enviar el recordatorio. No debe registrar contenido de formularios ajeno al turno, datos clínicos, DNI, contraseñas, OTP ni tarjetas. En `NOTIFICACIONES` se guarda el destino enmascarado para auditoría.
