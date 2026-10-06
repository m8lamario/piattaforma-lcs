**Fonte:** finalità H dei Moduli 1 e 2 LCS 2026-27, adattata alla copia del certificato decisa da European Students League S.r.l. il 5 ottobre 2026.

**Mole Cup, Leonessa Cup, Colosseo Cup, Ferrea Cup, Olympius e Turas Cup**, stagione 2026/2027, versione 1.0 del 5 ottobre 2026. Data di entrata in vigore su questa piattaforma: **5 ottobre 2026**.

ai sensi degli artt. 13 e 9 del Regolamento UE 2016/679 (GDPR). Integra l’[informativa privacy](/privacy) e, per i minori, l’[informativa per minori](/privacy/minori). Non riguarda foto e video: vedi [Liberatoria](/liberatorie).

---

## 1. Titolare

ESL **European Students League S.r.l.**, sede legale in **Corso Vinzaglio 24, 10121 Torino**, P.IVA/C.F. **IT12974200011 / 12974200011**.

Contatti privacy: **privacy@legacalciostudenti.it** — PEC **europeanstudentsleague@legalmail.it**. DPO: **non nominato**.

---

## 2. Perché si raccolgono i documenti

Per verificare il certificato medico di idoneità sportiva agonistica per il calcio e per tracciare la revisione umana (approvazione o rifiuto con motivazione visibile al giocatore).

Nella versione 1 non ci sono altri obblighi federali o assicurativi oltre questa verifica. In caso di infortunio, e solo su richiesta della pratica assicurativa, il certificato può essere trasmesso al soggetto assicurativo o a chi è legittimato a chiederlo, limitatamente a quanto serve a quella pratica.

---

## 3. Che cosa si tratta

Tipo in piattaforma: certificato medico di idoneità sportiva agonistica per il calcio.

- Formati: PDF, JPEG, PNG.
- Dimensione massima: 10 MB (configurabile).
- Si raccolgono: il file, la data di caricamento, l’eventuale scadenza indicata, lo stato di revisione, il motivo di rifiuto se c’è, e metadati tecnici (tipo MIME, dimensione, checksum, nome file originario sanitizzato).
- Il contenuto del file può includere dati relativi alla salute e identificativi (nome, data visita, medico, struttura).

Altri tipi di documento (identità, autocertificazioni, nulla osta scuola): non previsti in v1.

Istruzioni all’utente: caricare esclusivamente il certificato medico sportivo agonistico. Non caricare referti, cartelle cliniche, risultati di esami, prescrizioni o altra documentazione sanitaria non richiesta.

---

## 4. Base giuridica

I Moduli 1 e 2 (testi 1.0 del 1 ottobre 2026) dicono, alla finalità H:

> Verifica dell’idoneità sportiva: registrazione della presentazione e della scadenza del certificato medico richiesto dal regolamento (dato relativo alla salute). Base: consenso esplicito (art. 9.2.a GDPR). Obbligatorietà: necessaria per scendere in campo; **la copia del certificato non viene conservata**.

Casella originale: «Acconsento che ESL registri la presentazione e la data di scadenza del […] certificato medico sportivo (dato relativo alla salute, art. 9.2.a GDPR), senza conservarne copia.»

Su questa piattaforma il file viene caricato. La copia è acquisita e conservata per verificare l’idoneità e la scadenza. L’accesso al documento integrale è limitato agli utenti autorizzati. Base del dato sanitario: consenso esplicito (art. 9.2.a GDPR), caselle M3 e G4.

La casella obbligatoria per giocare è M3 (maggiorenni) o G4 (minorenni), nel passo privacy, distinta dalla presa visione di questa informativa. Il testo della casella in piattaforma parla della copia.

---

## 5. Chi può accedere al file (e chi no)

| Soggetto | File | Metadati / stato |
| --- | --- | --- |
| Giocatore titolare | sì, proprio file, tramite link temporaneo autenticato | sì |
| Compagni di squadra | no | no |
| Rappresentante di squadra | **no** — mai il file | solo lo **stato** (mancante / in revisione / ok / da ricaricare / scaduto) |
| Amministratori dell’organizzazione | sì, con audit di ogni visualizzazione | sì |
| Organizzatore di una coppa locale | interfaccia di gestione della competizione, se autorizzato | lo stato; il file solo con il permesso di revisione documenti, con audit |
| Fornitore di storage | Cloudflare R2, accesso tecnico agli oggetti | sì |
| Scuole e federazioni | no, in via ordinaria | no |
| Assicurazione | solo in caso di infortunio e di richiesta della pratica | il file necessario a quella pratica |

Accesso tecnico: niente percorso pubblico; token a tempo legato al documento e all’utente (default 60 secondi); ogni lettura è registrata.

Nessun medico esterno accede ai certificati.

---

## 6. Processo di revisione

1. Caricamento solo con sessione, permesso sulla propria iscrizione, email verificata.
2. Stato «in revisione».
3. Lo staff approva oppure rifiuta. Il rifiuto richiede un motivo visibile al giocatore.
4. Il motivo di rifiuto **non** è copiato nelle email (niente dettaglio sanitario nel canale). Resta nell’area documenti.
5. Il giocatore può sostituire il file. La regola è conservare solo l’ultimo approvato; la cancellazione del file precedente non è ancora automatica.
6. L’iscrizione può proseguire mentre il certificato è in revisione o rifiutato: il passo privacy non aspetta l’approvazione.
7. In approvazione lo staff registra la data di scadenza letta sul certificato.

Lo staff approva solo se verifica: nome e cognome del partecipante; indicazione di certificato medico sportivo agonistico; riferimento al calcio; data di emissione; data di scadenza; idoneità alla pratica agonistica; timbro, firma o altro elemento del medico o della struttura; leggibilità e completezza.

I file caricati sono sottoposti a scansione antivirus tramite Cloudflare Malicious Uploads Detection.

---

## 7. Conservazione

La copia resta fino a 90 giorni dopo la conclusione del torneo locale (`endsAt` dell’edizione), poi va cancellata. Va cancellata prima in caso di ritiro. Su richiesta dell’interessato va cancellata se non c’è un motivo che ne imponga la conservazione. Si conserva solo l’ultimo file approvato. Non c’è un obbligo di tenuta ulteriore per controversie o assicurazione. L’esito della verifica può restare separato dal file. Backup del database: Neon Point-in-Time Restore, fino a 30 giorni.

La cancellazione automatica a 90 giorni non è ancora un processo schedulato: fino a quel collegamento la copia resta nello storage privato.

Non c’è un pulsante «elimina definitivamente il certificato» indipendente dalla sostituzione.

---

## 8. Sicurezza

Storage privato, chiave opaca, elenco tipi di file consentiti, verifica del contenuto, limite di dimensione, audit degli accessi.

Cifratura a riposo: sì. Cifratura in transito: sì. Storage di produzione: Cloudflare R2.

---

## 9. Destinatari e trasferimenti extra-UE

Come nell’[informativa privacy](/privacy). Il file non è trasmesso in via ordinaria a scuole o federazioni. Il bucket Cloudflare R2 ha giurisdizione Unione europea: i file sono mantenuti nell’Unione europea. Eventuali trattamenti del fornitore fuori da quella regione vanno letti nel suo contratto di responsabile del trattamento.

---

## 10. Diritti

Accesso al proprio file dall’area personale. Rettifica: sostituzione del file (nuovo ciclo di revisione). Cancellazione: entro 90 giorni dalla fine del torneo locale, prima in caso di ritiro, e su richiesta se non c’è un motivo di conservazione. Se l’interessato è minore: genitori e minore possono scrivere a **privacy@legacalciostudenti.it**; l’account resta del minore.

Reclamo: [Garante per la protezione dei dati personali](https://www.garanteprivacy.it).
