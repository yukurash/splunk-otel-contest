#!/usr/bin/env node
// Splunk Observability Cloud に Claude Code エージェント可観測性の
// ダッシュボード（A/B コスト比較）とディテクタ（コスト超過アラート）を API で作る。
//
// 使い方: プロジェクトルートで `node scripts/provision-splunk.mjs`
//   削除: `node scripts/provision-splunk.mjs --destroy`
// realm/token は collector/.env (SPLUNK_REALM / SPLUNK_ACCESS_TOKEN) から読む（コミットしない）。
import fs from 'node:fs';

const env = fs.readFileSync('collector/.env', 'utf8');
const REALM = (env.match(/SPLUNK_REALM=(\S+)/) || [, 'us0'])[1];
const TOKEN = env.match(/SPLUNK_ACCESS_TOKEN=(\S+)/)[1];
const API = `https://api.${REALM}.signalfx.com`;
const APP = `https://app.${REALM}.signalfx.com`;
const H = { 'X-SF-Token': TOKEN, 'Content-Type': 'application/json' };
const DESTROY = process.argv.includes('--destroy');
const TAG = 'claude-code-otel-contest'; // 作成物を識別する customProperties / 名前接頭

async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

// COUNTER(デルタ)なので rollup='sum' で可視ウィンドウ内を合算して総量表示する
const chart = (name, program, type = 'List', extra = {}) => ({
  name,
  programText: program,
  options: { type, ...extra },
});

// --- 既存の本プロジェクト作成物を消す（再実行/クリーンアップ用） ---
async function destroyExisting() {
  for (const kind of ['dashboardgroup', 'detector', 'chart']) {
    const list = await api('GET', `/v2/${kind}?name=${encodeURIComponent('[Claude Code]')}&limit=200`).catch(() => ({ results: [] }));
    for (const o of list.results || []) {
      if ((o.name || '').includes('[Claude Code]')) {
        await api('DELETE', `/v2/${kind}/${o.id}`).catch((e) => console.warn('skip', kind, o.id, e.message));
        console.log('deleted', kind, o.id, o.name);
      }
    }
  }
}

if (DESTROY) {
  await destroyExisting();
  console.log('destroy 完了');
  process.exit(0);
}

// 念のため同名の旧作成物を掃除してから作る（重複防止）
await destroyExisting();

// --- 1) チャート作成 ---
const charts = {};
const defs = {
  abCost: chart(
    '[Claude Code] A/B 合計コスト by run (USD)',
    "data('claude_code.cost.usage', rollup='sum').sum(by=['run']).publish(label='cost')",
  ),
  byAgentModel: chart(
    '[Claude Code] コスト by agent.name × model',
    "data('claude_code.cost.usage', rollup='sum').sum(by=['agent.name','model']).publish(label='cost')",
  ),
  tokenBySkill: chart(
    '[Claude Code] トークン by skill.name',
    "data('claude_code.token.usage', rollup='sum').sum(by=['skill.name']).publish(label='tokens')",
  ),
  costByModel: chart(
    '[Claude Code] コスト by model',
    "data('claude_code.cost.usage', rollup='sum').sum(by=['model']).publish(label='cost')",
  ),
  activeByRun: chart(
    '[Claude Code] active_time by run (sec)',
    "data('claude_code.active_time.total', rollup='sum').sum(by=['run']).publish(label='active_sec')",
  ),
  costOverTime: chart(
    '[Claude Code] cost.usage 推移 by run',
    "data('claude_code.cost.usage', rollup='sum').sum(by=['run']).publish(label='cost/min')",
    'TimeSeriesChart',
  ),
};
for (const [key, def] of Object.entries(defs)) {
  const c = await api('POST', '/v2/chart', def);
  charts[key] = c.id;
  console.log('chart  ', key.padEnd(14), c.id);
}

// --- 2) ダッシュボードグループ + ダッシュボード ---
const group = await api('POST', '/v2/dashboardgroup', {
  name: '[Claude Code] Agent Observability',
  description: 'Claude Code のマルチエージェント開発を OTel で計装し A/B 比較したダッシュボード（コンテスト）',
});
console.log('group   ', group.id);

// 12カラムグリッドに配置
const layout = [
  ['abCost', 0, 0, 6, 2],
  ['byAgentModel', 6, 0, 6, 2],
  ['tokenBySkill', 0, 2, 6, 2],
  ['costByModel', 6, 2, 6, 2],
  ['activeByRun', 0, 4, 6, 2],
  ['costOverTime', 6, 4, 6, 2],
];
const dashboard = await api('POST', '/v2/dashboard', {
  name: '[Claude Code] A/B コスト & エージェント可観測性',
  groupId: group.id,
  description: 'run=quality(opus main) vs run=cost(sonnet main) の実測コストと agent/skill 別内訳',
  charts: layout.map(([k, column, row, width, height]) => ({
    chartId: charts[k], column, row, width, height,
  })),
});
console.log('dashboard', dashboard.id);

// --- 3) ディテクタ: 1時間で run のコストが $2 を超えたら警告 ---
const detectorProgram =
  "A = data('claude_code.cost.usage', rollup='sum').sum(by=['run']).sum(over='1h')\n" +
  "detect(when(A > 2)).publish('claude-run-cost-over-2usd-1h')";
const detector = await api('POST', '/v2/detector', {
  name: '[Claude Code] run cost > $2 / 1h',
  description: 'いずれかの run が直近1時間で $2 を超過したらアラート（暴走/高額モデル検知）',
  programText: detectorProgram,
  rules: [
    {
      detectLabel: 'claude-run-cost-over-2usd-1h',
      severity: 'Warning',
      description: 'Claude Code の run コストが直近1hで $2 超過',
      notifications: [],
    },
  ],
});
console.log('detector', detector.id);

// --- 出力: URL を captures に保存（秘密なし） ---
const out = {
  _note: 'scripts/provision-splunk.mjs が Splunk API で作成した可観測性オブジェクト。秘密は含まない。',
  realm: REALM,
  dashboardGroupId: group.id,
  dashboardId: dashboard.id,
  detectorId: detector.id,
  chartIds: charts,
  urls: {
    dashboard: `${APP}/#/dashboard/${dashboard.id}`,
    dashboardGroup: `${APP}/#/dashboard/${group.id}`,
    detector: `${APP}/#/detector/${detector.id}/edit`,
  },
};
fs.writeFileSync('captures/splunk-provisioned.json', JSON.stringify(out, null, 2) + '\n');
console.log('\n=== 作成完了 ===');
console.log('Dashboard:', out.urls.dashboard);
console.log('Detector :', out.urls.detector);
console.log('captures/splunk-provisioned.json に保存しました');
