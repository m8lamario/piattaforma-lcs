# Informativa specifica per minori e contatto genitore/tutore

**Questo testo è un placeholder di piattaforma. Non è un’informativa legale valida. Non è un parere giuridico. Non dichiara conformità a norme.**

**[INSERIRE INFORMATIVA MINORI]**

**[INSERIRE TESTO INFORMATIVA MINORI]**

**[INSERIRE DATA DI ENTRATA IN VIGORE DELLA VERSIONE UFFICIALE]**

---

## 1. Principio di prodotto (non è un parere legale)

- L’**account appartiene al minore**.
- Il genitore, tutore o affidatario è un **contatto collegato** al profilo, **non** il titolare del login.
- In v1 esiste un solo contatto tutore per profilo (upsert del primo).
- Soglia operativa di età: 18 anni in Italia (`AGE_OF_MAJORITY`). **[INSERIRE CONFERMA DELLA SOGLIA E DELLA GIURISDIZIONE]**

Queste regole guidano il software. **[INSERIRE QUALIFICAZIONE GIURIDICA DEL RAPPORTO MINORE / GENITORE / ORGANIZZAZIONE]**

---

## 2. Dati del minore

**[INSERIRE CATEGORIE DI DATI DEL MINORE]**

Operativo: gli stessi dell’informativa generale (account, anagrafica, codice fiscale, telefono, iscrizione, certificato, consensi, pagamenti, comunicazioni), con l’aggiunta obbligatoria del contatto tutore per completare il percorso.

**[INSERIRE SE ALCUNI DATI NON VANNO RACCOLTI SOTTO UNA CERTA ETÀ]**

**[INSERIRE SE IL CODICE FISCALE DEL MINORE HA UNA BASE SPECIFICA]**

---

## 3. Dati del genitore / tutore / affidatario

Il tutore è a sua volta interessato.

**[INSERIRE CATEGORIE DI DATI DEL GENITORE/TUTORE]**

Operativo oggi:

- nome, cognome;
- rapporto: Genitore / Tutore / Affidatario / Altro;
- email, telefono;
- eventuale `metadata` JSON futuro.

Non raccolti oggi:

- documento d’identità;
- SPID/CIE;
- firma olografa o digitale;
- prova della responsabilità genitoriale.

**[INSERIRE SE QUESTI ELEMENTI DIVENTANO OBBLIGATORI]**

Finalità del contatto tutore: **[INSERIRE FINALITÀ: RINTRACCIABILITÀ, COMUNICAZIONI DI SERVIZIO, URGENZE, CONSENSI, FATTURAZIONE]**

Base giuridica sui dati del tutore: **[INSERIRE BASE GIURIDICA DATI TUTORE]**

Il rappresentante di squadra **non** vede i dati del tutore (solo, al più, se il passo risulta completo o meno). **[INSERIRE SE IL REP DEVE POTER CONTATTARE IL GENITORE]**

---

## 4. Come si raccolgono i consensi in v1

**[INSERIRE DESCRIZIONE UFFICIALE DELLA RACCOLTA CONSENSI MINORI]**

Fatto di piattaforma (tracciamento tecnico, non validità):

1. Il minore accede con l’email dell’invito (email obbligatoria sull’account — decisione aperta se molti under-18 non ne hanno una stabile).
2. Nel passo «Privacy» vede, se risulta minorenne, il pacchetto: informativa privacy + informativa documenti + **questa** informativa.
3. Deve spuntare ogni testo (nessuna spunta pre-selezionata) e confermare la presa visione della versione mostrata.
4. Si crea un `ConsentRecord` collegato all’utente minore, alla versione, all’iscrizione, con data/ora e traccia IP/user agent.
5. Il campo `guardianId` **non** viene valorizzato: **non si finge** che il genitore abbia firmato.

**[INSERIRE REQUISITO CONSENSO GENITORE SE PREVISTO DALLA LEGGE / DAL LEGALE]**

**[INSERIRE SE IL CLICK DEL MINORE È SUFFICIENTE, INSUFFICIENTE, O SUFFICIENTE SOLO SOPRA UNA CERTA ETÀ]**

---

## 5. Possibili modalità di verifica del genitore/tutore

**Non implementate.** Da scegliere con organizzazione e legale; il prodotto può estendersi senza stravolgere lo schema (es. futura entità di verifica).

Opzioni da valutare (nessuna è adottata):

1. **[INSERIRE: EMAIL AL GENITORE CON LINK DI CONFERMA]**
2. **[INSERIRE: SPID / CIE DEL GENITORE]**
3. **[INSERIRE: UPLOAD DOCUMENTO D’IDENTITÀ DEL GENITORE]**
4. **[INSERIRE: DICHIARAZIONE IN PRESENZA / PROCESSO OFFLINE CON CARICAMENTO ESITO]**
5. **[INSERIRE: SOLO TRACCIAMENTO DEL CLICK DEL MINORE + CONSERVAZIONE CONTATTO]**

**[INSERIRE DECISIONE E DATA]**

Finché manca la decisione, la UI dice che si è presa visione della versione X in data Y, **senza** affermare validità legale.

---

## 6. Comunicazioni verso il minore e verso il tutore

**[INSERIRE CANALI E DESTINATARI DELLE COMUNICAZIONI]**

Operativo:

- login e area personale: del minore;
- email di servizio (quando il provider sarà live): oggi partono verso l’email dell’**account** (minore);
- l’email del tutore è conservata ma **non** è usata in v1 come destinatario automatico. **[INSERIRE SE IL GENITORE DEVE RICEVERE COPIA DI INVITO, RIFIUTO CERTIFICATO, PAGAMENTO, APPROVAZIONE]**
- notifiche in-app: sull’account minore; i rifiuti certificato non includono il dettaglio sanitario nell’email.

**[INSERIRE SE È VIETATO CONTATTARE DIRETTAMENTE IL MINORE PER CERTI CONTENUTI]**

---

## 7. Certificato medico del minore

Vale `document-processing`. **[INSERIRE SE SERVONO REGOLE EXTRA PER MINORI: TIPO VISITA, CONSENSO ALLA VISITA, CHI PUÒ CARICARE IL FILE]**

In v1 carica il file chi è loggato (l’account del minore). **[INSERIRE SE IL GENITORE DEVE POTER CARICARE SENZA LOGIN DEL MINORE — OGGI NON PREVISTO]**

---

## 8. Foto, video e social del minore

Vale `media-release`. **[INSERIRE LIMITAZIONI AGGIUNTIVE PER MINORI: DIVIETO VOLTO, DIVIETO NOME, SOLO CANALI INTERNI, DURATA RIDOTTA, CONSENSO GENITORE OBBLIGATORIO]**

In v1 la decisione accept/refuse è dell’account loggato (il minore), sullo stesso passo di tutti. **[INSERIRE SE PER I MINORI LA LIBERATORIA DEVE ESSERE NEGATA IN ASSENZA DI VERIFICA GENITORE]**

---

## 9. Chi esercita i diritti privacy

**[INSERIRE CHI PUÒ ESERCITARE I DIRITTI: MINORE, GENITORE, ENTRAMBI, IN CHE ETÀ]**

**[INSERIRE COME SI VERIFICA CHE CHI SCRIVE ALL’EMAIL PRIVACY SIA IL GENITORE O IL MINORE]**

**[INSERIRE COSA SUCCEDE IN CASO DI CONFLITTO TRA GENITORI]**

Canale: **[INSERIRE EMAIL PRIVACY]** — **[INSERIRE ISTRUZIONI SPECIFICHE MINORI]**

---

## 10. Conservazione

**[INSERIRE PERIODO DI CONSERVAZIONE DATI MINORE]**

**[INSERIRE PERIODO DI CONSERVAZIONE DATI TUTORE DOPO LA MAGGIORE ETÀ O IL RITIRO]**

**[INSERIRE SE ALLA MAGGIORE ETÀ IL CONTATTO TUTORE SI CANCELLA O SI MANTIENE]**

Operativo: `isMinor` si ricalcola dalla data di nascita a ogni lettura; non è uno stato congelato. Un giocatore che compie 18 anni durante l’edizione: **[INSERIRE REGOLA]**

---

## 11. Destinatari specifici

Oltre a quanto in `privacy-policy`:

- **[INSERIRE SE LA SCUOLA RICEVE DATI DEL MINORE]**
- **[INSERIRE SE ALTRI GENITORI DELLA SQUADRA VEDONO QUALCOSA — IN V1 NO]**
- Rappresentante: stato, non dossier familiare.

---

## 12. Rapporto con le altre informative

Questa informativa si aggiunge a `privacy-policy` e `document-processing` nel passo privacy **solo se** il giocatore risulta minorenne. Non sostituisce `media-release` né `terms` né `cookie-policy`.

---

## 13. Luogo e data

- **[INSERIRE LUOGO]**
- **[INSERIRE DATA]**
- **[INSERIRE NOME E RUOLO DI CHI APPROVA IL TESTO UFFICIALE]**
