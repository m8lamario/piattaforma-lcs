# SCHOOL_ACCESS

Richiesta pubblica di accesso per una scuola, approvazione staff e attivazione account del rappresentante.

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| SCHOOL_ACCESS_DUPLICATE | SCHOOL_ACCESS | Richiesta PENDING già presente | Stessa email o stessa scuola+edizione | Abbiamo già una richiesta in esame per questi dati | Attendi | `submitSchoolAccessAction` |
| SCHOOL_ACCESS_ALREADY_APPROVED | SCHOOL_ACCESS | Richiesta già approvata, account non ancora attivo | APPROVED senza `activatedAt` | La richiesta è già stata approvata. Controlla l’email | Attiva da email | submit / approve |
| SCHOOL_ACCESS_SCHOOL_EXISTS | SCHOOL_ACCESS | Scuola già in edizione | Team esistente su stesso nome+città+edizione | Questa scuola è già registrata per la competizione | Contatta org | submit / approve |
| SCHOOL_ACCESS_EMAIL_TAKEN | SCHOOL_ACCESS | Email già User | Unique User.email | Questa email è già associata a un account | Accedi / org | submit / approve |
| SCHOOL_ACCESS_NOT_FOUND | SCHOOL_ACCESS | Id richiesta assente | Admin su id errato | Richiesta non trovata | Nessuno | approve / reject / resend |
| SCHOOL_ACCESS_NOT_PENDING | SCHOOL_ACCESS | Non più PENDING | Doppia decisione | Questa richiesta non è più in attesa | Nessuno | approve / reject |
| SCHOOL_ACCESS_EDITION_UNAVAILABLE | SCHOOL_ACCESS | Edizione assente o non attiva | Catalogo cambiato | La competizione non è disponibile | Scegli un’altra | submit / approve |
| SCHOOL_ACCESS_TOKEN_INVALID | SCHOOL_ACCESS | Token sconosciuto o malformato | Hash assente | Questo link non è valido | Contatta org | attivazione |
| SCHOOL_ACCESS_TOKEN_EXPIRED | SCHOOL_ACCESS | Token scaduto | expiresAt superato | Questo link è scaduto | Contatta org | attivazione |
| SCHOOL_ACCESS_TOKEN_USED | SCHOOL_ACCESS | Token già consumato | activatedAt valorizzato | Questo link è già stato usato | Accedi | attivazione |
| SCHOOL_ACCESS_ALREADY_ACTIVATED | SCHOOL_ACCESS | Account già con password | passwordHash presente | L’account è già attivo | Accedi | attivazione |
| SCHOOL_ACCESS_RATE_LIMITED | SCHOOL_ACCESS | Rate limit | Invio o attivazione | Troppi tentativi | Attendi | submit / activate |
| SCHOOL_ACCESS_RESEND_NOT_ALLOWED | SCHOOL_ACCESS | Reinvio non applicabile | Non APPROVED o già attivato | Non è possibile reinviare il link | Nessuno | resend |
