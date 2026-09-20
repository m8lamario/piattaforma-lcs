# 08 — Privacy and Consent Architecture

**Questo file non è una privacy policy.** Non ha valore legale. I testi visibili all’utente sono placeholder da sostituire con documenti ufficiali dell’organizzazione e del professionista competente. Non si afferma che il prodotto o i testi siano «conformi».

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
| `media-release` | `content/legal/media-release.md` | Liberatoria foto, video e social | ALL | passo **liberatorie** (decisione esplicita) | `/liberatorie` | no (seed edizione `required=false`) |
| `terms` | `content/legal/terms.md` | Condizioni di iscrizione e uso | ALL | **non** nel wizard (OD-026) | `/termini` | no |
| `cookie-policy` | `content/legal/cookie-policy.md` | Informativa cookie e tracciamenti | ALL | **non** nel wizard (OD-027) | `/cookie` | no |

Nuove informative: aggiungere riga in `LEGAL_CATALOG` + file markdown + (se serve) `publicPath`. Se deve comparire nel wizard, impostare `wizardStep: "privacy" | "liberatorie"`; altrimenti `null`. Non aggiungere colonne su `User`.

`terms` e `cookie-policy` sono versionati in DB come gli altri, così un futuro checkbox non richiede un nuovo modello. Oggi **non** si registra acceptance su di essi: non si finge il consenso.

---

## 3. Mapping ai flussi prodotto

### 3.1 Wizard — passo privacy (`/area/registrazione/privacy`)

Pacchetto `privacySlugsFor(isMinor)`:

- maggiorenne: `privacy-policy` + `document-processing`
- minorenne: quelli + `minor-privacy`

Ogni documento: testo scrollabile, versione, avviso placeholder, checkbox **non** preselezionata. Tutte devono essere confermate. `ConsentRecord` in append su `legalDocumentVersionId` corrente (`consentType=REQUIRED`, `accepted=true`). `guardianId` resta `null` (non si finge firma del genitore). Versione non `isCurrent` rifiutata.

### 3.2 Wizard — passo liberatorie (`/area/registrazione/liberatorie`)

Solo `media-release`. Bottoni Accetto / Non accetto (il rifiuto è nascosto se l’edizione marca il requisito obbligatorio). Record `OPTIONAL` o `REQUIRED` a seconda dell’edizione. Rifiuto esplicito completa il requisito se `required=false`.

### 3.3 Certificato (`/area/registrazione/certificato`)

Nessun testo legale extra nel passo upload. L’informativa documenti è nel pacchetto privacy. Il rappresentante in `/squadra` vede solo lo **stato**, mai il file.

### 3.4 Pagine pubbliche

Stesso CSS di `/privacy` (`page.module.css`). Ogni pagina mostra body markdown + indice link agli altri slug. Header pubblico continua a puntare a `/privacy` (nessun restyle della shell).

Le pagine pubbliche leggono il **file**. Il wizard, via `ensureLegalDocuments`, allinea il body in DB e, se il file è cambiato, crea una **nuova** versione (`placeholder-{timestamp}`): non sovrascrive il body di una versione già accettata.

### 3.5 Area consensi / admin informative

`/admin/informative` è sola lettura delle versioni `isCurrent` (OD-038: niente CMS). `/area/consensi` non è una route v1: i consensi si gestiscono nel wizard. I record restano interrogabili da `ConsentRecord` + versione.

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
| Comunicazioni | notifica in-app; email stub con `template=type` e `title` | niente motivo sanitario in email |
| Audit / log | azione, entità, metadati redatti, IP/UA | CF/token/password/storageKey redatti nei log |
| Squadra / scuola | nome squadra, logo key, istituto, maglia/ruolo | compagni: nome e maglia, non PII extra |
| Tema UI | cookie `eph-theme` + localStorage | visitatori inclusi |
| Media | **nessun album in DB**; solo la decisione di liberatoria | usi esterni da descrivere nel testo ufficiale |

Categorie particolari (sanitarie): file certificato e possibile contenuto del PDF/immagine. Trattamento descritto in `document-processing.md` con placeholder sulla base giuridica.

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

**Vietato** usare solo `privacyAccepted = true`.

Re-consent: OD-024. IP/UA retention: OD-022.

Copy UI: presa visione della versione X in data Y. Vietato dire che il click è legalmente valido.

---

## 7. Liberatorie foto / video / social

Sezione prominente, passo proprio, testo strutturato in `media-release.md` (acquisizione, finalità, canali, durata, revoca, soggetti, minori, social come titolari autonomi). Tutti i contenuti sostanziali sono `[INSERIRE …]`.

Se `MEDIA_RELEASE` è `required=false`, iscrizione completabile senza accettare. Nessun pre-check, nessun «accetta tutto». Consensi granulari futuri (foto vs social): nuovi slug nel catalogo, stesso modello.

---

## 8. Minori

- Dati tutore = dati personali del tutore (sezione in `minor-privacy.md` e in `privacy-policy.md`).
- Account del minore; tutore = contatto collegato (constitution §2.9).
- Nessun parental gate legale finché OD-002 / OD-040 non lo richiedono.
- `[INSERIRE REQUISITO CONSENSO GENITORE SE PREVISTO DALLA LEGGE / DAL LEGALE]`
- Email del minore come login: OD-003.

---

## 9. Certificati

Informative in `document-processing.md`: finalità, accesso staff vs stato-only del rep, retention, review, sostituzione senza delete del blob, sicurezza, placeholder su base giuridica del dato sanitario (OD-035, OD-030, OD-005).

---

## 10. Diritti e cancellazione

Sezioni 14–15 di `privacy-policy.md`. Processo organizzativo: OD-029. Nessuna cancellazione audit da UI utente.

---

## 11. Cookie

`cookie-policy.md` elenca i cookie/storage **effettivi** (`eph-theme`, sessione/CSRF Auth.js) e lascia vuoti analytics/pixel. Banner: OD-027. Non è un `ConsentRecord`.

---

## 12. Sostituzione testi

1. Avvocato/organizzazione compilano i `[INSERIRE …]` (o sostituiscono l’intero body sotto il banner di placeholder).
2. Si toglie o si riduce l’avviso UI solo quando i testi sono ufficiali (decisione org; oggi `it.legalPlaceholderNotice` resta).
3. Deploy / runtime: `ensureLegalDocuments` crea nuova versione se il body file ≠ body `isCurrent`.
4. Non modificare componenti React per un cambio di testo.

Seed: se manca la versione corrente, crea `placeholder-1`. Non riscrive una current già esistente (evita di mutare il testo già accettato). In sviluppo, dopo un reset DB, `placeholder-1` contiene i file aggiornati.

---

## 13. Cosa blocca un lancio reale

Vedi OD-001 (testi firmati) e OD-026–OD-043: titolare/DPO, cookie, `terms` nel wizard, diritti, retention certificati, revoca media, email al tutore, contitolarità, fornitori/DPA, base giuridica sanitaria, marketing, obbligatorietà liberatoria, pubblicazione versioni, canali media, chi esercita i diritti del minore, informativa staff, media in-app. Più le decisioni già aperte su storage, pagamenti, validità del click del minore (OD-002), re-consent (OD-024). Senza quelli il prodotto resta in sviluppo con placeholder visibili; **non** è pubblicabile verso interessati reali.
