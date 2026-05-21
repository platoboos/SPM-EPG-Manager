# SPM TVG Mapper - Anleitung fuer Anfaenger

Diese Anleitung beschreibt den sicheren Ablauf, wenn du in SPM automatisch TVG-IDs fuer TiviMate oder E-Channelizer setzen moechtest.

## Worum geht es?

SPM liefert deine Sender als M3U-Playlist aus. TiviMate und E-Channelizer koennen den EPG aber nur sauber zuordnen, wenn die Sender eine passende `tvg-id` haben.

Beispiel:

```text
tvg-id="RTL.de"
tvg-id="ZDF.de"
tvg-id="SkySportBundesliga1.de"
```

EasyEPG liefert die EPG-Daten mit solchen IDs. Der Mapper traegt diese IDs automatisch in ein SPM-Profil ein.

## Die wichtigsten Begriffe

| Begriff | Bedeutung |
|---|---|
| SPM | Stalker Portal Manager |
| Portal | Ein einzelnes Portal in SPM, z. B. 204TV oder Sky4K |
| Profil | Bearbeitete M3U-Version in SPM |
| `spm` | Unser Profilname fuer die automatisch bearbeitete M3U |
| TVG-ID | Senderkennung fuer EPG-Zuordnung, z. B. `RTL.de` |
| Dry-Run | Testlauf ohne Speichern |
| Apply | Echter Lauf, der in SPM speichert |
| Report | JSON-Datei, in der steht, was der Mapper gefunden und gesetzt hat |

## Goldene Regel

Immer zuerst Dry-Run, dann Report pruefen, danach erst Apply.

Nach jedem Apply wird das Script wieder auf Dry-Run gestellt.

## Wichtige Dateien

| Datei | Zweck |
|---|---|
| `browser/spm_auto_tvg_mapper.browser.js` | Das Script, das du in der Browser-Konsole ausfuehrst |
| `run_dry_run.cmd` | Einfacher Starter fuer einen sicheren externen Testlauf |
| `run_apply.cmd` | Einfacher Starter fuer einen echten externen Speicherlauf |
| `config/spm_tvg_aliases_master.json` | Zentrale Liste, welcher Sender welche TVG-ID bekommt |
| `reports/` | Hier werden Reports und Testdateien abgelegt |
| `LOGIN_ERMITTELN.md` | Anleitung, wie wir den SPM-Login fuer automatische Anmeldung herausfinden |
| `PROXMOX_INSTALLATION.md` | Anleitung fuer spaeteren Betrieb auf Proxmox/Linux |
| `PRODUKTIV_CHECKLISTE.md` | Extra Checkliste fuer spaetere Produktiv-Container |

## Standard-Einstellung

Das Script soll normalerweise so stehen:

```js
DRY_RUN: true,
APPLY_ALL_PORTALS: true,
ENSURE_PROFILE: true,
PROFILE_NAME: 'spm',
```

Das bedeutet:

- Es wird nur getestet.
- Alle Portale werden geprueft.
- Pro Portal wird ein Profil `spm` gesucht oder im echten Lauf angelegt.
- Es wird noch nichts gespeichert.

## Schritt 1: Dry-Run ausfuehren

1. In SPM einloggen.
2. Den M3U Editor oeffnen.
3. Die Datei `browser/spm_auto_tvg_mapper.browser.js` oeffnen.
4. Den kompletten Inhalt kopieren.
5. Im Browser die Entwicklerkonsole oeffnen.
   - Chrome/Edge: `F12`
   - Dann Tab `Konsole` oder `Console`
6. Das komplette Script einfuegen und mit Enter starten.
7. Warten, bis SPM eine Meldung anzeigt.
8. Die heruntergeladenen `*_dry_run_report.json` Dateien in den Ordner `reports/` legen.

Ein Dry-Run veraendert nichts in SPM.

## Schritt 2: Report pruefen

Im Report stehen vor allem diese Werte:

| Feld | Bedeutung |
|---|---|
| `entries` | Anzahl Sender im Portal |
| `matched` | Sender, fuer die der Mapper einen Treffer gefunden hat |
| `payloadTvgIds` | Sender, die im gespeicherten Profil eine TVG-ID haetten |
| `unmatched` | Sender ohne Treffer |
| `profileSource` | Ob ein Profil gefunden, angelegt oder fest vorgegeben wurde |

Wichtig ist nicht, dass 100 Prozent getroffen werden. Viele Portale enthalten PPV, Event-Kanaele, Backup-Sender oder internationale Sender ohne passenden Rytec-EPG.

## Schritt 3: Apply vorbereiten

Nur wenn der Dry-Run plausibel aussieht, im Script diese Zeile aendern:

```js
DRY_RUN: false,
```

Alles andere bleibt normalerweise gleich.

## Schritt 4: Apply ausfuehren

1. Wieder in SPM eingeloggt bleiben.
2. M3U Editor oeffnen.
3. Das komplette Script mit `DRY_RUN: false` in die Browser-Konsole einfuegen.
4. Warten, bis die Erfolgsmeldung kommt.
5. Die heruntergeladenen `*_applied_report.json` Dateien in den Ordner `reports/` legen.
6. Danach das Script sofort wieder auf `DRY_RUN: true` stellen.

## Schritt 5: Custom-M3U nutzen

Nach dem Apply gibt es pro Portal eine bearbeitete Custom-M3U.

Schema:

```text
http://<SPM-IP>:8000/proxy/custom/<PortalName>_tv_spm.m3u
```

Beispiele im Test-SPM:

```text
http://DEINE-SPM-IP:8000/proxy/custom/204TV_tv_spm.m3u
http://DEINE-SPM-IP:8000/proxy/custom/Sky4K_tv_spm.m3u
```

Die normale M3U bleibt weiterhin vorhanden:

```text
http://DEINE-SPM-IP:8000/proxy/<PortalName>_tv.m3u
```

Wenn etwas nicht passt, kannst du in TiviMate oder E-Channelizer wieder temporaer die normale M3U verwenden.

## TiviMate einrichten

1. Playlist hinzufuegen oder bestehende Playlist bearbeiten.
2. Als Playlist-URL die Custom-M3U eintragen.
3. Als EPG-URL die EasyEPG-URL eintragen.

Beispiel:

```text
Playlist:
http://DEINE-SPM-IP:8000/proxy/custom/204TV_tv_spm.m3u

EPG:
https://epg1.boombox.de/epg.xml.gz
```

Danach EPG in TiviMate aktualisieren lassen.

## E-Channelizer einrichten

1. Die Custom-M3U laden.
2. Die EasyEPG-XMLTV-Quelle verwenden.
3. Sender anhand der `tvg-id` zuordnen lassen.
4. Fehlende Sender pruefen.

## Wenn Sender fehlen

Fehlende Sender sind normal. Dann gibt es zwei Moeglichkeiten:

1. Der Sender hat keinen passenden Rytec-EPG.
2. Der Mapper kennt den Sendernamen noch nicht.

In dem Fall:

1. Screenshot oder M3U/Report sichern.
2. Fehlenden Sendernamen notieren.
3. In `config/spm_tvg_aliases_master.json` eine neue Alias-Regel ergaenzen.
4. Danach das Browser-Script neu bauen:

```powershell
node .\tools\rebuild_browser_mapper.mjs
```

5. Wieder mit Dry-Run testen.

## Neue Portale

Wenn du in SPM ein neues Portal anlegst:

1. Portal in SPM anlegen.
2. Playlist einmal laden lassen.
3. Mapper mit `DRY_RUN: true` und `APPLY_ALL_PORTALS: true` starten.
4. Report pruefen.
5. Wenn es passt, `DRY_RUN: false` setzen und erneut starten.
6. Danach die neue Custom-M3U im Client verwenden.

Du musst normalerweise keine Portal-ID manuell eintragen. Das Script sucht alle Portale und legt das Profil `spm` pro Portal an.

## Wann muss ich eine Portal-ID eintragen?

Nur in Sonderfaellen.

Beispiel im Test-SPM:

```js
PROFILE_ID_BY_PORTAL_ID: { 3: 1 },
```

Das bedeutet: Portal 3 soll fest Profil-ID 1 verwenden.

Solche Sonderfaelle sollte man nur setzen, wenn man bewusst ein vorhandenes Profil weiterverwenden will.

## Produktiv-Uebernahme

Fuer Produktiv gilt derselbe Ablauf, aber vorsichtiger:

1. Vorher SPM-Konfiguration sichern.
2. Erst Dry-Run im produktiven SPM.
3. Reports pruefen.
4. Nur bei plausiblen Ergebnissen Apply.
5. Danach Custom-M3U testen.
6. Normale M3U als Rueckfall behalten.

Details stehen in `PRODUKTIV_CHECKLISTE.md`.

## Externer Runner unter Windows

Wenn der Cookie gesetzt ist, kannst du statt des langen Node-Befehls diese Kurzbefehle nutzen:

```powershell
.\run_dry_run.cmd
```

und erst wenn der Dry-Run passt:

```powershell
.\run_apply.cmd
```

Der Apply-Starter fragt extra nochmal nach `APPLY`, bevor wirklich gespeichert wird.

## Schneller Merksatz

Dry-Run ist anschauen. Apply ist speichern.

Wenn du unsicher bist: Script auf `DRY_RUN: true` lassen.
