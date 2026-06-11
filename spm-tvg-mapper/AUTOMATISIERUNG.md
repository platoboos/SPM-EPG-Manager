# SPM EPG Manager automatisch ausführen

Ziel: Der Mapper soll update-sicher ausserhalb des SPM-Containers laufen.

Der SPM-Container bleibt dabei unverändert. Das Script spricht SPM nur über die Web/API an, genau wie der Browser auch.

## Warum ausserhalb des Containers?

Wenn der SPM-Ersteller den Container aktualisiert, können eigene Dateien im Container verloren gehen. Deshalb liegt unser Projekt ausserhalb:

```text
C:\Users\torst\Documents\New project\spm-tvg-mapper
```

Später auf Proxmox wäre ein guter Ort zum Beispiel:

```text
/opt/spm-tvg-mapper
```

oder:

```text
/srv/spm-tvg-mapper
```

## Ablauf der Automatisierung

1. Das externe Script ruft die SPM-API auf.
2. Es liest alle Portale.
3. Es sucht oder erstellt pro Portal das Profil `spm`.
4. Es lädt die Senderliste pro Portal.
5. Es setzt passende `tvg-id` Werte anhand der Aliasliste.
6. Es schreibt Reports in den Ordner `reports/`.
7. Nur im Apply-Modus speichert es die Daten in SPM.

## Der externe Runner

Datei:

```text
tools/run_spm_tvg_mapper.mjs
```

Einfacher für Windows sind die Starter-Dateien im Projektordner:

```text
run_dry_run.ps1
run_apply.ps1
run_dry_run.cmd
run_apply.cmd
```

Empfohlener Weg für den Test-SPM:

```powershell
.\run_dry_run.cmd
```

und erst danach:

```powershell
.\run_apply.cmd
```

Dry-Run:

```powershell
node .\tools\run_spm_tvg_mapper.mjs --dry-run
```

Apply:

```powershell
node .\tools\run_spm_tvg_mapper.mjs --apply
```

Der Dry-Run ist der sichere Standard. Ohne Parameter läuft das Script ebenfalls als Dry-Run.

## Authentifizierung

Das Browser-Script nutzt automatisch deine aktive SPM-Browser-Sitzung.

Das externe Script braucht dagegen selbst Zugriff auf SPM. Dafür gibt es zwei Wege:

### Variante A: SPM ist im internen Netz ohne Login erreichbar

Dann reicht die `baseUrl` in der Konfiguration.

### Variante B: SPM braucht Login/Sitzung

Dann muss das externe Script einen gültigen Session-Cookie mitsenden.

Der Runner liest standardmäßig diese Umgebungsvariable:

```text
SPM_COOKIE
```

Beispiel PowerShell:

```powershell
$env:SPM_COOKIE = "session=DEIN_COOKIE_WERT"
.\run_dry_run.cmd
```

Wenn SPM eine feste Login-API anbietet, können wir später noch Benutzername/Passwort direkt in den Runner einbauen. Dafür müssen wir einmal den Login-Request aus dem Browser-Netzwerk-Tab kennen.

Der Runner ist dafür bereits vorbereitet. Die Anleitung zum Ermitteln der Login-Daten steht hier:

```text
LOGIN_ERMITTELN.md
```

Sobald die Login-URL und Feldnamen bekannt sind, kann `login.enabled` in der Ziel-Konfiguration auf `true` gesetzt werden.

Für den Test-SPM ist der Login aktuell so konfiguriert:

```text
URL: /api/auth/login
Methode: POST
Content-Type: application/json
Benutzerfeld: username
Passwortfeld: password
```

Damit reicht künftig:

```powershell
$env:SPM_USERNAME = "dein_benutzer"
$env:SPM_PASSWORD = "dein_passwort"
.\run_dry_run.cmd
```

Wenn Benutzer und Passwort gesetzt sind, nutzt der Runner diese Anmeldung bevorzugt. Ein alter `SPM_COOKIE` wird dann ignoriert.

## Konfiguration

Beispiel:

```text
config/spm_targets.example.json
```

Für den Test-SPM gibt es ausserdem:

```text
config/spm_targets.test.json
```

Wichtig sind:

| Feld | Bedeutung |
|---|---|
| `baseUrl` | URL zum SPM, z. B. `http://DEINE-SPM-IP:8000` |
| `profileName` | Profilname, normalerweise `spm` |
| `playlistType` | Normalerweise `tv` |
| `portalIds` | Optional. Wenn leer oder nicht gesetzt, werden alle Portale bearbeitet |
| `profileIdByPortalId` | Optionaler Sonderfall für feste Profil-IDs |
| `cookieEnv` | Name der Umgebungsvariable für den Session-Cookie |

## Zeitplanung

Automatisch sollte man nicht ständig Apply laufen lassen. Sinnvoll ist:

- regelmäßig Dry-Run, z. B. täglich
- Apply nur bewusst oder nach Prüfung
- Produktiv Apply eher manuell oder sehr kontrolliert

## Windows Aufgabenplanung

Dry-Run Beispiel:

```powershell
cd "C:\Users\torst\Documents\New project\spm-tvg-mapper"
.\run_dry_run.cmd
```

Apply Beispiel:

```powershell
cd "C:\Users\torst\Documents\New project\spm-tvg-mapper"
.\run_apply.cmd
```

Die `.cmd` Starter umgehen die lokale PowerShell-Script-Sperre nur für diesen einzelnen Start.

## Linux Cron Beispiel

Für Linux/Proxmox gibt es eigene Starter:

```bash
./run_dry_run.sh
./run_apply.sh
```

Die vollständige Anleitung steht hier:

```text
PROXMOX_INSTALLATION.md
```

Dry-Run jede Nacht um 03:15 Uhr:

```cron
15 3 * * * cd /opt/spm-tvg-mapper && ./run_dry_run.sh >> ./reports/cron.log 2>&1
```

## Produktiv-Empfehlung

Für produktive SPMs würde ich es so machen:

1. Projektordner ausserhalb des Containers ablegen.
2. Konfiguration pro produktivem SPM anlegen.
3. Erst Dry-Run laufen lassen.
4. Reports prüfen.
5. Erst danach Apply.
6. Apply nicht blind minütlich oder stündlich planen.

## Wichtig

Das Script speichert nur, wenn `--apply` gesetzt wird.

Ohne `--apply` ist es ein Dry-Run.

