# 07 — Security Guidelines

## 1. Obiettivi

Proteggere identità, dati anagrafici, dati di minori, documenti sanitari, consensi e pagamenti. Ogni feature nuova si valuta contro questo elenco.

## 2. Autenticazione

- Auth.js, cookie di sessione httpOnly, `Secure` in produzione, `SameSite=Lax` (o Strict se compatibile con webhook/redirect pagamento — i webhook non usano cookie).
- Password: hash (Argon2id o bcrypt, scelta in foundation: Argon2 se disponibile, altrimenti bcrypt).
- Verifica email prima di upload documenti e consensi vincolanti.
- Rate limit su `/accedi`, redeem invito, reset password, upload.
- `AUTH_SECRET` e DB URL solo in env. Nessun secret in client bundle.

## 3. Autorizzazione

Vedi [06-roles-and-permissions.md](06-roles-and-permissions.md). Sempre server-side. Deny by default.

## 4. Input

- Zod su ogni mutazione, client e server. Lo schema server è la fonte.
- Codice fiscale: validazione formato in M0; checksum ufficiale OPEN_DECISIONS.
- Date: respingere date future di nascita, età implausibili (es. < 10 o > 80: soglie config, non hardcode magico sparso).
- Output HTML: React di default escapa. Vietato `dangerouslySetInnerHTML` sui testi utente. I testi legali CMS sono markdown sanitizzato quando arriveranno.

## 5. Upload

- Allowlist MIME: `application/pdf`, `image/jpeg`, `image/png`.
- Verifica magic bytes, non solo `Content-Type`.
- Max size da `DocumentType` (default 10 MB).
- Nome file sanitizzato; storage key opaca (`documents/{documentId}`).
- Nessuna bucket policy pubblica.
- Antivirus: OPEN_DECISIONS; stub passa.

## 6. Documenti medici

- Mai URL pubbliche o path statici `/uploads`.
- Signed URL TTL breve (default 60 secondi).
- Ogni `DOCUMENT_VIEW` e `DOCUMENT_DOWNLOAD` in AuditLog.
- Il rappresentante non ottiene la key.

## 7. CSRF / XSS / sessioni

- Mutazioni via Server Actions o route con protezione CSRF Auth.js.
- CSP di base in headers Next (strictness incrementale).
- Logout invalida sessione server-side.

## 8. Pagamenti

- Adapter; webhook con verifica firma (quando live).
- Idempotenza su `providerPaymentId`.
- Nessun campo carta nel DOM nostro (hosted checkout).
- Non loggare payload webhook grezzi.

## 9. Logging

Loggabile: request id, user id, action, entity type/id, status code.

Non loggare: password, token, CF completo (mascherare), body documenti, Authorization headers, cookie.

## 10. Segreti

`.env` gitignored. `.env.example` senza valori reali. CI con secrets del provider.

## 11. Dipendenze e CI

- `npm audit` in CI (fail su high se praticabile).
- Typecheck e lint in CI.
- Nessuno `--no-verify`.

## 12. Checklist review sicurezza (ogni milestone)

- [ ] Nuove route protette?
- [ ] Output filtrato per ruolo?
- [ ] Upload/download sicuri?
- [ ] Segreti ok?
- [ ] Audit sulle azioni sensibili?
- [ ] Nessun dato sanitario in log/notifiche?

## 13. Esito review M0

- Route `/area` protette da `proxy.ts` + `auth()` nella pagina.
- HEX solo in `src/shared/ui/tokens.css`.
- Segreti in `.env` / `.env.example` senza valori reali.
- Logger con redazione password/token/CF/storageKey.
- Nessun upload e nessun certificato in M0.
- Residual: advisory Prisma CLI (vedi architecture §12). Non si downgrade a Prisma 6.

## 14. Esito review M1

- `/squadra` dietro sessione + `team:invite` / `team:read`.
- Token invito hashed (SHA-256); plaintext una tantum in UI rappresentante (email stub).
- Rate limit in-process su create/redeem (M7: store condiviso).
- Email già registrata: login obbligatorio, niente account takeover.
- Race redeem: `updateMany` su `PENDING`.
- Audit `INVITE_CREATE`, `INVITE_REVOKE`, `INVITE_REDEEM`, `INVITE_ATTACH`.
- Unique parziale un pending per `(teamId, email)`.
- Attach a un account esistente non degrada `TeamMembership.role` (es. rappresentante che gioca).
- Invito rifiutato in creazione se il destinatario è già in squadra o ha un’altra edizione attiva.
- `/invito` pubblico per incollare link/codice; CTA landing «Ho un invito».

## 15. Esito review M2

- `registration:write` solo sul proprio `userId`; l’ID in form è ignorato.
- CF unique: conflitto = errore, niente overwrite di un altro profilo.
- Email account in sola lettura sul passo anagrafica.
- Passi futuri visibili ma non completabili (niente false complete).
- Audit `PROFILE_UPDATE`, `GUARDIAN_SAVE`.

## 16. Esito review M3

- Upload solo con sessione, `registration:write` sul proprio profilo e `emailVerified`.
- Magic bytes PDF/JPEG/PNG; size da `DocumentType`; filename sanitizzato; blob fuori da `public/`.
- Token HMAC TTL 60s; URL senza storage key; GET 404 opaco se sessione/token/authz non coincidono.
- `DOCUMENT_UPLOAD` / `DOCUMENT_VIEW` / `DOCUMENT_APPROVE` / `DOCUMENT_REJECT` in AuditLog. View sul GET.
- Rappresentante: nessuna voce admin, `document:read_file` denied, `/admin/documenti` redirige a `/area`.
- Lista admin senza `storageKey` nel select.
- Rate limit upload 20/h (in-process).

## 17. Esito review M4

- Consensi solo con sessione, `registration:write` e `emailVerified`.
- Persistito `legalDocumentVersionId` (non un booleano isolato).
- Checkbox non preselezionate; media rifiutabile se non required.
- Audit `CONSENT_ACCEPT` / `CONSENT_REFUSE` senza body legale nei metadata.
- Testi da `content/legal/` con avviso placeholder. `guardianId` non usato come firma.

## 18. Esito review M5

- Checkout via adapter; nessun input carta.
- Conferma stub solo se pagatore autorizzato (`payment:create_player` / `payment:create_team`).
- Webhook pubblico senza cookie; payload non loggato grezzo.
- Doppio checkout rifiutato se già coperto.
- Audit `PAYMENT_CHECKOUT` / `PAYMENT_SUCCEEDED` / `PAYMENT_WEBHOOK`.

## 19. Esito review M6

- Rosa rappresentante senza CF, email, telefono, storageKey, file.
- Notifiche: niente motivo medico nel body; email stub senza payload sanitario.
- `/area/comunicazioni` autenticata.

## 20. Esito review M7

- CSP + nosniff, referrer, frame deny, permissions policy.
- Rate limit in-process su login/invito/upload/consensi/profilo (store non distribuito).
- Residuo: Playwright CI, nonce CSP, monitoring live.
