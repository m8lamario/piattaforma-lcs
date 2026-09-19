# 11 — Testing Strategy

## 1. Piramide

| Livello | Tool | Cosa |
|---|---|---|
| Unit | Vitest | domain: età/minore, checklist, authorize, masking |
| Integration | Vitest + Prisma (quando DB disponibile) | repository, invito hash, unique registration |
| HTTP / UI | Playwright (non in M0 obbligatorio) | wizard, IDOR browser, admin review |
| Static | tsc, eslint | sempre in CI |

M4: unit sul pacchetto privacy (minore vs adulto, versionId) e sulla decisione media (refuse opzionale completa, refuse required no).
M5: importi/cover; niente campi carta.
M6: proiezione rosa senza PII extra.
M7: Playwright CI è residuo; happy path coperto da verifica browser agente su M1–M6.

## 2. Casi obbligatori (prodotto)

- Minorenne 17 anni vs maggiorenne 18 anni al confine (timezone: usare data UTC o date-only; documentare).
- Giocatore A non legge registrazione B.
- Team rep non ottiene `storageKey`.
- Consenso salva versionId.
- Pagamento TEAM succeeded copre player (quando implementato).
- Upload MIME spoofing rifiutato (quando implementato).
- Invito scaduto/revocato non crea account.

## 3. Sicurezza nei test

Niente certificati reali, niente CF di persone vere. Fixture `RSSMRA80A01H501U` solo se necessario e documentato come fittizio, oppure CF ovvio di test.

## 4. Definition of done test

Il backlog indica i test per task. Se un task tocca authz o documenti, include almeno un test negativo (accesso negato).

## 5. CI

Su pull request / push: `npm ci`, `lint`, `typecheck`, `test`, `build`.

`DATABASE_URL` in CI può essere dummy per generate/build se il client è generato; la build Next non deve fallire senza Postgres in M0 (le pagine non interrogono il DB al build time, oppure usano skip). Prisma generate non richiede DB.
