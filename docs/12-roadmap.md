# 12 — Roadmap

## Milestone M0 — Foundation (questa)

Documentazione completa + applicazione eseguibile senza wizard.

- Repo, docs, design tokens, feature folders
- Prisma schema
- Auth.js email/password + sessione (login; signup solo via token stub/pagina invito minimale se presente)
- `authorize()` deny-by-default + test
- Adapter stub email/storage/payments/monitoring
- Landing + login + shell autenticata placeholder
- CI, env example, legal placeholder files

**Exit:** typecheck, lint, test, build verdi. Nessun form di iscrizione completo.

## M1 — Inviti e account giocatore (completata)

Invito rappresentante, redeem, creazione account, membership, registration `ACCOUNT_CREATED`. Email stub: il link è visibile una volta al rappresentante.

**Exit:** test, lint, typecheck, build; token solo in hash; deny-by-default su create invite; edge case token/scadenza/email esistenti coperti.

## M2 — Wizard dati e dashboard (completata)

Passi dati personali e guardian, salvataggio, dashboard checklist, stato calcolato. I passi certificato/privacy/liberatorie/pagamento sono nel percorso come placeholder onesti.

**Exit:** test, lint, typecheck, build; `isMinor` da data UTC; CF con checksum; `registration:write` deny-by-default; stato persistito dal motore.

## M3 — Documenti medici (completata)

Upload, storage adapter locale (dev) / stub (prod), stati, replace. Admin review (approve/reject con motivo). Accesso file via token HMAC a TTL breve + audit `DOCUMENT_VIEW`. Rep vede solo lo stato, mai il file/key.

**Exit:** test, lint, typecheck, build; magic bytes; signed URL senza storage key; reject senza motivo rifiutato; `document:read_file` deny-by-default per il rappresentante.

## M4 — Consensi e informative (completata)

Pagine placeholder, versioni, ConsentRecord, step privacy + step media prominente, no dark pattern. Pacchetto privacy: `privacy-policy` + `document-processing` + `minor-privacy` se minore. Liberatoria: accettazione o rifiuto esplicito.

**Exit:** test, lint, typecheck, build; versionId persistito; refuse opzionale non bloccante; testi `[INSERIRE …]`.

## M5 — Pagamenti (completata)

Adapter checkout stub, success interno, webhook route, regole PLAYER/TEAM/BOTH senza doppio addebito. Importi Edition o placeholder 40/200 EUR (OD-008).

**Exit:** test, lint, typecheck, build; niente campi carta; isPaymentCovered; stub confirm autorizza il pagatore.

## M6 — Squadra e comunicazioni (completata)

Rosa su `/squadra` con nome + stato iscrizione + stato certificato (mai file/CF/email). Notifiche in-app `/area/comunicazioni` e dispatch email stub (solo titolo, niente dati sanitari).

**Exit:** test roster senza PII extra; lint/typecheck/build.

## M7 — Hardening (completata, con residui dichiarati)

Rate limit già su login/invito/upload/consensi; header di sicurezza + CSP incrementale in `next.config.ts`. Playwright E2E automatizzato, retention purge e monitoring live restano residui (OD-013, OD-022) senza bloccare l’architettura v1.

**Exit:** test, lint, typecheck, build; CSP presente; rate limit documentati.

Il roadmap v1 (M0–M7) è chiuso. I residui (Playwright CI, nonce CSP, provider live, testi legali, retention purge) restano in `OPEN_DECISIONS.md` e non costituiscono una milestone successiva.
