# SPM Stream Manager

SPM Stream Manager ist ein separates Monitoring-Tool für Stalker Portal Manager.

Es liest die Proxy Logs aus SPM und zeigt an, welche Clients zuletzt Streams abgerufen haben. Damit sieht man schnell:

- Client-IP
- Portal
- Sender/Stream
- MAC, falls SPM sie loggt
- Zeitpunkt des letzten Requests
- HTTP-Status und Ergebnis
- User-Agent in den Details

## Wichtig

Das Tool ändert nichts in SPM. Es liest nur die SPM-API.

„Aktiv“ bedeutet in der ersten Version: Der Client hatte innerhalb des eingestellten Zeitfensters einen erfolgreichen Proxy-Request. Bei HLS-Streams ist das sehr nah an „streamt gerade“, weil regelmäßig Segmente geladen werden. Bei manchen direkten Streams kann ein Client länger schauen, obwohl kein neuer Request im Zeitfenster auftaucht.

## Voraussetzungen

- laufender Stalker Portal Manager
- SPM Benutzername und Passwort
- Docker und Docker Compose
- Proxy Logs in SPM müssen vorhanden sein

## Start

```bash
cp env.example .env
nano .env
docker compose -f docker-compose.example.yml up -d --build
```

Danach im Browser:

```text
http://HOST-IP:8100
```

## Konfiguration

```text
SPM_BASE_URL=http://DEINE-SPM-IP:8000
SPM_USERNAME=dein_benutzer
SPM_PASSWORD=dein_passwort
WEB_PORT=8100
ACTIVE_WINDOW_MINUTES=180
ACTIVE_GROUP_BY=viewer
```

`ACTIVE_GROUP_BY=viewer` zeigt pro Client-IP und Portal nur den letzten erfolgreichen Stream als aktiv. Das ist beim Umschalten/Zappen meist die sinnvollste Ansicht.

Warum nicht MAC als Standard? SPM kann je Stream/Portal unterschiedliche MACs aus seinem Bestand nutzen. Diese MAC ist dann nicht zuverlässig der echte Zuschauer, sondern oft nur die verwendete Portal-MAC.

`ACTIVE_WINDOW_MINUTES=180` hält den letzten Stream pro Client/Portal bis zu 3 Stunden sichtbar. Das ist nötig, weil SPM bei manchen Streamarten nur den Start/Redirect loggt und danach keine laufenden Segmente mehr protokolliert. Beim Umschalten wird der alte Sender trotzdem verdrängt, weil pro Client/Portal nur der neueste Stream angezeigt wird.

Weitere mögliche Werte:

- `stream`: jeden Stream innerhalb des Zeitfensters einzeln anzeigen
- `mac`: pro MAC-Adresse gruppieren
- `client`: pro Client-IP gruppieren

Hinweis: Auch bei `stream` werden ältere Streams desselben Clients ausgeblendet, sobald derselbe Client danach einen neueren Stream gestartet hat. So bleiben beim Umschalten nicht mehrere alte Sender als aktiv stehen.

## Nächster Test

1. Stream in TiviMate oder E-Channelizer starten.
2. WebUI öffnen.
3. `Aktualisieren` klicken.
4. Prüfen, ob IP, Portal und Stream erscheinen.

Wenn keine Daten erscheinen, zuerst in SPM selbst unter `Proxy Logs` prüfen, ob dort Einträge auftauchen.
