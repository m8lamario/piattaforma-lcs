# 09 — UI/UX Guidelines

## 1. Carattere visivo

Moderno, sportivo-istituzionale, **mobile-first**. Area personale del giocatore, non back-office anni 2000 e non sito vetrina di una coppa.

Identità di sistema: **registro di campo**. Una linea di sideline (teal/acqua) marca lockup, titoli di pagina e passi critici. Il blu resta il colore delle azioni; il verde acqua è accento e titolo hero in scuro. Nessuna card ovunque, icone solo se portano significato. L’unica eccezione al divieto di gradienti è la **navbar** (blu `#011674` → azzurro `#012BFD` → verde acqua `#00EDAF`).

Il tema segue `prefers-color-scheme` del dispositivo. Nessun toggle in interfaccia, nessun cookie o `localStorage` di preferenza. Default scuro se il sistema non esprime una preferenza chiara. Nessun flash: uno script in `<head>` applica `data-theme` prima del paint e si aggiorna se cambia lo schema di colore.

## 2. Design tokens

Tutti i colori, spazi, raggi, type scale vivono in `src/shared/ui/tokens.css` come CSS custom properties. Vietato hardcodare HEX nei componenti.

`:root` contiene i token del **tema scuro** (default). `html[data-theme="light"]` contiene il tema chiaro. Sostituire i HEX = modificare **un file**. Palette ufficiale: blu `#011674`, azzurro `#012BFD`, verde acqua `#00EDAF`.

Scuro (default):

| Token | Ruolo | Valore |
|---|---|---|
| `--color-primary` | azzurro azione su scuro | `#012BFD` |
| `--color-on-primary` | testo su primario | `#F4F8FC` |
| `--color-surface` | sfondo carbone fresco | `#0E1016` |
| `--color-surface-raised` | pannelli rari | `#181A22` |
| `--color-surface-inset` | inset / body documenti | `#0A0C12` |
| `--color-accent` / `--color-line` | verde acqua, sideline e titoli hero | `#00EDAF` |
| `--color-on-accent` | testo su accent | `#042F2E` |
| `--color-danger` | errori | `#F07171` |
| `--color-warning` | attenzione | `#E6B23C` |
| `--color-success` | ok | `#3DCE9A` |
| `--color-text` | testo | `#F4F7FB` |
| `--color-text-muted` | secondario | `#9AA3B0` |
| `--color-hairline` | divisori | `#1C1F28` |
| `--color-border` | controlli | `#2A2E38` |
| `--gradient-nav` | barra pubblica / mobile | `#011674 → #012BFD → #00EDAF` |
| `--color-hero-fg` | titolo hero | teal (`--color-accent`) |

Chiaro (`data-theme="light"`):

| Token | Ruolo | Valore |
|---|---|---|
| `--color-primary` | azzurro istituzionale | `#012BFD` |
| `--color-on-primary` | testo su primario | `#F8FBFF` |
| `--color-surface` | sfondo | `#F4F6FA` |
| `--color-surface-raised` | pannelli rari | `#FFFFFF` |
| `--color-surface-inset` | inset | `#E8ECF2` |
| `--color-accent` | acqua testuale (AA su bianco) | `#007A62` |
| `--color-line` | sideline/decoro | `#00EDAF` |
| `--color-on-accent` | testo su accent | `#F4FFFD` |
| `--color-danger` | errori | `#B42318` |
| `--color-warning` | attenzione | `#9A6700` |
| `--color-success` | ok | `#067647` |
| `--color-text` | testo | `#0F172A` |
| `--color-text-muted` | secondario | `#3D4F66` |
| `--color-hairline` | divisori | `#E4EBF3` |
| `--color-border` | controlli | `#D5DEEA` |
| `--gradient-nav` | barra pubblica / mobile | `#011674 → #012BFD → #00EDAF` |
| `--color-hero-bg` / `--color-hero-fg` | fascia hero | azzurro `#012BFD` / bianco |

Token di supporto (stessi nomi in entrambi i temi): `--color-input`, `--color-primary-soft`, `--color-danger-soft`, `--color-warning-soft`, `--color-success-soft`, `--color-focus`, `--color-glow`, `--color-skeleton`, `--color-skeleton-shine`, `--color-on-nav`, `--color-hero-muted`, `--color-hero-cta-bg`.

Alias di compatibilità nello stesso file: `--control-height` = `--control-min` (44px), `--rail-width` = `--line-width` (3px), `--color-rail` = `--color-line`.

Typography: `--font-sans` (Geist) per UI; `--font-brand` (Barlow Condensed) solo per lockup ESL e numeri di passo, in attesa del kit ufficiale (OD-044). Scale: `--text-xs` … `--text-2xl` (il 2xl resta contenuto, non display enorme). Space: `--space-1` (4px) … `--space-16` (incluso `--space-5`, `--space-10`). Radius: `--radius-xs` … `--radius-lg`; i chip usano raggi piccoli, **non** pill sui bottoni. Bottoni: `--radius-sm`. Target: `--control-min` 44px.

## 3. Layout

- Mobile: colonna singola, nav in menu, CTA sticky sul wizard.
- Tablet: contenuto max ~40–44rem nel percorso.
- Desktop: shell con nav laterale nell’area autenticata (sideline sull’item attivo); il wizard resta stretto e guidato.
- Pagine pubbliche (`/`, `/accedi`, `/invito`, `/privacy`, `/liberatorie`, informative collegate): topbar con marca LCS su gradiente; footer con Privacy, Liberatorie, Termini e Cookie.
- Hero di presentazione (landing, pannello marca del login, riquadro stato in area): in scuro titolo teal su carbone `#0E1016`; in chiaro fascia azzurra con titolo bianco. Non applicare questo trattamento ai titoli di form e wizard.
- Bottoni: **primary** azzurro/blu; **accent** verde acqua per CTA già marcate così; **secondary** fondo tenue + bordo; **ghost** trasparente; **danger** invariato nel ruolo. Hover, active, focus e disabled coerenti.
- Gerarchia di pagina: kicker tracked + titolo `--text-xl` + lead, con sideline a sinistra. Liste e checklist sono righe divise da hairline, non card innestate.

## 4. Wizard

Vietato un’unica card con tutti i campi.

- Indicatore di progresso (`completati n/m`) in type brand + percorso cliccabile (fatto / corrente / da fare / attenzione). I passi sono navigabili dopo i dati personali; si può saltare temporaneamente uno step (es. certificato) e tornarci dopo.
- Titolo umano (“I tuoi dati”) + descrizione. Icona di passo solo se identifica il tema.
- Indietro verso il passo precedente; Salva e continua; Salva ed esci.
- Campi in fieldset (identità / contatti; chi è / come lo contattiamo).
- Validazione inline dopo blur, riepilogo errori in cima (`aria-live` / `role="alert"`).
- Passo privacy: documento da leggere, versione visibile, checkbox non pre-selezionata, placeholder legale evidente.
- Passo media/liberatorie: sideline accent, titolo forte, due scelte di peso visivo simile (accetto / non accetto). Niente reject nascosto in ghost in fondo pagina. Se l’edizione rende la liberatoria obbligatoria, resta visibile solo l’accetto e il motivo.

## 5. Dashboard

- Hero: stato in linguaggio naturale (“Devi caricare il certificato medico”) + CTA primaria, con sideline teal.
- Progress visivo a segmenti (completo / da fare / attenzione), non solo percentuale.
- Percorso a elenco numerato: chip di stato (completo, attenzione, da fare) + testo + segno di forma diversa. Ogni voce porta al passo.

## 6. Stati UI obbligatori

Ogni schermata dati:

- **Skeleton** al primo load (file `loading.tsx` e sistema Skeleton: di competenza dello slice loading)
- **Empty** con copy e CTA se serve
- **Error** recuperabile (`error.tsx` + `RouteError`)
- **Success** breve (banner o inline), non un alert nativo solo

Micro-interazioni: Framer Motion su transizioni di passo e ingresso landing. Durata breve (~200–300ms), `useReducedMotion`, niente looping decorativo.

## 7. Accessibilità

- Contrasto WCAG AA sui token (reverificare se cambiano i HEX).
- Focus visibile (`--color-focus`).
- Label collegate agli input; non placeholder-as-label.
- Errori annunciabili (`role="alert"` sulle summary).
- Target touch ≥ 44px (`--control-min`).
- Non affidare informazione al solo colore (checklist: chip + testo + segno).
- Skip link verso il contenuto nell’area autenticata.

## 8. Copy

Italiano semplice, seconda persona (“Devi…”, “Manca…”). Niente burocratese. Niente “clicca qui”. I placeholder legali restano visibilmente placeholder, non finti articoli di legge.

Chiavi in `src/shared/i18n/it.ts` per non spargere stringhe magiche e per i18n futuro.

## 9. Dark pattern vietati

- Pre-selezionare consensi opzionali.
- Nascondere il reject della liberatoria.
- Confondere “Accetta tutto” con lo step privacy required.
- Timer o urgenza falsa.

## 10. Admin

L’area admin è più densa ma usa gli stessi token. Elenco a righe con chip di stato, motivo di rifiuto obbligatorio in un blocco accessibile (non un dialog nativo).

## 11. Iconografia

Un solo set in `src/shared/ui/Icon.tsx`: 24×24, stroke 1.75, cap square. Nav, passi wizard, empty state. Niente icone decorative.

## 12. Email transazionali

Tutte le email della piattaforma usano un layout HTML comune (`src/features/emails/domain/layout.ts`), con fallback testuale. Header con logo `public/logoLCSw.png`, lockup LCS / Player Hub, barra ai colori della navbar, contenuto con sideline, CTA a bottone e footer con informative. I client di posta non supportano le custom properties: i HEX del layout vivono in `src/features/emails/domain/theme.ts` e restano allineati a questo file (nav scura + contenuto del tema chiaro, per leggibilità). Niente pixel di tracking, niente Adobe Fonts nelle email (Helvetica/Arial). I testi restano in i18n; gli override admin vengono avvolti nello stesso chrome.
