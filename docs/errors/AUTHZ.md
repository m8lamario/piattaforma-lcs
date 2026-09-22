# AUTHZ

Deny-by-default. Verso player/rep: 404 opaco su file medici (`FORBIDDEN_DOCUMENT_FILE` mappa HTTP 404).

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| FORBIDDEN_RESOURCE | AUTHZ | authorize denied | Azione non in matrice | Non puoi accedere a questa risorsa | Nessuno | authz |
| FORBIDDEN_REGISTRATION_WRITE | AUTHZ | registration:write denied | Non owner | Non puoi modificare questa iscrizione | Nessuno | wizard actions |
| FORBIDDEN_TEAM_INVITE | AUTHZ | team:invite denied | Non rep/admin del team | Non puoi invitare giocatori in questa squadra | Nessuno | `createInviteAction` |
| FORBIDDEN_TEAM_MANAGE | AUTHZ | team manage denied | Scope team errato | Non puoi gestire questa squadra | Nessuno | `requireTeamAction` |
| FORBIDDEN_DOCUMENT_FILE | AUTHZ | document:read_file denied | Rep o IDOR | Documento non disponibile | Nessuno | signed URL |
| FORBIDDEN_PAYMENT_PLAYER | AUTHZ | payment:create_player denied | Non owner | Non puoi pagare questa iscrizione | Nessuno | checkout player |
| FORBIDDEN_PAYMENT_TEAM | AUTHZ | payment:create_team denied | Non rep | Solo il rappresentante può pagare per la squadra | Nessuno | checkout team |
| FORBIDDEN_STAFF_INVITE | AUTHZ | staff:invite denied | Non admin | Non puoi invitare un rappresentante | Nessuno | `createStaffInviteAction` |
