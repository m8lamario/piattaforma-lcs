# 06 — Roles and Permissions

Principio: **deny by default**. Se un controllo non è esplicito, la risposta è 403. L’esistenza di un record non autorizza.

## 1. Ruoli

| Ruolo | Scope | Assegnazione v1 |
|---|---|---|
| PLAYER | proprio userId / playerProfileId | membership su team dopo redeem invito |
| TEAM_REPRESENTATIVE | teamId | invito admin |
| ORGANIZATION_ADMIN | globale piattaforma | Super Admin |
| SUPER_ADMIN | globale | bootstrap |
| COMPETITION_ORGANIZER | competitionId | schema pronto, UI non in v1 |

## 2. Matrice (sì / stato / no)

| Azione | Player | Team Rep | Org Admin | Super Admin |
|---|---|---|---|---|
| Login proprio account | sì | sì | sì | sì |
| Modificare dati propri | sì | se anche player | impersonation no in v1 | sì tecnico |
| Vedere roster propria squadra (minimo) | sì | sì | sì | sì |
| Invitare giocatori | no | sì (proprio team) | sì | sì |
| Vedere stato certificato del roster | no (né dei compagni) | **stato** | sì | sì |
| Aggiornare maglia/ruolo rosa | no | sì (proprio team) | sì | sì |
| Ritirare iscrizione | la propria | no | sì | sì |
| Invitare rappresentante | no | no | sì | sì |
| Vedere/scaricare file certificato | solo il proprio via signed URL | **no** | sì + audit | sì + audit |
| Approvare/rifiutare documento | no | no | sì | sì |
| Pagare quota individuale | se paymentMode lo richiede | no (salvo anche player) | no | no |
| Pagare quota squadra | no | se paymentMode TEAM/BOTH | sì override | sì |
| Pubblicare informative | no | no | sì | sì |
| Gestire ruoli e adapter | no | no | no | sì |
| Audit log | no | no | lettura | lettura + config retention |

## 3. IDOR

Ogni server action / route:

1. Sessione obbligatoria (salvo pubbliche).
2. Carica la risorsa.
3. `authorize(actor, action, resource)` deve tornare `allow`.
4. Filtra i campi in output (il rappresentante non riceve `storageKey`).

Vietato: `findUnique({ where: { id } })` poi restituire il record senza check.

Test obbligatori: tentativo di accesso a registrazione/documento di un altro userId deve essere 403, non 404 leak se 404 rivela esistenza di documenti medici — per i documenti sanitari usare **403 uniforme** oppure 404 consistente senza distinguere. Decisione: **404 per risorse inesistenti o non autorizzate** verso player/rep (anti-enumerazione); gli admin possono ricevere 404 onesti. Documentato qui.

## 4. Campi visibili in rosa (Team Rep e compagni)

Consentiti al **rappresentante**: firstName, lastName, jerseyNumber, rosterRole, registration status, medical **status only**, payment **status only**.

Consentiti ai **compagni** (`/area/squadra`): firstName, lastName, jerseyNumber, rosterRole. Non stato certificato, non pagamento, non checklist.

Negati: fiscalCode, phone, email (rep può vedere email dell’invito che ha creato), birthDate, storageKey, consent bodies, guardian details (OPEN: il rep vede se “dati genitore completi” sì/no, non i dati).

## 5. Implementazione

Modulo `src/shared/authz`:

```ts
type Action =
  | "registration:read"
  | "registration:write"
  | "document:read_status"
  | "document:read_file"
  | "document:review"
  | "team:invite"
  | "team:read"
  | "team:update_roster"
  | "registration:withdraw"
  | "staff:invite"
  | "payment:create_player"
  | "payment:create_team"
  | "admin:manage";

function authorize(actor: Actor, action: Action, resource: Resource): Decision
```

Nessun bypass `if (role === SUPER_ADMIN) return true` sparso nelle pagine: il super admin è un caso dentro `authorize`.

## 6. Privilege escalation

- Un player non può auto-assegnarsi TEAM_REPRESENTATIVE (solo `StaffInvite` o Super Admin).
- Il codice invito giocatore non concede admin né ruolo rappresentante.
- Le API admin vivono sotto `/admin` **e** sotto check ruolo, entrambi necessari.
- `staff:invite` e `admin:manage` per Org/Super Admin; `platform:admin` solo Super Admin.
