# SPM EPG Manager - Production Installer

Dieser Ordner ist als sauberes Installationspaket fuer Produktiv- oder neue SPM-Systeme gedacht.

Er installiert:

- SPM EPG Manager WebUI
- Mapper-Konfiguration fuer ein SPM-System
- SPM Login per Benutzer/Passwort
- optional EasyEPG `settings.json`

## EasyEPG settings.json

Eine komplette EasyEPG `settings.json` kann sensible oder private Daten enthalten:

- Session-Cookies von Providern
- private XMLTV-Quellen/URLs
- deine persoenliche Sender- und Provider-Auswahl

Darum liegt hier nur eine bereinigte Vorlage:

```text
easyepg-settings.rytec-template.json
```

Diese Vorlage enthaelt keine Sessions, keine Login-Daten und nur oeffentliche Rytec-Quellen. Damit kann ein neues EasyEPG-System schneller starten. Danach in EasyEPG pruefen, ob die Quellen geladen werden, und bei Bedarf eigene Provider ergaenzen.

## Empfehlung

Ich wuerde es so aufbauen:

1. **GitHub**
   - Fuer Code, Installer und Mapper-Projekt.
   - Kann privat oder oeffentlich sein.
   - Keine Passwoerter, keine `.env`, keine geheimen URLs committen.

2. **Unraid**
   - Fuer private Dateien, falls gewuenscht.
   - Zum Beispiel EasyEPG `settings.json`.
   - Vorteil: bleibt zuhause, nicht in GitHub.

Der Installer kann den Mapper von GitHub laden und optional die EasyEPG-Settings von Unraid.

## Einzeiler mit Rueckfragen

Auf dem Zielhost:

```bash
curl -fsSL https://DEINE-URL/install.sh -o /tmp/spm-install.sh && sh /tmp/spm-install.sh
```

Das Script fragt dann:

- Mapper Archiv-URL
- SPM Basis-URL
- SPM Benutzername
- SPM Passwort

## Einzeiler komplett automatisch

Beispiel:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | \
MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" \
SPM_BASE_URL="http://DEINE-SPM-IP:8000" \
SPM_TARGET_NAME="Produktiv SPM" \
SPM_USERNAME="dein_benutzer" \
SPM_PASSWORD="dein_passwort" \
sh
```

Wichtig: Das Passwort steht dabei in der Shell-History. Sicherer ist die Variante mit Rueckfragen.

## Mit EasyEPG settings.json von Unraid

Beispiel:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | \
MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" \
SPM_BASE_URL="http://DEINE-SPM-IP:8000" \
SPM_USERNAME="dein_benutzer" \
SPM_PASSWORD="dein_passwort" \
EASYEPG_SETTINGS_URL="http://UNRAID-IP/easyepg/settings.json" \
EASYEPG_CONTAINER="easyepg" \
EASYEPG_SETTINGS_PATH="/opt/EasyEPG/settings.json" \
sh
```

Der Installer macht vorher ein Backup der vorhandenen EasyEPG-Datei.

## Wenn EasyEPG settings.json auf dem Host liegt

Beispiel fuer Unraid Appdata:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | \
MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" \
SPM_BASE_URL="http://DEINE-SPM-IP:8000" \
SPM_USERNAME="dein_benutzer" \
SPM_PASSWORD="dein_passwort" \
EASYEPG_SETTINGS_URL="http://UNRAID-IP/easyepg/settings.json" \
EASYEPG_HOST_SETTINGS_PATH="/mnt/user/appdata/easyepg/settings.json" \
sh
```

## Lokaler Test

Wenn der Ordner schon auf dem Host liegt:

```bash
cd spm-production-installer
cp config.example.env .env
nano .env
chmod +x install.sh
./install.sh
```

## Nach der Installation

Im Browser:

```text
http://HOST-IP:8099
```

Dann:

1. `Nur pruefen`
2. Report kontrollieren
3. `In SPM speichern`

## Oeffentliche Vorlage

Fuer andere Nutzer besser die bereinigte EasyEPG-Vorlage aus diesem Repository verwenden oder eigene private Settings selbst bereitstellen. Eine originale EasyEPG `settings.json` sollte vor einer Veroeffentlichung auf Sessions, Cookies und private XMLTV-URLs geprueft werden.
