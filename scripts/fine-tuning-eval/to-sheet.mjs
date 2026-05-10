#!/usr/bin/env node
// Convert answers-{mode}.csv into TSV to paste into Google Sheets column G.
// Columns order matches the original sheet (A..F empty placeholders), with G = current answer.
//
// Usage:
//   node scripts/fine-tuning-eval/to-sheet.mjs --mode agent > sheet-paste-agent.tsv
//   # Then copy the file content and paste at cell A2 (or only G column by pasting at G2).

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
const IN = args['in'] ?? path.join(__dirname, `answers-${MODE}.csv`);
const COL = args['col'] ?? 'g-only'; // 'g-only' = only G column (paste at G2). 'full' = rebuild all 7 cols.

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQuote = false;
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
      else if (c === '\r') { }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

const tsvEscape = (v) => {
  // Google Sheets paste: TSV with cells quoted only if they contain tab/newline/quote.
  // Newlines inside cells require surrounding double-quotes.
  const s = String(v ?? '');
  if (/[\t\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const rows = parseCsv(fs.readFileSync(IN, 'utf8'));
const header = rows[0];
const iQ = header.indexOf('question');
const iA = header.indexOf('answer');
const iMs = header.indexOf('response_ms');
const iIn = header.indexOf('input_tokens');
const iOut = header.indexOf('output_tokens');
const iTc = header.indexOf('tool_calls');

const out = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[iQ]) continue;
  const answer = r[iA] ?? '';
  // Annotate with compact meta so it's visible in sheet
  const meta = `[${MODE} ${r[iMs]}ms / ${r[iIn]}in ${r[iOut]}out / tools:${r[iTc]}]`;
  const cell = answer ? `${meta}\n\n${answer}` : `${meta} (no answer)`;

  if (COL === 'g-only') {
    out.push([tsvEscape(cell)].join('\t'));
  } else {
    out.push([r[iQ], '', '', '', '', '', cell].map(tsvEscape).join('\t'));
  }
}
process.stdout.write(out.join('\n') + '\n');
