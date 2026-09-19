# Informativa cookie e tracciamenti

**Questo testo è un placeholder di piattaforma. Non è un’informativa cookie valida. Non è un parere giuridico. Non dichiara che il banner sia o non sia dovuto.**

**[INSERIRE INFORMATIVA COOKIE UFFICIALE]**

**[INSERIRE TESTO INFORMATIVA COOKIE]**

**[INSERIRE DATA DI ENTRATA IN VIGORE DELLA VERSIONE UFFICIALE]**

---

## 1. Che cosa regola questo documento

**[INSERIRE OGGETTO: COOKIE, STORAGE LOCALE, PIXEL, SDK]**

Pagine pubbliche e area autenticata della piattaforma di iscrizione. Non copre i cookie dei siti delle coppe locali (repository distinti).

In v1 **non** è implementato un banner cookie e **non** risultano analytics, advertising pixel o SDK di social plugin nel codice applicativo. **[INSERIRE SE INTRODURRE BANNER, E CON QUALI CATEGORIE]**

Questo documento **non** è un passo del wizard e **non** viene registrato come `ConsentRecord`. Eventuale consenso cookie (se il legale lo riterrà necessario) è una decisione aperta di prodotto.

---

## 2. Titolare e contatti

- Titolare: **[INSERIRE NOME TITOLARE DEL TRATTAMENTO]**
- Email: **[INSERIRE EMAIL PRIVACY]**
- DPO: **[INSERIRE DPO / CONTATTO PRIVACY SE PRESENTE]**

---

## 3. Cookie e storage oggi usati dal prodotto

Elenco **operativo** da far qualificare al legale (tecnico / non tecnico, durata, terza parte). I nomi Auth.js possono avere prefisso `__Secure-` in produzione HTTPS.

| Nome / chiave | Dove | Finalità operativa | Durata operativa | Prima / terza parte | **[INSERIRE QUALIFICAZIONE LEGALE]** |
|---------------|------|--------------------|------------------|---------------------|--------------------------------------|
| `eph-theme` | cookie (path `/`, `SameSite=Lax`, `max-age` 1 anno) e `localStorage` di fallback | ricordare tema chiaro/scuro | 1 anno circa | prima parte (questa app) | **[INSERIRE SE STrettamente NECESSARIO]** |
| Cookie di sessione Auth.js (nome tipico `authjs.session-token`) | cookie httpOnly | mantenere l’accesso all’area | **[INSERIRE DURATA SESSIONE AUTH.JS IN PROD]** | prima parte | **[INSERIRE]** |
| Cookie CSRF Auth.js (nome tipico `authjs.csrf-token`) | cookie | protezione CSRF del flusso auth | **[INSERIRE]** | prima parte | **[INSERIRE]** |
| `authjs.callback-url` (nome tipico) | cookie | ritorno post-login | **[INSERIRE]** | prima parte | **[INSERIRE]** |
| Cookie del provider di pagamento | dominio del provider, dopo redirect al checkout | pagamento quota | **[INSERIRE QUANDO IL PROVIDER SARÀ SCELTO]** | terza parte | **[INSERIRE]** |
| Cookie email / monitoring / storage | **[INSERIRE QUANDO LIVE]** | **[INSERIRE]** | **[INSERIRE]** | **[INSERIRE]** | **[INSERIRE]** |

**[INSERIRE TABELLA UFFICIALE CON NOMI ESATTI RILEVATI IN PRODUZIONE]**

Non risultano in v1 (da confermare a ogni rilascio):

- Google Analytics / Matomo / analoghi: **[INSERIRE: ASSENTI / DA INTRODURRE]**
- pixel Meta / TikTok / LinkedIn: **[INSERIRE]**
- widget social embed: **[INSERIRE]**
- captcha di terze parti: **[INSERIRE]**
- video embed YouTube in pagine pubbliche: **[INSERIRE]**

Permissions-Policy del prodotto svuota camera, microfono, geolocalizzazione e payment nel browser dell’app. **[INSERIRE SE RILEVANTE PER QUESTA INFORMATIVA]**

---

## 4. Base giuridica e consenso

**[INSERIRE BASE GIURIDICA COOKIE TECNICI]**

**[INSERIRE BASE GIURIDICA EVENTUALI COOKIE NON TECNICI]**

**[INSERIRE SE È DOVUTO UN BANNER CON ACCETTA/RIFIUTA E PREFERENZE GRANULARI]**

Finché esistono solo cookie di tema e di autenticazione, **[INSERIRE VALUTAZIONE DEL LEGALE]**. Non si afferma che «i cookie tecnici non richiedono consenso».

---

## 5. Come gestire cookie e storage

**[INSERIRE ISTRUZIONI BROWSER]**

- Tema: il toggle in intestazione riscrive `eph-theme`. **[INSERIRE SE DEVE ESISTERE UN PULSANTE «CANCELLA PREFERENZA»]**
- Sessione: il logout invalida la sessione lato applicazione secondo Auth.js.
- Browser: **[INSERIRE LINK DI ISTRUZIONI PER I PRINCIPALI BROWSER]**
- Non tracciamo un identificativo pubblicitario proprio.

---

## 6. Trasferimenti e terze parti

**[INSERIRE TRASFERIMENTI LEGATI A COOKIE DI TERZE PARTI]**

Checkout e webhook: quando il payment adapter sarà live, i cookie e i dati sul dominio del provider seguono l’informativa di quel provider. **[INSERIRE NOME PAYMENT PROVIDER E LINK]**

---

## 7. Aggiornamenti

Ogni nuovo SDK, analytics o pixel **deve** aggiornare questo documento (nuova versione) **prima** del rilascio. **[INSERIRE PROCESSO INTERNO]**

---

## 8. Rapporto con le altre informative

Integra `privacy-policy`. Non sostituisce `media-release` (pubblicazione di immagini) né `terms`.

---

## 9. Luogo e data

- **[INSERIRE LUOGO]**
- **[INSERIRE DATA]**
- **[INSERIRE NOME E RUOLO DI CHI APPROVA IL TESTO UFFICIALE]**
