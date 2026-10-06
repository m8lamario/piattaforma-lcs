# EMAILS

Webhook Resend: verifica firma Svix, niente payload grezzo nei log. L’invio fallito non fa fallire registrazione, documenti o consensi.

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| EMAIL_WEBHOOK_INVALID | EMAILS | Firma/payload invalidi | Webhook | (API) | Nessuno | `/api/webhooks/resend` |
| EMAIL_NOT_FOUND | EMAILS | Messaggio assente | URL admin | Comunicazione non trovata | Nessuno | dettaglio / retry |
| EMAIL_RETRY_NOT_ALLOWED | EMAILS | Già accettato dal provider | Retry | Questo invio non si può riprovare | Nessuno | retry |
| EMAIL_CONFIRM_REQUIRED | EMAILS | Manca conferma | Form | Conferma l’invio | Correggi | invio manuale |
| EMAIL_TEMPLATE_INVALID | EMAILS | Variabili non ammesse | Override | Template non valido | Correggi | template |
| EMAIL_RECIPIENT_REQUIRED | EMAILS | Destinatario assente | Form | Seleziona un destinatario | Correggi | invio manuale |
