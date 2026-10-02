# 08 — Privacy and Consent Architecture

**Questo file non è una privacy policy.** Non ha valore legale. I testi visibili all’utente in `content/legal/` derivano dai moduli LCS 2026-27 (1.0 del 1 ottobre 2026), adattati al modello account-del-giocatore e alla copia del certificato. Restano `[INSERIRE …]` su titolare, sede, P.IVA, email, partner, base giuridica della copia, regolamento di torneo. Non si afferma che il prodotto o i testi siano «conformi» né firmati.

Fonte dei testi utente: `content/legal/{slug}.md`, versionati come `LegalDocument` / `LegalDocumentVersion` (seed e `ensureLegalDocuments`). Catalogo unico: `src/features/consents/domain/catalog.ts`.

---

## 1. Titolare e contatti (da compilare nei testi)

I campi vivono nei markdown, non nel codice:

- Titolare: `[INSERIRE NOME TITOLARE DEL TRATTAMENTO]`
- Email privacy: `[INSERIRE EMAIL PRIVACY]`
- DPO: `[INSERIRE DPO / CONTATTO PRIVACY SE PRESENTE]`
- Testo informativa: `[INSERIRE TESTO INFORMATIVA]`
- Retention: `[INSERIRE PERIODO DI CONSERVAZIONE]`
- Basi giuridiche: `[INSERIRE BASI GIURIDICHE]`
- Diritti: `[INSERIRE DIRITTI E MODALITÀ]`

OD-001 resta aperto finché i testi non sono firmati. La **struttura** delle sezioni è già nei file: si riempiono i placeholder senza cambiare architettura.

---

## 2. Inventario documenti

| slug | File | Titolo UI | Audience | Wizard | Pagina pubblica | Required default |
|---|---|---|---|---|---|---|
| `privacy-policy` | `content/legal/privacy-policy.md` | Informativa privacy | ALL | passo **privacy** (sempre) | `/privacy` | sì |
| `document-processing` | `content/legal/document-processing.md` | Informativa documenti caricati | ALL | passo **privacy** (sempre) | `/privacy/documenti` | sì |
| `minor-privacy` | `content/legal/minor-privacy.md` | Informativa per minori | MINOR | passo **privacy** **solo se** `isMinor` | `/privacy/minori` | sì (per i minori) |
| `media-release` | `content/legal/media-release.md` | Liberatoria foto, video e social | ALL | passo **liberatorie** (caselle uso per uso) | `/liberatorie` | presa visione del testo; gli usi restano facoltativi |
| `terms` | `content/legal/terms.md` | Condizioni di iscrizione e uso | ALL | passo **privacy** (casella T1) | `/termini` | sì |
| `cookie-policy` | `content/legal/cookie-policy.md` | Informativa cookie e tracciamenti | ALL | **non** nel wizard (OD-027) | `/cookie` | no |

Nuove informative: aggiungere riga in `LEGAL_CATALOG` + file markdown + (se serve) `publicPath`. Se deve comparire nel wizard, impostare `wizardStep: "privacy" | "liberatorie"`; altrimenti `null`. Non aggiungere colonne su `User`.

Le **caselle** (T1, M1–M11, G2–G14, C1) non sono slug di documento: vivono in `ConsentChoice` (append-only) con il codice del file 08. Catalogo: `src/features/consents/domain/boxes.ts`. Elenco partner: `content/legal/partners.json` (vuoto = casella partner nascosta).

---

## 3. Mapping ai flussi prodotto

### 3.1 Wizard — passo privacy (`/area/registrazione/privacy`)

Pacchetto `privacySlugsFor(isMinor)`:

- maggiorenne: `privacy-policy` + `document-processing` + `terms`
- minorenne: quelli + `minor-privacy`

Ogni documento: testo scrollabile, versione, avviso placeholder, checkbox **non** preselezionata. Tutte devono essere confermate. `ConsentRecord` in append su `legalDocumentVersionId` corrente (`consentType=REQUIRED`, `accepted=true`). Versione non `isCurrent` rifiutata.

Caselle dello stesso passo (mai pre-spuntate): T1 (da `terms`), M1 se adulto, M3/G4 salute, marketing, partner (se elenco nominativo), opt-out edizioni successive, G5 cognome completo se minore. M2/G2 si registrano dalla presa visione dei documenti. G1 non è una casella del giocatore (OD-046).

### 3.2 Wizard — passo liberatorie (`/area/registrazione/liberatorie`)

`media-release` da leggere, poi una casella per uso: canali, promozione, sponsor, stampa, interviste (M7–M11 o G9–G13). Per i minori dai 14 anni, G14 in fondo: senza, gli usi e G5 restano inattivi. Completare il passo = registrare le caselle, anche tutte vuote. Gli usi non bloccano mai l’iscrizione.

### 3.3 Certificato (`/area/registrazione/certificato`)

Upload del file (il hub conserva la copia per la revisione). L’informativa documenti resta nel pacchetto privacy. La casella salute M3/G4 è nel passo privacy. Avviso operativo: i moduli 2026-27 chiedevano solo presentazione e scadenza; finché il legale non riscrive, la copy dice che esiste una copia in piattaforma. Il rappresentante in `/squadra` vede solo lo **stato**, mai il file.

### 3.4 Pagine pubbliche

Stesso CSS di `/privacy` (`page.module.css`). Privacy, liberatorie, termini e cookie restano nel footer pubblico.

Le pagine pubbliche (`/privacy`, `/termini`, …) leggono il **file** corrente. Il permalink storico `/documenti-legali/{slug}/{version}` legge il `body` di `LegalDocumentVersion` in DB (404 se assente). L’email di ricevuta usa solo quel permalink, senza allegati. Il wizard, via `ensureLegalDocuments`, allinea il body in DB e, se il file è cambiato, crea una **nuova** versione (`placeholder-{timestamp}`): non sovrascrive il body di una versione già accettata.

### 3.5 Area consensi / admin informative

`/admin/informative` è sola lettura delle versioni `isCurrent` (OD-038: niente CMS). `/area/consensi` elenca le caselle, consente la revoca delle facoltative, export JSON/testo e una richiesta di cancellazione (audit). I record restano interrogabili da `ConsentRecord` + `ConsentChoice`.

---

## 4. Cosa la piattaforma tratta (inventario operativo)

Non è un elenco legale chiuso. Serve al compilatore dei testi. Dettaglio nelle sezioni dei markdown.

| Area | Dati | Note di accesso |
|---|---|---|
| Account | email, password hash, emailVerified, name, ruoli, sessione Auth.js | login |
| Anagrafica | nome, cognome, data di nascita, CF, telefono, metadata JSON | solo il giocatore (e staff) |
| Tutore | nome, cognome, rapporto, email, telefono | obbligatorio se minore; il rep **non** vede i dettagli |
| Invito | email, nome/cognome opzionali, hash token, scadenza | creatore + staff; CF **non** precompilato dal rep |
| Iscrizione | squadra, edizione, stato checklist | rep: stato, non dossier |
| Certificato | file privato + metadati + review (motivo rifiuto) | file: giocatore e staff + audit; rep: **stato only** |
| Consensi | versione, accepted, timestamp, IP/UA | staff può consultare versione/data, non serve il body in rosa |
| Pagamenti | importo, stato, id provider, pagatore; **niente carta** | stub; provider live = OD-006 |
| Comunicazioni | notifica in-app; email Resend/stub con `template=type`, `title`, URL | niente CF né motivo sanitario; ricevuta consensi con link alle versioni |
| Audit / log | azione, entità, metadati redatti, IP/UA | CF/token/password/storageKey redatti nei log |
| Squadra / scuola | nome squadra, logo key, istituto, maglia/ruolo | compagni: nome e maglia, non PII extra |
| Tema UI | `prefers-color-scheme`, nessun cookie | visitatori inclusi |
| Media | **nessun album in DB**; solo la decisione di liberatoria | usi esterni da descrivere nel testo ufficiale |

Categorie particolari (sanitarie): file certificato e possibile contenuto del PDF/immagine. Trattamento descritto in `document-processing.md` con placeholder sulla base giuridica. Casella esplicita M3/G4 nel passo privacy: necessaria per giocare, distinta dalla presa visione.

---

## 5. Fornitori tecnici (processor / sub-processor)

Tutti via adapter. Finché restano stub, **non** lanciare verso utenti reali.

| Funzione | Oggi | Decisione |
|---|---|---|
| App host | non deciso | OD-012 |
| PostgreSQL | `DATABASE_URL` | OD-012 |
| Auth | Auth.js (credenziali) nell’app | OD-023 per SPID/OAuth |
| Storage file | stub in prod; `local` fuori prod | OD-010 |
| Email | stub | OD-011 |
| Pagamenti | stub | OD-006 |
| Monitoring | stub | OD-013 |
| Antivirus | stub ok | OD-021 |

L’elenco nominativo va in `privacy-policy.md` sezione responsabili **prima** di ogni go-live di un adapter.

---

## 6. Registrazione dell’accettazione

`ConsentRecord` memorizza: userId, legalDocumentVersionId, datetime, consentType, accepted, ipAddress, userAgent, registrationId, guardianId (sempre null in v1).

**Vietato** usare solo `privacyAccepted = true`. Le caselle granulari stanno in `ConsentChoice` (una riga per evento, mai sovrascritta).

Re-consent: OD-024. IP/UA retention: OD-022.

Copy UI: presa visione della versione X in data Y. Vietato dire che il click è legalmente valido.

Quando il pacchetto wizard è completo (privacy dell’audience + decisione sulla liberatoria), parte una notifica `REGISTRATION_RECEIVED` con email di ricevuta: elenco slug/versioni e link a `/documenti-legali/{slug}/{version}`. Idempotente su `Notification.metadata.fingerprint` + `registrationId`. Una nuova versione accettata cambia l’impronta e genera una nuova ricevuta.

La prima transizione della registration a `APPROVED` invia `REGISTRATION_APPROVED` (link ad `/area`, senza ripetere l’elenco versioni). Certificato approvato/da aggiornare riusa le notifiche esistenti, con link all’area e senza motivo sanitario nel canale email. Audit `CONSENT_ACCEPT` / `CONSENT_REFUSE` include `slug`, `versionId` e l’etichetta `version`.

---

## 7. Liberatorie foto / video / social

Sezione prominente, passo proprio, testo strutturato in `media-release.md`. Tutti i contenuti sostanziali del documento restano `[INSERIRE …]`. Le caselle uso-per-uso sono nel form (codici M7–M11 / G9–G13). Nessun pre-check, nessun «accetta tutto».

Il flag **pubblicabile** è calcolato: per i maggiorenni vale l’uso «canali del torneo»; per i minorenni servono anche C1 (o unico esercente) e, dai 14 anni, G14. Gli altri usi sono sotto-flag. Il hub non pubblica album: il flag serve a rosa, admin e a chi pubblica fuori da questo repository.

---

## 8. Minori

- Dati tutore = dati personali del tutore (sezione in `minor-privacy.md` e in `privacy-policy.md`).
- Account del minore; tutore = contatto collegato (constitution §2.9, OD-046).
- Passo tutore: contatto 1 + G3 (altro genitore con email, oppure dichiarazione di unico esercente). Se G3 = altro genitore, email C1 al secondo contatto (`guardianId` sul token e sulla conferma).
- G14: il minore dai 14 anni spunta l’accordo sulle immagini. Sotto i 14 anni G14 non è richiesta per attivare gli usi dopo C1/unico.
- `[INSERIRE REQUISITO CONSENSO GENITORE SE PREVISTO DALLA LEGGE / DAL LEGALE]` — OD-002 resta aperto.
- Email del minore come login: OD-003.

---

## 9. Certificati

Informative in `document-processing.md`: finalità, accesso staff vs stato-only del rep, retention, review, sostituzione senza delete del blob, sicurezza, placeholder su base giuridica del dato sanitario (OD-035, OD-030, OD-005).

---

## 10. Diritti e cancellazione

Sezioni 14–15 di `privacy-policy.md`. Processo organizzativo: OD-029 (resta aperto: niente cancellazione “totale” da UI).

`/area/consensi` offre export JSON/testo e revoca delle caselle facoltative. La richiesta di cancellazione scrive un audit: non sostituisce il processo della segreteria.

Tool admin (non è l’esercizio del diritto dell’interessato, è un attrezzo di piattaforma):

- Rappresentante: solo **rimozione dalla propria rosa**. L’account del giocatore resta.
- Super Admin: **chiusura account** (niente login) e **anonimizzazione** (PII tolta, tracce operative e audit restano).
- File medici: **non** si purgano in automatico (OD-030). Accesso resta HMAC + staff; il giocatore chiuso non accede.
- Audit: **nessuna** cancellazione da UI, neanche per Super Admin. Nessun payload sanitario nei metadata.

Workaround canale: `[INSERIRE EMAIL PRIVACY]`.

---

## 11. Cookie

`cookie-policy.md` elenca i cookie/storage **effettivi** (sessione/CSRF Auth.js) e lascia vuoti analytics/pixel. Banner: OD-027. Non è un `ConsentRecord`. Il tema UI segue `prefers-color-scheme` e non imposta cookie.

---

## 12. Sostituzione testi

1. Avvocato/organizzazione compilano i `[INSERIRE …]` (o sostituiscono l’intero body sotto il banner di placeholder).
2. Si toglie o si riduce l’avviso UI solo quando i testi sono ufficiali (decisione org; oggi `it.legalPlaceholderNotice` resta).
3. Deploy / runtime: `ensureLegalDocuments` crea nuova versione se il body file ≠ body `isCurrent`.
4. Non modificare componenti React per un cambio di testo.

Seed: se manca la versione corrente, crea `placeholder-1`. Non riscrive una current già esistente (evita di mutare il testo già accettato). In sviluppo, dopo un reset DB, `placeholder-1` contiene i file aggiornati.

---

## 13. Cosa blocca un lancio reale

Vedi OD-001 (testi firmati) e OD-026–OD-046: titolare/DPO, cookie, testo ufficiale di `terms`, diritti, retention certificati, rimozione media già pubblicati, email al tutore, contitolarità, fornitori/DPA, base giuridica sanitaria della **copia** del certificato, elenco partner, validità del click del minore (OD-002), re-consent (OD-024), informativa staff. Senza testi firmati il prodotto resta in sviluppo con placeholder visibili; **non** è pubblicabile verso interessati reali.
