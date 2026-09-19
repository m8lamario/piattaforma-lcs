# ESL Player Hub

Piattaforma web nazionale di **registrazione e gestione giocatori** per ESL / LCS.

Non è un form di iscrizione. È l’area personale del giocatore, lo strumento di roster del rappresentante di squadra e il cruscotto di revisione dell’organizzazione.

## Fonte di verità

La documentazione in [`docs/`](docs/) è la fonte di verità del progetto. Prima di implementare una funzionalità, consultala. Se una decisione di prodotto o architettura cambia, aggiorna i documenti **prima** o **insieme** al codice.

| Documento | Contenuto |
|---|---|
| [00-constitution.md](docs/00-constitution.md) | Principi, vincoli, processo |
| [01-product-specification.md](docs/01-product-specification.md) | Cosa fa il prodotto in v1 |
| [02-architecture.md](docs/02-architecture.md) | Moduli, adapter, stack |
| [03-information-architecture.md](docs/03-information-architecture.md) | Struttura delle aree |
| [04-user-flows.md](docs/04-user-flows.md) | Flussi principali |
| [05-database-design.md](docs/05-database-design.md) | Modello dati |
| [06-roles-and-permissions.md](docs/06-roles-and-permissions.md) | RBAC deny-by-default |
| [07-security-guidelines.md](docs/07-security-guidelines.md) | Sicurezza |
| [08-privacy-and-consent.md](docs/08-privacy-and-consent.md) | Privacy, informative, consensi |
| [09-ui-ux-guidelines.md](docs/09-ui-ux-guidelines.md) | Design system e UX |
| [10-development-guidelines.md](docs/10-development-guidelines.md) | Come si sviluppa |
| [11-testing-strategy.md](docs/11-testing-strategy.md) | Test |
| [12-roadmap.md](docs/12-roadmap.md) | Milestone |
| [13-backlog.md](docs/13-backlog.md) | Task con acceptance criteria |
| [OPEN_DECISIONS.md](docs/OPEN_DECISIONS.md) | Decisioni che spettano all’organizzazione |

## Stack

- Next.js (App Router) · React · TypeScript
- PostgreSQL · Prisma
- Auth.js
- CSS Modules · Framer Motion
- Zod · React Hook Form

## Avvio locale

1. Copiare `.env.example` in `.env`.
2. Impostare `DATABASE_URL` e `AUTH_SECRET`.
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate` (quando PostgreSQL è disponibile)
6. `npm run dev`

Script: `lint`, `typecheck`, `test`, `build`.

La foundation **non** include il wizard di iscrizione. **M1–M7** del roadmap v1 sono implementate. Residui dichiarati: testi legali ufficiali, provider live, Playwright CI, monitoring/retention.

Seed di sviluppo (`npm run db:seed`):

- `rep@esl-player-hub.local` / `ChangeMe_TeamRep1!` — rappresentante, area `/squadra`
- `org@esl-player-hub.local` / `ChangeMe_OrgAdmin1!`
- `super@esl-player-hub.local` / `ChangeMe_SuperAdmin1!`

Cambiare queste password prima di qualsiasi ambiente condiviso.

## Principi

- Sicurezza, privacy e tracciabilità prima della velocità di compilazione.
- Testi legali solo come placeholder `[INSERIRE …]` finché l’organizzazione non fornisce i testi ufficiali.
- Nessun dark pattern sui consensi.
- Deny by default: nessun dato altrui è accessibile cambiando un ID.
