# 01 — Product Specification

## 1. Problema

Oggi le iscrizioni a coppe studentesche locali sono frammentate. ESL/LCS opera a livello Italia e ha bisogno di una piattaforma unica in cui il giocatore capisca **chi è**, **a che punto è**, **cosa manca** e **cosa deve fare**, mentre l’organizzazione revisiona documenti e consensi in modo tracciabile.

## 2. Utenti

| Persona | Obiettivo | Paura |
|---|---|---|
| Giocatore (anche giovane) | Iscriversi senza perdersi | Non capire cosa manca, sbagliare un upload |
| Genitore/tutore (contatto, non login) | Essere rintracciabile e informato | Consensi poco chiari sul minore |
| Rappresentante di squadra | Costruire il roster e vedere chi è in regola | Vedere dati sanitari che non gli spettano |
| Organization Admin | Revisionare e sbloccare le iscrizioni | Documenti sparsi, nessuna traccia |
| Super Admin | Configurare piattaforma, ruoli, informative | Errori di configurazione su dati sensibili |

## 3. Promessa v1

Il giocatore entra **solo su invito** del rappresentante, crea il proprio account, completa un percorso guidato (dati, eventuale genitore, certificato, privacy, liberatorie, pagamento se dovuto) e ha una dashboard con stato e checklist. Il rappresentante gestisce la squadra. L’organizzazione revisiona.

## 4. Fuori scope v1 / M0

| In scope dopo la documentazione | Fuori dalla foundation M0 | Fuori dal prodotto (per ora) |
|---|---|---|
| Docs complete | Wizard iscrizione | Sito vetrina della coppa |
| App Next.js, auth, schema | Upload reale su cloud | Live scoring / tabellini |
| Design tokens | Pagamento live | App nativa |
| RBAC e adapter stub | Review admin UI completa | Integrazione codice Leonessa Cup |
| | Notifiche email reali | Multi-lingua UI |

## 5. Capacità del giocatore (prodotto, non M0)

- Creare l’account **da invito** (email + password + verifica email).
- Completare la registrazione a passi, con salvataggio e ripresa.
- Vedere i propri dati e lo stato.
- Caricare/sostituire il certificato medico agonistico.
- Gestire i consensi versionati.
- Vedere la propria squadra (dati minimi dei compagni).
- Completare il pagamento online quando l’edizione lo richiede al giocatore.
- Ricevere comunicazioni in-app (email quando il provider sarà scelto).
- Correggere dati/documenti richiesti dall’organizzazione.
- Capire chiaramente cosa manca.

## 6. Capacità del rappresentante

- Accedere alla propria squadra (invito da Organization/Super Admin).
- Invitare giocatori con codice/link (email obbligatoria; altri campi roster minimi configurabili).
- Vedere checklist e stati di registrazione/pagamento dei propri giocatori.
- Vedere **stato** del certificato (caricato / in revisione / approvato / rifiutato / scaduto), **mai il file**.
- Non vedere codice fiscale, telefono, email completa dei compagni oltre quanto strettamente necessario al roster (vedi ruoli).

## 7. Capacità organizzazione

- CRUD competizioni, edizioni, istituti, squadre, requisiti.
- Revisionare documenti: approvare, rifiutare con motivazione, richiedere nuovo caricamento.
- Consultare consensi (versione, timestamp, tipo).
- Vedere pagamenti (stato, id transazione, importo) senza dati carta.
- Pubblicare versioni di informative.
- Audit log.

## 8. Dati giocatore (minimi)

- Nome, cognome, data di nascita, codice fiscale, email obbligatoria, telefono.
- Estensione futura: colonna `metadata Json` su `PlayerProfile` + eventuali colonne tipizzate. Non si riscrive l’architettura per un campo nuovo.

Campi **non** mostrati ai compagni di squadra: CF, email, telefono, data di nascita completa, documenti, consensi.

## 9. Minori

- Minorenne se età < 18 alla data di valutazione (assunzione IT, da validare).
- Flusso guardian obbligatorio: nome, cognome, rapporto, email, telefono.
- Informative/consensi con audience `MINOR` / `GUARDIAN`.
- Account del minore, non del genitore.
- Validità legale del consenso digitale e dell’email del minore: **OPEN_DECISIONS**, non inventata.

## 10. Certificato medico

Sistema documentale, non un’immagine di profilo.

- Upload, validazione formato, limite dimensione.
- Metadata in DB: tipo, storage key, MIME, size, hash, stato, date, scadenza, revisore, motivo rifiuto.
- Blob su storage privato; accesso solo via signed URL breve + audit.
- Sostituzione e richiesta di nuovo caricamento.

## 11. Privacy e media

- Sezione Privacy evidente, versionata, placeholder ufficiali.
- Liberatorie foto/video/social: **step proprio**, visibile, senza nasconderle in fondo.
- Registrazione accettazione: utente, documento, versione, datetime, tipo consenso, traccia tecnica (IP, user agent) secondo quanto consentito e documentato.
- Consensi opzionali restano opzionali.

## 12. Pagamento

- Importo e modalità (`PLAYER` | `TEAM` | `BOTH`) per edizione.
- Stati: pending, succeeded, failed, refunded.
- Id transazione, data, utente/squadra, webhook, eventuale ricevuta (placeholder).
- Nessun PAN/CVV.
- Provider via adapter, non hardcoded.
- Doppia addebito vietata: se la squadra ha un pagamento `SUCCEEDED` che copre il roster, il giocatore non paga di nuovo (dettaglio `BOTH` in OPEN_DECISIONS).

## 13. Dashboard

Stato registrazione (proiezione dei requisiti):

`INVITED` → `ACCOUNT_CREATED` → `IN_PROGRESS` → `PENDING_REVIEW` | `CHANGES_REQUESTED` | `PAYMENT_PENDING` → `APPROVED`

Checklist con voci complete / da fare / attenzione / non applicabile e copy che dice **cosa fare adesso**.

## 14. Squadra

Pagina squadra: nome, logo, competizione/edizione, info principali, referente, componenti con dati minimi (nome, eventuale ruolo in campo/numero maglia se presenti). Niente PII superflua.

## 15. Lingua e brand

- UI v1: italiano. Chiavi di copy centralizzate per i18n futuro.
- Brand: ESL/LCS. Colori: token (blu, chiaro, teal) con HEX placeholder.
- Nome prodotto UI: **ESL Player Hub** (finché l’organizzazione non fornisce il nome pubblico).
