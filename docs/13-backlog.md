# 13 — Task Backlog

Ogni task: obiettivo, requisiti, dipendenze, acceptance criteria, test. I task M0 sono da completare nella foundation. I successivi sono specificati per non perdere il filo; **non** si implementano in M0.

---

## M0

### M0-01 Documentazione fonte di verità

- **Obiettivo:** Constitution e docs elenco in README.
- **Requisiti:** File `docs/00`–`13` + `OPEN_DECISIONS.md` + README.
- **Dipendenze:** nessuna.
- **Acceptance:** Un nuovo sviluppatore capisce ruoli, invito-only, minori, documenti, placeholder legali.
- **Test:** nessuno (review umana).

### M0-02 Scaffold Next.js feature-based

- **Obiettivo:** App TypeScript App Router con CSS Modules, alias `@/*`, cartelle features/shared.
- **Requisiti:** no Tailwind come sistema; tokens CSS; ESLint.
- **Dipendenze:** M0-01.
- **Acceptance:** `npm run dev` mostra landing in italiano.
- **Test:** build.

### M0-03 Design tokens

- **Obiettivo:** File token unico con placeholder blu / surface / teal.
- **Requisiti:** [09-ui-ux-guidelines.md](09-ui-ux-guidelines.md).
- **Dipendenze:** M0-02.
- **Acceptance:** Nessun HEX nei componenti pagina oltre i token.
- **Test:** grep/review; visual landing.

### M0-04 Prisma schema

- **Obiettivo:** Modello in `05-database-design.md` espresso in Prisma 7.
- **Requisiti:** convenzioni id, timestamp, relazioni doppie, indici.
- **Dipendenze:** M0-02.
- **Acceptance:** `prisma generate` ok; schema copre User→AuditLog.
- **Test:** generate in CI.

### M0-05 Auth.js

- **Obiettivo:** Login email/password, sessione, Prisma adapter, secret da env.
- **Requisiti:** no signup pubblico; pagina `/accedi`.
- **Dipendenze:** M0-04.
- **Acceptance:** Credenziali invalide = errore; sessione cookie; logout.
- **Test:** unit hash password; pagina accedi render.

### M0-06 RBAC deny-by-default

- **Obiettivo:** `authorize()` centrale.
- **Requisiti:** [06-roles-and-permissions.md](06-roles-and-permissions.md).
- **Dipendenze:** M0-05.
- **Acceptance:** player denied `document:read_file` su documento altrui; rep denied `document:read_file`; admin allowed.
- **Test:** Vitest matrice azioni.

### M0-07 Adapter stub

- **Obiettivo:** Email, storage, payment, monitoring stub.
- **Requisiti:** interfacce in architecture; nessuna SDK provider.
- **Dipendenze:** M0-02.
- **Acceptance:** chiamare stub non lancia; payment stub ritorna ref fittizio.
- **Test:** unit stub.

### M0-08 Config env e CI

- **Obiettivo:** `.env.example`, GitHub Actions, script npm.
- **Requisiti:** secret non committati; CI lint/typecheck/test/build.
- **Dipendenze:** M0-02–07.
- **Acceptance:** workflow presente; example documentato.
- **Test:** CI verde (locale: stessi comandi).

### M0-09 Copy i18n IT e legal placeholder

- **Obiettivo:** `src/shared/i18n/it.ts` + `content/legal/*.md` placeholder.
- **Dipendenze:** M0-02.
- **Acceptance:** visibile `[INSERIRE …]` in file legal; UI non inventa policy.
- **Test:** file esistono.

### M0-10 Domain checklist/minore

- **Obiettivo:** Funzioni pure `isMinor` e `projectRegistration` usabili dal futuro wizard.
- **Dipendenze:** M0-02.
- **Acceptance:** 17 anni → guardian required; 18 → no; pagamento TEAM succeeded copre item PAYMENT.
- **Test:** Vitest.

---

## M1

### M1-01 Invito rappresentante

- **Obiettivo:** Creare PlayerInvite, token hash, redeem.
- **Requisiti:** flussi 04; email unica per team pending.
- **Dipendenze:** M0.
- **Acceptance:** token scaduto rifiutato; doppio redeem rifiutato; resend revoca il pending precedente.
- **Test:** unit token hash + inspect/decide path. **Stato: fatto.**

### M1-02 Creazione account da invito

- **Obiettivo:** User + membership + registration `ACCOUNT_CREATED`.
- **Acceptance:** niente `/register` pubblico; email esistente richiede login (niente takeover); una edition attiva alla volta (OD-017).
- **Test:** IDOR team:invite player denied; race su claim `updateMany` status PENDING. **Stato: fatto.**

---

## M2

### M2-01 Wizard dati + guardian

- **Obiettivo:** Percorso guidato un tema per schermata: dati personali, tutore solo se minore. Salvataggio per passo, ripresa, validazione client e server.
- **Requisiti:** spec §8–9; flussi 04 §3–4; `isMinor` da data di nascita (UTC date-only, OD-004); CF formato + checksum (OD-020); email account in sola lettura; tutore: nome, cognome, rapporto, email, telefono.
- **Dipendenze:** M1 (account + registration `ACCOUNT_CREATED`).
- **Acceptance:**
  - niente un’unica card con tutti i campi;
  - minorenne → passo tutore obbligatorio; maggiorenne → passo assente (`not_applicable`);
  - Salva e continua / Salva ed esci;
  - CF duplicato su altro account rifiutato;
  - `registration:write` solo sul proprio profilo (deny-by-default);
  - i passi certificato/privacy/liberatorie/pagamento esistono nel percorso ma **non** si completano in M2 (placeholder onesto).
- **Test:** Zod/CF/telefono; wizard gate minorenne vs adulto; authorize write altrui denied. **Stato: fatto.**

### M2-02 Dashboard checklist

- **Obiettivo:** `/area` con stato in linguaggio naturale, segmenti checklist, voci cliccabili, stato registrazione ricalcolato dal motore e persistito.
- **Requisiti:** spec §13; `projectChecklist` / `projectRegistrationStatus`; copy “cosa fare adesso”.
- **Dipendenze:** M2-01.
- **Acceptance:** dopo i dati, lo stato passa da `ACCOUNT_CREATED` a `IN_PROGRESS` se restano requisiti; hero e checklist coerenti; loading/empty/error; icone + testo (non solo colore).
- **Test:** proiezione già in domain; persistenza allineata al motore. **Stato: fatto.**

---

## M3

### M3-01 Upload certificato

- **Obiettivo:** Il giocatore carica/sostituisce il certificato medico agonistico. Blob privato, metadata in DB, mai URL pubbliche.
- **Requisiti:** spec §10; flussi 04 §5; MIME PDF/JPEG/PNG; magic bytes; max size config; storage adapter; virus scan stub (OD-021).
- **Dipendenze:** M2.
- **Acceptance:** file non in `public/`; storage key opaca; replace marca il precedente `REPLACED`; stato `PENDING_REVIEW`; signed URL TTL breve; `emailVerified` richiesto.
- **Test:** magic bytes; filename sanitizzato; authorize `document:read_file` altrui denied. **Stato: fatto.**

### M3-02 Review admin

- **Obiettivo:** Org/Super Admin lista documenti in revisione, apre via signed URL con audit, approva o rifiuta con motivo obbligatorio.
- **Requisiti:** ruoli 06; security 07 §6; rappresentante vede solo stato, mai file/key.
- **Dipendenze:** M3-01.
- **Acceptance:** reject senza motivo rifiutato; `DOCUMENT_VIEW` in audit; dashboard giocatore mostra attenzione/rifiuto con CTA ricarica; rep non ottiene signed URL.
- **Test:** authorize review player denied; rep `document:read_file` denied (già in matrice). **Stato: fatto.**

---

## M4

### M4-01 Consensi versionati (privacy)

- **Obiettivo:** Step privacy con testi placeholder versionati. L’accettazione persiste `ConsentRecord` con `legalDocumentVersionId`, datetime e traccia tecnica. Nessuna affermazione di validità legale.
- **Requisiti:** spec §11; [08-privacy-and-consent.md](08-privacy-and-consent.md); OD-001 placeholder; OD-002 traccia tecnica senza dichiarare validità; `emailVerified` prima dei consensi vincolanti.
- **Dipendenze:** M2 (wizard), M3 (percorso dopo certificato).
- **Acceptance:**
  - lo step mostra la versione corrente, con avviso placeholder visibile;
  - checkbox con label chiara; niente pre-check;
  - salvataggio con `versionId` della versione `isCurrent`;
  - per i minori, anche l’informativa `minor-privacy` nello stesso passo;
  - informativa documenti caricati (`document-processing`) nello stesso passo;
  - `PRIVACY` in checklist è completo solo se tutti i consensi required del pacchetto privacy sono accettati sulla versione corrente;
  - i testi restano `[INSERIRE …]` da `content/legal/`.
- **Test:** domain: privacy incompleta senza versionId corrente; minore richiede `minor-privacy`; record rifiuta versioni non current. **Stato: fatto.**

### M4-02 Step media prominente

- **Obiettivo:** Step proprio per liberatorie foto/video/social, visibile, senza dark pattern.
- **Requisiti:** constitution §2.7; 08 §6; edition `MEDIA_RELEASE` `required=false` di default.
- **Dipendenze:** M4-01.
- **Acceptance:**
  - non è un link minore in footer;
  - se `required=false`, si può rifiutare esplicitamente e l’iscrizione non si blocca;
  - se `required=true`, serve accettazione sulla versione corrente;
  - nessuna checkbox pre-selezionata; “accetta tutto” assente;
  - copy UI non dichiara validità legale.
- **Test:** optional refuse → item complete e non blocking; required senza accept → blocking. **Stato: fatto.**

---

## M5

### M5-01 Checkout adapter

- **Obiettivo:** Il giocatore (e il rappresentante se TEAM/BOTH) avvia un checkout via `PaymentAdapter` senza campi carta nel DOM.
- **Requisiti:** spec §12; adapter esistente; importi da Edition (OD-008).
- **Dipendenze:** M2, M4 (percorso).
- **Acceptance:** niente PAN/CVV; Payment `PENDING` con reference; stub redirect al success URL interno; UI indica importo placeholder se non ufficiale.
- **Test:** adapter checkout senza dati carta (già presente); domain: TEAM succeeded copre player. **Stato: fatto.**

### M5-02 Webhook e no double charge

- **Obiettivo:** Transizione di stato da webhook/stub confirm; idempotenza su `providerPaymentId`; BOTH: il primo SUCCEEDED copre.
- **Requisiti:** OD-007 workaround; security §8.
- **Dipendenze:** M5-01.
- **Acceptance:** secondo checkout bloccato se già coperto; webhook duplicato non crea doppio SUCCEEDED; PLAYER/TEAM/BOTH rispettati.
- **Test:** isPaymentCovered; reject second intent if covered. **Stato: fatto.**

---

## M6

### M6-01 Pagina squadra PII minima

- **Obiettivo:** Il rappresentante vede la rosa della propria squadra senza CF, email, telefono, storageKey o file medico.
- **Requisiti:** constitution §4; spec stato certificato only; authorize `team:read`.
- **Dipendenze:** M1, M3 (stato documento).
- **Acceptance:**
  - elenco nome + stato iscrizione + stato certificato (mancante / in revisione / ok / da ricaricare / scaduto);
  - nessuna URL o key di storage;
  - rappresentante non ottiene il file.
- **Test:** `toRosterRow` non include fiscalCode/email/storageKey; CHANGES_REQUESTED → da ricaricare. **Stato: fatto.**

### M6-02 Notification in-app

- **Obiettivo:** Il giocatore riceve comunicazioni in-app (e email stub) su eventi di iscrizione, senza payload sanitari.
- **Requisiti:** privacy; adapter email stub.
- **Dipendenze:** M3, M5.
- **Acceptance:**
  - `/area/comunicazioni` autenticata;
  - review certificato: testo generico, niente motivo medico;
  - pagamento riuscito: notifica al giocatore (anche se TEAM);
  - email stub: solo `title` nelle variables.
- **Test:** copy di reject senza reason nel body (verifica codice + browser). **Stato: fatto.**

---

## M7

### M7-01 Playwright happy path

- **Obiettivo:** E2E automatizzato del percorso invitati → iscrizione → pagamento.
- **Dipendenze:** M5.
- **Acceptance:** suite Playwright in CI.
- **Stato: residuo dichiarato.** Happy path verificato in browser agente su M1–M6. Playwright non introdotto: richiede env E2E dedicato (seed + DB + browser CI) senza cambiare i requisiti di prodotto.

### M7-02 Rate limit e CSP

- **Obiettivo:** Mitigare brute-force e XSS di base.
- **Dipendenze:** M0.
- **Acceptance:** rate limit login/invito/upload/consensi; header CSP, nosniff, frame deny, permissions-policy.
- **Stato: fatto** (CSP incrementale con unsafe-inline/eval per Next; da inasprire con nonce).

---

| ID | Obiettivo | Dipendenze | Test chiave |
|---|---|---|---|
| M3-01 | Upload certificato | M2, storage | MIME, size, no public URL |
| M3-02 | Review admin | M3-01 | audit view, rep no file |
| M4-01 | Consensi versionati | M2 | versionId persistito |
| M4-02 | Step media prominente | M4-01 | optional non bloccante se required=false |
| M5-01 | Checkout adapter | M2 | no card storage |
| M5-02 | Webhook + no double charge | M5-01 | BOTH/TEAM cover |
| M6-01 | Pagina squadra PII minima | M1 | compagni senza CF |
| M6-02 | Notification in-app | M1 | no dati sanitari nel body |
| M7-01 | Playwright happy path | M5 | E2E — **residuo**: verifica browser manuale fatta; suite Playwright non introdotta |
| M7-02 | Rate limit e CSP | M0 | smoke — **fatto:** rate limit in-process + CSP incrementale |

---

## M8

### M8-01 Console organizzazione

- **Obiettivo:** Org/Super Admin gestisce coppe, edizioni, istituti, squadre e vede iscrizioni senza seed-only.
- **Requisiti:** IA `/admin/*`; `admin:manage`; `StaffInvite` hashato; nessun CMS informative.
- **Dipendenze:** M7.
- **Acceptance:**
  - `/admin` hub con conteggi;
  - CRUD edizione (finestre, paymentMode, fee, requisiti) e squadra (school + team);
  - invito rappresentante: token hashato, redeem senza `Registration`;
  - lista registrazioni filtrabile (edizione, squadra, stato, nome — mai CF in query);
  - scheda giocatore staff: anagrafica incluso CF, tutore, checklist, consensi versione/timestamp; file medico solo via flusso auditato;
  - filtri documenti; lista pagamenti senza PAN; audit in lettura; `/admin/informative` sola lettura;
  - edizione con registrazioni non cancellabile.
- **Test:** IDOR player/rep su actions admin; staff invite expired/revoked; filtri senza `storageKey`.

## M9

### M9-01 Rosa quotidiana

- **Obiettivo:** Il rappresentante vede lo stato della rosa e invita in blocco senza PII extra.
- **Acceptance:** selettore squadra (`eph-team`); striscia conteggi; reinvio = revoca pending + nuovo token visibile una volta; CSV max 50; sollecito `REGISTRATION_REMINDER` senza motivo medico; maglia/ruolo; nuovi inviti bloccati fuori finestra edizione.
- **Test:** `toRosterRow` senza CF/email/storageKey; CSV parziale; switcher IDOR; domain `isRegistrationWindowOpen`.

## M10

### M10-01 Account e post-iscrizione

- **Obiettivo:** L’area resta utilizzabile dopo l’iscrizione; recupero password; ritiro senza cancellare dati.
- **Acceptance:** dashboard DONE/APPROVED senza “Continua”; `/area/account` cambio password; reset con messaggio generico; `/area/squadra` nome+maglia+ruolo; badge unread; withdraw owner/staff; countdown finestre; email tutore solo `title`.
- **Test:** reset token riusato; withdraw IDOR; compagni senza medicalStatus.

## M11

### M11-01 Adapter Resend / R2 / Stripe

- **Obiettivo:** Provider live dietro driver env, fail-closed a stub se manca config.
- **Acceptance:** SDK solo in `src/shared/adapters/live`; checkout Stripe hosted; webhook firma; esito interno non marca SUCCEEDED se driver ≠ stub; rate limit Postgres; variabili email senza CF/motivo medico.
- **Test:** firma webhook invalida; stub esito; interfaccia storage invariata.

## M12

### M12-01 CSP nonce e Playwright

- **Obiettivo:** Chiudere i residui M7-01 (E2E) e nonce CSP.
- **Acceptance:** nonce sul bootstrap tema; suite Playwright happy path in CI; banner staff se `[INSERIRE` è ancora nei file legal.
- **Test:** `test:e2e`; lint/typecheck/build.

| ID | Obiettivo | Dipendenze | Test chiave |
|---|---|---|---|
| M8-01 | Console org + StaffInvite | M7 | IDOR admin, invite hash |
| M9-01 | Rosa, reinvio, CSV, sollecito | M8 | roster PII, window |
| M10-01 | Account, reset, ritiro, compagni | M9 | reset reuse, withdraw IDOR |
| M11-01 | Resend/R2/Stripe + rate limit DB | M10 | webhook sig, stub esito |
| M12-01 | CSP nonce + Playwright CI | M11 | e2e happy path |
