import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.WEB_PORT || 8100);
const SPM_BASE_URL = (process.env.SPM_BASE_URL || '').replace(/\/+$/, '');
const SPM_USERNAME = process.env.SPM_USERNAME || '';
const SPM_PASSWORD = process.env.SPM_PASSWORD || '';
const ACTIVE_WINDOW_MINUTES = Number(process.env.ACTIVE_WINDOW_MINUTES || 180);
const ACTIVE_GROUP_BY = process.env.ACTIVE_GROUP_BY || 'viewer';

let sessionCookie = '';
let sessionCreatedAt = 0;

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  res.end(type === 'application/json' ? JSON.stringify(body, null, 2) : body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function requireConfig() {
  const missing = [];
  if (!SPM_BASE_URL) missing.push('SPM_BASE_URL');
  if (!SPM_USERNAME) missing.push('SPM_USERNAME');
  if (!SPM_PASSWORD) missing.push('SPM_PASSWORD');
  if (missing.length) {
    throw new Error(`Fehlende Konfiguration: ${missing.join(', ')}`);
  }
}

function cookieFromHeaders(headers) {
  const setCookie = headers.getSetCookie ? headers.getSetCookie() : [];
  const values = setCookie.length ? setCookie : [headers.get('set-cookie')].filter(Boolean);
  return values.map(value => value.split(';')[0]).join('; ');
}

async function spmFetch(apiPath, options = {}) {
  requireConfig();
  const url = `${SPM_BASE_URL}${apiPath}`;
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };
  if (sessionCookie) headers.Cookie = sessionCookie;

  let res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    await login();
    headers.Cookie = sessionCookie;
    res = await fetch(url, { ...options, headers });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
}

async function login() {
  requireConfig();
  const res = await fetch(`${SPM_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ username: SPM_USERNAME, password: SPM_PASSWORD })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SPM Login fehlgeschlagen: ${res.status} ${res.statusText}: ${text}`);
  }

  sessionCookie = cookieFromHeaders(res.headers);
  sessionCreatedAt = Date.now();
  if (!sessionCookie) throw new Error('SPM Login erfolgreich, aber kein Session-Cookie erhalten.');
  return { ok: true, sessionCreatedAt: new Date(sessionCreatedAt).toISOString() };
}

async function loadProxyLogs({ pageSize = 100, search = '', outcome = 'all', portalId = '' } = {}) {
  const params = new URLSearchParams({
    page: '1',
    page_size: String(Math.max(1, Math.min(100, Number(pageSize) || 100))),
    outcome,
    search
  });
  if (portalId) params.set('portal_id', portalId);
  return spmFetch(`/api/proxy-logs?${params.toString()}`);
}

function parseTime(value) {
  const normalized = normalizeTimestamp(value);
  const time = Date.parse(normalized || '');
  return Number.isFinite(time) ? time : 0;
}

function normalizeTimestamp(value) {
  const text = String(value || '');
  if (!text) return text;
  if (/[zZ]$|[+-]\d\d:\d\d$/.test(text)) return text;
  return `${text}Z`;
}

function isSuccessfulStream(row) {
  return row && row.outcome === 'redirect' && Number(row.http_status || 0) >= 200 && Number(row.http_status || 0) < 400;
}

function streamKey(row) {
  if (ACTIVE_GROUP_BY === 'viewer') {
    return viewerKey(row);
  }
  if (ACTIVE_GROUP_BY === 'client') {
    return row.client_ip || row.mac || `${row.portal_id || row.portal_name || ''}|${row.stream_id || row.stream_ref || row.stream_name || ''}`;
  }
  if (ACTIVE_GROUP_BY === 'mac') {
    return row.mac || row.client_ip || `${row.portal_id || row.portal_name || ''}|${row.stream_id || row.stream_ref || row.stream_name || ''}`;
  }
  return [
    row.client_ip || '',
    row.portal_id || row.portal_name || '',
    row.stream_id || row.stream_ref || row.stream_name || '',
    row.mac || ''
  ].join('|');
}

function viewerKey(row) {
  const device = row.client_ip || row.mac || 'unknown';
  const portal = row.portal_id || row.portal_name || 'unknown';
  return `${device}|${portal}`;
}

function buildSummary(items) {
  const now = Date.now();
  const activeMs = Math.max(1, ACTIVE_WINDOW_MINUTES) * 60 * 1000;
  const latestByStream = new Map();
  const latestTimeByViewer = new Map();

  for (const row of items || []) {
    if (!isSuccessfulStream(row)) continue;
    const time = parseTime(row.ts);
    const viewer = viewerKey(row);
    const currentViewerTime = latestTimeByViewer.get(viewer) || 0;
    if (time > currentViewerTime) latestTimeByViewer.set(viewer, time);

    const key = streamKey(row);
    const current = latestByStream.get(key);
    if (!current || time > parseTime(current.ts)) latestByStream.set(key, row);
  }

  const active = [...latestByStream.values()]
    .filter(row => now - parseTime(row.ts) <= activeMs)
    .filter(row => {
      if (ACTIVE_GROUP_BY !== 'stream') return true;
      const viewerLatest = latestTimeByViewer.get(viewerKey(row)) || 0;
      return parseTime(row.ts) >= viewerLatest;
    })
    .sort((a, b) => parseTime(b.ts) - parseTime(a.ts));

  const uniqueIps = new Set(active.map(row => row.client_ip).filter(Boolean));
  const uniquePortals = new Set(active.map(row => row.portal_name || row.portal_id).filter(Boolean));
  const errors = (items || []).filter(row => row.outcome === 'error' || Number(row.http_status || 0) >= 400);

  return {
    activeWindowMinutes: ACTIVE_WINDOW_MINUTES,
    activeGroupBy: ACTIVE_GROUP_BY,
    totalLoaded: (items || []).length,
    activeCount: active.length,
    uniqueIps: uniqueIps.size,
    uniquePortals: uniquePortals.size,
    recentErrors: errors.length,
    active,
    latest: items || []
  };
}

const page = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SPM Stream Manager</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; background: #f3f1eb; color: #111; }
    body { margin: 0; }
    header { background: #151515; color: #fff; padding: 18px 28px; }
    main { max-width: 1260px; margin: 0 auto; padding: 24px; display: grid; gap: 20px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    section { border-top: 1px solid #d8d2c8; padding-top: 18px; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
    label { display: grid; gap: 4px; font-size: 13px; color: #514a42; }
    input, select { min-height: 38px; border: 1px solid #b8b1a5; border-radius: 6px; padding: 0 10px; background: white; }
    button { border: 1px solid #2b2b2b; background: #fff; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; }
    button.primary { background: #1f6f4a; color: #fff; border-color: #1f6f4a; }
    .status { padding: 10px 12px; background: #fff; border: 1px solid #d8d2c8; border-radius: 6px; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 10px; }
    .card { background: #fff; border: 1px solid #d8d2c8; border-radius: 6px; padding: 12px; }
    .card strong { display: block; font-size: 26px; margin-bottom: 4px; }
    .card span { color: #685f54; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { text-align: left; padding: 9px; border-bottom: 1px solid #e1ddd4; font-size: 14px; vertical-align: top; }
    th { background: #faf9f5; position: sticky; top: 0; }
    .table-wrap { max-height: 470px; overflow: auto; border: 1px solid #e1ddd4; border-radius: 6px; background: white; }
    .muted { color: #685f54; }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: 12px; font-weight: 700; background: #eee6d8; }
    .ok { color: #17623f; }
    .bad { color: #9f2d20; }
    @media (max-width: 860px) { .cards { grid-template-columns: repeat(2, minmax(120px, 1fr)); } }
  </style>
</head>
<body>
  <header><h1>SPM Stream Manager</h1></header>
  <main>
    <section>
      <h2>Steuerung</h2>
      <div class="toolbar">
        <label>Suche<input id="search" placeholder="IP, Sender, Portal, MAC"></label>
        <label>Ergebnis<select id="outcome"><option value="all">Alle</option><option value="redirect">Erfolgreich</option><option value="error">Fehler</option></select></label>
        <label>Anzahl<input id="pageSize" type="number" min="1" max="100" value="100"></label>
        <button class="primary" onclick="loadData()">Aktualisieren</button>
      </div>
      <p class="muted">Aktive Streams werden aus dem letzten erfolgreichen Proxy-Request abgeleitet. Zeitfenster: ${ACTIVE_WINDOW_MINUTES} Minuten. Gruppierung: ${ACTIVE_GROUP_BY === 'viewer' ? 'letzter Stream pro Client-IP und Portal' : ACTIVE_GROUP_BY === 'client' ? 'letzter Stream pro Client-IP' : ACTIVE_GROUP_BY === 'mac' ? 'letzter Stream pro MAC' : 'jeder Stream einzeln'}.</p>
      <div id="status" class="status">Bereit.</div>
    </section>

    <section>
      <h2>Übersicht</h2>
      <div class="cards">
        <div class="card"><strong id="activeCount">-</strong><span>vermutlich aktiv</span></div>
        <div class="card"><strong id="uniqueIps">-</strong><span>Client-IPs</span></div>
        <div class="card"><strong id="uniquePortals">-</strong><span>Portale</span></div>
        <div class="card"><strong id="recentErrors">-</strong><span>Fehler in Liste</span></div>
      </div>
    </section>

    <section>
      <h2>Vermutlich aktive Streams</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Zeit</th><th>Client</th><th>Portal</th><th>Stream</th><th>MAC</th><th>Status</th></tr></thead>
        <tbody id="activeRows"></tbody>
      </table></div>
    </section>

    <section>
      <h2>Letzte Proxy Logs</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Zeit</th><th>Client</th><th>Portal</th><th>Stream</th><th>Quelle</th><th>Status</th></tr></thead>
        <tbody id="latestRows"></tbody>
      </table></div>
    </section>
  </main>
  <script>
    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    function fmtTime(value) {
      if (!value) return '-';
      const text = String(value);
      const normalized = /[zZ]$|[+-]\\d\\d:\\d\\d$/.test(text) ? text : text + 'Z';
      const date = new Date(normalized);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }
    function streamName(row) {
      return row.stream_name || row.stream_id || row.stream_ref || '-';
    }
    function statusCell(row) {
      const cls = row.outcome === 'redirect' && row.http_status < 400 ? 'ok' : 'bad';
      return '<span class="' + cls + '">' + esc(row.outcome) + ' ' + esc(row.http_status) + '</span>';
    }
    function renderRows(rows, target, active) {
      document.getElementById(target).innerHTML = rows.length ? rows.map(row => (
        '<tr>' +
        '<td>' + esc(fmtTime(row.ts)) + '<br><span class="muted">vor ' + esc(ageText(row.ts)) + '</span></td>' +
        '<td>' + esc(row.client_ip || '-') + '</td>' +
        '<td>' + esc(row.portal_name || row.portal_id || '-') + '</td>' +
        '<td>' + esc(streamName(row)) + '<br><span class="muted">' + esc(row.stream_ref || '') + '</span></td>' +
        (active ? '<td>' + esc(row.mac || '-') + '</td>' : '<td>' + esc(row.source || '-') + '</td>') +
        '<td>' + statusCell(row) + '</td>' +
        '</tr>'
      )).join('') : '<tr><td colspan="6" class="muted">Keine Einträge.</td></tr>';
    }
    async function api(url) {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      return data;
    }
    function ageText(value) {
      const text = String(value || '');
      const normalized = /[zZ]$|[+-]\d\d:\d\d$/.test(text) ? text : text + 'Z';
      const diffMs = Date.now() - new Date(normalized).getTime();
      if (!Number.isFinite(diffMs) || diffMs < 0) return '-';
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'unter 1 Min.';
      if (minutes < 60) return minutes + ' Min.';
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest ? hours + ' Std. ' + rest + ' Min.' : hours + ' Std.';
    }
    async function loadData() {
      const params = new URLSearchParams({
        search: document.getElementById('search').value,
        outcome: document.getElementById('outcome').value,
        pageSize: document.getElementById('pageSize').value
      });
      document.getElementById('status').textContent = 'Lade Proxy Logs...';
      try {
        const data = await api('/api/streams?' + params.toString());
        document.getElementById('activeCount').textContent = data.activeCount;
        document.getElementById('uniqueIps').textContent = data.uniqueIps;
        document.getElementById('uniquePortals').textContent = data.uniquePortals;
        document.getElementById('recentErrors').textContent = data.recentErrors;
        renderRows(data.active, 'activeRows', true);
        renderRows(data.latest, 'latestRows', false);
        document.getElementById('status').textContent = 'Aktualisiert: ' + new Date().toLocaleString();
      } catch (error) {
        document.getElementById('status').textContent = error.message;
      }
    }
    loadData();
    setInterval(loadData, 15000);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, page, 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, {
        ok: true,
        name: 'SPM Stream Manager',
        spmConfigured: Boolean(SPM_BASE_URL && SPM_USERNAME && SPM_PASSWORD),
        activeWindowMinutes: ACTIVE_WINDOW_MINUTES
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/login-test') {
      return send(res, 200, await login());
    }
    if (req.method === 'GET' && url.pathname === '/api/streams') {
      const pageSize = url.searchParams.get('pageSize') || 100;
      const search = url.searchParams.get('search') || '';
      const outcome = url.searchParams.get('outcome') || 'all';
      const portalId = url.searchParams.get('portalId') || '';
      const logs = await loadProxyLogs({ pageSize, search, outcome, portalId });
      return send(res, 200, buildSummary(logs.items || []));
    }
    if (req.method === 'GET' && url.pathname === '/api/proxy-logs') {
      const logs = await loadProxyLogs({
        pageSize: url.searchParams.get('pageSize') || 100,
        search: url.searchParams.get('search') || '',
        outcome: url.searchParams.get('outcome') || 'all',
        portalId: url.searchParams.get('portalId') || ''
      });
      return send(res, 200, logs);
    }
    if (req.method === 'POST' && url.pathname === '/api/config-preview') {
      const body = await readBody(req);
      return send(res, 200, { received: body.length });
    }
    return send(res, 404, { error: 'Nicht gefunden' });
  } catch (error) {
    return send(res, 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SPM Stream Manager: http://0.0.0.0:${PORT}`);
});
