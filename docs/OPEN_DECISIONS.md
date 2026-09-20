# OPEN_DECISIONS

Ogni voce: problema, opzioni, decisione necessaria, conseguenze, impatto sullo sviluppo. Finché è aperta, si usa il **workaround** indicato e si va avanti.

---

## OD-001 Testi legali ufficiali

- **Problema:** Mancano privacy policy, informative documenti, informative minori, liberatorie, termini.
- **Opzioni:** (a) placeholder versionati in `content/legal`; (b) attendere i testi prima di ogni UI.
- **Decisione necessaria:** testi firmati da organizzazione/legale, titolare, DPO, finalità, retention, basi giuridiche. La struttura da compilare è in `content/legal/` (mappa in `docs/08-privacy-and-consent.md`).
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
- **Decisione necessaria:** organizzazione (DPA, commissioni, metodi IT). **Scelta implementativa M11:** Stripe Checkout hosted (`PAYMENT_DRIVER=stripe`), webhook fonte di verità.
- **Conseguenze:** OD-034 resta aperto (DPA/extra-SEE). Default `stub` se manca config.
- **Impatto:** adapter live in `src/shared/adapters/live/stripe.ts`. Stub confirm solo con `PAYMENT_DRIVER=stub`.

## OD-010 Object storage

- **Problema:** S3, R2, GCS, altro.
- **Opzioni:** adapter.
- **Decisione necessaria:** hosting/ops + DPA. **Scelta implementativa M11:** Cloudflare R2 (`STORAGE_DRIVER=r2`), bucket privato.
- **Conseguenze:** accesso file resta HMAC interno (M3-D1). Fail closed a stub se manca config. Locale: `STORAGE_DRIVER=local`.
- **Impatto:** adapter `live/r2.ts`.

## OD-011 Email provider

- **Problema:** Resend, SES, Mailgun, altro.
- **Opzioni:** adapter.
- **Decisione necessaria:** ops + DPA. **Scelta implementativa M11:** Resend (`EMAIL_DRIVER=resend`).
- **Conseguenze:** template con `title` / URL; mai CF o motivo medico. Default stub.
- **Impatto:** adapter `live/resend.ts`.

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

## OD-026 Titolare, DPO, contatti e registro

- **Problema:** Mancano denominazione del titolare, sede, PEC, email privacy, eventuale DPO, e se esiste un registro dei trattamenti.
- **Opzioni:** titolare unico ESL/LCS; contitolarità con coppe locali; DPO interno / esterno / non nominato.
- **Decisione necessaria:** organizzazione + legale. Compilare i placeholder in `privacy-policy` sezioni 2–3.
- **Conseguenze:** senza questi dati nessuna informativa è pubblicabile.
- **Impatto:** solo testi e footer/contatti. Workaround: `[INSERIRE NOME TITOLARE DEL TRATTAMENTO]`, `[INSERIRE EMAIL PRIVACY]`.

## OD-027 Cookie banner, analytics e tracciamenti

- **Problema:** Oggi esistono cookie di sessione Auth.js e preferenza tema (`eph-theme`). Non c’è banner né analytics.
- **Opzioni:** solo cookie tecnici senza banner; banner se si aggiungono analitici; niente terze parti.
- **Decisione necessaria:** legale + prodotto, prima di introdurre analytics/pixel.
- **Conseguenze:** un banner è lavoro UI; un nuovo consenso va come `LegalDocument` distinto, non come checkbox nascosta.
- **Impatto:** nessuno finché non si aggiungono tracker. Workaround: pagina `/cookie` placeholder (`cookie-policy`).

## OD-028 Condizioni di iscrizione (`terms`) nel wizard

- **Problema:** Esiste la struttura `terms` e la pagina `/termini`, ma lo step privacy non la presenta.
- **Opzioni:** (a) solo pagina pubblica; (b) aggiungerla al pacchetto privacy required; (c) step proprio.
- **Decisione necessaria:** organizzazione + legale, dopo il testo ufficiale.
- **Conseguenze:** se required, si aggiunge lo slug al catalogo `wizardStep: "privacy"` (o un nuovo step). Vietato un booleano `termsAccepted`.
- **Impatto:** nullo finché resta fuori dal wizard. Workaround: documento versionato, nessuna acceptance finta.

## OD-029 Processo esercizio diritti

- **Problema:** Non c’è un flusso self-service di accesso/export/cancellazione. L’audit non si cancella dalla UI.
- **Opzioni:** solo processo email/PEC; tool admin; portabilità automatica.
- **Decisione necessaria:** legale + organizzazione (tempi, verifica identità, limiti su certificati e log).
- **Conseguenze:** può richiedere UI admin e policy di redazione.
- **Impatto:** non blocca lo sviluppo del wizard. Workaround: canale `[INSERIRE EMAIL PRIVACY]`, niente delete-all in prodotto.
- **Implementazione (sviluppo, non chiude OD-029):** Super Admin può chiudere o anonimizzare un account da `/admin/utenti`. Il rappresentante può solo rimuovere un giocatore dalla propria rosa. Purge file medici e cancellazione audit restano aperti (OD-022/030). Non è self-service.

## OD-030 Retention certificati e file sostituiti

- **Problema:** In v1 il replace non cancella il blob precedente. Mancano periodi per file approvati, rifiutati, sostituiti, hash, motivi di rifiuto.
- **Opzioni:** purge a fine edizione; N anni; obbligo sportivo più lungo; cancellazione su richiesta con eccezioni.
- **Decisione necessaria:** legale + organizzazione sanitaria/regolamenti (lega OD-005).
- **Conseguenze:** job di purge e regole storage.
- **Impatto:** nessuno strutturale ora. Workaround: storia completa, nessuna cancellazione automatica.

## OD-031 Ritiro liberatoria media e materiale già pubblicato

- **Problema:** Il hub registra accept/refuse in append, ma non rimuove contenuti da social, siti locali o stampa.
- **Opzioni:** revoca = stop alle nuove uscite; tentativo di rimozione sui canali propri; nessuna rimozione dell’archivio.
- **Decisione necessaria:** legale + comunicazione. Chi può revocare per un minore (OD-040).
- **Conseguenze:** processo operativo (chi toglie cosa, in quanto tempo) più eventuale stato visibile al rep.
- **Impatto:** il wizard già consente il rifiuto se `required=false`. Workaround: testo placeholder in `media-release` § 13.

## OD-032 Comunicazioni al genitore/tutore

- **Problema:** Si raccoglie email/telefono del contatto, ma v1 non ha un login genitore e l’email è stub.
- **Opzioni:** nessuna email al genitore; elenco eventi obbligatori (invito, rifiuto certificato, approvazione); copia di tutte le comunicazioni.
- **Decisione necessaria:** organizzazione + legale (informativa al genitore come interessato).
- **Conseguenze:** template e adapter email; mai dettaglio sanitario nel canale.
- **Impatto:** M10: copia del `title` della notifica di servizio all’email tutore se il giocatore è minore. Non è firma del genitore. DPA/testi restano OD-001.

## OD-033 Titolarità hub nazionale vs coppe locali

- **Problema:** ESL/LCS è nazionale; le coppe locali hanno siti distinti non gestiti da questo repo. Chi è titolare di anagrafica, certificati, foto?
- **Opzioni:** titolare unico; contitolarità; titolari distinti per finalità (iscrizione vs vetrina).
- **Decisione necessaria:** legale + organizzazione (lega OD-019).
- **Conseguenze:** testi, DPA, e se i siti locali possono riprendere foto dal hub.
- **Impatto:** nessuno sullo schema. Workaround: placeholder in `privacy-policy` § 2 e `media-release` § 5 e § 7.

## OD-034 Elenco responsabili, DPA e trasferimenti extra-SEE

- **Problema:** Hosting, DB, storage, email, pagamenti, monitoring, antivirus non sono scelti (OD-006/010/011/012/013/021). Senza fornitori non si chiude la sezione trasferimenti.
- **Opzioni:** stack tutto SEE; fornitori extra-SEE con SCC/adeguatezza; elenco pubblico aggiornato a ogni cambio.
- **Decisione necessaria:** ops + legale, prima del lancio con dati reali.
- **Conseguenze:** DPA firmati; aggiornamento `privacy-policy` § 11–12 e `cookie-policy` § 6.
- **Impatto:** adapter già previsti. Workaround: tabelle placeholder, nessuno claim di conformità.

## OD-035 Base giuridica del certificato medico

- **Problema:** Il certificato è (o può essere) dato sanitario. Non è deciso se la base è obbligo di legge sportivo, contratto, consenso, o altro, né se lo *stato* in rosa è dato sanitario.
- **Opzioni:** da far scrivere al legale; non copiare formule da altri siti.
- **Decisione necessaria:** legale, con OD-005 e OD-030.
- **Conseguenze:** testo in `document-processing` e visibilità stato al rappresentante.
- **Impatto:** il prodotto già nasconde il file al rep. Workaround: `[INSERIRE BASE GIURIDICA PER DATI SANITARI / CERTIFICATO]`.

## OD-036 Marketing e comunicazioni non di servizio

- **Problema:** Oggi esistono solo comunicazioni di servizio (in-app; email stub). Non c’è newsletter né consenso marketing.
- **Opzioni:** non introdurre marketing in v1; se si introduce, documento e consenso **separati**, mai obbligatori per l’iscrizione.
- **Decisione necessaria:** organizzazione.
- **Conseguenze:** nuovo slug `LegalDocument` + step o checkbox non pre-spuntata.
- **Impatto:** nessuno ora. Workaround: finalità F8 in `privacy-policy` § 7, richiamo che in v1 non c’è consenso marketing.

## OD-037 Liberatoria obbligatoria per edizione

- **Problema:** `MEDIA_RELEASE` è `required=false` nel seed demo. Un’edizione reale potrebbe obbligarla.
- **Opzioni:** sempre facoltativa; obbligatoria per tutte le edizioni; per-edizione (già previsto da `EditionRequirement`).
- **Decisione necessaria:** organizzazione + legale, soprattutto per i minori.
- **Conseguenze:** se required, il rifiuto blocca il checklist (già implementato). Serve copy ufficiale e processo in campo per chi rifiuta se invece è facoltativa (OD-031).
- **Impatto:** configurazione edizione, non schema. Workaround: demo non obbliga.

## OD-038 Pubblicazione nuove versioni informative

- **Problema:** Chi firma il testo, chi marca `isCurrent`, come si avvisano gli iscritti.
- **Opzioni:** solo Super Admin; Org Admin; processo legale esterno + upload file in `content/legal/`.
- **Decisione necessaria:** organizzazione. `/admin/informative` è in IA, non è il flusso ufficiale finché non esiste.
- **Conseguenze:** allinea OD-024 (re-consent).
- **Impatto:** oggi `ensureLegalDocuments` crea una nuova versione se il file markdown cambia. Workaround: file + seed/sync, niente CMS.

## OD-039 Durata e canali media (nazionale vs edizione)

- **Problema:** Una liberatoria unica vs testi/canali diversi per coppa o anno.
- **Opzioni:** un `media-release` nazionale; versioni per edizione; documenti distinti (foto vs social) come previsto da docs/08.
- **Decisione necessaria:** organizzazione + legale.
- **Conseguenze:** se servono più documenti, nuovi slug nel catalogo, stesso pattern versionato. Non si affastellano checkbox nascoste.
- **Impatto:** nessuno ora (un solo slug). Workaround: un testo placeholder con sezioni canale da compilare.

## OD-040 Chi esercita i diritti del minore

- **Problema:** Account del minore; genitore senza login. Chi chiede accesso, rettifica, cancellazione, revoca media.
- **Opzioni:** solo genitore; minore e genitore; minore da una certa età.
- **Decisione necessaria:** legale (lega OD-002, OD-029, OD-031).
- **Conseguenze:** processo di verifica della legittimazione, non necessariamente un secondo account.
- **Impatto:** nessuno sul wizard. Workaround: `[INSERIRE SE GENITORE, MINORE, ENTRAMBI]` in `minor-privacy`.

## OD-041 Informativa per rappresentanti e amministratori

- **Problema:** Rep e admin hanno account (email, ruoli, pagamenti di squadra). I testi visibili in wizard sono calibrati sul giocatore.
- **Opzioni:** stessa informativa `ALL`; addendum; slug dedicato con audience diversa.
- **Decisione necessaria:** legale + organizzazione.
- **Workaround:** `privacy-policy` § 4 elenca già rep/admin tra gli interessati; nessun secondo checkbox finto.

## OD-042 Foto profilo, logo squadra, streaming in piattaforma

- **Problema:** Schema con `User.image` e `Team.logoStorageKey`; niente gallery né live in v1.
- **Opzioni:** non usarli; se si attivano upload volto/logo o embed, aggiornare `media-release` e `cookie-policy` **prima**.
- **Decisione necessaria:** prodotto + legale.
- **Workaround:** placeholder in `media-release` § 2 e § 5.

## OD-043 Checklist go-live legale (non esaustiva)

- **Problema:** I placeholder visibili e i provider stub impediscono un lancio verso interessati reali anche se il software funziona.
- **Da chiudere almeno:** OD-001 testi firmati; OD-026 titolare/DPO; OD-002/040 minori; OD-029 diritti; OD-030/031 retention e revoca media; OD-034/010/006 fornitori live e DPA; OD-035 base sanitaria; OD-037 obbligatorietà liberatoria.
- **Workaround:** ambiente di sviluppo con avviso placeholder in UI. Non rimuovere `[INSERIRE …]` finché i testi non sono ufficiali.

## OD-044 Face display temporaneo (Barlow Condensed)

- **Problema:** Il lockup ESL e i numeri di passo usano Barlow Condensed (`--font-brand`) come face sportivo-istituzionale. I HEX e il wordmark ufficiali non sono ancora disponibili.
- **Opzioni:** tenere Barlow fino al brand kit; sostituire con la face ufficiale; usare solo Geist.
- **Decisione necessaria:** organizzazione / identità visiva.
- **Conseguenze:** si cambia `layout.tsx` e `--font-brand` in `tokens.css`, non i componenti.
- **Impatto:** nessuno strutturale. Workaround: Barlow Condensed + Geist, placeholder cromatici in `tokens.css`.

---

## OD-045 Conflitto codice fiscale / due account

- **Problema:** Una persona può riscattare due inviti con due email. Il CF unique emerge solo al passo anagrafica: il secondo account ha già User + Registration e restava bloccato in loop sul wizard.
- **Opzioni:** (a) merge automatico col CF; (b) takeover del primo account; (c) un account = un CF, niente merge in prodotto, recovery esplicita; (d) unique solo per edizione.
- **Decisione implementata (c, provvisoria):** User resta il login; PlayerProfile 1:1; CF unique globale già in schema (no migration 0004). Classificazione dominio (`new_player` / `own_identity` / `foreign_identity` con duplicate account, duplicate registration, already on team). Fail utente sempre `IDENTITY_FISCAL_CODE_ASSOCIATED` senza PII dell’altro account. Recovery: correggere il CF, usare l’account originale, ritirare *questa* iscrizione, contattare l’org. Persistenza del blocco in `PlayerProfile.metadata.identityConflict` solo se il secondo profilo non ha ancora un CF.
- **Decisione ancora dell’organizzazione:** merge dei due User, quale email è canonica, riuso del CF dopo ritiro / rimozione rosa / chiusura (`DELETED` tiene il CF). L’anonimizzazione azzera già il CF (unique libero). Non è self-service.
- **Impatto:** nessuna unione account in v1; unique DB come rete di sicurezza.

---

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

## Decisioni autonome chiuse in M8–M12 (2026-09-20)

| ID | Decisione |
|---|---|
| M8-D1 | Invito rappresentante = `StaffInvite` hashato; redeem senza `Registration` |
| M8-D2 | `/admin/informative` sola lettura; CMS resta `content/legal/` (OD-038) |
| M8-D3 | Status iscrizione resta proiezione del motore; niente bottone admin “approva iscrizione” |
| M9-D1 | Reinvio = revoca pending + nuovo token (M1-D2); plaintext una volta |
| M9-D2 | CSV max 50 righe `email,firstName,lastName`; CF mai |
| M9-D3 | Cookie `eph-team` per selettore squadra; ogni action riautorizza `teamId` |
| M10-D1 | Vista compagni: nome, maglia, ruolo; niente stato medico |
| M10-D2 | Ritiro `WITHDRAWN` senza cancellazione dati |
| M10-D3 | Reset password: messaggio generico, token monouso su `VerificationToken` |
| M10-D4 | Fuori finestra edizione: no nuovi inviti/wizard/checkout; redeem già emesso fino a TTL |
| M11-D1 | Stripe webhook fonte di verità; stub confirm solo se `PAYMENT_DRIVER=stub` |
| M11-D2 | File medici: HMAC interno anche con R2 |
| M11-D3 | Rate limit su tabella `RateLimitHit` |
| M12-D1 | CSP nonce sul bootstrap tema; Playwright in CI |
