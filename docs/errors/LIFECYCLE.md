# Errori LIFECYCLE

Codici del ciclo di vita account/rosa. Allineati a `ERROR_CODES` in `src/shared/errors/codes.ts` e a `src/features/admin/domain/lifecycle.ts`.

Non è un parere legale. OD-029 (self-service diritti) e OD-030 (purge file medici) restano aperti.

| Codice | HTTP | Quando | Messaggio utente (IT) | Soft / hard / retained |
|---|---|---|---|---|
| `LIFECYCLE_REMOVE_FORBIDDEN` | 403 | `team:remove_player` denied (altra squadra, player, o ruolo insufficiente). IDOR. | Non puoi rimuovere un giocatore di un’altra squadra. | — |
| `LIFECYCLE_REMOVE_NOT_PLAYER` | 403 | Membership `REPRESENTATIVE` sul team target. | Puoi togliere dalla rosa solo un giocatore, non un rappresentante. | — |
| `LIFECYCLE_NOT_ON_TEAM` | 404 | Membership assente per `membershipId`+`teamId`. | Questo giocatore non è in questa squadra. | — |
| `LIFECYCLE_TARGET_NOT_ACTIVE` | 409 | Remove su account `DELETED` / `ANONYMIZED`. | Questo account non è più attivo. | — |
| `LIFECYCLE_REGISTRATION_REMOVED` | 409 | Wizard/write su `Registration.status = REMOVED`. | Sei stato rimosso dalla squadra. Questa iscrizione non si modifica più da qui. | Soft (stato) |
| `LIFECYCLE_DELETE_FORBIDDEN` | 403 | `user:delete` da Org Admin, rep o player. | Solo un Super Admin può chiudere un account. | — |
| `LIFECYCLE_ANONYMIZE_FORBIDDEN` | 403 | `user:anonymize` da chi non è Super Admin. | Solo un Super Admin può anonimizzare un account. | — |
| `LIFECYCLE_CANNOT_DELETE_SELF` | 403 | Super Admin chiude la propria sessione. | Non puoi chiudere l’account con cui sei connesso. | — |
| `LIFECYCLE_CANNOT_ANONYMIZE_SELF` | 403 | Super Admin anonimizza se stesso. | Non puoi anonimizzare l’account con cui sei connesso. | — |
| `LIFECYCLE_LAST_SUPER_ADMIN` | 409 | Unico Super Admin `ACTIVE`. | Non puoi chiudere o anonimizzare l’ultimo Super Admin. | — |
| `LIFECYCLE_CONFIRM_MISMATCH` | 400 | Cognome / `ELIMINA` / `ANONIMIZZA` non coincidono. | La conferma non corrisponde. Operazione non eseguita. | — |
| `LIFECYCLE_ALREADY_DELETED` | 409 | Delete su account già `DELETED`. | Questo account è già chiuso. | Soft già applicato |
| `LIFECYCLE_ALREADY_ANONYMIZED` | 409 | Anonymize su account già `ANONYMIZED`. | Questo account è già stato anonimizzato. | Soft già applicato |
| `LIFECYCLE_ACCOUNT_DELETED` | 410 | Superficie admin / catalogo per `lifecycleStatus = DELETED`. Il **login** non emette questo codice: stesso fail `AUTH_INVALID_CREDENTIALS` (anti-enumerazione). | Questo account è chiuso. | Soft |
| `LIFECYCLE_ACCOUNT_ANONYMIZED` | 410 | Superficie admin / catalogo per `lifecycleStatus = ANONYMIZED`. Stesso trattamento anti-enum al login. | Questo account è già stato anonimizzato. | Soft |
| `LIFECYCLE_USER_NOT_FOUND` | 404 | User id assente (admin). | Account non trovato. | — |

`audit:delete` è un’azione authz sempre negata (anche Super Admin). Non c’è codice catalogo dedicato: l’UI non espone la cancellazione dei log.

## CF unique vs stati

| Stato titolare | CF | Secondo account |
|---|---|---|
| `ACTIVE` + `WITHDRAWN` / `REMOVED` | resta unique | bloccato; può usare l’account originale |
| `DELETED` | resta unique | bloccato; serve org (anonimizzare per liberare) |
| `ANONYMIZED` | `null` | può completare l’anagrafica con quel CF |

Delete e anonymize segnano le iscrizioni non terminali come `REMOVED` (riga conservata, niente SQL delete). `WITHDRAWN` non viene sovrascritto.
