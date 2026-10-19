# MEDIA_PARTNER

Gestione account media partner (Super Admin) e verifica in campo delle autorizzazioni foto/video/social.

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| MEDIA_PARTNER_FORBIDDEN | MEDIA_PARTNER | Attore senza permesso | Manca `media:verify` o `media:manage` | Non hai accesso a questa area | Nessuno | dashboard / admin |
| MEDIA_PARTNER_NOT_FOUND | MEDIA_PARTNER | Org o account assente | Id errato | Organizzazione o account non trovato | Nessuno | admin CRUD |
| MEDIA_PARTNER_EMAIL_TAKEN | MEDIA_PARTNER | Email già User | Unique email | Questa email è già associata a un account | Altro indirizzo | crea account |
| MEDIA_PARTNER_ACCOUNT_EXISTS | MEDIA_PARTNER | Già media partner | Unique userId | Questo account è già un media partner | Nessuno | crea account |
| MEDIA_PARTNER_COMPETITION_REQUIRED | MEDIA_PARTNER | Nessuna coppa valida | Checkbox vuote o id inesistenti | Seleziona almeno una competizione | Correggi | crea/modifica org |
| MEDIA_PARTNER_TOKEN_INVALID | MEDIA_PARTNER | Token sconosciuto | Hash assente | Questo link non è valido | Contatta org | attivazione |
| MEDIA_PARTNER_TOKEN_EXPIRED | MEDIA_PARTNER | Token scaduto | expiresAt superato | Questo link è scaduto | Contatta org | attivazione |
| MEDIA_PARTNER_TOKEN_USED | MEDIA_PARTNER | Token già usato | activatedAt valorizzato | Questo link è già stato utilizzato | Accedi | attivazione |
| MEDIA_PARTNER_ALREADY_ACTIVATED | MEDIA_PARTNER | Password già presente | passwordHash | L’account è già attivo | Accedi | attivazione |
| MEDIA_PARTNER_RATE_LIMITED | MEDIA_PARTNER | Rate limit | Ricerca, scheda o attivazione | Troppi tentativi | Attendi | search / verify / activate |
| MEDIA_PARTNER_RESEND_NOT_ALLOWED | MEDIA_PARTNER | Reinvio non applicabile | Già attivato o sospeso | Non è possibile reinviare il link | Nessuno | resend |
| MEDIA_PARTNER_SUSPENDED | MEDIA_PARTNER | Org o account sospeso | status SUSPENDED | Questo accesso è sospeso | Contatta org | attivazione / dashboard |
| MEDIA_PARTNER_PLAYER_NOT_FOUND | MEDIA_PARTNER | Fuori grant o inesistente | 404 uniforme | Giocatore non trovato | Nessuno | scheda verifica |
