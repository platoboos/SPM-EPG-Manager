#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const applyMode = args.has('--apply');
const dryRunMode = args.has('--dry-run') || !applyMode;

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const configPath = path.resolve(ROOT, argValue('--config', 'config/spm_targets.example.json'));
const aliasesPath = path.resolve(ROOT, argValue('--aliases', 'config/spm_tvg_aliases_master.json'));
const reportsDir = path.resolve(ROOT, argValue('--reports', 'reports'));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(input) {
  let s = String(input || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[á´¬-áµ¿â°-â‚¿]/g, ' ');
  s = s.toLowerCase();
  s = s.replace(/https?:\/\/\S+/g, ' ');
  s = s.replace(/\b(de|at|ch|dach|germany|deutschland)\b\s*[|:.-]?/g, ' ');
  s = s.replace(/\b(joyn|wow|skygo|sky go|prime|magenta|rtl\+|rtl plus|waipu|vodafone|telekom|dazn exclusive)\b\s*[|:.-]?/g, ' ');
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(/\[[^\]]*\]/g, ' ');
  s = s.replace(/\b(uhd|fhd|hd|sd|4k|8k|720p|1080p|2160p|3840p|raw|hevc|h265|h\.265|dolby|audio|vip|backup|alt|new|mobil|mobile|tv)\b/g, ' ');
  s = s.replace(/\b(\d+)\s*\+\b/g, '$1plus');
  s = s.replace(/\bund\b/g, ' ');
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9]+/g, '');
  const replacements = {
    daserste: 'ard', erstes: 'ard', ard: 'ard',
    prosieben: 'prosieben', pro7: 'prosieben',
    sat1: 'sat1', sat1gold: 'sat1gold', sat1emotions: 'sat1emotions',
    kabeleins: 'kabeleins', kabel1: 'kabeleins', kabeleinsdoku: 'kabeleinsdoku', kabel1doku: 'kabeleinsdoku',
    rtlzwei: 'rtl2', rtltwo: 'rtl2', rtlplus: 'rtlup',
    brfernsehensud: 'brfernsehen', brfernsehensued: 'brfernsehen',
    ndrmecklenburgv: 'ndrmecklenburgvorpommern', ndrmecklenburgvorpommern: 'ndrmecklenburgvorpommern', ndrnds: 'ndrniedersachsen',
    skysportbundesliga: 'skysportbundesliga', skybundesliga: 'skysportbundesliga'
  };
  return replacements[s] || s;
}

function candidateKeys(entry) {
  const rawFields = [entry.title, entry.name, entry.tvg_name, entry.stream_ref].filter(Boolean).map(String);
  const keys = new Set();
  for (const raw of rawFields) {
    const magentaSportNum = raw.match(/\bmagenta\s*sport\s*(?:ppv\s*)?(\d+)\b/i);
    if (magentaSportNum) keys.add(`magentasport${magentaSportNum[1]}`);
    const myTeamSportNum = raw.match(/\bsport\s*(\d+)\s*[- ]*\s*my\s*team\s*(?:tv)?\b/i);
    if (myTeamSportNum) keys.add(`sport${myTeamSportNum[1]}myteam`);
    if (/\bmagenta\s*sport\s*programm/i.test(raw)) keys.add('magentasportprogrammubersicht');
    if (!magentaSportNum && /\bmagenta\s*sport\b/i.test(raw)) keys.add('magentasport');
    if (/\bnow\s*raw\b/i.test(raw)) keys.add('nowraw');
    keys.add(normalizeName(raw));
    keys.add(normalizeName(raw.replace(/^[A-Z]{2}\s*[:|]\s*/i, '')));
    keys.add(normalizeName(raw.replace(/^[^:|]+[:|]\s*/i, '')));
    keys.add(normalizeName(raw.replace(/\braw\b/ig, '').replace(/\bhd\b/ig, '')));
    keys.add(normalizeName(raw.replace(/\b(?:de|at|ch)\b/ig, '')));
    const daznNum = raw.match(/\bdazn\s*(\d+)\b/i);
    if (daznNum) keys.add(`dazn${daznNum[1]}`);
    const skyBundesligaNum = raw.match(/\b(?:sky\s*)?(?:sport\s*)?bundesliga\s*(\d+)\b/i);
    if (skyBundesligaNum) keys.add(`skybundesliga${skyBundesligaNum[1]}`);
  }
  return Array.from(keys).filter(Boolean);
}

function isHeaderTitle(entry) {
  const text = String(entry.title || entry.name || '').trim();
  return /^#{3,}.*#{3,}$/.test(text);
}

function cookiePairsFromHeaders(headers) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')] : []);
  return setCookies.map(cookie => String(cookie).split(';')[0]).filter(Boolean);
}

async function loginAndGetCookie(baseUrl, target) {
  const login = target.login || {};
  if (!login.enabled) return null;

  const username = process.env[login.usernameEnv || 'SPM_USERNAME'];
  const password = process.env[login.passwordEnv || 'SPM_PASSWORD'];
  if (!username || !password) {
    throw new Error(`Login ist aktiviert, aber ${login.usernameEnv || 'SPM_USERNAME'} oder ${login.passwordEnv || 'SPM_PASSWORD'} fehlt.`);
  }
  if (!login.url) throw new Error('Login ist aktiviert, aber login.url fehlt in der Konfiguration.');

  const usernameField = login.usernameField || 'username';
  const passwordField = login.passwordField || 'password';
  const payload = {
    ...(login.extraFields || {}),
    [usernameField]: username,
    [passwordField]: password
  };

  let body;
  let contentType;
  if (login.contentType === 'form') {
    body = new URLSearchParams(payload).toString();
    contentType = 'application/x-www-form-urlencoded';
  } else {
    body = JSON.stringify(payload);
    contentType = 'application/json';
  }

  const res = await fetch(`${baseUrl}${login.url}`, {
    method: login.method || 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': contentType,
      ...(login.headers || {})
    },
    body
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Login fehlgeschlagen: ${res.status} ${res.statusText}: ${text}`);
  }

  const cookie = cookiePairsFromHeaders(res.headers).join('; ');
  if (!cookie) {
    throw new Error('Login war erfolgreich, aber die Antwort enthielt keinen Set-Cookie Header.');
  }
  return cookie;
}

async function buildApiClient(target) {
  const baseUrl = String(target.baseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error(`Target ${target.name || ''} hat keine baseUrl.`);

  const login = target.login || {};
  const hasLoginCredentials = login.enabled
    && process.env[login.usernameEnv || 'SPM_USERNAME']
    && process.env[login.passwordEnv || 'SPM_PASSWORD'];
  const envCookie = hasLoginCredentials ? null : (target.cookieEnv ? process.env[target.cookieEnv] : process.env.SPM_COOKIE);
  const loginCookie = envCookie ? null : await loginAndGetCookie(baseUrl, target);
  const cookie = envCookie || loginCookie;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(target.headers || {})
  };
  if (cookie) headers.Cookie = cookie;

  return async function fetchJson(url, options = {}) {
    const res = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
    return data;
  };
}

function getEntriesFromResponse(data) {
  return (data && (data.entries || data.items || data.data || data.results)) || [];
}

function matchEntry(entry, aliases, blockedAliases) {
  if (isHeaderTitle(entry)) return null;
  const keys = candidateKeys(entry);
  const hasAllowedAlias = keys.some(key => aliases[key] && !blockedAliases.has(key));
  if (!hasAllowedAlias && keys.some(key => blockedAliases.has(key))) return null;
  for (const key of keys) {
    if (aliases[key]) return { tvgId: aliases[key], key };
  }
  return null;
}

async function listProfiles(fetchJson, portalId, playlistType) {
  const data = await fetchJson(`/api/m3u-editor/profiles?portal_id=${encodeURIComponent(portalId)}&playlist_type=${encodeURIComponent(playlistType)}`);
  return Array.isArray(data) ? data : (data.profiles || data.items || data.data || []);
}

async function createProfile(fetchJson, portalId, playlistType, name) {
  return fetchJson('/api/m3u-editor/profiles', {
    method: 'POST',
    body: JSON.stringify({
      portal_id: Number(portalId),
      playlist_type: playlistType,
      name
    })
  });
}

async function ensureProfile(fetchJson, portalId, target, dryRun) {
  const profileOverrides = target.profileIdByPortalId || {};
  if (profileOverrides[portalId]) {
    return { id: profileOverrides[portalId], name: '(configured)', created: false, source: 'configured-id' };
  }

  const profileName = String(target.profileName || 'spm').trim();
  const playlistType = target.playlistType || 'tv';
  const profiles = await listProfiles(fetchJson, portalId, playlistType);
  const existing = profiles.find(profile => String(profile.name || '').toLowerCase() === profileName.toLowerCase());
  if (existing) return { id: existing.id, name: existing.name, created: false, source: 'existing-profile' };

  if (dryRun) return { id: null, name: profileName, created: false, source: 'dry-run-would-create' };

  const created = await createProfile(fetchJson, portalId, playlistType, profileName);
  return { id: created.id, name: created.name || profileName, created: true, source: 'created-profile' };
}

async function getPortalIds(fetchJson, target) {
  if (Array.isArray(target.portalIds) && target.portalIds.length) return target.portalIds;
  const data = await fetchJson('/api/portals');
  const portals = Array.isArray(data) ? data : (data.portals || data.items || data.data || []);
  return portals.map(p => p.id || p.portal_id).filter(Boolean);
}

async function fetchAllEntries(fetchJson, portalId, target) {
  const all = [];
  const playlistType = target.playlistType || 'tv';
  const pageSize = Number(target.pageSize || 1000);
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const url = `/api/m3u-editor/source?portal_id=${encodeURIComponent(portalId)}&playlist_type=${encodeURIComponent(playlistType)}&page=${page}&page_size=${pageSize}`;
    const data = await fetchJson(url);
    const entries = getEntriesFromResponse(data);
    all.push(...entries);
    totalPages = Number(data.total_pages || data.totalPages || Math.ceil((data.total_entries || data.total || all.length) / pageSize) || 1);
    await sleep(Number(target.requestDelayMs || 100));
  }
  return all;
}

function buildPayload(portalId, entries, profileInfo, target, aliases, blockedAliases) {
  const tvgIds = {};
  const tvgNames = {};
  const tvgChnos = {};
  const matched = [];
  const unmatched = [];
  const keepExisting = target.keepExistingTvgIds !== false;

  for (const entry of entries) {
    const id = String(entry.id || entry.entry_id || '');
    if (!id) continue;

    const keys = candidateKeys(entry);
    const hasAllowedAlias = keys.some(key => aliases[key] && !blockedAliases.has(key));
    if (isHeaderTitle(entry) || (!hasAllowedAlias && keys.some(key => blockedAliases.has(key)))) {
      unmatched.push({ id, title: entry.title || entry.name || '', group: entry.group_title || '', keys: keys.join('|'), skipped: 'blocked-header-or-alias' });
      continue;
    }

    const match = matchEntry(entry, aliases, blockedAliases);
    if (match) {
      tvgIds[id] = match.tvgId;
      matched.push({ id, title: entry.title || entry.name || '', tvg_id: match.tvgId, key: match.key });
    } else if (keepExisting && entry.tvg_id) {
      tvgIds[id] = entry.tvg_id;
    } else {
      unmatched.push({ id, title: entry.title || entry.name || '', group: entry.group_title || '', keys: keys.join('|') });
    }
  }

  return {
    payload: {
      portal_id: portalId,
      playlist_type: target.playlistType || 'tv',
      ...(profileInfo.id ? { profile_id: profileInfo.id } : {}),
      excluded_entry_ids: [],
      renamed_titles: {},
      tvg_ids: tvgIds,
      tvg_names: tvgNames,
      tvg_chnos: tvgChnos
    },
    matched,
    unmatched
  };
}

async function main() {
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const aliasConfig = JSON.parse(await fs.readFile(aliasesPath, 'utf8'));
  const aliases = aliasConfig.aliases || aliasConfig;
  const blockedAliases = new Set(aliasConfig.blocked_aliases || []);
  const targets = config.targets || [];
  const summary = [];
  await fs.mkdir(reportsDir, { recursive: true });

  for (const target of targets) {
    const fetchJson = await buildApiClient(target);
    const portalIds = await getPortalIds(fetchJson, target);
    for (const portalId of portalIds) {
      console.log(`[SPM TVG] ${target.name || target.baseUrl} Portal ${portalId}: lade Daten...`);
      const profileInfo = await ensureProfile(fetchJson, portalId, target, dryRunMode);
      const entries = await fetchAllEntries(fetchJson, portalId, target);
      const result = buildPayload(portalId, entries, profileInfo, target, aliases, blockedAliases);
      const row = {
        target: target.name || target.baseUrl,
        portalId,
        profileId: profileInfo.id,
        profileName: profileInfo.name,
        profileSource: profileInfo.source,
        profileCreated: profileInfo.created,
        entries: entries.length,
        matched: result.matched.length,
        payloadTvgIds: Object.keys(result.payload.tvg_ids).length,
        unmatched: result.unmatched.length
      };
      summary.push(row);

      const mode = dryRunMode ? 'dry_run' : 'applied';
      const reportName = `spm_tvg_mapper_portal_${portalId}_${mode}_report.json`;
      await fs.writeFile(path.join(reportsDir, reportName), JSON.stringify({ summary: row, matched: result.matched, unmatched: result.unmatched, payload: result.payload }, null, 2));

      if (!dryRunMode) {
        if (!profileInfo.id) throw new Error(`Portal ${portalId}: Speichern ohne profile_id nicht möglich.`);
        await fetchJson('/api/m3u-editor/save', { method: 'POST', body: JSON.stringify(result.payload) });
        console.log(`[SPM TVG] Portal ${portalId}: gespeichert.`);
      } else {
        console.log(`[SPM TVG] Portal ${portalId}: Dry-Run fertig.`);
      }
    }
  }

  const summaryName = `spm_tvg_mapper_${dryRunMode ? 'dry_run' : 'applied'}_summary_${new Date().toISOString().slice(0, 10)}.json`;
  await fs.writeFile(path.join(reportsDir, summaryName), JSON.stringify(summary, null, 2));
  console.table(summary);
  console.log(`[SPM TVG] Summary: ${path.join(reportsDir, summaryName)}`);
}

main().catch(error => {
  console.error('[SPM TVG] Fehler:', error.message);
  process.exitCode = 1;
});
