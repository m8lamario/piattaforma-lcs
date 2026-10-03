**Fonte operativa:** cookie e storage effettivamente usati da questa piattaforma di iscrizione. I moduli LCS 2026-27 (checklist) chiedono un banner con rifiuto in prima schermata e nessun tracciamento prima del consenso. **In v1 il banner non è implementato** e nel codice applicativo **non** risultano analytics, pixel pubblicitari o plugin social. **Non è un parere legale e non è un testo firmato.**

**[INSERIRE NOME TORNEO]**, versione 1.0 del 1 ottobre 2026. Data di entrata in vigore su questa piattaforma: **[INSERIRE DATA DI ENTRATA IN VIGORE]**.

Questo documento **non** è un passo del wizard e **non** viene registrato come consenso versionato. Eventuale consenso cookie, se dovuto, è una decisione aperta (OD-027). Non copre i cookie dei siti delle coppe locali.

---

## 1. Titolare

ESL **[INSERIRE RAGIONE SOCIALE]**, sede **[INSERIRE SEDE LEGALE]**, P.IVA/C.F. **[INSERIRE P.IVA / CODICE FISCALE]**.

Email: **[INSERIRE EMAIL PRIVACY]**. DPO: **[INSERIRE NOME E EMAIL DPO, OPPURE «non nominato»]**.

---

## 2. Cookie e storage usati oggi

I nomi Auth.js possono avere il prefisso `__Secure-` in produzione HTTPS. Durata sessione Auth.js (JWT): default di libreria 30 giorni, salvo configurazione diversa. **[INSERIRE DURATA SESSIONE IN PRODUZIONE]**.

| Nome / chiave | Dove | Finalità | Durata | Parte | Qualificazione |
| --- | --- | --- | --- | --- | --- |
| Cookie di sessione Auth.js (tipico `authjs.session-token`) | cookie httpOnly | mantenere l’accesso all’area personale | **[INSERIRE]** | prima parte | **[INSERIRE: TECNICO / ALTRO]** |
| Cookie CSRF Auth.js (tipico `authjs.csrf-token`) | cookie | protezione del flusso di accesso | **[INSERIRE]** | prima parte | **[INSERIRE]** |
| `authjs.callback-url` (tipico) | cookie | ritorno dopo il login | **[INSERIRE]** | prima parte | **[INSERIRE]** |
| Cookie del checkout (dominio del fornitore, dopo il redirect) | terza parte, solo se i pagamenti sono attivi | pagamento della quota | secondo l’informativa del fornitore | terza parte | **[INSERIRE]** |
| `eph-team` | cookie prima parte | ricordare la squadra selezionata dal rappresentante | sessione / persistenza di interfaccia | prima parte | **[INSERIRE SE STRETTAMENTE NECESSARIO]** |

Tema grafico: segue `prefers-color-scheme` del dispositivo; l’app **non** imposta un cookie di preferenza.

Non risultano in v1 (da confermare a ogni rilascio): Google Analytics / Matomo; pixel Meta / TikTok / LinkedIn; widget social embed; captcha di terze parti; video embed YouTube nelle pagine pubbliche.

L’app chiede al browser di non usare fotocamera, microfono, geolocalizzazione e Payment Request API.

---

## 3. Base giuridica e banner

**[INSERIRE BASE GIURIDICA DEI COOKIE TECNICI]**

**[INSERIRE BASE GIURIDICA DI EVENTUALI COOKIE NON TECNICI]**

I moduli LCS (checklist file 08) chiedono: banner con rifiuto in prima schermata, nessun tracciamento prima del consenso, cookie tecnici liberi (Linee guida Garante 10 giugno 2021). **[INSERIRE SE È DOVUTO UN BANNER CON ACCETTA/RIFIUTA E PREFERENZE]**

Finché esistono solo cookie di autenticazione e di interfaccia, **[INSERIRE VALUTAZIONE DEL LEGALE]**. Questa pagina non afferma che «i cookie tecnici non richiedono consenso».

---

## 4. Come gestirli

- Logout: invalida la sessione lato applicazione.
- Browser: elimina o blocca i cookie dalle impostazioni del browser. **[INSERIRE LINK DI ISTRUZIONI PER I PRINCIPALI BROWSER]**.
- Non usiamo un identificativo pubblicitario proprio.

---

## 5. Terze parti e trasferimenti

Checkout: se attivo, cookie e dati sul dominio del fornitore seguono la sua informativa. **[INSERIRE LINK]**.

Email e storage file, se attivi, non impostano cookie di tracciamento in questa app. **[INSERIRE CONFERMA]**. Trasferimenti extra-UE: vedi [informativa privacy](/privacy).

---

## 6. Aggiornamenti

Ogni nuovo SDK, analytics o pixel deve aggiornare questo documento (nuova versione) **prima** del rilascio. La versione in vigore è su [/cookie](/cookie).

---

## 7. Altri documenti

Integra l’[informativa privacy](/privacy). Non sostituisce la [Liberatoria](/liberatorie) né le [condizioni](/termini).
