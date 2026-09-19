# 10 — Development Guidelines

## 1. Ordine di lavoro

1. Leggere constitution + spec + doc della feature.
2. Aggiornare docs se la decisione cambia.
3. Implementare.
4. Test, `tsc`, lint, build.
5. Checklist sicurezza dello slice.
6. Solo allora il task è chiuso.

## 2. Branch e commit

- Nessun commit se non richiesto esplicitamente da Mario.
- Non aggiornare git config, no force push, no `--no-verify`.

## 3. TypeScript

- `strict: true`.
- Niente `any` senza commento di uscita.
- Import alias `@/*` → `src/*`.

## 4. Componenti

- Server Components di default. `"use client"` solo per form, motion, stato locale.
- CSS Modules accanto al componente (`Button.module.css`).
- Classi semantiche; colori solo via `var(--token)`.

## 5. Validazione

- Schema Zod in `features/*/schemas`.
- Lo stesso schema (o `omit`/`pick`) sul server.
- Messaggi errore in italiano via i18n.

## 6. Database

- Prisma schema è la fonte del modello; `docs/05` si aggiorna insieme.
- Migrazioni per ogni cambio; niente `db push` in produzione.
- Prisma 7: `prisma.config.ts` + adapter `pg` + `import 'dotenv/config'`.

## 7. Authz

Ogni mutazione chiama `authorize`. Test IDOR per risorse nuove.

## 8. Feature flags / config

Importi, MIME, size, età maggiorenne, TTL signed URL, driver storage: `src/shared/config` e env (`STORAGE_DRIVER`, `SIGNED_URL_TTL_SECONDS`, `MAX_UPLOAD_BYTES`). Non sparsi.

## 9. Testi legali

Niente policy scritte nei componenti. File in `content/legal/` o DB versioni.

## 10. Dipendenze

Aggiungere una libreria solo se serve a un requisito. Provider cloud dietro adapter.

## 11. Script npm

| Script | Uso |
|---|---|
| `dev` | Next dev |
| `build` | Next build |
| `start` | Next start |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest |
| `db:generate` | prisma generate |
| `db:migrate` | prisma migrate dev |
| `db:seed` | prisma db seed |
| `db:studio` | prisma studio |

Seed di sviluppo: vedi README. Non usare le password seed fuori dal locale.

## 12. Definition of done (task)

Vedi backlog: acceptance criteria + test richiesti. “Compila” non è done.
