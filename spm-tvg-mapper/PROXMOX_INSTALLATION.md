# SPM TVG Mapper auf Proxmox/Linux installieren

Diese Anleitung ist fuer den Betrieb ausserhalb des SPM-Containers gedacht.

Der SPM-Container bleibt unveraendert. Dadurch bleibt alles update-sicher.

## Zielordner

Empfohlen:

```bash
/opt/spm-tvg-mapper
```

## 1. Projektordner kopieren

Den Ordner `spm-tvg-mapper` auf den Proxmox-/Docker-Host kopieren.

### Einfach von Windows per SSH/SCP

Wenn du von Windows per SSH auf den Host kommst, kannst du im Projektordner diesen Starter nutzen:

```powershell
.\deploy_to_linux.cmd -Target "torsten@ctSTM" -RemoteDir "/opt/spm-tvg-mapper"
```

Der Starter erstellt ein Archiv, kopiert es per `scp`, entpackt es nach `/opt/spm-tvg-mapper` und setzt die Ausfuehrungsrechte fuer die Linux-Starter.

Danach auf dem Host:

```bash
cd /opt/spm-tvg-mapper
cp env.example .env.local
nano .env.local
chmod 600 .env.local
./run_dry_run.sh
```

### Manuell

Beispiel:

```bash
sudo mkdir -p /opt/spm-tvg-mapper
```

Danach die Projektdateien dort ablegen.

## 2. Node.js installieren

Pruefen:

```bash
node --version
```

Wenn Node.js fehlt:

```bash
sudo apt update
sudo apt install -y nodejs
```

## 3. Rechte setzen

```bash
cd /opt/spm-tvg-mapper
chmod +x run_dry_run.sh run_apply.sh
```

## 4. Login-Datei erstellen

Vorlage kopieren:

```bash
cp env.example .env.local
```

Bearbeiten:

```bash
nano .env.local
```

Eintragen:

```text
SPM_USERNAME=dein_benutzer
SPM_PASSWORD=dein_passwort
```

Danach Rechte einschranken:

```bash
chmod 600 .env.local
```

## 5. Config fuer Test oder Produktiv waehlen

Test-SPM:

```bash
config/spm_targets.test.json
```

Produktiv-Vorlage:

```bash
config/spm_targets.prod.example.json
```

Fuer Produktiv am besten kopieren:

```bash
cp config/spm_targets.prod.example.json config/spm_targets.prod.json
nano config/spm_targets.prod.json
```

Dann `baseUrl` anpassen.

## 6. Dry-Run starten

Test-Config:

```bash
./run_dry_run.sh
```

Produktiv-Config:

```bash
SPM_CONFIG=/opt/spm-tvg-mapper/config/spm_targets.prod.json ./run_dry_run.sh
```

## 7. Reports pruefen

Reports liegen hier:

```bash
/opt/spm-tvg-mapper/reports
```

Erst wenn der Dry-Run plausibel ist, Apply ausfuehren.

## 8. Apply starten

Test-Config:

```bash
./run_apply.sh
```

Produktiv-Config:

```bash
SPM_CONFIG=/opt/spm-tvg-mapper/config/spm_targets.prod.json ./run_apply.sh
```

Der Apply-Lauf fragt nochmal nach `APPLY`.

## 9. Cron fuer regelmaessigen Dry-Run

Cron bearbeiten:

```bash
crontab -e
```

Beispiel: taeglich um 03:15 Uhr Dry-Run:

```cron
15 3 * * * cd /opt/spm-tvg-mapper && ./run_dry_run.sh >> ./reports/cron_dry_run.log 2>&1
```

Produktiv-Dry-Run:

```cron
15 3 * * * cd /opt/spm-tvg-mapper && SPM_CONFIG=/opt/spm-tvg-mapper/config/spm_targets.prod.json ./run_dry_run.sh >> ./reports/cron_prod_dry_run.log 2>&1
```

## Apply nicht blind planen

Ich empfehle:

- Dry-Run automatisch
- Reports pruefen
- Apply bewusst manuell starten

So vermeidest du, dass falsche Zuordnungen automatisch produktiv gespeichert werden.
