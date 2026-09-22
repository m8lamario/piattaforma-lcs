# DOCUMENTS

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| DOCUMENT_INVALID_TYPE | DOCUMENTS | MIME/magic fuori allowlist | Non PDF/JPEG/PNG | Formato non valido | Correggi file | `storeMedicalCertificate` |
| DOCUMENT_TOO_LARGE | DOCUMENTS | Oltre maxSizeBytes | File troppo grande | Il file supera la dimensione massima | Correggi file | upload |
| DOCUMENT_MISSING_FILE | DOCUMENTS | Serve un file | Nessun file | Seleziona un file | Correggi | upload |
| DOCUMENT_SCAN_FAILED | DOCUMENTS | Scan adapter reject | Stub/scan | File non accettato | Org / altro file | upload |
| DOCUMENT_NOT_FOUND | DOCUMENTS | Id inesistente o 404 opaco | IDOR o missing | Documento non disponibile | Nessuno | file GET / signed URL |
| DOCUMENT_UPLOAD_RATE_LIMITED | DOCUMENTS | Rate limit upload | Troppi upload | Troppi upload | Attendi | upload |
| DOCUMENT_REJECT_REASON_REQUIRED | DOCUMENTS | Rifiuto senza motivo | Admin | Devi indicare un motivo | Correggi | review |
