# REGISTRATION

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| REGISTRATION_NOT_FOUND | REGISTRATION | Nessuna iscrizione | Account senza redeem | Non hai un’iscrizione da completare | Nuovo invito | workspace null |
| REGISTRATION_WITHDRAWN | REGISTRATION | status WITHDRAWN | Ritiro | Questa iscrizione è ritirata | Contatta org | `writeGate` |
| REGISTRATION_WINDOW_CLOSED | REGISTRATION | Finestra chiusa | Edizione non aperta | Le iscrizioni non sono aperte adesso | Attendi | `writeGate` |
| REGISTRATION_STEP_NOT_REQUIRED | REGISTRATION | Passo non applicabile | Maggiorenne su tutore | Questo passo non è richiesto | Nessuno | `saveGuardianAction` |
| REGISTRATION_IN_PROGRESS | REGISTRATION | Iscrizione già in corso | Stato dominio | Continua da dove eri rimasto | Nessuno | classificazione |
| REGISTRATION_COMPLETED | REGISTRATION | Già APPROVED | Stato dominio | Iscrizione già completata | Nessuno | classificazione |
| REGISTRATION_BLOCKED | REGISTRATION | Blocco identità persistito | metadata.identityConflict | Iscrizione in stallo | Account originale / org | dashboard |
| REGISTRATION_DUPLICATE | REGISTRATION | Unique (profile, edition) | Race attach | Contatta l’organizzazione | Contatta org | Prisma P2002 registration |
| GUARDIAN_SAVE_FAILED | REGISTRATION | Profilo assente | Dato inconsistente | Non è stato possibile salvare i dati del tutore | Riprova | `saveGuardianProfile` |
