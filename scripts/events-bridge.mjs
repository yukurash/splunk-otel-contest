#!/usr/bin/env node
// Claude Code の claude_code.api_request イベント層を Splunk Observability の
// 「カスタムイベント(Event Feed)」として着弾させるブリッジ。
//
// 背景: signalfx exporter は素の OTel ログを SignalFx イベントへ自動変換しないため、
//   logs→signalfx だけでは Event Feed に出ない。そこで Collector の debug 出力
//   (docker logs) から api_request の LogRecord を抜き、ingest /v2/event へ
//   eventType='claude_code.api_request' で POST する。
//
// 使い方: プロジェクトルートで
//   node scripts/events-bridge.mjs            # 直近のビルド窓のイベントを送る
//   SINCE=30m node scripts/events-bridge.mjs  # 取得窓を指定
//
// 送る属性は cost_usd / model / query_source / run / duration_ms / tokens 等のみ。
// user.email/id 等の PII と prompt 本文は送らない（公開スクショ前提）。
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const env = fs.readFileSync('collector/.env', 'utf8');
const REALM = (env.match(/SPLUNK_REALM=(\S+)/) || [, 'us0'])[1];
const TOKEN = env.match(/SPLUNK_ACCESS_TOKEN=(\S+)/)[1];
const INGEST = `https://ingest.${REALM}.signalfx.com/v2/event`;
const SINCE = process.env.SINCE || '60m';
const COMPOSE = 'collector/docker-compose.yml';

// 1) Collector debug 出力を取得
const raw = execSync(`docker compose -f ${COMPOSE} logs --since ${SINCE} --no-color 2>&1`, {
  maxBuffer: 256 * 1024 * 1024,
}).toString();

// 2) api_request の LogRecord をパース
//    各ブロックは "Body: Str(claude_code.api_request)" → "Attributes:" → "-> k: Type(v)" の並び。
const lines = raw.split('\n').map((l) => l.replace(/^otelcollector-1\s*\|\s?/, ''));
const attrRe = /^\s*->\s*([\w.]+):\s*\w+\(([\s\S]*)\)\s*$/;
const events = [];
for (let i = 0; i < lines.length; i++) {
  if (!/Body:\s*Str\(claude_code\.api_request\)/.test(lines[i])) continue;
  const a = {};
  for (let j = i + 1; j < lines.length && j < i + 40; j++) {
    if (/Body:\s*Str\(/.test(lines[j]) || /^(ResourceLog|ScopeLog|LogRecord|Resource attributes)/.test(lines[j])) break;
    const m = lines[j].match(attrRe);
    if (m) a[m[1]] = m[2];
  }
  if (!a['event.timestamp']) continue;
  events.push(a);
}

// このオーケストレーター(=現セッション)の api_request はログ側だけ run=zenn に
// ホットリロードされ混入するため、session.id で除外する（メトリクスには出ない分）。
const MY_SESSION = process.env.MY_SESSION || 'fd14accc-a120-46e7-acaf-e7f56ce41bcf';

// 3) 同じ event をユニーク化（prompt.id + sequence + request 近似キー）
const seen = new Set();
const uniq = events.filter((a) => {
  const k = `${a['prompt.id']}|${a['event.sequence']}|${a.cost_usd}|${a['event.timestamp']}`;
  if (seen.has(k)) return false; seen.add(k); return true;
});

// 3.5) 自セッション(オーケストレーター)を除外
const buildOnly = uniq.filter((a) => a['session.id'] !== MY_SESSION);

// 診断: session.id × run でコスト内訳を表示
if (process.env.DIAG) {
  const g = {};
  for (const a of uniq) {
    const k = `${(a['session.id'] || '-').slice(0, 8)} | run=${a.run}`;
    g[k] = g[k] || { n: 0, cost: 0 };
    g[k].n++; g[k].cost += Number(a.cost_usd || 0);
  }
  for (const [k, v] of Object.entries(g).sort((x, y) => y[1].cost - x[1].cost))
    console.log(`  ${k.padEnd(28)} n=${String(v.n).padStart(3)}  $${v.cost.toFixed(4)}`);
}

// 4) SignalFx イベントへ整形（PII は送らない）
const num = (x) => (x == null ? undefined : Number(x));
const payload = buildOnly.map((a) => ({
  category: 'USER_DEFINED',
  eventType: 'claude_code.api_request',
  timestamp: Date.parse(a['event.timestamp']),
  dimensions: {
    run: a.run || 'unknown',
    project: a.project || 'unknown',
    model: a.model || 'unknown',
    query_source: a.query_source || 'unknown',
    // 開発チーム(tech-lead+subagents)由来のクリーンなイベントだけを識別する印。
    // Event Feed を actor='build-team' で絞れば探索用セッションの混入を除外できる。
    actor: 'build-team',
  },
  properties: {
    cost_usd: num(a.cost_usd),
    input_tokens: num(a.input_tokens),
    output_tokens: num(a.output_tokens),
    cache_read_tokens: num(a.cache_read_tokens),
    cache_creation_tokens: num(a.cache_creation_tokens),
    duration_ms: num(a.duration_ms),
    prompt_id: a['prompt.id'],
  },
}));

// run でフィルタしたい場合
const ONLY = process.env.ONLY_RUN;
const filtered = ONLY ? payload.filter((e) => e.dimensions.run === ONLY) : payload;

console.log(`parsed api_request=${events.length} uniq=${uniq.length} buildOnly=${buildOnly.length} sending=${filtered.length} (since ${SINCE}${ONLY ? `, run=${ONLY}` : ''})`);
if (process.env.DRY) {
  const tot = filtered.reduce((s, e) => s + (e.properties.cost_usd || 0), 0);
  console.log(`DRY-RUN: 送信せず。対象 ${filtered.length} 件 合計 $${tot.toFixed(4)}`);
  process.exit(0);
}
if (!filtered.length) { console.log('送るイベントがありません'); process.exit(0); }

// 5) 100件ずつ POST
let sent = 0;
for (let i = 0; i < filtered.length; i += 100) {
  const batch = filtered.slice(i, i + 100);
  const r = await fetch(INGEST, {
    method: 'POST',
    headers: { 'X-SF-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  const tx = await r.text();
  if (!r.ok) { console.error('POST 失敗', r.status, tx.slice(0, 300)); process.exit(1); }
  sent += batch.length;
}
const costs = filtered.map((e) => e.properties.cost_usd || 0);
const tot = costs.reduce((s, v) => s + v, 0);
console.log(`✅ ${sent} 件の claude_code.api_request イベントを Splunk に送信（合計 $${tot.toFixed(4)}）`);
console.log(`確認: Event Feed / チャートのイベントオーバーレイで eventType='claude_code.api_request'`);
