# TEAMS

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| TEAM_NOT_FOUND | TEAMS | Team id assente | Dato inconsistente | Squadra non trovata | Nessuno | invite/checkout team |
| TEAM_PLAYER_ALREADY_ON_TEAM | TEAMS | Già in rosa | inviteCreateBlocker | Questo giocatore è già in squadra | Nessuno | create/bulk invite |
| TEAM_EDITION_CONFLICT | TEAMS | Altra edizione attiva | OD-017 | Già iscritto a un’altra competizione | Nessuno | create/bulk invite |
| TEAM_BULK_RATE_LIMITED | TEAMS | Rate limit CSV | Troppi elenchi | Troppi elenchi | Attendi | `bulkInviteAction` |
| TEAM_STAFF_LIMIT | TEAMS | Oltre 5 staff attivi | Conteggio o trigger | Posti staff esauriti | Nessuno | iscrizione staff |
| TEAM_STAFF_CATEGORY_CONFLICT | TEAMS | Già giocatore o staff nella stessa edizione | Unique profilo+edizione | Nessun secondo ruolo aggiuntivo | Ritira o fai rimuovere l’iscrizione | opt-in referente / link |
| TEAM_COACH_INVALID | TEAMS | Allenatore non valido | Non STAFF della squadra, o non più idoneo | Selezione rifiutata | Scegli un altro componente | `designateCoachAction` |
