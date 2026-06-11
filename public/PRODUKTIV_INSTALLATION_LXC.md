# Produktiv-Installation auf LXC

Diese Anleitung ist für einen produktiven SPM-LXC mit Docker gedacht.

Beispiel in diesem Setup:

```text
SPM-IP: 10.10.100.112
SPM-URL: http://10.10.100.112:8000
```

## Vorher

- Proxmox-Backup des LXC erstellen.
- Docker prüfen:

```bash
docker --version
docker compose version
```

## 1. SPM EPG Manager installieren

Auf dem LXC ausführen:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-production-installer/install.sh | INSTALL_DIR="$HOME/spm-epg-manager" MAPPER_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" SPM_BASE_URL="http://10.10.100.112:8000" SPM_TARGET_NAME="Produktiv SPM" sh
```

Der Installer fragt nach:

- SPM Benutzername
- SPM Passwort

Danach öffnen:

```text
http://10.10.100.112:8099
```

Dann:

1. `Nur prüfen`
2. Ergebnis ansehen
3. erst danach `In SPM speichern`

## 2. SPM Stream Manager installieren

Auf dem LXC ausführen:

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-stream-installer/install.sh | INSTALL_DIR="$HOME/spm-stream-manager" STREAM_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" SPM_BASE_URL="http://10.10.100.112:8000" ACTIVE_WINDOW_MINUTES="180" ACTIVE_GROUP_BY="viewer" sh
```

Der Installer fragt nach:

- SPM Benutzername
- SPM Passwort

Danach öffnen:

```text
http://10.10.100.112:8100
```

## 3. Testablauf

1. EPG Manager öffnen.
2. `Nur prüfen` ausführen.
3. Bei plausiblen Treffern `In SPM speichern`.
4. In TiviMate/E-Channelizer einen Stream starten.
5. Stream Manager öffnen und prüfen, ob Client, Portal und Stream erscheinen.
6. Über Cloudflare einen Stream starten und prüfen, welche Client-IP angezeigt wird.

## Cloudflare

Der Stream Manager liest nur die SPM Proxy Logs. Wenn dort nur Cloudflare-IP-Adressen stehen, sieht auch der Stream Manager nur Cloudflare.

Dann muss später die echte Client-IP sauber an SPM weitergegeben werden, zum Beispiel über:

- Reverse-Proxy mit Real-IP-Konfiguration
- `CF-Connecting-IP`
- `X-Forwarded-For`
- oder eine SPM-seitige Anpassung

Das prüfen wir nach der Installation mit einem echten Zugriff über Cloudflare.

## Updates

Zum Aktualisieren denselben Einzeiler erneut ausführen. Die Installer schreiben die `.env` mit den eingegebenen Zugangsdaten neu und bauen den Container aktualisiert.
