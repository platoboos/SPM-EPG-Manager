# SPM EPG Manager

SPM EPG Manager setzt TVG-IDs in Stalker Portal Manager (SPM), damit EPG-Daten aus EasyEPG in Playlists fuer TiviMate, E-Channelizer und aehnliche Clients leichter zugeordnet werden koennen.

Der Manager laeuft als kleine Docker-WebUI neben SPM. Er liest die Sender der vorhandenen Portale, nutzt eine Aliasliste fuer bekannte Sendernamen und schreibt die Treffer in portalgebundene SPM-Profile mit dem Namen `spm`.

## Voraussetzungen

- ein laufender Stalker Portal Manager mit Web-Login
- Docker und Docker Compose auf dem Zielhost
- ein laufendes EasyEPG mit passenden EPG-Quellen
- passende TVG-IDs in EasyEPG und SPM

## Was das Projekt macht

- findet vorhandene SPM-Portale
- legt bei Bedarf pro Portal ein SPM-Profil an
- setzt TVG-IDs fuer erkannte Sender
- zeigt Dry-Run-Reports vor dem Speichern
- liefert eine bereinigte Rytec-EasyEPG-Vorlage als Startpunkt

## Was es nicht automatisch loest

- EasyEPG muss die benoetigten EPG-Daten selbst liefern
- sehr ungewoehnliche Sendernamen koennen weitere Alias-Regeln brauchen
- keine TVG-ID kann fehlende EPG-Daten ersetzen

## Schnellstart

Auf dem Docker-Host ausfuehren:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" sh
```

Der Installer fragt nach:

1. SPM Basis-URL, zum Beispiel `http://DEINE-SPM-IP:8000`
2. SPM Benutzername
3. SPM Passwort

Danach ist die WebUI standardmaessig hier erreichbar:

```text
http://HOST-IP:8099
```

In der WebUI immer zuerst:

1. `Nur pruefen`
2. Zusammenfassung und Reports ansehen
3. `In SPM speichern`

## EasyEPG

SPM und EasyEPG muessen dieselben IDs verwenden. Beispiel:

- SPM Playlist: `tvg-id="ZDF.de"`
- EasyEPG XMLTV: `<channel id="ZDF.de">`

Unter `spm-production-installer/easyepg-settings.rytec-template.json` liegt eine bereinigte Startvorlage fuer EasyEPG. Sie enthaelt keine Sessions, keine Login-Daten und nur oeffentliche Rytec-Quellen.

## Sicherheit

- keine Passwoerter in GitHub-Dateien speichern
- keine `.env` Dateien hochladen
- private EasyEPG `settings.json` nur bereinigt veroeffentlichen
- bei Produktivsystemen zuerst immer `Nur pruefen`

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Details stehen in `LICENSE`.

## Ordner

- `spm-production-installer`: Einzeiler-Installer und EasyEPG-Vorlage
- `spm-tvg-mapper`: WebUI, TVG-Regeln und technische Dokumentation
- `public`: Forumstext, Schnellstart und Veroeffentlichungs-Checkliste

## Weiter lesen

- `public/QUICK_START.md`
- `spm-production-installer/README.md`
- `spm-tvg-mapper/ANLEITUNG_FUER_ANFAENGER.md`
