# SPM TVG Mapper

Dieses Projekt setzt TVG-IDs in Stalker Portal Manager anhand einer zentralen Rytec-Aliasliste.

## Start fuer Anfaenger

Bitte zuerst diese Anleitung lesen:

```text
ANLEITUNG_FUER_ANFAENGER.md
```

Fuer spaetere automatische Ausfuehrung ausserhalb des Containers:

```text
AUTOMATISIERUNG.md
```

Die kurze Regel lautet:

1. Erst `DRY_RUN: true` laufen lassen.
2. Reports pruefen.
3. Nur wenn alles plausibel ist, `DRY_RUN: false` setzen.
4. Nach dem Apply wieder auf `DRY_RUN: true` stellen.

## Aktueller Stand

- Test-SPM: `http://10.10.100.117:8000`
- Profilname je Portal: `spm`
- Standardmodus im Browser-Script: `DRY_RUN: true`
- All-Portal-Modus ist vorbereitet: `APPLY_ALL_PORTALS: true`
- Vorhandener Sonderfall: Portal `3` nutzt fest Profil-ID `1`
- Letzter erfolgreicher Apply-Lauf: `reports/all_portals_applied_summary_2026-05-18.json`

## Dateien

- `config/spm_tvg_aliases_master.json`: Master-Liste normalisierter Sendernamen zu Rytec/XMLTV-IDs.
- `browser/spm_auto_tvg_mapper.browser.js`: Browser-Console-Script fuer SPM.
- `run_dry_run.cmd`: Einfacher Windows-Starter fuer den externen Dry-Run.
- `run_apply.cmd`: Einfacher Windows-Starter fuer den externen Apply-Lauf mit Bestaetigung.
- `run_dry_run.sh`: Linux/Proxmox-Starter fuer den externen Dry-Run.
- `run_apply.sh`: Linux/Proxmox-Starter fuer den externen Apply-Lauf mit Bestaetigung.
- `deploy_to_linux.cmd`: Kopiert das Projekt von Windows per SSH/SCP nach Proxmox/Linux.
- `Dockerfile`: Container-Variante mit WebUI.
- `docker-compose.web.example.yml`: Compose-Vorlage fuer die WebUI-Container-Variante.
- `DOCKER_WEBUI.md`: Anleitung fuer die Docker-WebUI.
- `tools/run_spm_tvg_mapper.mjs`: Externer Node-Runner fuer update-sichere Automatisierung ausserhalb des Containers.
- `tools/rebuild_browser_mapper.mjs`: Uebernimmt Aenderungen aus der Master-Aliasliste ins Browser-Script.
- `LOGIN_ERMITTELN.md`: Anleitung zum Ermitteln des SPM-Login-Requests.
- `PROXMOX_INSTALLATION.md`: Anleitung fuer Betrieb auf Proxmox/Linux ausserhalb des Containers.
- `reports/`: Platz fuer heruntergeladene Reports, M3U-Pruefungen und Zusammenfassungen.

## Arbeitsweise

1. In SPM einloggen.
2. M3U Editor oeffnen.
3. `browser/spm_auto_tvg_mapper.browser.js` komplett in die Browser-Konsole einfuegen.
4. Erst mit `DRY_RUN: true` laufen lassen und Report pruefen.
5. Wenn es passt, im Script `DRY_RUN: false` setzen und erneut laufen lassen.
6. Nach einem Apply-Lauf das Script wieder auf `DRY_RUN: true` setzen.

## Wichtige Script-Optionen

- `DRY_RUN: true`: Testlauf ohne Speichern. Immer als sichere Standardstellung verwenden.
- `DRY_RUN: false`: Schreibt die TVG-IDs wirklich in SPM.
- `APPLY_ALL_PORTALS: true`: Bearbeitet alle von SPM gelieferten Portale.
- `APPLY_ALL_PORTALS: false`: Bearbeitet nur die IDs aus `PORTAL_IDS`.
- `PORTAL_IDS: [7]`: Wird nur genutzt, wenn `APPLY_ALL_PORTALS: false` ist.
- `ENSURE_PROFILE: true`: Profil pro Portal automatisch suchen oder anlegen.
- `PROFILE_NAME: 'spm'`: Name des SPM-Profils je Portal.
- `PROFILE_ID_BY_PORTAL_ID`: Optionaler Override, wenn ein Portal bewusst ein bestimmtes Profil verwenden soll.
- `KEEP_EXISTING_TVG_IDS: true`: Vorhandene TVG-IDs bleiben erhalten, wenn kein besserer Treffer gefunden wird.

## Custom-M3U in TiviMate / E-Channelizer

Nach dem Apply-Lauf wird pro Portal eine eigene Custom-Playlist genutzt:

```text
http://10.10.100.117:8000/proxy/custom/<PortalName>_tv_spm.m3u
```

Beispiele aus dem Testsystem:

```text
http://10.10.100.117:8000/proxy/custom/204TV_tv_spm.m3u
http://10.10.100.117:8000/proxy/custom/Sky4K_tv_spm.m3u
```

Die normale Portal-M3U ohne Custom-Profil bleibt unveraendert:

```text
http://10.10.100.117:8000/proxy/<PortalName>_tv.m3u
```

## Neue Portale

- Portal in SPM anlegen und Playlist einmal laden lassen.
- Mapper mit `DRY_RUN: true` und `APPLY_ALL_PORTALS: true` ausfuehren.
- Report pruefen.
- Wenn die Treffer plausibel sind, `DRY_RUN: false` setzen und erneut ausfuehren.
- Das Script legt das Profil `spm` fuer das neue Portal automatisch an.
- Danach die Custom-M3U in TiviMate/E-Channelizer verwenden.

## Fehlende Sender

Fehlende Sender stehen im heruntergeladenen Report unter `unmatched`. Den normalisierten Key einmal in `config/spm_tvg_aliases_master.json` ergaenzen und danach das Browser-Script neu erzeugen:

```powershell
node .\tools\rebuild_browser_mapper.mjs
```

Danach wieder mit `DRY_RUN: true` testen.

## Profile je Portal

SPM-Profile sind portalgebunden. Das Profil `spm` von Portal 204TV kann nicht direkt bei einem anderen Portal verwendet werden. Das Browser-Script kann deshalb pro Portal automatisch ein Profil mit dem Namen `spm` suchen oder anlegen.

## Bisherige Profil-IDs im Test-SPM

Diese IDs stammen aus dem Apply-Report vom 18.05.2026:

| Portal | Profil-ID | Quelle |
|---:|---:|---|
| 1 | 5 | neu erstellt |
| 2 | 6 | neu erstellt |
| 3 | 1 | fest konfiguriert |
| 4 | 7 | neu erstellt |
| 5 | 3 | neu erstellt |
| 6 | 4 | neu erstellt |
| 7 | 2 | bestehend |

## Sicherer Wiederholungsablauf

1. Script auf `DRY_RUN: true` lassen.
2. In SPM einloggen und M3U Editor oeffnen.
3. Komplettes Browser-Script in der Konsole ausfuehren.
4. Reports in `reports/` ablegen.
5. Treffer und auffaellige Sender pruefen.
6. Nur wenn alles plausibel ist: `DRY_RUN: false` setzen und nochmal ausfuehren.
7. Reports wieder sichern.
8. Script zurueck auf `DRY_RUN: true` setzen.
