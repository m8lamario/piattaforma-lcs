# Informativa sui documenti caricati (certificato medico e file)

**Questo testo è un placeholder di piattaforma. Non è un’informativa legale valida. Non è un parere giuridico. Non dichiara conformità a norme.**

**[INSERIRE INFORMATIVA DOCUMENTI CARICATI]**

**[INSERIRE TESTO INFORMATIVA DOCUMENTI]**

**[INSERIRE DATA DI ENTRATA IN VIGORE DELLA VERSIONE UFFICIALE]**

---

## 1. Perché si raccolgono i documenti

**[INSERIRE FINALITÀ RACCOLTA CERTIFICATO MEDICO]**

Bozza operativa **non ufficiale** (da confermare o sostituire):

- consentire all’organizzazione di verificare che esista un certificato medico agonistico associato all’iscrizione;
- tracciare revisione umana (approvazione / rifiuto con motivazione);
- conservare uno storico dei file sostituiti per audit interno.

**[INSERIRE SE LA FINALITÀ INCLUDE ADEMPIMENTI FEDERALI, ASSICURATIVI, DI LEGGE SULLO SPORT, TUTELA SANITARIA]**

Base giuridica: **[INSERIRE BASE GIURIDICA DATI SANITARI / CATEGORIE PARTICOLARI]**

Eventuale consenso esplicito distinto da questa informativa: **[INSERIRE SÌ / NO / TESTO CONSENSO]** — in v1 la presa visione avviene nel passo privacy insieme alle altre informative del pacchetto, **senza** un checkbox sanitario separato. **[INSERIRE SE SERVE UN CONSENSO SPECIFICO AGGIUNTIVO]**

---

## 2. Che cosa si carica oggi

Tipo documento in piattaforma: `MEDICAL_CERTIFICATE` («Certificato medico agonistico»).

- Formati ammessi: PDF, JPEG, PNG.
- Dimensione massima: configurabile (default 10 MB).
- Scadenza del certificato: campo previsto; in v1 **non** è calcolata in automatico. **[INSERIRE REGOLE DI VALIDITÀ, TIPO VISITA, SPORT, SCADENZA]**
- Antivirus: interfaccia prevista, implementazione stub. **[INSERIRE OBBLIGO DI SCAN PRIMA DEL LANCIO]**

Altri tipi documentali futuri: **[INSERIRE: DOCUMENTO IDENTITÀ, AUTOCERTIFICAZIONI, NULLA OSTA SCUOLA, ECC.]**. Lo schema lo consente come nuovo `DocumentType`, senza cambiare l’architettura.

Cosa **non** va nel certificato secondo l’organizzazione: **[INSERIRE ISTRUZIONI ALL’UTENTE: ES. NON INCLUDERE REFERTI NON RICHIESTI]**

---

## 3. Dati contenuti nel trattamento documentale

**[INSERIRE CATEGORIE DI DATI DEL FILE E DEI METADATI]**

Operativo, in database (il file binario **non** sta nel DB):

- collegamento a iscrizione e profilo giocatore;
- tipo documento;
- chiave di storage opaca (non è un URL pubblico);
- MIME, dimensione, checksum, nome file originario sanitizzato;
- stato: caricato / in revisione / approvato / rifiutato / scaduto / sostituito;
- date di upload e eventuale scadenza;
- revisioni: revisore, decisione, motivo di rifiuto.

Il contenuto del file può includere dati sanitari e identificativi (nome, data visita, medico, struttura). **[INSERIRE QUALIFICAZIONE LEGALE: CATEGORIA PARTICOLARE]**

---

## 4. Chi può accedere al file (e chi no)

**[INSERIRE SOGGETTI AUTORIZZATI ALL’ACCESSO AL FILE]**

Regole di prodotto **già implementate** (descrizione tecnica):

| Soggetto | File (bytes) | Metadati / stato |
|----------|----------------|------------------|
| Giocatore titolare | sì, proprio file, via link temporaneo autenticato | sì |
| Compagni di squadra | no | no |
| Rappresentante di squadra | **no** — mai `storageKey`, mai download | solo **stato** in rosa (mancante / in revisione / ok / da ricaricare / scaduto) |
| Organization Admin / Super Admin | sì, con audit | sì, lista senza esporre la storage key |
| Competition Organizer | ruolo in schema, nessuna UI v1 | **[INSERIRE QUANDO ATTIVATO]** |
| Provider di storage | **[INSERIRE QUANDO SCELTO: ACCESSO TECNICO]** | chiavi oggetto |
| Scuole, federazioni, assicurazioni | non in v1 | **[INSERIRE SE SI ESPORTANO FILE O SOLO ESITI]** |

Accesso tecnico:

- niente path statico `/uploads` o bucket pubblico;
- token HMAC legato a `documentId` + `userId` + scadenza (default 60 secondi);
- ogni GET del file genera audit `DOCUMENT_VIEW`;
- URL senza storage key.

**[INSERIRE SE LO STAFF MEDICO ESTERNO DEVE ACCEDERE E CON QUALE CONTRATTO]**

---

## 5. Processo di revisione

**[INSERIRE PROCESSO ORGANIZZATIVO DI REVIEW]**

Operativo:

1. Upload solo con sessione, permesso di scrittura sulla propria iscrizione, email verificata.
2. Stato verso revisione (`PENDING_REVIEW`).
3. Lo staff approva oppure rifiuta. Il rifiuto richiede un motivo visibile al giocatore.
4. Il motivo di rifiuto **non** viene copiato nelle notifiche email (niente dettaglio sanitario nel canale). Resta nell’area documenti del giocatore.
5. Il giocatore può sostituire il file: il precedente passa a `REPLACED` e il blob non viene cancellato in automatico.
6. Il wizard non blocca i passi successivi se il certificato è «in attenzione» (in revisione / rifiutato): si può completare privacy mentre lo staff revisiona.

Criteri di approvazione/rifiuto (tipo visita, intestazione, data, sport): **[INSERIRE ISTRUZIONI STAFF — NON SONO NEL CODICE]**

---

## 6. Conservazione, sostituzione, cancellazione

**[INSERIRE PERIODO DI CONSERVAZIONE DOCUMENTI SANITARI]**

**[INSERIRE PERIODO DI CONSERVAZIONE FILE SOSTITUITI (REPLACED)]**

**[INSERIRE SE I BLOB SI ELIMINANO A FINE STAGIONE / A RITIRO ISCRIZIONE / SU RICHIESTA]**

Punti aperti da non decidere in codice:

- conservare solo l’ultimo approvato: **[INSERIRE SÌ/NO]**
- obbligo di conservazione per controversie / assicurazione: **[INSERIRE]**
- anonimizzazione vs cancellazione: **[INSERIRE]**
- backup dei file: **[INSERIRE]**

Il prodotto non offre al giocatore un pulsante «elimina definitivamente il certificato» indipendente dalla sostituzione.

---

## 7. Sicurezza dei file

**[INSERIRE MISURE DI SICUREZZA DOCUMENTI]**

Operativo: storage privato, key opaca `documents/{registrationId}/{random}`, allowlist MIME, verifica magic bytes, size cap, audit accessi, deny-by-default.

Misure da definire prima del lancio:

- cifratura at rest: **[INSERIRE]**
- cifratura in transito: **[INSERIRE]**
- object storage production: **[INSERIRE FORNITORE]**
- antivirus reale: **[INSERIRE]**
- chi può emettere il token di lettura: solo dopo `authorize`

---

## 8. Destinatari e trasferimenti

**[INSERIRE DESTINATARI DEI DOCUMENTI SANITARI]**

**[INSERIRE TRASFERIMENTI EXTRA SEE DELLO STORAGE]**

Finché `STORAGE_DRIVER=local` è solo per non-produzione e in produzione lo storage resta stub, **non** si deve lanciare verso utenti reali. **[INSERIRE VINCOLO ORGANIZZATIVO AL GO-LIVE]**

---

## 9. Diritti dell’interessato sul documento

**[INSERIRE DIRITTI E MODALITÀ SPECIFICI PER DATI SANITARI]**

- Accesso al proprio file: in area personale, con sessione.
- Rettifica: sostituzione del file (nuovo ciclo di revisione).
- Cancellazione: **[INSERIRE LIMITI]**
- Chi esercita i diritti se l’interessato è minore: **[INSERIRE]**

---

## 10. Rapporto con le altre informative

Questa informativa integra `privacy-policy`. Per i minori, vale anche `minor-privacy`. Non sostituisce la liberatoria media (`media-release`), che non riguarda i file medici.

---

## 11. Luogo e data

- **[INSERIRE LUOGO]**
- **[INSERIRE DATA]**
- **[INSERIRE NOME E RUOLO DI CHI APPROVA IL TESTO UFFICIALE]**
