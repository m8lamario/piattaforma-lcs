# IDENTITY

## Modello (v1)

- **User** = login (email unica).
- **PlayerProfile** = 1:1 con User; `fiscalCode` unique (nullable finché incompleto). PostgreSQL consente più `NULL`.
- Una persona, un account (constitution §2.9). Il CF **non** è un secondo login e **non** consente di prendere un altro account.
- L’invito non porta il CF (OD-016): il conflitto emerge al passo anagrafica, dopo che il secondo account e la `Registration` esistono già.
- Unique DB su CF resta la rete di sicurezza. **Nessuna migration `0004`**: il vincolo c’è già. Unique globale è sicuro con CF null; ritiro (`WITHDRAWN`) e rimozione rosa (`REMOVED`) **non** liberano il CF. Chiusura account (`DELETED`) tiene il CF (login impossibile: recovery org). Anonimizzazione azzera il CF: il secondo account può usarlo. Unione account = policy org, OD-045.

## Stati di dominio

| Kind | Codice interno | Quando |
|---|---|---|
| new_player | — (successo) | CF libero |
| own_identity | — (successo) | Lo stesso User ha già questo CF (doppio submit incluso) |
| foreign_identity | `IDENTITY_DUPLICATE_ACCOUNT` | Altro User detiene il CF |
| + | `IDENTITY_EXISTING_ACCOUNT_DIFFERENT_EMAIL` | Stesso fatto, email diversa (non rivelata) |
| + | `IDENTITY_DUPLICATE_REGISTRATION` | L’altro profilo ha registration attiva sulla stessa edizione |
| + | `IDENTITY_PLAYER_ALREADY_ON_TEAM` | L’altro profilo è già nel team |
| recovery | `IDENTITY_CONFLICT_NEEDS_USER` | Typo / account originale / ritiro di *questa* iscrizione |
| recovery | `IDENTITY_CONFLICT_NEEDS_ORG` | Merge o allineamento: non self-service |

Verso l’utente il fail pubblico è sempre **`IDENTITY_FISCAL_CODE_ASSOCIATED`** (anti-enumerazione). Audit: `IDENTITY_CONFLICT` con `conflictKind`, senza email/CF/userId altrui.

Interazione con lifecycle (non è merge automatico):

- Titolare `ACTIVE` con iscrizione `WITHDRAWN`/`REMOVED`: CF occupato; il primo account può ancora accedere.
- Titolare `DELETED`: CF occupato; login originale chiuso → `IDENTITY_CONFLICT_NEEDS_ORG` (anonimizzare per liberare il CF).
- Titolare `ANONYMIZED`: CF messo a `null` in transazione; unique non lo trova più. Un CF residuo (non dovrebbe accadere) è trattato come account chiuso, non come “usa l’account originale”.

Se il secondo account **non ha ancora un CF salvato**, il conflitto è persistito in `PlayerProfile.metadata.identityConflict`: dashboard e passo dati mostrano recovery (correggi CF, logout, ritiro, org). Non si lascia il wizard in loop. Se il profilo ha già un CF proprio e si tenta di cambiarlo in uno occupato: errore in form, **senza** bloccare l’iscrizione valida.

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| IDENTITY_FISCAL_CODE_ASSOCIATED | IDENTITY | CF unique: altro profilo | Due email, stesso CF | Testo unico anti-enumerazione + recovery | Account originale / correggi CF / ritiro / org | `savePersonalProfile` |
| IDENTITY_EXISTING_ACCOUNT_DIFFERENT_EMAIL | IDENTITY | CF su User diverso | Email distinta | Stesso testo utente (anti-enum) | Account originale | classificazione |
| IDENTITY_DUPLICATE_ACCOUNT | IDENTITY | Due User, stesso CF | Secondo account | Stesso testo utente | Account originale | classificazione |
| IDENTITY_DUPLICATE_REGISTRATION | IDENTITY | Altro account già iscritto all’edizione | Unique per persona non per email | Stesso testo utente | Org + ritiro di questa iscrizione | classificazione |
| IDENTITY_PLAYER_ALREADY_ON_TEAM | IDENTITY | Altro account già in squadra | Stesso team | Stesso testo utente | Org | classificazione |
| IDENTITY_CONFLICT_NEEDS_ORG | IDENTITY | Serve l’organizzazione | Merge/allineamento | Escalation senza PII | Contatta org | classificazione |
| IDENTITY_CONFLICT_NEEDS_USER | IDENTITY | Risolvibile dall’utente | Typo o secondo account | Recovery utente | Correggi / originale / ritiro | classificazione |
