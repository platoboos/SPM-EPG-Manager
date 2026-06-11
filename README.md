# SPM EPG Manager

SPM EPG Manager hilft bei zwei Aufgaben rund um Stalker Portal Manager (SPM):

- TVG-IDs automatisch in SPM-Profile schreiben, damit EasyEPG in TiviMate/E-Channelizer sauber zugeordnet wird.
- Stream-Zugriffe aus den SPM Proxy Logs anzeigen.

Das Projekt besteht aus getrennten Modulen. EPG Manager und Stream Manager laufen als eigene Docker-WebUIs neben SPM und ändern den SPM-Container selbst nicht.

## Voraussetzungen

- laufender Stalker Portal Manager mit Web-Login
- Docker und Docker Compose auf dem Zielhost
- für EPG: laufendes EasyEPG mit passenden EPG-Quellen
- für Stream-Monitoring: SPM Proxy Logs müssen Einträge liefern

## EPG Manager installieren

Auf dem Docker-Host ausführen:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" sh
```

Danach ist die WebUI standardmäßig hier erreichbar:

```text
http://HOST-IP:8099
```

In der WebUI immer zuerst:

1. `Nur prüfen`
2. Zusammenfassung und Reports ansehen
3. `In SPM speichern`

## Stream Manager installieren

Auf dem Docker-Host ausführen:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-stream-installer/install.sh | STREAM_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" sh
```

Danach ist die WebUI standardmäßig hier erreichbar:

```text
http://HOST-IP:8100
```

## EasyEPG

SPM und EasyEPG müssen dieselben IDs verwenden. Beispiel:

- SPM Playlist: `tvg-id="ZDF.de"`
- EasyEPG XMLTV: `<channel id="ZDF.de">`

Unter `spm-production-installer/easyepg-settings.rytec-template.json` liegt eine bereinigte Startvorlage für EasyEPG. Sie enthält keine Sessions, keine Login-Daten und nur öffentliche Rytec-Quellen.

## Cloudflare-Hinweis

Der Stream Manager kann nur anzeigen, was SPM in den Proxy Logs sieht. Wenn SPM hinter Cloudflare nur Cloudflare-IP-Adressen loggt, müssen echte Client-IPs später über Reverse-Proxy/Real-IP-Header sauber an SPM weitergegeben werden.

## Sicherheit

- keine Passwörter in GitHub-Dateien speichern
- keine `.env` Dateien hochladen
- private EasyEPG `settings.json` nur bereinigt veröffentlichen
- bei Produktivsystemen zuerst immer `Nur prüfen`

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Details stehen in `LICENSE`.

## Ordner

- `spm-production-installer`: Einzeiler-Installer und EasyEPG-Vorlage
- `spm-tvg-mapper`: EPG Manager WebUI, TVG-Regeln und technische Dokumentation
- `spm-stream-installer`: Einzeiler-Installer für den Stream Manager
- `spm-stream-manager`: Stream-Monitoring über SPM Proxy Logs
- `public`: Forumstext, Schnellstart und Veröffentlichungs-Checkliste

## Weiter lesen

- `public/QUICK_START.md`
- `spm-production-installer/README.md`
- `spm-stream-installer/README.md`
- `spm-tvg-mapper/ANLEITUNG_FUER_ANFAENGER.md`
