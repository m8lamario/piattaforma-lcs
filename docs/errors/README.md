# Catalogo errori

Fonte di verità dei **codici**: `src/shared/errors/codes.ts` + metadati in `src/shared/errors/catalog.ts`.
Copy utente: chiavi `error{CODICE}` nel blocco `// --- errors (agent1) ---` di `src/shared/i18n/it.ts` (inclusi i `errorLIFECYCLE_*`). Copy di UI del ciclo di vita (conferme, admin) nel blocco `// --- lifecycle (agent2) ---`.

Un test (`src/shared/errors/catalog.test.ts`) fallisce se manca catalogo, i18n o riga `| CODICE |` in questi file.

## Come aggiungere un errore

1. Aggiungere la chiave in `ERROR_CODES`.
2. Compilare `ERROR_CATALOG` (categoria, testo tecnico, HTTP, recovery, `retrySafe`).
3. Aggiungere `errorNUOVO_CODICE` in `it.ts` nel blocco errors.
4. Aggiungere una riga nella tabella del file `docs/errors/{CATEGORIA}.md`.
5. Usare `fail("NUOVO_CODICE")` nelle action; non inventare stringhe sparse.

Le categorie sono file separati: si può aggiungere un file nuovo (es. `LIFECYCLE.md`) senza ristrutturare gli altri. I codici restano un unico oggetto estendibile.

## File

| File | Area |
|---|---|
| [AUTH.md](AUTH.md) | Login, sessione, reset password, verifica email |
| [AUTHZ.md](AUTHZ.md) | Deny-by-default, 403/404 opachi |
| [IDENTITY.md](IDENTITY.md) | Codice fiscale, account duplicato, conflitto iscrizione |
| [REGISTRATION.md](REGISTRATION.md) | Wizard, finestra, ritiro, stati |
| [INVITES.md](INVITES.md) | Inviti giocatore e staff |
| [DOCUMENTS.md](DOCUMENTS.md) | Upload e file certificato |
| [CONSENTS.md](CONSENTS.md) | Informative e liberatoria |
| [PAYMENTS.md](PAYMENTS.md) | Checkout, doppio pagamento, webhook |
| [TEAMS.md](TEAMS.md) | Squadra, creazione inviti |
| [SYSTEM.md](SYSTEM.md) | Rate limit, 404, boundary UI |
| [VALIDATION.md](VALIDATION.md) | Zod e date |
| [LIFECYCLE.md](LIFECYCLE.md) | Rimozione rosa, chiusura e anonimizzazione account |

## Principi

- Codice stabile e leggibile, mai `ERROR_123`.
- Testo tecnico ≠ testo utente.
- Conflitti di identità: **nessun PII dell’altro account** (email, nome, squadra).
- Indicare se riprovare è sicuro.
- Se non è recuperabile dall’utente: escalation all’organizzazione, senza takeover via codice fiscale.
