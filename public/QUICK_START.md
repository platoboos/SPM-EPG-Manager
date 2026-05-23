# SPM EPG Manager - Schnellstart

Diese Anleitung ist fuer einen ersten Test auf einem Docker-Host gedacht.

## 1. Vorher pruefen

Du brauchst:

- einen laufenden Stalker Portal Manager
- SPM Benutzername und Passwort
- Docker und Docker Compose auf dem Host
- ein laufendes EasyEPG fuer die spaetere EPG-Zuordnung

## 2. Installation starten

Auf dem Host ausfuehren:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" sh
```

Der Installer fragt nach:

1. SPM Basis-URL, zum Beispiel `http://DEINE-SPM-IP:8000`
2. SPM Benutzername
3. SPM Passwort

## 3. WebUI oeffnen

Im Browser:

```text
http://HOST-IP:8099
```

## 4. Sicherer erster Lauf

1. `Nur pruefen` starten.
2. Zusammenfassung ansehen.
3. Bei plausiblen Treffern `In SPM speichern` starten.

## 5. Playlist und EPG nutzen

In TiviMate oder E-Channelizer die SPM-Custom-Playlist mit dem `spm`-Profil verwenden. EasyEPG muss die gleichen TVG-IDs liefern, die in der Playlist stehen.

Beispiel:

```text
tvg-id="ZDF.de"
```

passt zu:

```xml
<channel id="ZDF.de">
```

## 6. Wenn Sender fehlen

Fehlende Treffer sind normal, wenn ein Portal Sender ungewoehnlich benennt. Dann koennen Alias-Regeln im Projekt erweitert und danach erneut geprueft werden.
