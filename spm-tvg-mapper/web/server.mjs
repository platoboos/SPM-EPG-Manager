import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const PORT = Number(process.env.WEB_PORT || 8099);
const CONFIG_PATH = process.env.SPM_CONFIG || path.join(ROOT, 'config', 'spm_targets.web.json');
const REPORTS_DIR = process.env.SPM_REPORTS || path.join(ROOT, 'reports');
const RUNNER = path.join(ROOT, 'tools', 'run_spm_tvg_mapper.mjs');

let running = null;
const history = [];

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

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function listReports() {
  await ensureReportsDir();
  const entries = await fs.readdir(REPORTS_DIR, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(REPORTS_DIR, entry.name);
    const stat = await fs.stat(full);
    files.push({ name: entry.name, size: stat.size, modified: stat.mtime.toISOString() });
  }
  return files.sort((a, b) => b.modified.localeCompare(a.modified));
}

async function latestSummary() {
  const reports = await listReports();
  const summary = reports.find(report => /spm_tvg_mapper_(dry_run|applied)_summary_.*\.json$/.test(report.name));
  if (!summary) return null;
  try {
    const text = await fs.readFile(path.join(REPORTS_DIR, summary.name), 'utf8');
    const rows = JSON.parse(text);
    const totals = rows.reduce((acc, row) => {
      acc.entries += Number(row.entries || 0);
      acc.matched += Number(row.matched || 0);
      acc.payloadTvgIds += Number(row.payloadTvgIds || 0);
      acc.unmatched += Number(row.unmatched || 0);
      return acc;
    }, { entries: 0, matched: 0, payloadTvgIds: 0, unmatched: 0 });
    return { file: summary.name, modified: summary.modified, rows, totals };
  } catch {
    return null;
  }
}

function runMapper(mode) {
  if (running) {
    return { error: 'Es laeuft bereits ein Job.' };
  }

  const args = [
    RUNNER,
    `--config=${CONFIG_PATH}`,
    `--reports=${REPORTS_DIR}`,
    mode === 'apply' ? '--apply' : '--dry-run'
  ];

  const job = {
    id: Date.now().toString(),
    mode,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    output: ''
  };
  running = job;
  history.unshift(job);
  if (history.length > 20) history.pop();

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: process.env
  });

  child.stdout.on('data', data => {
    job.output += data.toString();
  });
  child.stderr.on('data', data => {
    job.output += data.toString();
  });
  child.on('close', code => {
    job.exitCode = code;
    job.finishedAt = new Date().toISOString();
    running = null;
  });

  return { job };
}

const page = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SPM EPG Manager</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; background: #f4f2ec; color: #111; }
    body { margin: 0; }
    header { background: #151515; color: white; padding: 18px 28px; }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; display: grid; gap: 20px; }
    section { border-top: 1px solid #d8d2c8; padding-top: 18px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { margin: 0 0 10px; font-size: 20px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    button { border: 1px solid #2b2b2b; background: #fff; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; }
    button.primary { background: #1f6f4a; color: white; border-color: #1f6f4a; }
    button.warn { background: #b96b11; color: white; border-color: #b96b11; }
    button:disabled { opacity: .55; cursor: wait; }
    details summary { cursor: pointer; font-weight: 700; font-size: 20px; margin-bottom: 10px; }
    textarea { width: 100%; min-height: 300px; box-sizing: border-box; font-family: Consolas, monospace; font-size: 13px; padding: 12px; border: 1px solid #b8b1a5; border-radius: 6px; background: white; }
    pre { white-space: pre-wrap; word-break: break-word; background: #111; color: #e8e8e8; padding: 14px; border-radius: 6px; min-height: 180px; max-height: 460px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { text-align: left; padding: 9px; border-bottom: 1px solid #e1ddd4; font-size: 14px; }
    .muted { color: #685f54; }
    .status { padding: 10px 12px; background: #fff; border: 1px solid #d8d2c8; border-radius: 6px; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 10px; }
    .card { background: #fff; border: 1px solid #d8d2c8; border-radius: 6px; padding: 12px; }
    .card strong { display: block; font-size: 24px; margin-bottom: 4px; }
    .card span { color: #685f54; font-size: 13px; }
    .toolbar { display: flex; flex-direction: column; gap: 10px; }
    @media (max-width: 760px) { .cards { grid-template-columns: repeat(2, minmax(120px, 1fr)); } }
  </style>
</head>
<body>
  <header>
    <h1>SPM EPG Manager</h1>
  </header>
  <main>
    <section>
      <h2>Steuerung</h2>
      <div class="toolbar">
        <div class="actions">
          <button class="primary" onclick="run('dry-run')">Nur pruefen</button>
          <button class="warn" onclick="confirmApply()">In SPM speichern</button>
          <button onclick="loadAll()">Ansicht aktualisieren</button>
        </div>
        <div class="muted">Erst pruefen, dann speichern. Beim Pruefen wird nichts in SPM geaendert.</div>
      </div>
      <div id="status" class="status">Bereit.</div>
    </section>

    <section>
      <h2>Letzte Zusammenfassung</h2>
      <div class="cards">
        <div class="card"><strong id="sumPortals">-</strong><span>Portale</span></div>
        <div class="card"><strong id="sumEntries">-</strong><span>Sender gesamt</span></div>
        <div class="card"><strong id="sumTvg">-</strong><span>mit TVG-ID</span></div>
        <div class="card"><strong id="sumOpen">-</strong><span>ohne Treffer</span></div>
      </div>
      <p id="sumFile" class="muted"></p>
    </section>

    <section>
      <h2>Letzte Ausgabe</h2>
      <pre id="output"></pre>
    </section>

    <section>
      <details>
      <summary>Konfiguration</summary>
      <p class="muted">Passwoerter gehoeren in Docker-Umgebungsvariablen, nicht in diese JSON-Datei.</p>
      <textarea id="config"></textarea>
      <div class="actions">
        <button onclick="saveConfig()">Config speichern</button>
      </div>
      </details>
    </section>

    <section>
      <h2>Reports</h2>
      <table>
        <thead><tr><th>Datei</th><th>Geaendert</th><th>Groesse</th><th></th></tr></thead>
        <tbody id="reports"></tbody>
      </table>
    </section>
  </main>
  <script>
    async function api(url, options) {
      const res = await fetch(url, options);
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
      return data;
    }
    async function loadAll() {
      const config = await api('/api/config');
      document.getElementById('config').value = JSON.stringify(config, null, 2);
      const state = await api('/api/state');
      renderState(state);
      const reports = await api('/api/reports');
      document.getElementById('reports').innerHTML = reports.map(r =>
        '<tr><td>' + r.name + '</td><td>' + r.modified + '</td><td>' + r.size + '</td><td><button onclick="openReport(\\'' + r.name + '\\')">Oeffnen</button></td></tr>'
      ).join('');
      const summary = await api('/api/summary');
      renderSummary(summary);
    }
    function renderSummary(summary) {
      if (!summary) return;
      document.getElementById('sumPortals').textContent = summary.rows.length;
      document.getElementById('sumEntries').textContent = summary.totals.entries;
      document.getElementById('sumTvg').textContent = summary.totals.payloadTvgIds;
      document.getElementById('sumOpen').textContent = summary.totals.unmatched;
      document.getElementById('sumFile').textContent = 'Quelle: ' + summary.file + ' (' + summary.modified + ')';
    }
    function renderState(state) {
      const status = document.getElementById('status');
      const output = document.getElementById('output');
      const latest = state.running || state.history[0];
      status.textContent = state.running ? 'Job laeuft: ' + state.running.mode : 'Bereit.';
      output.textContent = latest ? latest.output : '';
      document.querySelectorAll('button').forEach(button => {
        if (button.textContent.includes('pruefen') || button.textContent.includes('speichern')) button.disabled = !!state.running;
      });
    }
    async function saveConfig() {
      const parsed = JSON.parse(document.getElementById('config').value);
      await api('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) });
      await loadAll();
      alert('Config gespeichert.');
    }
    async function run(mode) {
      await api('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
      poll();
    }
    function confirmApply() {
      if (confirm('TVG-IDs werden jetzt in SPM gespeichert. Vorher sollte "Nur pruefen" erfolgreich gewesen sein. Fortfahren?')) run('apply');
    }
    async function openReport(name) {
      const report = await api('/api/reports/' + encodeURIComponent(name));
      document.getElementById('output').textContent = typeof report === 'string' ? report : JSON.stringify(report, null, 2);
    }
    async function poll() {
      const state = await api('/api/state');
      renderState(state);
      if (state.running) setTimeout(poll, 1500);
      else loadAll();
    }
    loadAll();
  </script>
</body>
</html>`;

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, page, 'text/html; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, { running, history });
  if (req.method === 'GET' && url.pathname === '/api/summary') return send(res, 200, await latestSummary());
  if (req.method === 'GET' && url.pathname === '/api/config') {
    const text = await fs.readFile(CONFIG_PATH, 'utf8');
    return send(res, 200, JSON.parse(text));
  }
  if (req.method === 'POST' && url.pathname === '/api/config') {
    const body = await readBody(req);
    const parsed = JSON.parse(body);
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(parsed, null, 2));
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/api/run') {
    const body = JSON.parse(await readBody(req));
    if (!['dry-run', 'apply'].includes(body.mode)) return send(res, 400, { error: 'Ungueltiger Modus.' });
    const result = runMapper(body.mode);
    if (result.error) return send(res, 409, result);
    return send(res, 200, result);
  }
  if (req.method === 'GET' && url.pathname === '/api/reports') return send(res, 200, await listReports());
  if (req.method === 'GET' && url.pathname.startsWith('/api/reports/')) {
    const name = decodeURIComponent(url.pathname.replace('/api/reports/', ''));
    if (name.includes('/') || name.includes('\\')) return send(res, 400, { error: 'Ungueltiger Dateiname.' });
    const full = path.join(REPORTS_DIR, name);
    const text = await fs.readFile(full, 'utf8');
    try { return send(res, 200, JSON.parse(text)); } catch { return send(res, 200, text, 'text/plain; charset=utf-8'); }
  }

  send(res, 404, { error: 'Nicht gefunden.' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(error => send(res, 500, { error: error.message }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SPM EPG Manager WebUI: http://0.0.0.0:${PORT}`);
  console.log(`Config: ${CONFIG_PATH}`);
  console.log(`Reports: ${REPORTS_DIR}`);
});
