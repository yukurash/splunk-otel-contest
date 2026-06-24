#!/usr/bin/env node
// Splunk Observability Cloud から claude_code.* メトリクスを SignalFlow API で取得し、
// run × model で集計して captures/signalflow-aggregates.json を再生成する。
//
// 使い方: プロジェクトルートで `node scripts/fetch-aggregates.mjs`
// realm/token は collector/.env (SPLUNK_REALM / SPLUNK_ACCESS_TOKEN) から読む。
import fs from 'node:fs';

const env = fs.readFileSync('collector/.env', 'utf8');
const REALM = (env.match(/SPLUNK_REALM=(\S+)/) || [, 'us0'])[1];
const TOKEN = env.match(/SPLUNK_ACCESS_TOKEN=(\S+)/)[1];
const STREAM = `https://stream.${REALM}.signalfx.com`;
const HOURS_BACK = Number(process.env.HOURS_BACK || 8);

// claude_code.* は SignalFx の COUNTER(デルタ)型。各データ点は期間内の増分なので、
// 総量 = 全期間の datapoint を合算する(rollup='sum')。MTS毎に sum し、メタも返す。
async function execProgram(program) {
  const stop = Date.now();
  const start = stop - HOURS_BACK * 3600 * 1000;
  const url = `${STREAM}/v2/signalflow/execute?start=${start}&stop=${stop}&resolution=60000&immediate=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-SF-Token': TOKEN, 'Content-Type': 'text/plain' },
    body: program,
  });
  if (!res.ok) throw new Error(`SignalFlow HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  const meta = {}, sumByTs = {};
  for (const block of text.split(/\n\n+/)) {
    const lines = block.split('\n');
    const evType = (lines.find((l) => l.startsWith('event:')) || '').replace('event:', '').trim();
    const json = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).join('\n').trim();
    if (!json) continue;
    let obj; try { obj = JSON.parse(json); } catch { continue; }
    if (evType === 'metadata' && obj.tsId) meta[obj.tsId] = obj.properties || {};
    if (evType === 'data' && Array.isArray(obj.data)) {
      for (const d of obj.data) {
        if (typeof d.value === 'number') sumByTs[d.tsId] = (sumByTs[d.tsId] ?? 0) + d.value;
      }
    }
  }
  return { meta, sumByTs };
}

function groupSum({ meta, sumByTs }, keys) {
  const groups = {};
  for (const [ts, v] of Object.entries(sumByTs)) {
    const p = meta[ts] || {};
    const key = keys.map((k) => `${k}=${p[k] ?? '?'}`).join(' | ');
    groups[key] = (groups[key] || 0) + v;
  }
  return groups;
}

// COUNTER はデルタなので rollup='sum' で各バケットの増分を取り、時系列を合算する
const metric = (m) => execProgram(`data('${m}', rollup='sum').publish()`);

const [cost, token, active, lines, sessions, commits] = await Promise.all([
  metric('claude_code.cost.usage'),
  metric('claude_code.token.usage'),
  metric('claude_code.active_time.total'),
  metric('claude_code.lines_of_code.count'),
  metric('claude_code.session.count'),
  metric('claude_code.commit.count'),
]);

const out = {
  costByRunModel: groupSum(cost, ['run', 'model']),
  costByRun: groupSum(cost, ['run']),
  tokenByRunModelType: groupSum(token, ['run', 'model', 'type']),
  tokenByRun: groupSum(token, ['run']),
  activeByRun: groupSum(active, ['run']),
  linesByRun: groupSum(lines, ['run']),
  sessionByRun: groupSum(sessions, ['run']),
  commitByRun: groupSum(commits, ['run']),
};

console.log(JSON.stringify(out, null, 2));
