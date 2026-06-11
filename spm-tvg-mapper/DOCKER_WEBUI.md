# SPM EPG Manager als Docker-WebUI

Diese Variante ist für die einfache Installation neben einem oder mehreren SPM-Containern gedacht.

Der Mapper läuft als eigener Container und greift per SPM-Web/API auf die SPM-Container zu.

## Idee

- SPM bleibt unverändert.
- Mapper bekommt eine eigene WebUI.
- Dry-Run und Apply werden per Button gestartet.
- Reports bleiben in `./reports`.
- Ziele stehen in `./config/spm_targets.web.json`.

## Dateien

```text
Dockerfile
docker-compose.web.example.yml
web/server.mjs
config/spm_targets.web.example.json
```

## Installation

Im Ordner `/opt/spm-tvg-mapper`:

```bash
cp docker-compose.web.example.yml docker-compose.yml
cp config/spm_targets.web.example.json config/spm_targets.web.json
cp env.example .env
nano .env
```

In `.env` eintragen:

```text
SPM_USERNAME=dein_benutzer
SPM_PASSWORD=dein_passwort
```

Config prüfen:

```bash
nano config/spm_targets.web.json
```

Wichtig:

```json
"baseUrl": "http://DEINE-SPM-IP:8000"
```

## Start

```bash
docker compose up -d --build
```

WebUI öffnen:

```text
http://HOST-IP:8099
```

## Bedienung

1. Erst `Dry-Run starten`.
2. Ausgabe und Reports prüfen.
3. Nur wenn alles plausibel ist: `Apply starten`.

## Produktiv

Für Produktiv kannst du in `config/spm_targets.web.json` mehrere Targets eintragen.

Beispiel:

```json
{
  "targets": [
    {
      "name": "SPM Produktiv 1",
      "baseUrl": "http://DEINE-SPM-IP:8000",
      "playlistType": "tv",
      "profileName": "spm",
      "pageSize": 1000,
      "keepExistingTvgIds": true,
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
      },
      "profileIdByPortalId": {}
    }
  ]
}
```

## Sicherheit

Die erste Version hat keine eigene WebUI-Anmeldung. Deshalb:

- nur im internen Netz betreiben
- nicht ins Internet freigeben
- Port `8099` nicht öffentlich weiterleiten


