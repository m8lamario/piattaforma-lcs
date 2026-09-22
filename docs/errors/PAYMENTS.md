# PAYMENTS

Doppio click / tab chiuso a metà: si **riusa** il Payment `PENDING` (nuovo checkout sullo stesso id), non se ne crea un secondo. SUCCEEDED copre (OD-007). Webhook duplicato: idempotente o `PAYMENT_WEBHOOK_DUPLICATE`.

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| PAYMENT_ALREADY_COMPLETED | PAYMENTS | Già SUCCEEDED utile | Secondo checkout | Pagamento già coperto, nessun secondo addebito | Nessuno | checkout blocker |
| PAYMENT_IN_PROGRESS | PAYMENTS | PENDING esistente | Riuso checkout | Pagamento in corso, puoi riprendere | Riprova (sicuro) | claim checkout |
| PAYMENT_TEAM_PAYS | PAYMENTS | Mode TEAM | Canale sbagliato | Paga la squadra | Nessuno | player checkout |
| PAYMENT_PLAYER_PAYS | PAYMENTS | Mode PLAYER | Canale sbagliato | Paga il giocatore | Nessuno | team checkout |
| PAYMENT_WEBHOOK_INVALID | PAYMENTS | Firma/payload invalidi | Webhook | (API) | Nessuno | `/api/webhooks/payments` |
| PAYMENT_WEBHOOK_UNKNOWN | PAYMENTS | Payment non trovato | Evento orfano | (API) | Nessuno | webhook |
| PAYMENT_WEBHOOK_DUPLICATE | PAYMENTS | providerPaymentId già SUCCEEDED altrove | Replay | (API) | Nessuno | `applyProviderResult` |
| PAYMENT_WEBHOOK_CONFLICT | PAYMENTS | Stato non avanzabile | Race | (API) | Nessuno | `applyProviderResult` |
| PAYMENT_NOT_FOUND | PAYMENTS | paymentId assente | URL | Pagamento non trovato | Nessuno | esito |
