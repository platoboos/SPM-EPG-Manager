# SPM Stream Manager - Installer

Dieser Installer richtet den SPM Stream Manager als separate Docker-WebUI ein.

## Einzeiler

```bash
curl -fsSL https://raw.githubusercontent.com/platoboos/SPM-EPG-Manager/main/spm-stream-installer/install.sh | STREAM_ARCHIVE_URL="https://github.com/platoboos/SPM-EPG-Manager/archive/refs/heads/main.tar.gz" sh
```

Danach ist die WebUI normalerweise hier erreichbar:

```text
http://HOST-IP:8100
```

## Standard

- Installationsordner: `/opt/spm-stream-manager`
- Web-Port: `8100`
- aktive Anzeige: letzter Stream pro Client-IP und Portal
- Zeitfenster: 180 Minuten
