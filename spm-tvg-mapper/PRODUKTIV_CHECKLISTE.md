# Produktiv-Checkliste SPM TVG Mapper

Diese Checkliste ist fuer die spaetere Uebernahme vom Test-SPM in produktive SPM-Container gedacht.

## Vor der Uebernahme

- Test-SPM ist aktuell und der letzte Dry-Run/Apply-Run sieht plausibel aus.
- `browser/spm_auto_tvg_mapper.browser.js` steht wieder auf `DRY_RUN: true`.
- `config/spm_tvg_aliases_master.json` enthaelt die aktuell gewollten Alias-Regeln.
- EasyEPG liefert die gewuenschten XMLTV-IDs unter der produktiv genutzten EPG-URL.
- Vorhandene produktive M3U/Portal-Konfigurationen wurden gesichert.

## Produktiv-Dry-Run

1. Im produktiven SPM einloggen.
2. M3U Editor oeffnen.
3. Browser-Script mit `DRY_RUN: true` ausfuehren.
4. Alle heruntergeladenen `*_dry_run_report.json` sichern.
5. Pruefen:
   - Wurden alle erwarteten Portale gefunden?
   - Wuerde pro Portal ein Profil `spm` gefunden oder angelegt?
   - Sind die gesetzten TVG-IDs plausibel?
   - Gibt es auffaellige Fehlzuordnungen bei Sky, DAZN, regionalen Sendern oder internationalen Gruppen?

## Produktiv-Apply

Nur ausfuehren, wenn der Dry-Run passt.

1. Im Script `DRY_RUN: false` setzen.
2. Script erneut in derselben produktiven SPM-Umgebung ausfuehren.
3. Alle heruntergeladenen `*_applied_report.json` sichern.
4. Script danach sofort wieder auf `DRY_RUN: true` setzen.
5. Custom-M3U je Portal testen:

```text
http://<SPM-IP>:8000/proxy/custom/<PortalName>_tv_spm.m3u
```

## Nachkontrolle

- TiviMate mit der Custom-M3U und der EasyEPG-XMLTV-URL testen.
- E-Channelizer mit der Custom-M3U und der EasyEPG-XMLTV-URL testen.
- Fehlende Sender aus den Reports oder Screenshots in die Aliasliste uebernehmen.
- Nach Alias-Aenderungen das Browser-Script neu erzeugen:

```powershell
node .\tools\rebuild_browser_mapper.mjs
```

## Rueckfallplan

- Normale SPM-M3U bleibt erhalten:

```text
http://<SPM-IP>:8000/proxy/<PortalName>_tv.m3u
```

- Falls ein Custom-Profil falsche TVG-IDs enthaelt, in TiviMate/E-Channelizer wieder temporaer auf die normale M3U wechseln.
- Danach Aliasliste korrigieren, Dry-Run ausfuehren und erst dann erneut applyen.

## Merksatz

Immer erst Dry-Run, dann Reports pruefen, dann Apply. Nach jedem Apply das Script wieder auf Dry-Run stellen.
