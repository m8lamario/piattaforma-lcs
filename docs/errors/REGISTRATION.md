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
| GUARDIAN_SECOND_EMAIL | REGISTRATION | G3 senza email | Altro genitore | Inserisci l’email dell’altro genitore | Correggi | `saveGuardianAction` |
| GUARDIAN_SAME_EMAIL | REGISTRATION | Email duplicate | Stesso recapito | Email dell’altro genitore diversa | Correggi | `saveGuardianAction` |
| GUARDIAN_EMAIL_CORRECTION_USED | REGISTRATION | Correzione già usata | Secondo tentativo | Si può correggere una sola volta | Contatta org | `saveGuardianProfile` |
| GUARDIAN_SELF | REGISTRATION | Nome e cognome del contatto uguali al minore | Auto-indicazione | Il contatto del genitore non può coincidere con il nome del giocatore | Correggi | `saveGuardianAction` |
| GUARDIAN_EMAIL_IS_PLAYER | REGISTRATION | Email genitore = email minore | Auto-indicazione | Usa un’email del genitore diversa | Correggi | `saveGuardianAction` |
| GUARDIAN_AUTHORIZATION_REQUIRED | REGISTRATION | Manca autorizzazione ENROLLMENT | Link non confermato | Attesa del genitore | Attendi | checklist |
| GUARDIAN_AUTHORIZATION_REFUSED | REGISTRATION | Genitore ha rifiutato | Link refuse | Il genitore ha rifiutato | Contatta org | guardian link |
