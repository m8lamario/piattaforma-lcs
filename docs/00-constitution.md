# 00 — Project Constitution

Questo documento definisce i principi non negoziabili di ESL Player Hub. Ogni altra specifica, il codice e le milestone devono essere coerenti con questa constitution. In caso di conflitto, vince questo file — e se il conflitto è voluto, si aggiorna prima la constitution.

## 1. Identità del prodotto

ESL / LCS è l’organizzazione **nazionale** (Italia) che promuove competizioni sportive studentesche. Realtà locali (es. Leonessa Cup) nascono da ESL/LCS e restano prodotti distinti.

ESL Player Hub è la piattaforma di **registrazione e gestione dei giocatori** per quelle competizioni. Non è il sito vetrina di una singola coppa. Non è un gestionale amministrativo. Non è un form.

Il giocatore deve percepire un’**area personale** che lo accompagna dalla creazione dell’account alla conclusione dell’iscrizione e che resta utilizzabile dopo.

Leonessa Cup e altri siti locali **non** vengono modificati da questo repository.

## 2. Principi

1. **Chiarezza prima della densità.** Percorso guidato, checklist, stati espliciti. Adatto a utenti giovani e a chi non è abituato ai moduli online.
2. **Sicurezza e privacy by design.** Dati personali, minori, certificati medici, consensi e pagamenti sono il cuore del rischio. Non si ottimizza per “far funzionare il form”.
3. **Tracciabilità.** Consensi versionati, audit sugli accessi ai documenti sanitari, log senza payload inutilmente sensibili.
4. **Deny by default.** Autorizzazione server-side, scoped. Un ID in URL o API non basta.
5. **Estendibilità senza riscrittura.** Competizioni, edizioni, squadre, requisiti, informative e campi profilo devono poter crescere.
6. **Nessuna invenzione legale o commerciale.** Placeholder espliciti. Le decisioni aperte vivono in `OPEN_DECISIONS.md`.
7. **Nessun dark pattern.** I consensi non necessari non sono obbligatori per sbloccare l’iscrizione.
8. **Documentazione come fonte di verità.** Il codice segue i documenti. Una decisione nuova si scrive nei docs, poi si implementa.
9. **Una persona, un account.** Anche i minorenni hanno un account proprio. Il genitore/tutore è un contatto collegato, non il titolare del login.
10. **Ingresso controllato.** In v1 non esiste iscrizione pubblica da catalogo. Si entra con invito del rappresentante di squadra.

## 3. Cosa il prodotto è / non è

| È | Non è |
|---|---|
| Area personale del giocatore | Un unico form da 30 campi |
| Hub nazionale per più coppe/edizioni | Il sito di una singola coppa locale |
| Sistema documentale per certificati | Un allegato immagine sul profilo |
| Motore di requisiti e checklist | Un booleano `privacyAccepted` |
| Modulo pagamenti sostituibile | Un provider hardcoded |
| Piattaforma unica con permessi scoped | SaaS multi-tenant isolato |

## 4. Ruoli v1

- **Player** — gestisce il proprio account e la propria registrazione.
- **Team Representative** — gestisce roster e informazioni consentite della propria squadra. Vede lo **stato** dei documenti medici, mai il file.
- **Organization Admin** — gestisce giocatori, squadre, documenti, consensi, pagamenti e registrazioni a livello ESL/LCS.
- **Super Admin** — gestione completa della piattaforma.

Ruolo previsto nel modello permessi, non nella UI v1: **Competition Organizer** (scope `competitionId`).

## 5. Vincoli di stack

Salvo motivazione documentata in architecture / OPEN_DECISIONS:

Next.js, React, TypeScript, PostgreSQL, Prisma, Auth.js, CSS Modules, Framer Motion, Zod, React Hook Form.

La foundation è pronta a una futura app mobile/PWA (domain e authz disaccoppiati dalla pagina). La PWA **non** entra in M0.

## 6. Processo di sviluppo

1. Consultare i documenti pertinenti.
2. Implementare il task del backlog (obiettivo, requisiti, dipendenze, acceptance, test).
3. Testare, typecheck, lint, build.
4. Verificare sicurezza dello slice toccato.
5. Aggiornare la documentazione se la decisione è cambiata.
6. Solo allora il task è completo. Compilare non basta.

Dopo ogni milestone: verifica implementazione, test, TypeScript, lint, build, sicurezza, correzione, docs, milestone successiva.

## 7. Placeholder e decisioni aperte

- Testi legali: `[INSERIRE PRIVACY POLICY UFFICIALE]`, `[INSERIRE TITOLARE DEL TRATTAMENTO]`, ecc.
- Colori HEX: token CSS con valori temporanei, mai sparsi nel codice.
- Provider email, storage, pagamenti, error tracking: interfacce + stub.

Ciò che non può essere deciso senza l’organizzazione sta in [`OPEN_DECISIONS.md`](OPEN_DECISIONS.md). Si continua a costruire tutto il resto.

## 8. Giurisdizione di lavoro (non legale)

Si assume **Italia**, maggiorenne a **18 anni**, lingua UI **italiano**, codice fiscale italiano. Queste assunzioni sono operative, **non** un parere legale. Vanno validate dall’organizzazione e dal professionista competente.

## 9. Criteri di qualità

Una funzionalità è fatta quando:

- rispetta constitution e spec;
- è autorizzata deny-by-default;
- ha validazione client e server;
- ha stati (loading, empty, error, success) dove l’utente agisce;
- ha test previsti dal backlog;
- non espone documenti medici pubblicamente;
- non memorizza dati carta;
- non finge validità legale dei placeholder.
