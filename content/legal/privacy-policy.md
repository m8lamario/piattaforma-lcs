# Informativa sul trattamento dei dati personali

**Questo testo è un placeholder di piattaforma. Non è un’informativa legale valida. Non è un parere giuridico. Non dichiara conformità a norme.**

**[INSERIRE PRIVACY POLICY UFFICIALE]**

**[INSERIRE TESTO INFORMATIVA]**

**[INSERIRE DATA DI ENTRATA IN VIGORE DELLA VERSIONE UFFICIALE]**

**[INSERIRE NUMERO / CODICE VERSIONE UFFICIALE]**

---

## 1. Premessa e natura del documento

- Natura: **[INSERIRE NATURA DEL DOCUMENTO: INFORMATIVA EX ARTT. 13/14 O ALTRA QUALIFICAZIONE SCELTA DAL LEGALE]**
- Lingua ufficiale: **[INSERIRE LINGUA / TRADUZIONI]**
- Ambito: piattaforma di registrazione giocatori denominata internamente «ESL Player Hub»; nome pubblico: **[INSERIRE NOME PUBBLICO PRODOTTO]**
- Relazione con altri documenti: informative documenti caricati, minori, cookie, condizioni di iscrizione, liberatoria media. **[INSERIRE GERARCHIA TRA DOCUMENTI]**

Nota di piattaforma (non ha valore legale): l’utente in iscrizione conferma di aver preso visione della *versione* mostrata (identificata nel database). La UI non afferma che il click abbia valore legale.

---

## 2. Titolare del trattamento

- Denominazione: **[INSERIRE NOME TITOLARE DEL TRATTAMENTO]**
- Forma giuridica: **[INSERIRE FORMA GIURIDICA]**
- Sede legale: **[INSERIRE SEDE LEGALE]**
- C.F. / P.IVA: **[INSERIRE CODICE FISCALE / PARTITA IVA TITOLARE]**
- Recapito PEC: **[INSERIRE PEC TITOLARE]**
- Recapito ordinario: **[INSERIRE INDIRIZZO POSTALE TITOLARE]**

Eventuale contitolarità (es. ESL/LCS nazionale e organizzatore di coppa locale):

- Soggetti: **[INSERIRE EVENTUALI CONTITOLARI]**
- Accordo di contitolarità: **[INSERIRE SINTESI ACCORDO O RINVIO]**
- Chi risponde all’interessato: **[INSERIRE PUNTO DI CONTATTO UNICO O RIPARTIZIONE]**

---

## 3. Responsabile della protezione dei dati (DPO) e contatti privacy

- DPO nominato: **[INSERIRE SÌ / NO / DA DECIDERE]**
- Nome DPO: **[INSERIRE NOME DPO SE PRESENTE]**
- Email DPO: **[INSERIRE EMAIL DPO]**
- Contatto privacy operativo: **[INSERIRE EMAIL PRIVACY]**
- Telefono privacy: **[INSERIRE TELEFONO PRIVACY SE PREVISTO]**
- Modulo / canale per l’esercizio dei diritti: **[INSERIRE CANALE ESERCIZIO DIRITTI]**
- Orari / SLA di risposta: **[INSERIRE TEMPI DI RISPOSTA]**

---

## 4. Categorie di interessati

**[INSERIRE ELENCO UFFICIALE INTERESSATI]**

Elenco operativo della piattaforma (da validare):

1. Giocatori maggiorenni con account proprio.
2. Giocatori minorenni con account proprio (il genitore/tutore non è titolare del login).
3. Genitori / tutori / affidatari come *contatto collegato* al profilo del minore.
4. Rappresentanti di squadra.
5. Amministratori di organizzazione e super amministratori.
6. Referenti di squadra indicati come contatto (nome/email) anche se non hanno account.
7. Visitatori delle pagine pubbliche (cookie tecnici di tema; eventuale sessione se accedono).

**[INSERIRE SE CI SONO ALTRE CATEGORIE: FOTOGRAFI, VOLONTARI, MEDICI SOCIALI, ECC.]**

---

## 5. Categorie di dati trattati

**[INSERIRE CATEGORIE DI DATI UFFICIALI]**

Mappatura operativa (campi oggi previsti dal prodotto; non è un elenco legale chiuso):

### 5.1 Account e autenticazione

- Email, hash della password, data verifica email, nome visualizzato, eventuale immagine profilo (campo schema, non usato in v1 come upload).
- Dati di sessione (cookie Auth.js / JWT).
- Token di verifica e reset secondo il provider di autenticazione.
- Ruoli e ambiti (squadra, competizione).

### 5.2 Anagrafica giocatore

- Nome, cognome, data di nascita, codice fiscale, telefono.
- Campo `metadata` JSON per estensioni future: **[INSERIRE SE E QUANDO POTRÀ CONTENERE ULTERIORI DATI]**

### 5.3 Genitore / tutore (se minore)

- Nome, cognome, rapporto (`GENITORE` / `TUTORE` / `AFFIDATARIO` / `ALTRO`), email, telefono.
- **[INSERIRE SE SERVONO DOCUMENTI DI IDENTITÀ O PROVE DI POTESTÀ — OGGI NON RACCOLTI]**

### 5.4 Iscrizione, squadra, istituto

- Squadra, edizione, competizione, istituto scolastico (nome, città), stato iscrizione, numero maglia / ruolo in rosa se compilati.
- Invito: email destinatario, nome/cognome opzionali precompilati dal rappresentante, stato invito, scadenza. Il token in chiaro non è conservato: in archivio resta l’hash.

### 5.5 Documenti caricati (categorie particolari se sanitari)

- Certificato medico agonistico (file + metadati). Dettaglio: documento `document-processing`.
- Motivo di rifiuto della revisione (testo inserito dallo staff).

### 5.6 Consensi

- Documento legale, versione, data/ora, accettato/rifiutato, tipo required/optional, collegamento all’iscrizione.
- Traccia tecnica: indirizzo IP, user agent. **[INSERIRE SE CONSERVARE IP/USER AGENT — VEDI ANCHE OD-022]**
- Campo `guardianId` previsto ma **non usato in v1** come firma del genitore.

### 5.7 Pagamenti

- Importo, valuta, stato, identificativi del provider, sessione di checkout, eventuale URL ricevuta, chi ha pagato (giocatore o rappresentante).
- **Non** sono raccolti PAN, CVV o altri dati carta sul sito. **[INSERIRE COSA TRATTA IL PROVIDER DI PAGAMENTO SCELTO]**

### 5.8 Comunicazioni

- Notifiche in-app: tipo, titolo, corpo. Le email (quando il provider sarà scelto) usano template e, in v1, variabili limitate (es. titolo), senza motivo medico nel canale email.

### 5.9 Log, audit, sicurezza

- Azioni di audit (es. visualizzazione documento, consensi, inviti, pagamenti): attore, tipo entità, identificativo, metadati redatti, IP e user agent. **[INSERIRE RETENTION AUDIT]**
- Log applicativi con redazione di password, token, codice fiscale, storage key, cookie.

### 5.10 Contenuti media

- La piattaforma v1 **non** ospita un archivio foto/video del giocatore. La liberatoria riguarda usi *fuori* dal database (eventi, social, sito). Dettaglio: documento `media-release`.
- Logo squadra: eventuale storage key. **[INSERIRE SE IL LOGO PUÒ RITRARRE PERSONE]**

### 5.11 Dati non trattati oggi (riservati a decisioni future)

- **[INSERIRE: SPID/CIE, OAUTH, PROFILAZIONE, GEOLOCALIZZAZIONE, MICROFONO/CAMERA IN-APP, ANALYTICS]** — in v1 non risultano attivi.

---

## 6. Fonte dei dati

**[INSERIRE FONTI UFFICIALI]**

Operativo:

- Interessato (form wizard, upload, consensi, pagamento).
- Rappresentante di squadra (invito: email e nome/cognome opzionali; **non** il codice fiscale).
- Staff organizzazione (revisione documenti, ruoli, configurazione edizioni).
- Provider tecnici (esito pagamento, eventualmente email bounce): **[INSERIRE QUANDO LIVE]**
- **[INSERIRE SE ESISTONO FONTI ULTERIORI: FEDERAZIONE, SCUOLA, GESTIONALI ESTERNI]**

---

## 7. Finalità e basi giuridiche

**[INSERIRE FINALITÀ DEL TRATTAMENTO]**

**[INSERIRE BASI GIURIDICHE]**

Tabella da compilare (una riga per finalità). Le «note di piattaforma» non sono basi giuridiche.

| ID | Finalità (da redigere) | Dati coinvolti (operativo) | Base giuridica | Natura (obbligo / facoltativo) | Conservazione |
|----|------------------------|----------------------------|----------------|----------------------------------|---------------|
| F1 | **[INSERIRE: CREAZIONE ACCOUNT E AUTENTICAZIONE]** | email, password hash, sessione | **[INSERIRE BASE GIURIDICA F1]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F1]** |
| F2 | **[INSERIRE: GESTIONE ISCRIZIONE E PARTECIPAZIONE]** | anagrafica, squadra, edizione, checklist | **[INSERIRE BASE GIURIDICA F2]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F2]** |
| F3 | **[INSERIRE: CONTATTO GENITORE/TUTORE PER MINORE]** | dati Guardian | **[INSERIRE BASE GIURIDICA F3]** | obbligatorio in prodotto se minore; **[INSERIRE QUALIFICAZIONE LEGALE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F3]** |
| F4 | **[INSERIRE: IDONEITÀ DOCUMENTALE / CERTIFICATO MEDICO]** | file e metadati sanitari | **[INSERIRE BASE GIURIDICA F4 — DATO PARTICOLARE]** | richiesto dal prodotto se l’edizione lo marca; **[INSERIRE OBBLIGO SPORTIVO]** | **[INSERIRE PERIODO DI CONSERVAZIONE F4]** |
| F5 | **[INSERIRE: REVISIONE ORGANIZZATIVA E AUDIT ACCESSI SANITARI]** | DocumentReview, AuditLog | **[INSERIRE BASE GIURIDICA F5]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F5]** |
| F6 | **[INSERIRE: ADEMPIMENTI AMMINISTRATIVI E QUOTA DI ISCRIZIONE]** | Payment senza dati carta | **[INSERIRE BASE GIURIDICA F6]** | dipende da `paymentMode` edizione | **[INSERIRE PERIODO DI CONSERVAZIONE F6]** |
| F7 | **[INSERIRE: COMUNICAZIONI DI SERVIZIO SULL’ISCRIZIONE]** | email, telefono, notifiche in-app | **[INSERIRE BASE GIURIDICA F7]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F7]** |
| F8 | **[INSERIRE: COMUNICAZIONI NON DI SERVIZIO / PROMOZIONALI]** | **[INSERIRE DATI]** | **[INSERIRE BASE GIURIDICA F8 — O «NON SVOLTE»]** | in v1 **non** c’è un consenso marketing distinto | **[INSERIRE PERIODO DI CONSERVAZIONE F8]** |
| F9 | **[INSERIRE: FOTO, VIDEO, SOCIAL]** | non in DB; liberatoria separata | **[INSERIRE BASE GIURIDICA F9]** | in seed edizione: **non** obbligatoria (`required=false`) | vedi `media-release` |
| F10 | **[INSERIRE: SICUREZZA, PREVENZIONE ABUSI, LOG]** | IP, UA, audit | **[INSERIRE BASE GIURIDICA F10]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F10]** |
| F11 | **[INSERIRE: GESTIONE SQUADRA DA PARTE DEL RAPPRESENTANTE]** | nome, stato iscrizione, **stato** certificato | **[INSERIRE BASE GIURIDICA F11]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F11]** |
| F12 | **[INSERIRE: ADEMPIMENTI DI LEGGE / ASSICURATIVI / FEDERALI]** | **[INSERIRE]** | **[INSERIRE BASE GIURIDICA F12]** | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE F12]** |
| F13 | **[INSERIRE: COOKIE E PREFERENZA TEMA]** | cookie `eph-theme`, cookie di sessione | **[INSERIRE BASE GIURIDICA F13]** | vedi `cookie-policy` | **[INSERIRE PERIODO DI CONSERVAZIONE F13]** |

Profilazione e decisioni automatizzate che producano effetti giuridici: **[INSERIRE: NON EFFETTUATE / EFFETTUATE COME SEGUE]**. Operativo v1: lo stato iscrizione è una *proiezione di checklist* (documenti, consensi, pagamento), non un sistema di credit scoring.

---

## 8. Natura del conferimento e conseguenze del mancato conferimento

**[INSERIRE TESTO SU CONFERIMENTO OBBLIGATORIO / FACOLTATIVO]**

Operativo (non è una qualificazione legale):

- Senza invito valido non si crea l’account.
- Senza anagrafica, tutore (se minore), certificato (se richiesto), pacchetto privacy e pagamento (se dovuto) l’iscrizione non risulta completa.
- La liberatoria media, se l’edizione la marca `required=false`, può essere rifiutata esplicitamente senza bloccare l’iscrizione.
- I consensi non necessari non sono pre-selezionati e non esiste «accetta tutto».

---

## 9. Modalità del trattamento

**[INSERIRE MODALITÀ DEL TRATTAMENTO]**

Operativo:

- Trattamento elettronico su applicazione web e database relazionale.
- Accesso basato su ruoli, deny-by-default, lato server.
- File medici su storage privato, non in cartelle pubbliche; lettura tramite token a tempo e audit.
- Backup: **[INSERIRE POLITICA BACKUP E DOVE RISIEDONO]**
- Luogo dei server: **[INSERIRE REGIONE / PAESE DEL HOSTING E DEL DATABASE]**

---

## 10. Destinatari

**[INSERIRE DESTINATARI DEI DATI]**

Categorie da confermare:

| Categoria | Cosa può vedere (operativo) | **[INSERIRE BASE / CONTRATTO]** |
|-----------|-----------------------------|----------------------------------|
| Giocatore | propri dati, proprio file, propri consensi | — |
| Compagni di squadra | nome, cognome, eventuale maglia/ruolo | **[INSERIRE]** |
| Rappresentante di squadra | nome, cognome, stato iscrizione, **stato** certificato (mai il file), email degli inviti che ha creato; non CF, telefono, data di nascita, dettagli tutore, corpo consensi, storage key | **[INSERIRE]** |
| Organization Admin / Super Admin | gestione iscrizioni, file medici con audit, consensi (versione/timestamp), pagamenti senza carta | **[INSERIRE]** |
| Organizzatore di coppa locale | ruolo previsto in schema, UI non in v1 | **[INSERIRE SE E QUANDO]** |
| Istituto scolastico | **[INSERIRE SE LA SCUOLA RICEVE ELENCHI]** | **[INSERIRE]** |
| Federazione / ente sportivo | **[INSERIRE]** | **[INSERIRE]** |
| Assicurazione / medico sociale | **[INSERIRE]** | **[INSERIRE]** |
| Sponsor / media partner | **[INSERIRE — DI NORMA SOLO SE LIBERATORIA]** | **[INSERIRE]** |
| Autorità pubbliche | **[INSERIRE SE RICHIESTO PER LEGGE]** | **[INSERIRE]** |

---

## 11. Responsabili e sub-responsabili (fornitori tecnici)

**[INSERIRE ELENCO RESPONSABILI EX ART. 28 E SUB-RESPONSABILI]**

Stato prodotto: i provider non sono scelti; esistono adapter e stub.

| Funzione | Stato attuale | Fornitore live | Extra-SEE | Clausole |
|----------|---------------|----------------|-----------|----------|
| Hosting applicazione | **[INSERIRE HOSTING — OGGI NON DECISIO]** | **[INSERIRE NOME FORNITORE HOSTING]** | **[INSERIRE SÌ/NO E GARANZIE]** | **[INSERIRE DPA]** |
| Database PostgreSQL | URL generico; provider non deciso | **[INSERIRE NOME FORNITORE DB]** | **[INSERIRE]** | **[INSERIRE DPA]** |
| Autenticazione | Auth.js nel perimetro app | **[INSERIRE SE SI AGGIUNGONO IDP ESTERNI]** | **[INSERIRE]** | **[INSERIRE]** |
| Storage file privati | stub in produzione; `local` solo fuori produzione | **[INSERIRE NOME OBJECT STORAGE]** | **[INSERIRE]** | **[INSERIRE DPA]** |
| Email transazionale | stub (log senza corpo sensibile) | **[INSERIRE NOME EMAIL PROVIDER]** | **[INSERIRE]** | **[INSERIRE DPA]** |
| Pagamenti | stub, nessun dato carta in piattaforma | **[INSERIRE NOME PAYMENT PROVIDER]** | **[INSERIRE]** | **[INSERIRE DPA / TITOLARE AUTONOMO]** |
| Monitoring / error tracking | stub console | **[INSERIRE NOME MONITORING]** | **[INSERIRE]** | **[INSERIRE DPA]** |
| Antivirus upload | stub che non analizza davvero | **[INSERIRE NOME SCAN]** | **[INSERIRE]** | **[INSERIRE]** |
| CDN / DNS / captcha | **[INSERIRE SE PRESENTI]** | **[INSERIRE]** | **[INSERIRE]** | **[INSERIRE]** |

I testi ufficiali andranno aggiornati **prima** del passaggio live di ciascun adapter. **[INSERIRE PROCESSO DI AGGIORNAMENTO ELENCO FORNITORI]**

---

## 12. Trasferimenti verso paesi terzi

**[INSERIRE TRASFERIMENTI EXTRA SEE]**

- Paesi: **[INSERIRE PAESI]**
- Strumento: **[INSERIRE: DECISIONE DI ADEGUATEZZA / SCC / ALTRO]**
- Valutazione impatto trasferimenti: **[INSERIRE RINVIO O SINTESI]**

Finché hosting, DB, storage, email e pagamenti sono stub o locali di sviluppo, **non** si dichiara un trasferimento. La dichiarazione ufficiale va scritta dopo la scelta dei fornitori.

---

## 13. Periodi di conservazione

**[INSERIRE PERIODO DI CONSERVAZIONE]**

**[INSERIRE CRITERI DI DETERMINAZIONE DELLA RETENTION]**

| Categoria | Criterio operativo attuale | Periodo ufficiale |
|-----------|----------------------------|-------------------|
| Account e profilo | persistono finché l’account esiste; nessun purge automatico | **[INSERIRE PERIODO DI CONSERVAZIONE ACCOUNT]** |
| Iscrizione / rosa | persistono con lo storico edizioni | **[INSERIRE PERIODO DI CONSERVAZIONE ISCRIZIONI]** |
| Inviti | TTL configurabile (default 14 giorni se pending); restano in DB con stato | **[INSERIRE]** |
| Certificato corrente | file privato; sostituzione marca il precedente `REPLACED` **senza** cancellare il blob | **[INSERIRE PERIODO DI CONSERVAZIONE CERTIFICATI]** |
| Certificati sostituiti | conservati per tracciabilità tecnica | **[INSERIRE SE ELIMINARE BLOB REPLACED]** |
| Consensi | record in append; versioni storiche non sovrascritte | **[INSERIRE PERIODO DI CONSERVAZIONE CONSENSI]** |
| IP / user agent nei consensi e audit | campi presenti, nessun purge automatico | **[INSERIRE — VEDI OD-022]** |
| Pagamenti | stati e id provider; no carta | **[INSERIRE PERIODO OBBLIGHI CONTABILI]** |
| Notifiche | elenco recente in UI (ultime 50 in lettura) | **[INSERIRE]** |
| Log applicativi | **[INSERIRE]** | **[INSERIRE]** |
| Backup | **[INSERIRE]** | **[INSERIRE PERIODO DI CONSERVAZIONE BACKUP]** |

Cancellazione su richiesta: **[INSERIRE COME SI CONCILIA CON OBBLIGHI SPORTIVI, ASSICURATIVI, CONTABILI, DIFESA IN GIUDIZIO]**. Il prodotto **non** consente all’utente di cancellare da UI i log di audit.

---

## 14. Diritti dell’interessato

**[INSERIRE DIRITTI DELL’INTERESSATO]**

Struttura da completare (elenco classico da confermare/escludere per ogni trattamento):

- Accesso: **[INSERIRE DIRITTO DI ACCESSO — MODALITÀ]**
- Rettifica: **[INSERIRE]** — in prodotto il giocatore può aggiornare anagrafica e sostituire il certificato; l’email account non si cambia nel passo anagrafica.
- Cancellazione: **[INSERIRE]**
- Limitazione: **[INSERIRE]**
- Portabilità: **[INSERIRE]**
- Opposizione: **[INSERIRE]**
- Revoca del consenso (ove la base sia il consenso): **[INSERIRE]** — per i media, decisione esplicita nel passo liberatorie; effetti su materiali già pubblicati: vedi `media-release`.
- Reclamo all’autorità: **[INSERIRE DIRITTO DI RECLAMO AL GARANTE E RECAPITI]**

Non è previsto un pulsante «esporta tutti i dati» o «elimina account» in v1. **[INSERIRE SE E QUANDO SARÀ MESSO A DISPOSIZIONE UN TOOL ADMIN]**

---

## 15. Come esercitare i diritti

**[INSERIRE DIRITTI E MODALITÀ]**

- Canale: **[INSERIRE EMAIL PRIVACY]** / **[INSERIRE MODULO / PEC / POSTA]**
- Informazioni da allegare: **[INSERIRE: IDENTITÀ, ACCOUNT, COSA SI CHIEDE]**
- Verifica identità: **[INSERIRE PROCEDURA, SOPRATTUTTO PER MINORI]**
- Chi può agire per il minore: **[INSERIRE: GENITORE / TUTORE / INTERESSATO — DECISIONE LEGALE]**
- Tempi: **[INSERIRE TEMPI DI RISPOSTA]**
- Registro delle richieste: **[INSERIRE SE ESISTE PROCESSO INTERNO]**

---

## 16. Minori

Rinvio al documento `minor-privacy`. Punti fermi di prodotto (non sono un parere):

- Maggiore età operativa: 18 anni (`AGE_OF_MAJORITY`), da validare.
- L’account appartiene al minore; il genitore/tutore è un contatto collegato.
- In v1 il click di presa visione è dell’account loggato (il minore). Non si finge la firma del genitore (`guardianId` resta vuoto).
- **[INSERIRE REQUISITO CONSENSO GENITORE SE PREVISTO DALLA LEGGE / DAL LEGALE]**
- **[INSERIRE EVENTUALE VERIFICA IDENTITÀ DEL GENITORE]**

---

## 17. Dati sanitari e documenti caricati

Rinvio al documento `document-processing`.

Il rappresentante di squadra vede solo lo **stato** del certificato (mancante / in revisione / approvato / da ricaricare / scaduto), mai il file né i metadati di storage.

---

## 18. Foto, video e social

Rinvio al documento `media-release`. Trattamento distinto, passo wizard proprio, rifiutabile se non obbligatorio per edizione.

---

## 19. Cookie e tracciamenti

Rinvio al documento `cookie-policy`.

---

## 20. Sicurezza (misure organizzative e tecniche)

**[INSERIRE MISURE DI SICUREZZA — SENZA DICHIARARE CONFORMITÀ]**

Misure oggi presenti in prodotto (descrizione tecnica, non certificazione):

- Autorizzazione server-side, deny-by-default.
- Password con hash; sessione cookie httpOnly (config Auth.js).
- Verifica email prima di upload e consensi vincolanti.
- Rate limit su login, inviti, upload, consensi, profilo (store in-process, non distribuito).
- Upload: allowlist MIME, magic bytes, size cap, filename sanitizzato, storage key opaca.
- File medici non in URL pubblica; token HMAC a breve TTL; audit `DOCUMENT_VIEW`.
- Nessun campo carta nel DOM.
- Log con redazione di segreti e codice fiscale.
- Header di sicurezza di base (CSP incrementale, altro). **[INSERIRE VALUTAZIONE DEL LEGALE / DPO SULLE MISURE ADEGUATE]**

Antivirus reale, object storage cloud, monitoring live: non in produzione finché non scelti. **[INSERIRE MISURE OBBLIGATORIE PRIMA DEL LANCIO]**

---

## 21. Modifiche all’informativa

**[INSERIRE PROCESSO DI AGGIORNAMENTO]**

Operativo: nuova `LegalDocumentVersion` con `isCurrent`; le acceptance precedenti restano storiche. Se l’edizione richiede la versione corrente e l’iscrizione non è ancora approvata, il requisito privacy torna incompleto. Per iscrizioni già approvate: **[INSERIRE POLICY DI RE-CONSENT — VEDI OD-024]**

---

## 22. Legge applicabile e autorità di controllo

- Giurisdizione di lavoro del prodotto: Italia (assunzione operativa, non parere).
- Autorità: **[INSERIRE GARANTE PER LA PROTEZIONE DEI DATI PERSONALI O ALTRA]**
- Foro / legge applicabile: **[INSERIRE SOLO SE IL LEGALE VUOLE INDICARLI IN QUESTA INFORMATIVA]**

---

## 23. Luogo e data

- Luogo: **[INSERIRE LUOGO]**
- Data: **[INSERIRE DATA]**
- Firma / approvazione organizzazione: **[INSERIRE NOME E RUOLO DI CHI APPROVA IL TESTO UFFICIALE]**
