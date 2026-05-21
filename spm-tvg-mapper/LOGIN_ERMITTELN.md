# SPM Login fuer automatische Anmeldung ermitteln

Aktuell funktioniert der externe Runner mit `SPM_COOKIE`.

Damit er sich spaeter selbst anmelden kann, muessen wir einmal herausfinden, wie SPM den Login technisch macht.

## Wichtig

Bitte Passwort und Cookie nicht in den Chat posten.

Wir brauchen nur die technischen Namen:

- Login-URL
- Methode: `POST` oder etwas anderes
- Content-Type: `json` oder `form`
- Feldname fuer Benutzername
- Feldname fuer Passwort

## Schritt fuer Schritt

1. SPM im Browser oeffnen:

```text
http://DEINE-SPM-IP:8000
```

2. Ausloggen, falls du schon eingeloggt bist.

3. `F12` druecken.

4. Tab `Netzwerk` oder `Network` oeffnen.

5. Oben den Filter `Fetch/XHR` anklicken, falls vorhanden.

6. Jetzt in SPM normal einloggen.

7. In der Netzwerk-Liste den Login-Request suchen.

Typische Namen waeren zum Beispiel:

```text
/api/login
/login
/api/auth/login
/auth/login
```

8. Den Request anklicken.

## Was wir brauchen

### Aus `Headers`

Notieren:

```text
Request URL:
Request Method:
Content-Type:
```

Beispiel:

```text
Request URL: http://DEINE-SPM-IP:8000/api/login
Request Method: POST
Content-Type: application/json
```

### Aus `Payload` oder `Request Payload`

Bitte nur die Feldnamen notieren, nicht die echten Werte.

Beispiel:

```json
{
  "username": "...",
  "password": "..."
}
```

Dann brauchen wir:

```text
usernameField = username
passwordField = password
contentType = json
```

Wenn es so aussieht:

```text
username=...&password=...
```

dann ist es wahrscheinlich:

```text
contentType = form
```

## Danach

Wenn wir diese Infos haben, passen wir `config/spm_targets.test.json` an:

```json
"login": {
  "enabled": true,
  "url": "/api/auth/login",
  "method": "POST",
  "contentType": "json",
  "usernameEnv": "SPM_USERNAME",
  "passwordEnv": "SPM_PASSWORD",
  "usernameField": "username",
  "passwordField": "password",
  "extraFields": {}
}
```

Dann kannst du Benutzer und Passwort lokal in PowerShell setzen:

```powershell
$env:SPM_USERNAME = "dein_benutzer"
$env:SPM_PASSWORD = "dein_passwort"
.\run_dry_run.cmd
```

Der Runner meldet sich dann selbst an und braucht keinen manuell kopierten Cookie mehr.
