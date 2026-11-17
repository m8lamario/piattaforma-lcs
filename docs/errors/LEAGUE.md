# LEAGUE

Errori dell’account supervisore di lega e dell’area `/lega`.

| Codice | Categoria | Testo tecnico | Quando | Messaggio utente | Recovery | Superficie |
|---|---|---|---|---|---|---|
| LEAGUE_FORBIDDEN | LEAGUE | Attore senza permesso | Manca `league:read` o `league:manage` | Non hai accesso a questa area | Nessuno | dashboard / admin |
| LEAGUE_NOT_FOUND | LEAGUE | Account assente | Id errato | Supervisore non trovato | Nessuno | admin CRUD |
| LEAGUE_EMAIL_TAKEN | LEAGUE | Email già User | Unique email | Questa email è già associata a un account | Altro indirizzo | crea account |
| LEAGUE_EDITION_NOT_FOUND | LEAGUE | Edizione assente | Id errato | Seleziona un’edizione valida | Correggi | crea/modifica |
| LEAGUE_TOKEN_INVALID | LEAGUE | Token sconosciuto | Hash assente | Questo link non è valido | Contatta org | attivazione |
| LEAGUE_TOKEN_EXPIRED | LEAGUE | Token scaduto | expiresAt superato | Questo link è scaduto | Contatta org | attivazione |
| LEAGUE_TOKEN_USED | LEAGUE | Token già usato | activatedAt valorizzato | Questo link è già stato utilizzato | Accedi | attivazione |
| LEAGUE_ALREADY_ACTIVATED | LEAGUE | Password già presente | passwordHash | L’account è già attivo | Accedi | attivazione |
| LEAGUE_RATE_LIMITED | LEAGUE | Rate limit | Attivazione o reinvio | Troppi tentativi | Attendi | activate / resend |
| LEAGUE_RESEND_NOT_ALLOWED | LEAGUE | Reinvio non applicabile | Già attivato o sospeso | Non è possibile reinviare il link | Nessuno | resend |
| LEAGUE_SUSPENDED | LEAGUE | Account sospeso | status SUSPENDED | Questo accesso è sospeso | Contatta org | attivazione / dashboard |
