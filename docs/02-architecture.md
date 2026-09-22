# 02 — Architecture

## 1. Stile

Monolite Next.js **feature-based**, non un mucchio di componenti globali. Un’unica piattaforma, un unico database. Le coppe locali sono `Competition` + `Edition`, non tenant isolati.

I permessi sono **resource-scoped** (`userId`, `teamId`, `competitionId`) per poter aggiungere `CompetitionOrganizer` senza riscrivere l’authz.

## 2. Stack

| Layer | Scelta | Motivazione |
|---|---|---|
| UI | Next.js App Router, React, CSS Modules, Framer Motion | Stack richiesto, mobile-first, animazioni moderate |
| Linguaggio | TypeScript strict | Correttezza su dati sensibili |
| Validazione | Zod (client e server) + React Hook Form | Un solo schema condivisibile |
| Auth | Auth.js (NextAuth v5) | Sessioni, CSRF, adapter Prisma |
| DB | PostgreSQL + Prisma 7 | Relazionale, migrate, type-safe |
| Email / storage / pay / errors | Adapter + stub / live | Resend, R2, Stripe dietro driver env; default stub |

Prisma 7 richiede `prisma.config.ts`, `dotenv` esplicito, driver adapter `@prisma/adapter-pg` e client generato in `/generated` (gitignored; import `@generated/client`). `npm run build` esegue `prisma generate` prima di `next build` (non in `postinstall`: su Vercel `npm install` non ha sempre `DATABASE_URL`). `prisma.config.ts` accetta un URL placeholder solo per il generate; migrate/runtime usano `DATABASE_URL`.

Protezione route in Next.js 16: `src/proxy.ts` (non `middleware.ts`).

## 3. Struttura cartelle

```
src/
  app/                          # route, layout, pages — solo composizione
    (public)/
    (player)/
    (team)/
    (admin)/
    api/auth/[...nextauth]/
    api/webhooks/
  features/
    auth/
    players/
    registrations/
    documents/
    consents/
    payments/
    teams/
    notifications/
    admin/
  shared/
    ui/                         # primitive design system
    authz/                      # deny-by-default
    config/                     # env, tokens, flags
    lib/                        # prisma, logger, audit
    errors/                     # catalogo codici, fail(), metadati HTTP/recovery
    adapters/                   # email, storage, payments, monitoring
    i18n/                       # copy IT centralizzato
prisma/
  schema.prisma
prisma.config.ts
docs/
```

Ogni feature espone:

- `domain/` — regole pure (niente Next, niente Prisma client nelle funzioni di calcolo)
- `data/` — repository / query Prisma
- `ui/` — componenti della feature
- `schemas/` — Zod

Le route in `app/` chiamano domain + data. Nessuna query Prisma dentro un componente client.

## 4. Confini

| Modulo | Responsabilità | Non fa |
|---|---|---|
| auth | identità, sessione, verifica email | autorizzazione di business |
| authz | “può questo attore fare questa azione su questa risorsa?” | UI |
| players | profilo, guardian, identità fiscale | storage file |
| registrations | stato, checklist, requisiti edizione | pagamenti provider |
| documents | metadata, review, policy upload | servire file pubblici |
| consents | versioni e acceptance | testi legali inventati |
| payments | intent, stato, webhook | carte |
| teams | squadra, inviti, roster view | certificati |
| notifications | in-app + dispatch email | SMTP hardcoded |
| admin | review e config | bypass authz |

## 5. Adapter

Interfacce in `src/shared/adapters`. Implementazioni:

- `stub/` default se manca config (fail closed)
- `local/` per blob privati in non-produzione (`STORAGE_DRIVER=local`, directory `.local-storage` fuori da `public/`)
- `live/` Resend (`EMAIL_DRIVER=resend`), Cloudflare R2 (`STORAGE_DRIVER=r2`), Stripe Checkout (`PAYMENT_DRIVER=stripe`)

Nessun SDK provider importato dalle feature: solo da `src/shared/adapters/live`. L’accesso applicativo ai file **non** usa `getSignedReadUrl` del provider: token HMAC e stream da `/api/documents/file` dopo `authorize` + audit, anche con R2 privato.

```ts
export interface EmailAdapter {
  send(input: { to: string; template: string; variables: Record<string, string> }): Promise<void>;
}

export interface StorageAdapter {
  putPrivate(input: { key: string; body: Buffer; mimeType: string }): Promise<{ key: string }>;
  readPrivate(input: { key: string }): Promise<{ body: Buffer } | null>;
  getSignedReadUrl(input: { key: string; expiresInSeconds: number }): Promise<{ url: string }>;
  delete(input: { key: string }): Promise<void>;
}

export interface PaymentAdapter {
  createCheckout(input: unknown): Promise<{ providerRef: string; redirectUrl: string }>;
  parseWebhook(input: { headers: Headers; rawBody: string }): Promise<PaymentWebhookEvent>;
}

export interface MonitoringAdapter {
  captureError(error: unknown, context?: Record<string, string>): void;
}
```

SDK live solo negli adapter. Checkout Stripe hosted: nessun campo carta nel DOM. Webhook: verifica firma, niente payload grezzo nei log.

## 6. Motore requisiti

Lo stato della registrazione **non** è un campo editato a mano dall’utente. È una proiezione:

```
requirements(edition, player) + evidence(registration) → checklist → status
```

Codici: `PERSONAL_DATA`, `GUARDIAN_IF_MINOR`, `MEDICAL_CERT`, `PRIVACY`, `MEDIA_RELEASE`, `PAYMENT`.

Audience: `ALL` | `MINOR` | `ADULT`.

Questa logica vive in `features/registrations/domain` e deve essere testabile senza database.

## 7. Auth

Default foundation (documentato, modificabile):

- Email + password
- Verifica email obbligatoria prima delle azioni sensibili
- Sessioni Auth.js su cookie httpOnly
- Prisma adapter per User/Account/Session/VerificationToken

Magic link e OAuth: non in M0; vedi OPEN_DECISIONS.

L’account si crea **solo** con `PlayerInvite` valido o `StaffInvite` (rappresentante). Non esiste `/register` aperto. Reset password usa `VerificationToken` con identifier `password-reset:{email}`.

## 8. Dati estendibili del profilo

Decisione: colonne tipizzate per i campi noti + `metadata Json` per extra non ancora ufficiali.

Non si introduce un EAV `PlayerProfileField` in M0: troppa complessità per campi non definiti. Se l’organizzazione introdurrà molti campi dinamici per edizione, si rivaluta in OPEN_DECISIONS.

## 9. PWA / mobile futuro

- Domain e authz indipendenti da `window` e dai componenti.
- API route o server actions come unico ingresso mutativo.
- Nessun service worker in M0.

## 10. Logging ed errori

- Logger strutturato che **redige** CF, token, password, storage key complete, IP se policy lo richiede.
- Monitoring adapter stub (console in dev).
- Errori utente: messaggi in italiano, senza stack in UI.

## 12. Regole Responsive e Layout Space Management (2026-09-20)

Principio cardine:
- **Desktop (>= 1024px):** Sfruttamento estensivo dello spazio orizzontale. Canvas largo (`--content-max-canvas: 80rem`), affiancamento a due colonne per sezioni operative (stage principale + rail contestuale per progress, riassunti, window e azioni secondarie), riduzione drastica dello scrolling verticale immotivato.
- **Mobile (< 768px):** Priorità alla progressione verticale pulita a colonna singola (`100%` width), touch targets generosi (`--control-min: 2.75rem`), visual hierarchy lineare, nessun clipping orizzontale.
- **Transizioni fluide:** Utilizzo sistematico di `clamp()` per font sizes e paddings di pagina, evitando layout a colonna stretta centrata a desktop.

| ID | Decisione |
|---|---|
| ADR-001 | Piattaforma unica, non multi-tenant |
| ADR-002 | Feature folders, non layer tecnici globali come unica organizzazione |
| ADR-003 | Adapter per email/storage/payments/monitoring |
| ADR-004 | Stato registrazione calcolato da requisiti |
| ADR-005 | Prisma 7 + adapter `pg` |
| ADR-006 | CSS Modules + design tokens, non Tailwind |
| ADR-007 | Auth email/password + verifica; no signup pubblico |
| ADR-008 | Next.js 16 `proxy.ts` per le route autenticate |
| ADR-009 | Token invito in chiaro solo in URL/email; in DB solo SHA-256 |
| ADR-010 | Redeem di email già registrata richiede login: il token non resetta la password |
| ADR-011 | Riscatto invito marca `emailVerified` (possesso del link inviato a quell’email) |
| ADR-012 | Attach membership non degrada un ruolo squadra già presente |
| ADR-013 | Wizard a passi con flag `implemented` per sbloccare M3–M5 senza riscrivere il percorso |
| ADR-014 | File medici: token HMAC legato a `documentId`+`userId`+scadenza; stream interno; mai storage key in URL |
| ADR-015 | Gate wizard: i passi `attention` non bloccano i successivi (serve completare privacy mentre il certificato è in revisione) |
| ADR-016 | Pacchetto privacy in un passo; media con decisione esplicita accept/refuse; record in append |
| ADR-017 | Pagamenti: adapter + success interno per stub; webhook route pronta; cover dal primo SUCCEEDED |
| ADR-018 | Rosa squadra come proiezione PII-minima; notifiche in-app + email stub |
| ADR-019 | CSP con nonce sul bootstrap tema (proxy); Playwright in CI |
| ADR-020 | `StaffInvite` distinto da `PlayerInvite`; redeem senza Registration |
| ADR-021 | Stripe webhook fonte di verità; stub confirm solo con `PAYMENT_DRIVER=stub` |
| ADR-022 | Rate limit su Postgres (`RateLimitHit`), non Map in-process |
| ADR-023 | Vista compagni senza stato medico; rosa rep con stato certificato |

## 12. Nota audit M0

`npm audit --omit=dev` segnala advisory su dipendenze transitive del CLI Prisma (`deepmerge-ts`, `mysql2`). Non usiamo MySQL. `npm audit fix --force` proporrebbe Prisma 6, incompatibile. Si tiene Prisma 7 e si rivaluta a ogni upgrade del CLI.
