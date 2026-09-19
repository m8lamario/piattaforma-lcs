# OPEN_DECISIONS

Ogni voce: problema, opzioni, decisione necessaria, conseguenze, impatto sullo sviluppo. Finché è aperta, si usa il **workaround** indicato e si va avanti.

---

## OD-001 Testi legali ufficiali

- **Problema:** Mancano privacy policy, informative documenti, informative minori, liberatorie, termini.
- **Opzioni:** (a) placeholder versionati in `content/legal`; (b) attendere i testi prima di ogni UI.
- **Decisione necessaria:** testi firmati da organizzazione/legale, titolare, DPO, finalità, retention, basi giuridiche.
- **Conseguenze:** senza testi il prodotto non è pubblicabile verso utenti reali.
- **Impatto:** nessuno su schema/UI structure. Workaround: placeholder `[INSERIRE …]`.

## OD-002 Validità del consenso digitale del minore

- **Problema:** L’account è del minore. Non è chiaro se il click del minore (o un flusso genitore) abbia valore.
- **Opzioni:** email genitore con conferma; SPID/CIE genitore; carta identità; solo tracciamento + processo offline.
- **Decisione necessaria:** parere legale + processo organizzativo.
- **Conseguenze:** può aggiungere entità `GuardianVerification`.
- **Impatto:** M4 si blocca sulla **validità**, non sulla **registrazione tecnica** del consenso. Workaround: tracciare acceptance dell’account loggato; non dichiarare validità legale.

## OD-003 Email del minore come login

- **Problema:** Molti under-18 non hanno email stabile.
- **Opzioni:** email minore obbligatoria; alias genitore; username non email (sconsigliato).
- **Decisione necessaria:** organizzazione.
- **Impatto:** Auth.js è email-based. Workaround v1: email obbligatoria sul User (spec). Guardian.email è comunque raccolta.

## OD-004 Soglia di età e giurisdizione

- **Problema:** 18 anni Italia è un’assunzione.
- **Opzioni:** 18 fissi; per-edizione; per nazione.
- **Decisione necessaria:** legale.
- **Impatto:** `isMinor` usa config `AGE_OF_MAJORITY=18`.

## OD-005 Regole certificato agonistico

- **Problema:** Validità, tipo visita, sport, scadenza, cosa rifiutare.
- **Opzioni:** sola presenza file; scadenza obbligatoria; controlli manuali admin.
- **Decisione necessaria:** organizzazione sanitaria/regolamenti.
- **Impatto:** DocumentType flags. Workaround: metadata + review umana, expiry opzionale.

## OD-006 Provider pagamenti

- **Problema:** Non scelto (Nexi, Stripe, PayPal, Satispay, altro).
- **Opzioni:** adapter per ciascuno; uno solo.
- **Decisione necessaria:** organizzazione (Italia, carte, bonifico, commissioni).
- **Impatto:** M5. Workaround: `PaymentAdapter` stub.

## OD-007 Modalità BOTH (doppio canale)

- **Problema:** Se entrambi possono pagare, chi vince e come evitare doppio addebito.
- **Opzioni:** il primo SUCCEEDED copre; il team prevale e rimborsa il player; solo uno abilitato per volta in UI.
- **Decisione necessaria:** prodotto + pagamenti.
- **Impatto:** motore checklist PAYMENT. Workaround proposto: **il primo pagamento SUCCEEDED utile copre**; UI sconsiglia il secondo; rimborsi manuali admin.

## OD-008 Importi quota

- **Problema:** Importo giocatore/squadra per edizione sconosciuto.
- **Opzioni:** campi Edition già in schema.
- **Decisione necessaria:** organizzazione per ogni edizione.
- **Impatto:** nessuno strutturale. Workaround: 0 / null = non richiesto se requirement PAYMENT required=false.

## OD-009 Ricevuta

- **Problema:** PDF nostro vs ricevuta provider.
- **Opzioni:** solo `receiptUrl` provider; PDF interno.
- **Impatto:** M5. Workaround: campo `receiptUrl` nullable.

## OD-010 Object storage

- **Problema:** S3, R2, GCS, altro.
- **Opzioni:** adapter.
- **Decisione necessaria:** hosting/ops.
- **Impatto:** M3. Workaround: stub che rifiuta persistenza reale o salva locale **non** in prod.

## OD-011 Email provider

- **Problema:** Resend, SES, Mailgun, altro.
- **Opzioni:** adapter.
- **Impatto:** M1 comunicazioni. Workaround: stub log.

## OD-012 Hosting e database

- **Problema:** Vercel+Neon, VPS, altro.
- **Impatto:** CI/CD, adapter pg vs neon. Workaround: `DATABASE_URL` generico Postgres.

## OD-013 Error tracking

- **Problema:** Sentry vs altro.
- **Impatto:** monitoring adapter. Workaround: stub console.

## OD-014 HEX brand

- **Problema:** blu / chiaro / teal definitivi mancanti.
- **Impatto:** un file token. Workaround: placeholder in guidelines.

## OD-015 Nome pubblico prodotto

- **Problema:** “ESL Player Hub” è nome repo/prodotto interno.
- **Impatto:** copy. Workaround: costante i18n.

## OD-016 Precompilazione anagrafica da rappresentante

- **Problema:** L’invito può portare nome/cognome. Può il rep compilare CF o altri dati?
- **Opzioni:** solo email; email+nome; anagrafica completa (sconsigliata per CF).
- **Decisione necessaria:** prodotto/privacy.
- **Workaround:** invito con email + firstName/lastName opzionali; CF solo dal giocatore.
- **Implementato in M1:** form rappresentante email obbligatoria, nome/cognome opzionali.

## OD-017 Conflitto giocatore già in altra edizione/squadra

- **Problema:** v1 una edition alla volta, ma l’email può già esistere.
- **Opzioni:** collegare account e bloccare seconda edition; permettere coda; supporto.
- **Workaround:** redeem su user esistente solo se non ha registration attiva su altra edition; altrimenti errore chiaro. Dettaglio UX da confermare.
- **Implementato in M1:** login obbligatorio se l’email esiste; blocco se c’è un’altra edition non `WITHDRAWN`. UX: messaggi in italiano sulla pagina invito.

## OD-018 Competition Organizer in v1

- **Problema:** Realtà locali potrebbero aver bisogno di admin scoped.
- **Opzioni:** solo Org Admin nazionale; introdurre UI organizer.
- **Workaround:** ruolo in schema, nessuna UI.

## OD-019 Rapporto ESL nazionale vs coppa locale

- **Problema:** Competition = coppa locale (Leonessa Cup) o campionato nazionale con sotto-eventi?
- **Opzioni:** Competition piatta; albero parentId; Organization extra.
- **Workaround:** Competition piatta + Edition. `parentId` nullable riservato se serve dopo.

## OD-020 Validazione codice fiscale

- **Problema:** Solo regex vs checksum ufficiale vs integrazione Agenzia.
- **Workaround:** formato base in Zod; checksum come TODO testabile.

## OD-021 Antivirus sugli upload

- **Problema:** ClamAV, provider, nessuno.
- **Workaround:** MIME+size ora; interfaccia `scan(file)` stub ok.

## OD-022 Retention audit e IP nei consensi

- **Problema:** Quanto conservare IP/user agent.
- **Workaround:** campi presenti, policy di purge non automatica.

## OD-023 Magic link / OAuth / SPID

- **Problema:** Auth oltre password.
- **Workaround:** email+password+verifica. Auth.js consente di aggiungere provider dopo.

## OD-024 Re-consent su nuova versione informativa

- **Problema:** Forzare nuova accettazione a iscrizione già approvata?
- **Workaround:** re-consent solo se edition requirement punta a `isCurrent` e registration non approvata; approvati = processo admin.

## OD-025 Scan virus e PWA

Già coperti: no PWA in M0; scan OD-021.

---

Quando una decisione arriva, si sposta in fondo come **Chiusa** con data e si aggiornano spec/architecture/schema se serve.

## Decisioni autonome chiuse in M6 (2026-09-19)

| ID | Decisione |
|---|---|
| M6-D1 | Rosa: firstName, lastName, status registrazione, stato certificato. Mai CF/email/telefono/storageKey |
| M6-D2 | Notifiche in-app + email stub con `template=type` e solo `title` nelle variables |
| M6-D3 | Testo rifiuto certificato non va in notifica (niente dettaglio sanitario nel canale) |

## Decisioni autonome chiuse in M7 (2026-09-19)

| ID | Decisione |
|---|---|
| M7-D1 | CSP incrementale con `'unsafe-inline'` / `'unsafe-eval'` per Next; da inasprire con nonce |
| M7-D2 | Playwright E2E non introdotto in questo ciclo: happy path verificato in browser agente; da aggiungere in CI dopo un env E2E dedicato |
| M7-D3 | Retention purge e error tracking live restano OD-022 / OD-013 |
| M7-D4 | Rate limit login 20/15min dopo validazione schema; Permissions-Policy camera/mic/geo/payment vuote |

## Decisioni autonome chiuse in M5 (2026-09-19)

| ID | Decisione |
|---|---|
| M5-D1 | Importo mancante → 40 EUR giocatore / 200 EUR squadra, copy placeholder OD-008 |
| M5-D2 | Stub: success URL interno `/area/pagamento/esito` marca SUCCEEDED dopo authorize sul pagatore |
| M5-D3 | Webhook `/api/webhooks/payments` ignora eventi stub PENDING; provider live in seguito |
| M5-D4 | BOTH: primo SUCCEEDED copre (OD-007); secondo checkout bloccato |
| M5-D5 | Nessun campo carta nel DOM |

## Decisioni autonome chiuse in M4 (2026-09-19)

| ID | Decisione |
|---|---|
| M4-D1 | Step privacy = pacchetto `privacy-policy` + `document-processing` + `minor-privacy` se minore |
| M4-D2 | Liberatoria: bottoni Accetto / Non accetto; rifiuto esplicito completa se `required=false` |
| M4-D3 | ConsentRecord in append; `guardianId` null (OD-002: non si finge firma del genitore) |
| M4-D4 | Accettazione su versione non `isCurrent` rifiutata |
| M4-D5 | Checkbox mai preselezionate; niente “accetta tutto” |
| M4-D6 | Copy UI: presa visione della versione, nessun valore legale |
| M4-D7 | Versioni `placeholder-1` da `content/legal/` |

## Decisioni autonome chiuse in M3 (2026-09-19)

| ID | Decisione |
|---|---|
| M3-D1 | Accesso file: token HMAC `documentId.userId.exp` servito da `/api/documents/file`. Mai storage key in URL. |
| M3-D2 | `STORAGE_DRIVER=local` fuori produzione (directory `.local-storage`); in produzione resta lo stub (OD-010). |
| M3-D3 | MIME dichiarato vuoto o `application/octet-stream`: si accetta il MIME rilevato dai magic bytes. Mismatch dichiarato vs magic = rifiuto. |
| M3-D4 | Antivirus: `stubScan` sempre ok (OD-021). |
| M3-D5 | Review solo da `PENDING_REVIEW`. Rifiuto senza motivo trim rifiutato. |
| M3-D6 | Il gate del wizard blocca solo i passi precedenti `todo`. `attention` (in revisione / rifiutato) non impedisce privacy e passi successivi. |
| M3-D7 | Storage key opaca `documents/{registrationId}/{random}`. Replace marca il precedente `REPLACED` e non cancella il blob. |
| M3-D8 | Audit `DOCUMENT_VIEW` sul GET del file, non sulla sola emissione del token. |
| M3-D9 | Scadenza certificato non calcolata in v1 (OD-005). |
| M3-D10 | Upload consentito solo con `emailVerified`. |

## Decisioni autonome chiuse in M1 (2026-09-19)

| ID | Decisione |
|---|---|
| M1-D1 | TTL invito 14 giorni (`INVITE_TTL_DAYS`) |
| M1-D2 | Nuovo invito alla stessa email+squadra revoca il pending precedente |
| M1-D3 | Il token non consente di impostare una nuova password su un account esistente |
| M1-D4 | Redeem riuscito imposta `emailVerified` |
| M1-D5 | Con email stub il rappresentante vede il link una sola volta (oltre al log adapter) |
| M1-D6 | Rate limit in-process (non distribuito) su create/redeem |
| M1-D7 | Attach non sovrascrive `TeamMembership.role` esistente |
| M1-D8 | Pagina `/invito` per incollare link/codice; landing CTA non va più a `/accedi` |
| M1-D9 | Nuovo invito bloccato se email già in squadra o in altra edizione attiva |
| M1-D10 | Sessione con email diversa dall’invito: logout che riporta a `/invito/[token]` |

## Decisioni autonome chiuse in M2 (2026-09-19)

| ID | Decisione |
|---|---|
| M2-D1 | Data di nascita `DATE` UTC date-only; `isMinor` ricalcolato a ogni lettura |
| M2-D2 | v1 un solo Guardian per profilo (upsert del primo) |
| M2-D3 | Passi certificato/privacy/liberatorie/pagamento nel wizard come placeholder, `implemented: false` (certificato sbloccato in M3) |
| M2-D4 | Codice fiscale: formato + checksum (OD-020), senza anagrafe |
| M2-D5 | Rapporto tutore: `GENITORE` \| `TUTORE` \| `AFFIDATARIO` \| `ALTRO` |
| M2-D6 | Data nascita nel passato e non oltre 100 anni: qualità dati, non regola di ammissione |
