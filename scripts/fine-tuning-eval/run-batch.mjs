#!/usr/bin/env node
// Batch-run all questions through Recta2 AI chat (Agent mode) and write answers to CSV.
//
// Usage:
//   node scripts/fine-tuning-eval/run-batch.mjs \
//     [--base-url http://localhost:3000] \
//     [--mode agent] \
//     [--delay 2500] \
//     [--page-type top] \
//     [--in questions.csv] \
//     [--out answers.csv]

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

const BASE_URL = args['base-url'] ?? 'http://localhost:3333';
const MODE = args['mode'] ?? 'agent';
const DELAY_MS = Number(args['delay'] ?? 2500);
const PAGE_TYPE = args['page-type'] ?? 'top';
const IN_CSV = args['in'] ?? path.join(__dirname, 'questions.csv');
const OUT_CSV = args['out'] ?? path.join(__dirname, `answers-${MODE}.csv`);

// Minimal CSV parse/stringify tailored for this sheet (no embedded newlines in cells).
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
  return rows.filter((r) => r.some((v) => v !== ''));
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';
}

async function askChat(message) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      message,
      page_type: PAGE_TYPE,
      store_id: null,
      history: [],
      mode: MODE,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, error: text.slice(0, 500) };
  }
  try {
    const json = JSON.parse(text);
    return {
      ok: true,
      status: res.status,
      message: json.message ?? '',
      stores: Array.isArray(json.stores) ? json.stores.map((s) => s.name).join(' / ') : '',
      follow_ups: Array.isArray(json.follow_ups) ? json.follow_ups.join(' / ') : '',
      meta: json.meta ?? {},
    };
  } catch {
    return { ok: false, status: res.status, error: `Non-JSON response: ${text.slice(0, 300)}` };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`[config] base=${BASE_URL} mode=${MODE} delay=${DELAY_MS}ms page=${PAGE_TYPE}`);
  console.log(`[input]  ${IN_CSV}`);
  console.log(`[output] ${OUT_CSV}`);

  const rows = parseCsv(fs.readFileSync(IN_CSV, 'utf8'));
  const header = rows[0];
  const questionIdx = header.indexOf('question');
  const noIdx = header.indexOf('no');
  if (questionIdx < 0) throw new Error('questions.csv must have a "question" column');

  const outHeader = [
    'no',
    'question',
    'answer',
    'matched_stores',
    'follow_ups',
    'mode',
    'tool_calls',
    'input_tokens',
    'output_tokens',
    'response_ms',
    'status',
    'error',
  ];
  const outRows = [outHeader];
  fs.writeFileSync(OUT_CSV, toCsv(outRows));

  for (let i = 1; i < rows.length; i++) {
    const no = noIdx >= 0 ? rows[i][noIdx] : String(i);
    const q = rows[i][questionIdx];
    if (!q) continue;

    process.stdout.write(`[${i}/${rows.length - 1}] ${no}: ${q.slice(0, 40)}... `);
    const started = Date.now();
    let result;
    try {
      result = await askChat(q);
    } catch (e) {
      result = { ok: false, status: 0, error: String(e) };
    }
    const elapsed = Date.now() - started;

    const row = [
      no,
      q,
      result.ok ? result.message : '',
      result.ok ? result.stores : '',
      result.ok ? result.follow_ups : '',
      MODE,
      result.ok ? result.meta?.tool_calls ?? '' : '',
      result.ok ? result.meta?.input_tokens ?? '' : '',
      result.ok ? result.meta?.output_tokens ?? '' : '',
      result.ok ? result.meta?.response_ms ?? elapsed : elapsed,
      result.status,
      result.ok ? '' : (result.error ?? ''),
    ];
    outRows.push(row);
    fs.appendFileSync(OUT_CSV, toCsv([row]));

    console.log(result.ok ? `OK (${elapsed}ms)` : `FAIL (${result.status})`);
    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. Wrote ${outRows.length - 1} rows to ${OUT_CSV}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
