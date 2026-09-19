# 03 — Information Architecture

## 1. Aree

| Area | Audience | Prefisso | Auth |
|---|---|---|---|
| Pubblica | non autenticati | `/` `/accedi` `/invito` `/invito/[token]` `/privacy` | no |
| Giocatore | Player | `/area` | sì |
| Squadra (rappresentante) | Team Representative | `/squadra` | sì + ruolo |
| Organizzazione | Org Admin / Super Admin | `/admin` | sì + ruolo |

Un utente può avere più ruoli (es. rappresentante che è anche giocatore). La navigazione mostra solo le aree per cui è autorizzato.

## 2. Sitemap v1 (prodotto)

```
/                              landing minima (non vetrina coppa)
/accedi
/invito                        incolla link/codice invito
/invito/[token]                redeem invito, creazione account o collegamento account esistente
/privacy                       informative (placeholder versionati)
/liberatorie                   indice informative media (placeholder)

/area                          dashboard giocatore
/area/registrazione            wizard (post-M0)
/area/registrazione/[step]
/area/dati
/area/documenti
/area/consensi
/area/pagamento
/area/squadra
/area/comunicazioni
/area/account

/squadra                       dashboard rappresentante
/squadra/rosa
/squadra/inviti
/squadra/pagamenti
/squadra/impostazioni

/admin
/admin/registrazioni
/admin/giocatori/[id]
/admin/documenti
/admin/squadre
/admin/edizioni
/admin/informative
/admin/pagamenti
/admin/audit
```

M0: `/`, `/accedi`, layout token, shell autenticata.
M1: `/squadra` (inviti rappresentante), `/invito`, `/invito/[token]` (redeem/account), `/area` con stato account collegato alla squadra.
M2: `/area` dashboard checklist; `/area/registrazione` e `/area/registrazione/[step]` (dati, tutore, placeholder passi successivi, riepilogo). `/area/dati` redirige al passo dati.
M3: `/area/registrazione/certificato`; `/admin/documenti`; `/api/documents/file`.
M4: `/area/registrazione/privacy` e `/liberatorie`; `/liberatorie` pubblica.
M5: `/area/registrazione/pagamento`; `/area/pagamento/esito`; `/api/webhooks/payments`.
M6: `/squadra` rosa PII minima; `/area/comunicazioni`.

## 3. Navigazione giocatore

Priorità visiva:

1. Stato iscrizione + CTA “cosa fare ora”
2. Checklist
3. Percorso registrazione
4. Documenti, consensi, pagamento
5. Squadra
6. Comunicazioni
7. Account

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

Non visibili: email, telefono, CF, età esatta, documenti, pagamenti altrui, consensi altrui.
