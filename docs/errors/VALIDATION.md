# VALIDATION

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| VALIDATION_INVALID_INPUT | VALIDATION | Zod safeParse fallito | Campi | Dettaglio issue Zod oppure “Controlla i dati” | Correggi | tutte le action |
| VALIDATION_BIRTH_DATE_INVALID | VALIDATION | parseDateOnly fallito | Data | Inserisci una data di nascita valida | Correggi | `savePersonalDataAction` |
