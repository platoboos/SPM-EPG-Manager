# Forumstext

## Titelvorschlag

SPM EPG Manager - TVG-IDs für Stalker Portal Manager automatisch setzen

## Beitrag

Ich stelle hier den SPM EPG Manager zur Verfügung.

Das Tool hilft bei der EPG-Zuordnung, wenn Playlists aus Stalker Portal Manager in TiviMate, E-Channelizer oder ähnlichen Clients genutzt werden. Es trägt bekannte TVG-IDs automatisch in SPM-Profile ein, damit die IDs aus der Playlist zu EasyEPG/XMLTV passen.

### Was es macht

- erkennt vorhandene SPM-Portale
- legt pro Portal bei Bedarf ein Profil `spm` an
- setzt TVG-IDs für bekannte Sendernamen
- bietet zuerst einen Dry-Run ohne Speichern
- läuft als Docker-WebUI neben SPM

### Voraussetzungen

- laufender Stalker Portal Manager
- Docker und Docker Compose
- laufendes EasyEPG oder eine andere XMLTV-Quelle mit passenden IDs

### Installation

Auf dem Docker-Host:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" sh
```

Der Installer fragt nach SPM URL, Benutzername und Passwort.

Danach im Browser:

```text
http://HOST-IP:8099
```

Wichtig: Erst `Nur prüfen` laufen lassen. Nur wenn die Treffer plausibel aussehen, `In SPM speichern` ausführen.

### Hinweis zu EasyEPG

EPG funktioniert nur, wenn die TVG-ID aus der SPM-Playlist zur Channel-ID der EPG-Datei passt. Das Tool setzt die IDs in SPM; EasyEPG muss die passenden EPG-Daten liefern.

### Projekt

GitHub:

```text
https://github.com/platoboos/SPM-EPG-Manager
```

Rückmeldungen zu fehlenden Sendernamen oder Alias-Regeln helfen beim Erweitern.
