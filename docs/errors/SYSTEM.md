# SYSTEM

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| EDITION_NOT_FOUND | SYSTEM | Edition id admin assente | Form | Edizione non trovata | Nessuno | `updateEditionAction` |
| RATE_LIMITED | SYSTEM | Rate limit generico | Profilo/tutore | Troppe modifiche | Attendi | profile write |
| RESOURCE_NOT_FOUND | SYSTEM | 404 anti-enumerazione | Missing o denied | Risorsa non disponibile | Nessuno | risorse generiche |
| SYSTEM_UNEXPECTED | SYSTEM | Boundary UI | Eccezione non classificata | Problema, riprova o home | Riprova (sicuro) | `error.tsx` / RouteError |
