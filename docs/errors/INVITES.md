# INVITES

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| INVITE_INVALID | INVITES | Token sconosciuto | Hash assente | Questo invito non è valido | Nuovo link | `inspectInvite` |
| INVITE_EXPIRED | INVITES | Scaduto | expiresAt / EXPIRED | Invito scaduto, chiedi un nuovo link | Nuovo link | `inspectInvite` |
| INVITE_REVOKED | INVITES | Annullato | REVOKED | Invito annullato | Nuovo link | `inspectInvite` |
| INVITE_ALREADY_USED | INVITES | Già usato | ACCEPTED o race PENDING | Già utilizzato. Se hai un account, accedi | Accedi | redeem `updateMany` |
| INVITE_LOGIN_REQUIRED | INVITES | Email già User | Niente takeover | Esiste già un account: accedi | Accedi | `decideRedeemPath` |
| INVITE_WRONG_SESSION | INVITES | Sessione ≠ email invito | Altro account loggato | Esci e riprova con l’email dell’invito | Logout + invito | `decideRedeemPath` |
| INVITE_EDITION_CONFLICT | INVITES | Altra edizione attiva | OD-017 | Sei già iscritto a un’altra competizione | Contatta org | `decideRedeemPath` |
| INVITE_ALREADY_ON_TEAM | INVITES | Già nel team | Membership/registration | Sei già in questa squadra | Area | `decideRedeemPath` |
| INVITE_RATE_LIMITED | INVITES | Rate limit | Create/redeem | Troppi tentativi | Attendi | invite/staff redeem |
| INVITE_NOT_FOUND | INVITES | Id non del team | Resend su id errato | Invito non trovato | Nessuno | `resendInviteAction` |
| INVITE_TOKEN_MALFORMED | INVITES | Token malformato | Paste vuoto | Incolla il link o il codice | Correggi | `submitInviteTokenAction` |
| STAFF_INVITE_INVALID | INVITES | Staff non riscattabile | Scaduto/invalido | Invito non valido o scaduto | Nuovo link | staff redeem |
| STAFF_INVITE_LOGIN_REQUIRED | INVITES | Email staff già User | Serve login | Accedi e riapri il link | Accedi | staff redeem |
| STAFF_INVITE_PASSWORD_REQUIRED | INVITES | Create senza password | Form incompleto | Imposta una password | Correggi | staff redeem |
| STAFF_INVITE_WRONG_SESSION | INVITES | Sessione diversa | Altro account | Account diverso dall’invito | Logout | staff redeem |
| STAFF_INVITE_LOGIN_FAILED | INVITES | signIn dopo create | AuthError | Accedi dalla pagina di login | Accedi | staff redeem |
