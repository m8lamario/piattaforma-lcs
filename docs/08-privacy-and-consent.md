# 08 — Privacy and Consent Architecture

**Questo file non è una privacy policy.** Non ha valore legale. I testi visibili all’utente sono placeholder da sostituire con documenti ufficiali dell’organizzazione / del professionista competente.

## 1. Titolare e contatti (placeholder)

- Titolare del trattamento: `[INSERIRE TITOLARE DEL TRATTAMENTO]`
- DPO / contatto privacy: `[INSERIRE DPO / CONTATTO PRIVACY SE PRESENTE]`
- Base giuridica per ciascuna finalità: `[INSERIRE BASI GIURIDICHE]`
- Periodo di conservazione: `[INSERIRE RETENTION]`
- Diritti dell’interessato: `[INSERIRE DIRITTI E MODALITÀ]`

## 2. Finalità (placeholder, da validare)

`[INSERIRE FINALITÀ DEL TRATTAMENTO]` — bozza operativa **non ufficiale**:

- gestione iscrizione e partecipazione;
- verifica idoneità documentale (certificato) da parte dell’organizzazione;
- comunicazioni di servizio sull’iscrizione;
- adempimenti amministrativi/pagamento;
- eventuale uso foto/video/social **solo** se consenso specifico separato.

## 3. Documenti legali nel sistema

Ogni informativa è un `LegalDocument` con versioni.

| slug (proposto) | Scopo | Required default | Audience |
|---|---|---|---|
| `privacy-policy` | Informativa trattamento | sì | ALL |
| `document-processing` | Informative documenti caricati | sì | ALL |
| `minor-privacy` | Informative specifiche minori | sì se minore | MINOR / GUARDIAN |
| `media-release` | Foto, video, social | configurabile per edizione | ALL |
| `terms` | Eventuali condizioni iscrizione | OPEN | ALL |

Nuove informative si aggiungono come record, non come colonne User.

## 4. Registrazione dell’accettazione

`ConsentRecord` memorizza almeno:

- userId
- legalDocumentVersionId (quindi documento + versione)
- datetime
- consentType (REQUIRED | OPTIONAL)
- accepted
- ipAddress, userAgent (traccia tecnica; se il legale vieta IP, si disattiva via config)
- registrationId se nel flusso iscrizione

**Vietato** usare solo `privacyAccepted = true`.

Se l’informativa viene aggiornata (nuova versione current), le acceptance vecchie restano storiche. Se l’edizione richiede la versione nuova, il checklist torna incompleto (policy di re-consent: OPEN_DECISIONS).

## 5. UI privacy

- Pagine pubbliche `/privacy` con placeholder ben visibili.
- Nel wizard: step dedicato, testo scrollabile, checkbox con label chiara.
- Link alla versione esatta accettata dall’area consensi.

Copy UI non deve dire “è legalmente valido”: deve dire che l’utente ha preso visione della versione X in data Y.

## 6. Liberatorie foto / video / social

Sezione **prominente**, step proprio.

L’utente deve capire (campi configurabili, testi placeholder):

- cosa sta accettando: `[INSERIRE OGGETTO LIBERATORIA]`
- finalità: `[INSERIRE FINALITÀ MEDIA]`
- chi può usare il materiale: `[INSERIRE SOGGETTI AUTORIZZATI]`
- canali: `[INSERIRE CANALI: SITO, SOCIAL, STAMPA, …]`
- durata: `[INSERIRE DURATA]`
- altre condizioni: `[INSERIRE CONDIZIONI]`

Se l’edizione marca `MEDIA_RELEASE` come `required=false`, si può completare l’iscrizione **senza** accettare. Nessun pre-check, nessun “accetta tutto”.

Si possono avere più consensi media granulari in futuro (foto vs social) come documenti distinti.

## 7. Minori

- Dati guardian trattati come dati personali.
- Informative `minor-privacy` placeholder: `[INSERIRE INFORMATIVA MINORI]`
- Non si implementa un “parental gate” legale finché OPEN_DECISIONS non lo richiede; si traccia chi ha cliccato (l’account minore).
- `[INSERIRE REQUISITO CONSENSO GENITORE SE PREVISTO DALLA LEGGE / DAL LEGALE]`

## 8. Certificati (categorie particolari)

I certificati medici sono dati sanitari. Accesso minimo, audit, storage privato. Informative documenti: `[INSERIRE INFORMATIVA DOCUMENTI CARICATI]`.

## 9. Diritti e cancellazione

Flusso esercizio diritti: OPEN_DECISIONS (processo organizzativo + eventuale tool admin). Non si cancella un audit log solo perché l’utente lo chiede dalla UI, finché il legale non definisce retention vs diritti.

## 10. Sostituzione testi

I body delle versioni possono essere Markdown in DB o file versionati in `content/legal/` in M0. Foundation usa file placeholder in `content/legal/` + seed Prisma allineato, così sostituire i testi non richiede un deploy di componenti React.
