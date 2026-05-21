# SPM Manager

Dieses Paket enthaelt zwei Bausteine:

- `spm-tvg-mapper`: Mapper-WebUI und TVG-ID-Regeln fuer SPM.
- `spm-production-installer`: Einzeiler-Installer fuer neue oder produktive Systeme.

## Wichtig

Keine Passwoerter, keine `.env` Dateien und keine privaten EasyEPG-Settings in GitHub hochladen.

Private Dateien wie EasyEPG `settings.json` besser auf Unraid/NAS bereitstellen und im Installer nur als URL eintragen.

## Grundidee

1. Dieses Projekt nach GitHub hochladen.
2. Auf dem Zielhost den Installer starten.
3. Der Installer laedt den Mapper von GitHub.
4. Optional laedt der Installer EasyEPG `settings.json` von Unraid.
5. Danach in der Mapper-WebUI zuerst `Nur pruefen`, dann `In SPM speichern`.

## Fuer Anfaenger

Wenn du unsicher bist, nichts loeschen und keine echten Passwoerter in Dateien schreiben, die spaeter nach GitHub gehen.

Die Datei `spm-production-installer/README.md` enthaelt die konkreten Einzeiler.
