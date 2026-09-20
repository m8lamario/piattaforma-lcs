# 03 — Information Architecture

## 1. Aree

| Area | Audience | Prefisso | Auth |
|---|---|---|---|
| Pubblica | non autenticati | `/` `/accedi` `/invito` `/invito/[token]` `/invito-staff/[token]` `/recupera-password` `/privacy` | no |
| Giocatore | Player | `/area` | sì |
| Squadra (rappresentante) | Team Representative | `/squadra` | sì + ruolo |
| Organizzazione | Org Admin / Super Admin | `/admin` | sì + ruolo |

Un utente può avere più ruoli (es. rappresentante che è anche giocatore). La navigazione mostra solo le aree per cui è autorizzato.

## 2. Sitemap v1 (prodotto)

```
/                              landing minima (non vetrina coppa)
/accedi
/recupera-password
/recupera-password/[token]
/invito                        incolla link/codice invito giocatore
/invito/[token]                redeem invito giocatore
/invito-staff/[token]          redeem invito rappresentante
/privacy                       informative (placeholder versionati)
/liberatorie                   indice informative media (placeholder)

/area                          dashboard giocatore (post-iscrizione senza CTA wizard)
/area/registrazione            wizard
/area/registrazione/[step]
/area/dati                     redirige al passo dati
/area/squadra                  compagni: nome, maglia, ruolo (niente stato medico)
/area/comunicazioni
/area/account
/area/pagamento/esito

/squadra                       cruscotto rappresentante (conteggi, pagamento TEAM/BOTH)
/squadra/inviti                inviti, reinvio, CSV

/admin                         hub organizzazione
/admin/registrazioni
/admin/giocatori/[id]
/admin/documenti
/admin/squadre
/admin/squadre/[id]
/admin/edizioni
/admin/edizioni/[id]
/admin/informative             sola lettura versioni correnti
/admin/pagamenti
/admin/utenti                  Super Admin: chiusura / anonimizzazione account
/admin/utenti/[id]
/admin/audit
```

M0: `/`, `/accedi`, layout token, shell autenticata.
M1: `/squadra` (inviti rappresentante), `/invito`, `/invito/[token]` (redeem/account), `/area` con stato account collegato alla squadra.
M2: `/area` dashboard checklist; `/area/registrazione` e `/area/registrazione/[step]` (dati, tutore, placeholder passi successivi, riepilogo). `/area/dati` redirige al passo dati.
M3: `/area/registrazione/certificato`; `/admin/documenti`; `/api/documents/file`.
M4: `/area/registrazione/privacy` e `/liberatorie`; `/liberatorie` pubblica.
M5: `/area/registrazione/pagamento`; `/area/pagamento/esito`; `/api/webhooks/payments`.
M6: `/squadra` rosa PII minima; `/area/comunicazioni`.
M8: `/admin` hub e CRUD; `/invito-staff/[token]`.
M9: `/squadra/inviti`; selettore squadra.
M10: `/area/account`, `/area/squadra`, `/recupera-password`.

## 3. Navigazione giocatore

Priorità visiva:

1. Stato iscrizione + CTA “cosa fare ora” (assente se in regola / ritirato)
2. Checklist
3. Percorso registrazione
4. Squadra (compagni)
5. Comunicazioni (con badge non lette)
6. Account

Le liberatorie foto/video **non** sono un link minore in footer. Hanno uno step nel percorso e una voce in consensi.

## 4. Navigazione rappresentante

1. Stato rosa (quanti in regola / in attesa / da completare)
2. Invita giocatore
3. Elenco giocatori con checklist ridotta
4. Pagamento squadra se `paymentMode` lo prevede
5. Dati squadra (nome, logo, referente)

Nessuna voce “apri certificato”.

## 5. Contenuti pubblici privacy

Pagine pubbliche con il contenuto della **versione corrente** di `LegalDocument`. I testi sono placeholder. Il footer punta a Privacy; le accettazioni avvengono nel percorso autenticato con snapshot della versione.

## 6. Dati in pagina squadra (giocatore)

Visibili: nome squadra, logo, competizione, edizione, nome referente (se previsto), elenco compagni con **nome e cognome** + eventuale ruolo/numero maglia.

Non visibili: email, telefono, CF, età esatta, documenti, **stato certificato**, pagamenti altrui, consensi altrui. Lo stato medico resta sulla rosa del rappresentante (`/squadra`), non sulla vista compagni.
