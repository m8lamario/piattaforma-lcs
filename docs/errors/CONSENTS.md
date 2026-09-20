# CONSENTS

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| CONSENT_REQUIRED_UNCHECKED | CONSENTS | Checkbox required mancanti | Form incompleto | Conferma ogni informativa | Correggi | privacy step |
| CONSENT_VERSION_STALE | CONSENTS | Versione non isCurrent | Testo aggiornato | Rileggi la versione corrente | Riprova | `recordConsent` |
| CONSENT_MEDIA_DECISION_REQUIRED | CONSENTS | Né accept né refuse | Form | Scegli se accettare o no | Correggi | media step |
| CONSENT_MEDIA_REQUIRED | CONSENTS | Refuse su required=true | Edizione | Liberatoria obbligatoria | Correggi | media step |
| CONSENT_VERSION_MISSING | CONSENTS | versionId assente | Pagina stale | Ricarica la pagina | Riprova | media step |
| CONSENT_RATE_LIMITED | CONSENTS | Rate limit | Troppe conferme | Riprova più tardi | Attendi | consent actions |
