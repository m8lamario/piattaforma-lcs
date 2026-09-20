# TEAMS

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| TEAM_NOT_FOUND | TEAMS | Team id assente | Dato inconsistente | Squadra non trovata | Nessuno | invite/checkout team |
| TEAM_PLAYER_ALREADY_ON_TEAM | TEAMS | Già in rosa | inviteCreateBlocker | Questo giocatore è già in squadra | Nessuno | create/bulk invite |
| TEAM_EDITION_CONFLICT | TEAMS | Altra edizione attiva | OD-017 | Già iscritto a un’altra competizione | Nessuno | create/bulk invite |
| TEAM_BULK_RATE_LIMITED | TEAMS | Rate limit CSV | Troppi elenchi | Troppi elenchi | Attendi | `bulkInviteAction` |
