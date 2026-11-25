# Audit performance — Lega Calcio Studenti

Branch: `perf/mobile-lcp`. Data della verifica: 25 novembre 2026.

Stack verificato nel repository: Next.js 16.3.5, React 19.2.8, TypeScript, Prisma 7.10, PostgreSQL, Auth.js 5, CSS Modules, Framer Motion, Stripe. Il gate HTTP è `src/proxy.ts` (non esiste `middleware.ts`). L’isolamento tra competizioni è `editionId` su registrazioni, squadre e pagamenti, non un `leagueId`.

Lighthouse 13 misura un laboratorio (Slow 4G simulato, Moto G Power). Vercel Speed Insights resta il segnale sul campo.

## 1. Stato iniziale della piattaforma

Speed Insights (eventi / RES) usato come priorità di indagine:

| Route | Eventi | RES |
|---|---:|---:|
| `/area` | 262 | 79 |
| `/area/registrazione/certificato` | 67 | 88 |
| `/area/squadra` | 37 | 86 |
| `/area/registrazione/pagamento` | 34 | 70 |
| `/richiedi-accesso` | 28 | 55 |
| `/area/registrazione/privacy` | 27 | 70 |
| `/verifica-email` | 27 | 76 |
| `/lega` | 15 | 86 |

Lighthouse 13.6.0 mobile (Moto G Power), misura fornita all’avvio dell’audit, URL non indicato. Coincidono con le pagine pubbliche che condividono l’hero (`/` e `/richiedi-accesso`), non con `/area` (nessuna foto):

| Metrica | Prima | Obiettivo |
|---|---:|---:|
| Performance | 78 | 90+ |
| FCP | 2,3 s | < 1,8 s |
| LCP | 5,0 s | < 2,5 s |
| TBT | 20 ms | < 200 ms |
| CLS | 0 | < 0,1 |
| Speed Index | 3,1 s | < 3,0 s |

Accessibility 100, Best Practices 100, SEO 100.

## 2. Problemi individuati

- **CRITICO** — LCP delle landing: contenuto e foto partivano invisibili (`opacity: 0`) finché non arrivava il JavaScript di Framer Motion.
- **CRITICO** — Prima slide mobile `vertical.webp` ~334 KB a 1565×2783, senza `fetchPriority`. Desktop `horizontal.webp` ~1,2 MB. Le altre verticali (fino a ~720 KB) partivano al cambio slide.
- **ALTO** — `proxy.ts` chiamava `auth()` su ogni HTML, anche `/` e `/richiedi-accesso` senza sessione.
- **ALTO** — `AdminViewBanner` nel root layout chiamava `getRequestIdentity()` su ogni pagina pubblica.
- **ALTO** — `loadPlayerWorkspace` spezzava un `include` Prisma in circa 19 query su `/area`, wizard, pagamenti e upload.
- **ALTO** — Rosa: storico append-only di consensi e pagamenti per tutta la squadra; `LiveRefresh` rifaceva `router.refresh()` ogni 15 s.
- **ALTO** — Schede `/lega/giocatori/[id]` e `/lega/scuole/[id]`: caricavano tutte le registrazioni dell’edizione e filtravano in memoria.
- **ALTO** — URL firmati dei certificati: una lettura per id più `getDocumentById` con l’utente intero.
- **ALTO** — `SchoolLanding` era un unico Client Component (FAQ, hero, form, Framer Motion, oggetto `it`).
- **ALTO** — Passo privacy: `react-markdown` e `remark-gfm` finivano nel bundle client.
- **MEDIO** — Indici assenti sui filtri caldi (coda certificati, invii rosa, liste `/lega`, FK della richiesta scuola, pagatore).
- **MEDIO** — `findOrCreateSchool` leggeva tutte le scuole e confrontava in memoria.
- **MEDIO** — Logo `FieldMark` nascosto con `display: none` ma comunque richiesto.
- **BASSO** — Typekit Adobe in `<link rel="stylesheet">` render-blocking. I file del kit non sono nel repo; la licenza non è nel codice.

## 3. Cause tecniche

1. L’elemento LCP (foto o titolo) non era candidato al primo paint: `motion` montava `main` e la slide con `initial={{ opacity: 0 }}`.
2. Il telefono scaricava una verticale sovradimensionata; il carosello da 4 s faceva partire le altre.
3. Typekit e i CSS dell’app bloccano il first paint. Lo stylesheet Adobe costa circa 780 ms stimati da Lighthouse sul laboratorio locale.
4. Auth.js sul proxy e l’identità admin nel layout allungano il TTFB delle pagine pubbliche anche per gli ospiti.
5. Prisma 7 con `include` profondi genera round-trip multipli verso Neon. `react.cache()` su `loadPlayerWorkspace` non è applicabile: le server action lo rileggono dopo una scrittura nella stessa request.
6. Liste e schede di lega riusavano il dataset completo dell’edizione. La rosa includeva lo storico dei consensi.
7. Il markdown legale era importato da un `"use client"`. `SchoolLanding` importava l’intero catalogo i18n nel grafo client.

## 4. Route maggiormente penalizzate

| Route | Perché |
|---|---|
| `/richiedi-accesso` | RES 55. Stesso hero delle landing + form client. LCP = foto. |
| `/` | Stesso hero. Misura Lighthouse iniziale allineata a questa famiglia. |
| `/area` | Più usata (262 eventi). TTFB: proxy + `loadPlayerWorkspace`. Nessuna foto. |
| `/area/registrazione/pagamento` | RES 70. Stesso workspace. |
| `/area/registrazione/privacy` | RES 70. Workspace + markdown nel client. |
| `/area/squadra` | Rosa pesante + refresh a 15 s. |
| `/lega` e schede | Dataset edizione intero sulle schede. |

`/area`, wizard, pagamenti, certificati e admin autenticati non sono stati cliccati in questo giro: non c’era una sessione locale. Il proxy reindirizza `/area` a `/accedi?next=%2Farea`.

## 5. Problemi di immagini e caricamento mobile

Pesi in `public/img/` prima → dopo (WebP qualità alta, verticale max 900 px, orizzontale max 1600 px):

| File | Prima | Dopo |
|---|---:|---:|
| `vertical.webp` | 342 KB | 93 KB |
| `vertical-02.webp` | 686 KB | 153 KB |
| `vertical-03.webp` | 703 KB | 148 KB |
| `vertical-04.webp` | 737 KB | 140 KB |
| `vertical-05.jpeg` | 333 KB | sostituito da `vertical-05.webp` 83 KB |
| `horizontal.webp` | 1,26 MB | 212 KB |
| `horizontal-02.webp` | 203 KB | 124 KB |

Prima slide: `fetchPriority="high"`, `loading="eager"`, `decoding="auto"`. Slide successive: lazy, senza preload. Preload Server Component della sola prima coppia, con `media` mobile/desktop. `width`/`height` aggiornati per tenere il CLS basso.

Lighthouse 13.6.0 su `/` in emulazione mobile ha scaricato **solo** `/img/vertical.webp` (93,8 KB, priorità High, discoverable, `fetchpriority=high`). L’elemento LCP è l’`<img>` dell’hero.

Rimosso `FieldMark` (`Image` con `display: none`).

## 6. Problemi frontend

- `SchoolLanding` e `LandingHero` erano Client Component con fade-in. Ora sono Server Component; il carosello vive in `HeroPhotoStage` con `initial={false}` sul primo fotogramma.
- FAQ e copy di `/richiedi-accesso` restano sul server. `SchoolAccessForm` riceve le stringhe come props e non importa l’oggetto `it`.
- `LegalProse` resta server: il passo privacy e i form tutore ricevono `document.prose` già renderizzato. `react-markdown` non entra nel bundle del wizard.
- Typekit resta bloccante. Un tentativo di caricarlo con `media="print"` ha portato il CLS di `/richiedi-accesso` a 0,241; lo stylesheet è stato ripristinato. Self-host dei file Adobe è fuori da questo intervento.

## 7. Problemi backend

- `proxy`: `auth()` solo se il path è `/area`, `/squadra`, `/admin`, `/lega` oppure è presente un cookie di sessione Auth.js (incluso il chunk `.0`). I redirect degli ospiti sulle aree protette restano.
- `AdminViewBanner`: senza cookie di sessione non chiama `getRequestIdentity()`.
- `loadPlayerWorkspace`: una `registration.findFirst` con `select` annidati in parallelo a `isPartnerBoxVisible()`. Stesso oggetto, stessi filtri `playerProfile.userId`. Nessuna `cache()` di request, nessun `unstable_cache`.
- `getPlayerAdmin`: `select` sui campi della scheda admin; la checklist e i flag pubblicazione restano sul workspace.
- Hub layout: autorizza prima dei figli. Nessuno streaming che faccia intravedere `/area` a un supervisore.

## 8. Query e API ottimizzate

| Funzione | Intervento | Cosa resta invariato |
|---|---|---|
| `loadPlayerWorkspace` | Nested `select` al posto dell’`include` a 19 query | Filtro utente, checklist, nessuna cache |
| `listTeamRoster` | Ultima scelta per `code`, pagamenti `SUCCEEDED` `take: 1`, versioni legali correnti | Filtro `teamId`; il rappresentante vede lo stato del certificato, non il file |
| `getLeaguePlayer` | Una registrazione `id + editionId` + conteggio squadre della scuola | Deny + audit `LEAGUE_ACCESS_DENIED` |
| `getLeagueSchool` | `where` `editionId` + `schoolId` | Stesso deny/audit |
| `listLeagueWorkspace` | Invariato, liste complete | Un `take` cieco nasconderebbe iscritti |
| `listDocumentsForFileAccess` | `findMany` sugli id, `ownerUserId` + `teamId` | Autorizzazione `document:read_file` in memoria |
| `createSignedDocumentUrl(s)Action` | Una lettura batch, niente seconda `getDocumentById` | Download originale in `/api/documents/file`, `Cache-Control: no-store` |
| `findOrCreateSchool` | Filtro `name` case-insensitive, poi `schoolsMatch` | Stessa uguaglianza di dominio |
| Indici Prisma | Migrazione additiva `0024_performance_indexes` | Nessun cambio di colonne |

## 9. File modificati

Nuovi: `src/features/auth/ui/HeroPhotoPreload.tsx`, `HeroPhotoStage.tsx`, `src/features/consents/ui/consentDocument.ts`, `consentDocumentView.tsx`, `prisma/migrations/0024_performance_indexes/migration.sql`, `public/img/vertical-05.webp`, questo report.

Rimossi: `src/shared/ui/FieldMark.tsx`, `FieldMark.module.css`, `public/img/vertical-05.jpeg`.

Modificati: `src/proxy.ts`, `src/shared/cookies/inventory.ts`, `inventory.test.ts`, `src/app/page.tsx`, `src/app/richiedi-accesso/page.tsx`, `src/app/(hub)/area/registrazione/[step]/page.tsx`, `src/app/autorizzazione-genitore/[token]/page.tsx`, `src/features/admin-view/ui/AdminViewBanner.tsx`, `src/features/admin/data/catalog.ts`, `src/features/auth/ui/LandingHero.tsx`, `heroPhotos.ts`, `src/features/consents/ui/LegalReader.tsx`, `PrivacyConsentForm.tsx`, `MediaConsentForm.tsx`, `GuardianAuthorizeForm.tsx`, `GuardianWaitingView.tsx`, `src/features/documents/actions.ts`, `data/documents.ts`, `src/features/league/data/overview.ts`, `src/features/registrations/data/workspace.ts`, `src/features/school-access/data/requests.ts`, `ui/SchoolAccessForm.tsx`, `ui/SchoolLanding.tsx`, `src/features/teams/data/roster.ts`, `ui/LiveRefresh.tsx`, `prisma/schema.prisma`, file in `public/img/*.webp`.

`src/app/layout.tsx` è rimasto con Typekit bloccante.

## 10. Ottimizzazioni implementate

1. Hero ricompresso, visibile al primo paint, preload solo della prima coppia, lazy sulle slide successive.
2. Pagine pubbliche senza cookie: niente `auth()` né identità admin.
3. Workspace in due query parallele, stesso risultato.
4. Isola client più piccole sulle landing e sul passo privacy.
5. Rosa e schede lega alleggerite, RBAC e `editionId` invariati. Refresh della rosa su focus/visibilità, senza intervallo da 15 s.
6. URL firmati in batch; `findOrCreateSchool` filtrato; indici additivi.

Non toccati: Auth.js e cookie JWT, `lifecycleStatus === ACTIVE`, `authorize` / `requirePageUser`, filtro `editionId` del supervisore, file medici originali, audit log, Stripe Checkout e webhook, consensi versionati, guard read-only della vista admin.

## 11. Test effettuati

- `npm run typecheck` — ok.
- `npm run lint` — ok.
- `npm test` — 456/457 al primo giro; il test `guardianAuth.db.test.ts` «rifiuto, poi modifica, poi accettazione» è andato in timeout 5 s (Resend 403 sul dominio `example.test`, già flaky). Rilancio isolato: 4/4 ok. Isolamento edizione: `overview.db.test.ts` ok.
- `npm run build` — ok (Next.js 16.3.5 Turbopack).
- Browser su `http://127.0.0.1:3001` (build di produzione):
  - `/` — titolo, hero, link «Richiedi accesso», `main` con opacity 1.
  - `/richiedi-accesso` — hero, FAQ, form compilabile (campo Nome = «Mario»). Preload `vertical.webp` (`max-width: 959px`) e `horizontal.webp` (`min-width: 960px`).
  - `/area` — redirect a `/accedi?next=%2Farea`. Nessuna sessione locale: non sono stati cliccati dashboard, wizard, pagamenti, upload certificati né admin.

## 12. Metriche prima/dopo

Condizioni dopo: Lighthouse **13.6.0**, `--form-factor=mobile`, emulazione 412×823 dsf 1,75 (Moto G Power), `next start` su `127.0.0.1:3001`, categorie performance / accessibility / best-practices / seo.

### `/`

| Metrica | Prima (audit) | Dopo | Obiettivo |
|---|---:|---:|---:|
| Performance | 78 | **86** | 90+ |
| FCP | 2,3 s | **2,1 s** | < 1,8 s |
| LCP | 5,0 s | **3,9 s** | < 2,5 s |
| TBT | 20 ms | **40 ms** | < 200 ms |
| CLS | 0 | **0,02** | < 0,1 |
| Speed Index | 3,1 s | **2,1 s** | < 3,0 s |
| TTFB documento | — | 10 ms | — |

Accessibility 100, Best Practices 100, SEO 100. LCP: `vertical.webp`. Insight discovery LCP: `fetchpriority=high`, request discoverable, niente lazy load. Render-blocking stimato 1,48 s, di cui Typekit ~786 ms e `p.typekit.net` ~759 ms.

### `/richiedi-accesso`

Non c’era una misura Lighthouse distinta all’avvio (solo RES 55 sul campo). Dopo, stesse condizioni:

| Metrica | Dopo | Obiettivo |
|---|---:|---:|
| Performance | **82** | 90+ |
| FCP | **2,2 s** | < 1,8 s |
| LCP | **4,4 s** | < 2,5 s |
| TBT | **100 ms** | < 200 ms |
| CLS | **0,043** | < 0,1 |
| Speed Index | **2,2 s** | < 3,0 s |
| TTFB documento | 160 ms | — |

Accessibility 100, Best Practices 96 (issue CSP nel pannello Issues di Chrome su HTTP locale), SEO 100. Stesso LCP `vertical.webp`. JS trasferito ~370 KB contro ~277 KB della home. Render-blocking stimato 1,45 s (Typekit).

TBT e CLS restano dentro obiettivo. Performance, FCP e LCP no: il collo di bottiglia rimasto in laboratorio è Typekit + CSS bloccanti, non il peso della foto (93 KB, priorità alta).

## 13. Problemi ancora aperti

- **ALTO** — Typekit Adobe render-blocking. Self-host dei file (kit `ajb7nmd`) richiede i binari e la licenza Adobe, assenti dal repo. Il caricamento asincrono alza il CLS del titolo script sulla landing scuole.
- **ALTO** — LCP laboratorio ancora sopra 2,5 s su Slow 4G anche con foto visibile e piccola. Speed Insights dirà se sul campo (4G reale, cache) il RES di `/richiedi-accesso` sale.
- **MEDIO** — Liste `/lega` e admin: tutte le righe dell’edizione. Un `take` cieco nasconderebbe iscritti; serve paginazione esplicita.
- **MEDIO** — `completeStubPayment` in `src/features/payments/data/complete.ts` rilancia il workspace per ogni compagno dopo un pagamento squadra.
- **MEDIO** — Split completo di `it.ts` (~129 KB, poco tree-shakeable) oltre le stringhe già passate come props al form scuole.
- **BASSO** — `guardianAuth.db.test.ts` può superare i 5 s quando Resend risponde 403 sul dominio di test.
- **BASSO** — Best Practices 96 su `/richiedi-accesso` in HTTP locale (CSP in DevTools). Da rivedere su HTTPS di produzione.

## 14. Interventi infrastrutturali consigliati

1. Ottenere i file licensed del kit Adobe e servirli con `next/font/local` (o sottoinsieme WOFF2 self-hosted), poi togliere lo stylesheet Typekit dal critical path.
2. Applicare la migrazione `0024_performance_indexes` in staging e produzione prima del deploy di questo branch.
3. Tenere Speed Insights su `/richiedi-accesso` e `/area` per una settimana dopo il rilascio: Lighthouse non sostituisce il RES reale.
4. Paginare le liste lega/admin con UI esplicita (pagina successiva, conteggio totale), senza tagliare in silenzio.
5. Ridurre i round-trip di `completeStubPayment` dopo un pagamento di squadra.
6. Non introdurre `unstable_cache` su dati di utente, squadra o edizione. Non streamare il layout hub prima dell’autorizzazione.
