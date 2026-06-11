# Einzeiler Installation

Diese Variante ist für einen Host gedacht, auf dem der Ordner `spm-tvg-mapper` schon liegt, zum Beispiel unter:

```bash
/opt/spm-tvg-mapper
```

Der Installer richtet die Docker-WebUI ein, schreibt die Zugangsdaten in `.env` / `.env.local`, erstellt `config/spm_targets.web.json` und startet den Container.

## Empfohlener Einzeiler

Auf dem Host ausführen:

```bash
cd /opt/spm-tvg-mapper && chmod +x install_webui.sh && ./install_webui.sh
```

Danach fragt das Script ab:

- SPM Basis-URL, z.B. `http://DEINE-SPM-IP:8000`
- SPM Benutzername
- SPM Passwort

## Komplett ohne Rückfragen

Nur verwenden, wenn niemand in die Shell-History schauen kann. Das Passwort steht sonst in der History.

```bash
cd /opt/spm-tvg-mapper && chmod +x install_webui.sh && SPM_BASE_URL="http://DEINE-SPM-IP:8000" SPM_TARGET_NAME="Produktiv SPM" SPM_USERNAME="dein_benutzer" SPM_PASSWORD="dein_passwort" ./install_webui.sh
```

## Danach

Im Browser öffnen:

```text
http://HOST-IP:8099
```

Dann:

1. Erst `Nur prüfen`.
2. Ausgabe kontrollieren.
3. Wenn alles passt: `In SPM speichern`.

## Update

Wenn neue Mapper-Dateien auf den Host kopiert wurden, reicht derselbe Einzeiler erneut:

```bash
cd /opt/spm-tvg-mapper && ./install_webui.sh
```

Die WebUI wird dann neu gebaut und gestartet.
