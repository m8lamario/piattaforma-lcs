# 09 — UI/UX Guidelines

## 1. Carattere visivo

Moderno, sportivo-istituzionale, **mobile-first**. Area personale, non back-office anni 2000. Aria, gerarchia chiara, un’azione primaria per schermo nel wizard.

## 2. Design tokens

Tutti i colori, spazi, raggi, type scale vivono in `src/shared/ui/tokens.css` come CSS custom properties. Vietato hardcodare HEX nei componenti.

Placeholder (da sostituire quando arrivano i HEX ufficiali):

| Token | Ruolo | Valore temporaneo |
|---|---|---|
| `--color-primary` | blu istituzionale | `#1D4ED8` |
| `--color-on-primary` | testo su primario | `#F8FAFC` |
| `--color-surface` | chiaro / sfondo | `#F8FAFC` |
| `--color-surface-raised` | card | `#FFFFFF` |
| `--color-accent` | verde acqua / teal | `#0D9488` |
| `--color-on-accent` | testo su accent | `#F0FDFA` |
| `--color-danger` | errori | `#B91C1C` |
| `--color-warning` | attenzione | `#B45309` |
| `--color-success` | ok | `#047857` |
| `--color-text` | testo | `#0F172A` |
| `--color-text-muted` | secondario | `#475569` |

Typography: system stack + un family token `--font-sans`. Scale: `--text-sm` … `--text-2xl`. Space: `--space-1` (4px) … `--space-16`. Radius: `--radius-sm`, `--radius-md`, `--radius-lg`. Shadow token unica, leggera.

Sostituire i HEX = modificare **un file**.

## 3. Layout

- Mobile: colonna singola, CTA sticky sul wizard se serve.
- Tablet: contenuto max 720px centrato nel percorso.
- Desktop: shell con nav laterale nell’area autenticata; il wizard resta stretto e guidato.

## 4. Wizard

Vietato un’unica card con tutti i campi.

- Indicatore di passo (n di m) + titolo umano (“I tuoi dati”, non `step_2`).
- Un tema per schermata.
- Salva e continua; Salva ed esci.
- Validazione inline dopo blur, riepilogo errori in cima.
- Passo media/liberatorie: card evidenziata con accent, icona, titolo forte, niente testo grigio in fondo pagina.

## 5. Dashboard

- Hero: stato in linguaggio naturale (“Devi caricare il certificato medico”).
- Progress visivo (segmenti checklist, non solo percentuale opaca).
- Checklist con icone: completo, attenzione, mancante, non applicabile.
- Ogni voce cliccabile porta al punto giusto.

## 6. Stati UI obbligatori

Ogni schermata dati:

- **Skeleton** al primo load
- **Empty** (es. nessun documento) con CTA
- **Error** recuperabile
- **Success** breve (toast o inline), non un alert nativo solo

Micro-interazioni: Framer Motion su transizioni di passo e feedback CTA. Durata breve (~200–300ms), niente looping decorativo.

## 7. Accessibilità

- Contrasto WCAG AA sui token placeholder (verificarli quando cambiano i HEX).
- Focus visibile.
- Label collegate agli input; non placeholder-as-label.
- Errori annunciabili (`aria-live` sulle summary).
- Target touch ≥ 44px.
- Non affidare informazione al solo colore (checklist ha icona + testo).

## 8. Copy

Italiano semplice, seconda persona (“Devi…”, “Manca…”). Niente burocratese. Niente “clicca qui”. I placeholder legali restano visibilmente placeholder, non finti articoli di legge.

Chiavi in `src/shared/i18n/it.ts` per non spargere stringhe magiche e per i18n futuro.

## 9. Dark pattern vietati

- Pre-selezionare consensi opzionali.
- Nascondere il reject della liberatoria.
- Confondere “Accetta tutto” con lo step privacy required.
- Timer o urgenza falsa.

## 10. Admin

L’area admin può essere più densa ma usa gli stessi token. Tabelle con filtri chiari, motivo di rifiuto obbligatorio in un dialog accessibile.
