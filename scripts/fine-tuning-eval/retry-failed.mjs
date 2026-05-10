#!/usr/bin/env node
// Retry only rows in answers-{mode}.csv that failed (status != 200) or have empty answer.
// Overwrites the failed rows in place.
//
// Usage:
//   node scripts/fine-tuning-eval/retry-failed.mjs [--mode agent] [--base-url http://localhost:3333] [--delay 3000]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const MODE = args['mode'] ?? 'agent';
const BASE_URL = args['base-url'] ?? 'http://localhost:3333';
const DELAY_MS = Number(args['delay'] ?? 3000);
const CSV = args['csv'] ?? path.join(__dirname, `answers-${MODE}.csv`);
const PAGE_TYPE = args['page-type'] ?? 'top';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cell += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') { /* skip */ }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows) => rows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';

async function askChat(message) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ message, page_type: PAGE_TYPE, store_id: null, history: [], mode: MODE }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, error: text.slice(0, 500) };
  try {
    const json = JSON.parse(text);
    return {
      ok: true, status: res.status,
      message: json.message ?? '',
      stores: Array.isArray(json.stores) ? json.stores.map((s) => s.name).join(' / ') : '',
      follow_ups: Array.isArray(json.follow_ups) ? json.follow_ups.join(' / ') : '',
      meta: json.meta ?? {},
    };
  } catch {
    return { ok: false, status: res.status, error: `Non-JSON: ${text.slice(0, 300)}` };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const header = rows[0];
  const iNo = header.indexOf('no');
  const iQ = header.indexOf('question');
  const iA = header.indexOf('answer');
  const iStatus = header.indexOf('status');
  const iErr = header.indexOf('error');

  const targets = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;
    const isFailed = r[iStatus] !== '200' || !r[iA] || r[iErr];
    if (isFailed) targets.push(i);
  }
  console.log(`Retrying ${targets.length} failed row(s) (mode=${MODE})`);

  for (const i of targets) {
    const r = rows[i];
    const no = r[iNo], q = r[iQ];
    process.stdout.write(`  [${no}] ${q.slice(0, 40)}... `);
    const started = Date.now();
    let result;
    try { result = await askChat(q); } catch (e) { result = { ok: false, status: 0, error: String(e) }; }
    const elapsed = Date.now() - started;

    const iStores = header.indexOf('matched_stores');
    const iFu = header.indexOf('follow_ups');
    const iTc = header.indexOf('tool_calls');
    const iIn = header.indexOf('input_tokens');
    const iOut = header.indexOf('output_tokens');
    const iMs = header.indexOf('response_ms');

    rows[i][iA] = result.ok ? result.message : '';
    rows[i][iStores] = result.ok ? result.stores : '';
    rows[i][iFu] = result.ok ? result.follow_ups : '';
    rows[i][iTc] = result.ok ? (result.meta?.tool_calls ?? '') : '';
    rows[i][iIn] = result.ok ? (result.meta?.input_tokens ?? '') : '';
    rows[i][iOut] = result.ok ? (result.meta?.output_tokens ?? '') : '';
    rows[i][iMs] = result.ok ? (result.meta?.response_ms ?? elapsed) : elapsed;
    rows[i][iStatus] = String(result.status);
    rows[i][iErr] = result.ok ? '' : (result.error ?? '');

    console.log(result.ok ? `OK (${elapsed}ms)` : `FAIL (${result.status})`);
    fs.writeFileSync(CSV, toCsv(rows.filter((r) => r && r.length > 0)));
    await sleep(DELAY_MS);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
