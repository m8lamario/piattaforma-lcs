# 09 — UI/UX Guidelines

## 1. Carattere visivo

Moderno, sportivo-istituzionale, **mobile-first**. Area personale del giocatore, non back-office anni 2000 e non sito vetrina di una coppa.

Identità di sistema: **registro di campo**. Una linea di sideline (teal/acqua) marca lockup, titoli di pagina e passi critici. Il blu resta il colore delle azioni. Nessuna card ovunque, niente gradienti decorativi, icone solo se portano significato.

Il tema **predefinito è scuro**. L’utente può passare al chiaro (e viceversa) da un controllo persistente in header. La scelta è salvata nel cookie `eph-theme` (e in `localStorage` come fallback). Nessun flash: uno script in `<head>` applica il tema prima del paint.

## 2. Design tokens

Tutti i colori, spazi, raggi, type scale vivono in `src/shared/ui/tokens.css` come CSS custom properties. Vietato hardcodare HEX nei componenti.

`:root` contiene i token del **tema scuro** (default). `html[data-theme="light"]` contiene il tema chiaro. Sostituire i HEX = modificare **un file**.

Placeholder scuro (default):

| Token | Ruolo | Valore temporaneo |
|---|---|---|
| `--color-primary` | blu azione su scuro | `#3A7BD5` |
| `--color-on-primary` | testo su primario | `#F4F7FB` |
| `--color-surface` | sfondo | `#071018` |
| `--color-surface-raised` | pannelli rari | `#0C1A28` |
| `--color-surface-inset` | inset / body documenti | `#050C14` |
| `--color-accent` / `--color-line` | teal/acqua, sideline | `#2EC9B3` |
| `--color-on-accent` | testo su accent | `#042F2E` |
| `--color-danger` | errori | `#F07171` |
| `--color-warning` | attenzione | `#E6B23C` |
| `--color-success` | ok | `#3DCE9A` |
| `--color-text` | testo | `#F4F7FB` |
| `--color-text-muted` | secondario | `#9AADC2` |
| `--color-hairline` | divisori | `#15283D` |
| `--color-border` | controlli | `#1E334C` |

Placeholder chiaro (`data-theme="light"`):

| Token | Ruolo | Valore temporaneo |
|---|---|---|
| `--color-primary` | blu istituzionale | `#1B4FD8` |
| `--color-on-primary` | testo su primario | `#F8FAFC` |
| `--color-surface` | sfondo | `#F3F6FA` |
| `--color-surface-raised` | pannelli rari | `#FFFFFF` |
| `--color-surface-inset` | inset | `#E8EEF6` |
| `--color-accent` / `--color-line` | teal/acqua | `#0D8F86` |
| `--color-on-accent` | testo su accent | `#F0FDFA` |
| `--color-danger` | errori | `#B42318` |
| `--color-warning` | attenzione | `#9A6700` |
| `--color-success` | ok | `#067647` |
| `--color-text` | testo | `#0F172A` |
| `--color-text-muted` | secondario | `#3D4F66` |
| `--color-hairline` | divisori | `#E4EBF3` |
| `--color-border` | controlli | `#D5DEEA` |

Token di supporto (stessi nomi in entrambi i temi): `--color-input`, `--color-primary-soft`, `--color-danger-soft`, `--color-warning-soft`, `--color-success-soft`, `--color-focus`, `--color-glow`, `--color-skeleton`, `--color-skeleton-shine`.

Alias di compatibilità nello stesso file: `--control-height` = `--control-min` (44px), `--rail-width` = `--line-width` (3px), `--color-rail` = `--color-line`.

Typography: `--font-sans` (Geist) per UI; `--font-brand` (Barlow Condensed) solo per lockup ESL e numeri di passo, in attesa del kit ufficiale (OD-044). Scale: `--text-xs` … `--text-2xl` (il 2xl resta contenuto, non display enorme). Space: `--space-1` (4px) … `--space-16` (incluso `--space-5`, `--space-10`). Radius: `--radius-xs` … `--radius-lg`; i chip usano raggi piccoli, **non** pill sui bottoni. Bottoni: `--radius-sm`. Target: `--control-min` 44px.

## 3. Layout

- Mobile: colonna singola, nav in menu, CTA sticky sul wizard.
- Tablet: contenuto max ~40–44rem nel percorso.
- Desktop: shell con nav laterale nell’area autenticata (sideline sull’item attivo); il wizard resta stretto e guidato.
- Pagine pubbliche (`/`, `/accedi`, `/invito`, `/privacy`, `/liberatorie`, informative collegate): topbar con marca ESL, toggle tema, privacy; footer con Privacy e Liberatorie.
- Gerarchia di pagina: kicker tracked + titolo `--text-xl` + lead, con sideline a sinistra. Liste e checklist sono righe divise da hairline, non card innestate.

## 4. Wizard

Vietato un’unica card con tutti i campi.

- Indicatore di passo (`n/m`) in type brand + percorso cliccabile (fatto / corrente / da fare). I passi sono navigabili.
- Titolo umano (“I tuoi dati”) + descrizione. Icona di passo solo se identifica il tema.
- Indietro verso il passo precedente; Salva e continua; Salva ed esci.
- Campi in fieldset (identità / contatti; chi è / come lo contattiamo).
- Validazione inline dopo blur, riepilogo errori in cima (`aria-live` / `role="alert"`).
- Passo privacy: documento da leggere, versione visibile, checkbox non pre-selezionata, placeholder legale evidente.
- Passo media/liberatorie: sideline accent, titolo forte, due scelte di peso visivo simile (accetto / non accetto). Niente reject nascosto in ghost in fondo pagina. Se l’edizione rende la liberatoria obbligatoria, resta visibile solo l’accetto e il motivo.

## 5. Dashboard

- Hero: stato in linguaggio naturale (“Devi caricare il certificato medico”) + CTA primaria, con sideline blu.
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

- Contrasto WCAG AA sui token placeholder (verificarli quando cambiano i HEX).
- Focus visibile (`--color-focus`).
- Label collegate agli input; non placeholder-as-label.
- Errori annunciabili (`role="alert"` sulle summary).
- Target touch ≥ 44px (`--control-min`).
- Non affidare informazione al solo colore (checklist: chip + testo + segno).
- Skip link verso il contenuto nell’area autenticata.
- Il toggle tema ha un’etichetta che descrive l’azione (“Passa al tema chiaro” / “Passa al tema scuro”).

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

Un solo set in `src/shared/ui/Icon.tsx`: 24×24, stroke 1.75, cap square. Nav, passi wizard, empty state, toggle tema. Niente icone decorative.
