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
| EMAIL_RESEND_COOLDOWN | EMAILS | Reinvio in cooldown | 60 s | Attendi un momento prima di richiedere un nuovo invio | Attendi | reinvio utente |
| EMAIL_RESEND_EXHAUSTED | EMAILS | 3 reinvii esauriti | Tetto utente | Hai esaurito i reinvii. Scrivi all’assistenza | Assistenza | reinvio utente |
| EMAIL_UNDELIVERABLE | EMAILS | Bounce sull’ultimo invio | Webhook | Questo indirizzo non risulta raggiungibile | Correggi | reinvio utente |
| EMAIL_SEND_FAILED | EMAILS | Provider ha rifiutato prima dell’accettazione | Adapter | L’invio non è andato a buon fine | Riprova | dispatch |
