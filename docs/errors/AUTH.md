# AUTH

| Codice | Categoria | Significato | Causa | Cosa vede l'utente | Recovery | Dove viene generato |
|---|---|---|---|---|---|---|
| AUTH_INVALID_CREDENTIALS | AUTH | Credenziali non corrispondono | Email/password errati o AuthError | Email o password non corretti | Correggi i dati | `loginAction` |
| AUTH_RATE_LIMITED | AUTH | Rate limit login superato | Troppi tentativi | Troppi tentativi. Riprova tra qualche minuto | Attendi | `loginAction` |
| AUTH_SESSION_REQUIRED | AUTH | Sessione assente | Mutazione senza login | Devi accedere per continuare | Accedi | action autenticate |
| AUTH_ACCOUNT_MISSING | AUTH | User id senza record | Sessione orfana | Account non trovato. Accedi di nuovo | Accedi | `getActorByUserId` null |
| AUTH_NO_LOCAL_PASSWORD | AUTH | Account senza passwordHash | Provider non locale | Questo account non ha una password locale | Contatta org | `changePasswordAction` |
| AUTH_CURRENT_PASSWORD_MISMATCH | AUTH | Password attuale non verifica | Cambio password | La password attuale non è corretta | Correggi | `changePasswordAction` |
| AUTH_RESET_TOKEN_INVALID | AUTH | Token reset assente/scaduto/usato | Link monouso | Questo link non è valido o è già stato usato | Nuovo link | `resetPasswordAction` |
| AUTH_ACCOUNT_CREATED_LOGIN_FAILED | AUTH | User creato ma signIn fallito | AuthError dopo redeem | Accedi dalla pagina di login | Accedi | redeem invito |
| AUTH_EMAIL_NOT_VERIFIED | AUTH | emailVerified assente | Gate documenti/consensi | Verifica l’email prima di continuare | Contatta org | upload/consensi |

Login su account `DELETED` / `ANONYMIZED`: stesso fail `AUTH_INVALID_CREDENTIALS` (anti-enumerazione). Non si rivela se l’email esiste o è chiusa. I codici `LIFECYCLE_ACCOUNT_*` sono per admin e catalogo, non per la pagina di accesso.
