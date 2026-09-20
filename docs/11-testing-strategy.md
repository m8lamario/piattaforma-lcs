# 11 — Testing Strategy

## 1. Piramide

| Livello | Tool | Cosa |
|---|---|---|
| Unit | Vitest | domain: età/minore, checklist, authorize, masking |
| Integration | Vitest + Prisma (quando DB disponibile) | repository, invito hash, unique registration |
| HTTP / UI | Playwright | happy path invito → area → pagamento stub in CI |
| Static | tsc, eslint | sempre in CI |

M4: unit sul pacchetto privacy (minore vs adulto, versionId) e sulla decisione media (refuse opzionale completa, refuse required no).
M5: importi/cover; niente campi carta.
M6: proiezione rosa senza PII extra.
M7: rate limit e CSP di base.
M8–M10: authorize nuove action; window edizione; roster PII; reset/withdraw IDOR.
M11: webhook firma; adapter stub default in test.
M12: Playwright CI (`npm run test:e2e`) su postgres di servizio + seed.

## 2. Casi obbligatori (prodotto)

- Minorenne 17 anni vs maggiorenne 18 anni al confine (timezone: usare data UTC o date-only; documentare).
- Giocatore A non legge registrazione B.
- Team rep non ottiene `storageKey`.
- Consenso salva versionId.
- Pagamento TEAM succeeded copre player (quando implementato).
- Upload MIME spoofing rifiutato (quando implementato).
- Invito scaduto/revocato non crea account.
- Staff invite scaduto/revocato non concede TEAM_REPRESENTATIVE.
- Reset password: secondo uso dello stesso token rifiutato.
- Giocatore non ritira l’iscrizione di un altro.

## 3. Sicurezza nei test

Niente certificati reali, niente CF di persone vere. Fixture `RSSMRA80A01H501U` solo se necessario e documentato come fittizio, oppure CF ovvio di test.

## 4. Definition of done test

Il backlog indica i test per task. Se un task tocca authz o documenti, include almeno un test negativo (accesso negato).

## 5. CI

Su pull request / push: `npm ci`, `lint`, `typecheck`, `test`, `build`, `test:e2e`.

CI ha Postgres 16, `prisma migrate deploy`, seed. Playwright usa `next start` sullo stesso job. Prisma generate non richiede DB.

## 6. Loading UX

Ogni schermata dati ha un `loading.tsx` il cui skeleton specchia la struttura reale (non il testo “Loading…”). Le mutazioni disabilitano il submit, usano copy italiano esplicito e `aria-busy`. L’upload medico mostra un progresso indeterminato accessibile, senza percentuale finta. `prefers-reduced-motion` spegne lo shimmer.
