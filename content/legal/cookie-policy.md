**Fonte operativa:** cookie e risorse esterne effettivamente usati da questa piattaforma di iscrizione. I moduli LCS 2026-27 (checklist) chiedono un banner con rifiuto in prima schermata e nessun tracciamento prima del consenso. **Nel codice non ci sono analytics, pixel pubblicitari o plugin social.** Il banner Accetta / Rifiuta / Preferenze è implementato ma **resta nascosto** finché non esiste uno strumento non necessario. **Non è un parere legale e non è un testo firmato.**

**Mole Cup, Leonessa Cup, Colosseo Cup, Ferrea Cup, Olympius e Turas Cup**, versione 1.0 del 5 ottobre 2026. Data di entrata in vigore su questa piattaforma: **5 ottobre 2026**.

Questo documento **non** è un passo del wizard e **non** viene registrato come consenso versionato. La valutazione giuridica del banner resta aperta (OD-027). Non copre i cookie dei siti delle coppe locali.

---

## 1. Titolare

ESL **European Students League S.r.l.**, sede **Corso Vinzaglio 24, 10121 Torino**, P.IVA/C.F. **IT12974200011 / 12974200011**.

Email: **privacy@legacalciostudenti.it**. DPO: **non nominato**.

---

## 2. Cookie e storage usati oggi

I nomi Auth.js hanno il prefisso `__Secure-` o `__Host-` quando il sito è servito in HTTPS. La durata della sessione è fissata nel codice a **30 giorni** (2.592.000 secondi).

| Nome / chiave | Dove | Finalità | Durata | Parte | Qualificazione operativa |
| --- | --- | --- | --- | --- | --- |
| Sessione Auth.js. Produzione: `__Secure-authjs.session-token`. Sviluppo HTTP: `authjs.session-token`. Se il valore è molto lungo, Auth.js può dividerlo in `.0`, `.1`. | cookie HttpOnly, SameSite=Lax, Path=/, Secure su HTTPS | mantenere l’accesso all’area personale | 30 giorni dall’ultima scrittura del cookie (login; anche quando Auth.js esegue l’azione di sessione). L’interfaccia non rinnova la sessione in continuo | prima parte | tecnico |
| CSRF Auth.js. Produzione: `__Host-authjs.csrf-token`. Sviluppo HTTP: `authjs.csrf-token` | cookie HttpOnly, SameSite=Lax, Path=/, Secure su HTTPS | proteggere il flusso di accesso | sessione del browser (nessun Max-Age) | prima parte | tecnico |
| Ritorno dopo il login. Produzione: `__Secure-authjs.callback-url`. Sviluppo HTTP: `authjs.callback-url` | cookie HttpOnly, SameSite=Lax, Path=/, Secure su HTTPS | tornare alla pagina richiesta dopo il login | sessione del browser (nessun Max-Age) | prima parte | tecnico |
| `eph-team` | cookie HttpOnly, SameSite=Lax, Path=/, Secure su HTTPS | ricordare la squadra selezionata dal rappresentante, tra quelle già autorizzate. Un valore non autorizzato viene ignorato. Si cancella all’uscita dall’account | 365 giorni | prima parte | tecnico, per la funzione di selezione squadra |
| Checkout Stripe, solo dopo il redirect e solo se i pagamenti Stripe sono attivi | dominio del fornitore, non su questo sito. Stripe.js non è caricato qui | pagamento della quota | secondo l’[informativa cookie di Stripe](https://stripe.com/it/legal/cookies-policy) | terza parte | da confermare sull’informativa del fornitore |
| `eph-cookie-consent` | cookie HttpOnly di prima parte, previsto solo se esistono strumenti non necessari | ricordare Accetta, Rifiuta o le singole categorie | 180 giorni, **non impostato** nella versione attuale | prima parte | tecnico di gestione del consenso, oggi assente |

Tema grafico: segue `prefers-color-scheme` del dispositivo. Lo script in pagina **non** usa cookie, `localStorage` o `sessionStorage`. Se il browser ha ancora un cookie residuo `eph-theme`, la piattaforma lo cancella.

`localStorage` nel codice server (`localStorageAdapter`) è la cartella di sviluppo dei file, non il Web Storage del browser.

Non risultano nel codice applicativo: Google Analytics, Matomo, Plausible, PostHog, Sentry; pixel Meta, TikTok o LinkedIn; widget social; captcha di terze parti; video embed. I cookie Auth.js di PKCE, state, nonce e WebAuthn non vengono usati: l’unico accesso è email e password.

L’app chiede al browser di non usare fotocamera, microfono, geolocalizzazione e Payment Request API. La policy di sicurezza della pagina consente script e connessioni solo verso questa origine, oltre ai fogli e ai font Adobe indicati sotto.

### Risorsa esterna caricata subito

Adobe Fonts, kit `ajb7nmd` (`https://use.typekit.net/ajb7nmd.css`), fornisce Helvetica LT Pro e Komu. Il foglio di stile importa anche `https://p.typekit.net/p.css` (conteggio di pageview del kit). Domini: `use.typekit.net` e `p.typekit.net`. Fornitore: Adobe.

Una richiesta diretta al foglio di stile, al ping e a un file del font **non** ha restituito l’header `Set-Cookie`. Il codice di questa piattaforma non imposta cookie Adobe. Se il browser ha già una sessione Adobe, il comportamento resta **da confermare**. La richiesta parte al primo caricamento di ogni pagina, prima di qualunque scelta, perché i font fanno parte dell’interfaccia e non esiste uno strumento di tracciamento da bloccare. Informativa del fornitore: [Adobe Fonts privacy](https://www.adobe.com/privacy/policies/adobe-fonts.html). Il trasferimento verso Adobe (Stati Uniti) e l’eventuale accordo art. 28 sono **da confermare**: Adobe non è nell’elenco fornitori del modulo F.

---

## 3. Base giuridica e banner

Classificazione operativa: i cookie di sessione, CSRF, ritorno dopo il login e `eph-team` sono tecnici. La base giuridica definitiva è **[INSERIRE BASE GIURIDICA DEI COOKIE TECNICI]**.

Non ci sono cookie non tecnici. Se ne venissero aggiunti, restano spenti finché la persona non registra una scelta.

Il banner Accetta / Rifiuta / Preferenze non viene mostrato: nel codice non ci sono analytics, marketing o profilazione. Il componente resta nascosto finché quell’elenco è vuoto. La conferma del legale su questa scelta resta aperta (OD-027). Questa pagina non afferma che «i cookie tecnici non richiedono consenso».

La scelta, quando servirà, si modifica o si revoca da questa pagina. Revocare riporta allo stato «nessuna scelta» e rispegne gli strumenti non necessari. Uscire dall’account non è la revoca di un consenso cookie: chiude la sessione e cancella `eph-team`.

---

## 4. Come gestirli

- Logout: invalida la sessione lato applicazione e cancella `eph-team`.
- Browser: elimina o blocca i cookie dalle impostazioni. [Chrome](https://support.google.com/chrome/answer/95647), [Firefox](https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox), [Edge](https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09), [Safari](https://support.apple.com/guide/safari/sfri11471/mac).
- Non usiamo un identificativo pubblicitario proprio.

---

## 5. Terze parti e trasferimenti

Checkout: se attivo, cookie e dati sul dominio Stripe seguono la sua [informativa cookie](https://stripe.com/it/legal/cookies-policy) e la sua [informativa privacy](https://stripe.com/it/privacy). Il pagamento si apre sul sito di Stripe solo quando la persona avvia il checkout.

Email e storage file non impostano cookie di tracciamento in questa app. Le email sono testo semplice, senza pixel di apertura. I certificati sono letti dal server e consegnati da questa piattaforma (`/api/documents/file`), non dal dominio dello storage nel browser. Confermato nel codice dell’app: Resend invia solo testo, senza pixel di apertura; i file non sono aperti dal browser sul dominio R2. Tracking nel pannello Resend e cookie aggiunti dall’hosting Vercel restano fuori da questo codice. Trasferimenti extra-UE: vedi [informativa privacy](/privacy). Adobe Fonts: vedi la sezione 2.

---

## 6. Aggiornamenti

Ogni nuovo SDK, analytics o pixel deve aggiornare questo documento (nuova versione) **prima** del rilascio e deve passare dal blocco del consenso. La versione in vigore è su [/cookie](/cookie).

---

## 7. Altri documenti

Integra l’[informativa privacy](/privacy). Non sostituisce la [Liberatoria](/liberatorie) né le [condizioni](/termini).
