#!/usr/bin/env node
// Splunk Observability Cloud に Claude Code エージェント可観測性の
// ダッシュボード（エージェント/スキル/モデル別コスト + イベント）とディテクタ（コスト超過アラート）を API で作る。
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
const chart = (name, program, type = 'TableChart', extra = {}) => ({
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
// COUNTER(デルタ)を List で「合計値」表示するため .sum(over='1d') で直近1日の累計にする。
// 今回の本番ランは run=zenn。テスト用ラン(demo/quality/cost 等)を除くため絞る。
const F = process.env.CHART_FILTER || "filter('run','zenn')";
const defs = {
  // ① Agentごとのコスト: query_source(main/subagent/auxiliary) × model で実コストを分解。
  //    main=tech-lead(opus) / subagent=frontend-dev(sonnet)・reviewer/qa(haiku) / auxiliary=補助(haiku)。
  costByAgent: chart(
    '[Claude Code] ① Agentごとのコスト (query_source × model, USD)',
    `data('claude_code.cost.usage', filter=${F}, rollup='sum').sum(by=['query_source','model']).sum(over='1d').publish(label='cost')`,
  ),
  // ② Skillごとのコスト: skill.name(verbatim) 別の実コスト。design-system / quality-gate / commit-convention 等。
  costBySkill: chart(
    '[Claude Code] ② Skillごとのコスト (skill.name, USD)',
    `data('claude_code.cost.usage', filter=${F}, rollup='sum').sum(by=['skill.name']).sum(over='1d').publish(label='cost')`,
  ),
  // ③ Modelごとのコスト: opus / sonnet / haiku 別の実コスト。
  costByModel: chart(
    '[Claude Code] ③ Modelごとのコスト (model, USD)',
    `data('claude_code.cost.usage', filter=${F}, rollup='sum').sum(by=['model']).sum(over='1d').publish(label='cost')`,
  ),
  // 補助: Skillごとのトークン量(コストと別軸で見たい用)。
  tokenBySkill: chart(
    '[Claude Code] Skillごとのトークン (skill.name)',
    `data('claude_code.token.usage', filter=${F}, rollup='sum').sum(by=['skill.name']).sum(over='1d').publish(label='tokens')`,
  ),
  // ④ イベント層: claude_code.api_request を「1リクエスト=1コスト明細」のイベントとして
  //    タイムライン上に重ねる。events-bridge.mjs が ingest した actor='build-team' のみ表示。
  //    マーカーをクリックすると cost_usd / model / query_source / tokens が出る。
  eventsApiRequest: chart(
    '[Claude Code] ④ イベント: api_request (1リクエスト=1コスト明細)',
    `A = data('claude_code.cost.usage', filter=${F}, rollup='rate').sum().publish(label='cost rate (/s)')\n` +
      `B = events(eventType='claude_code.api_request', filter=filter('actor','build-team')).publish(label='api_request')`,
    'TimeSeriesChart',
    { showEventLines: true },
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
  description: 'Claude Code のマルチエージェント開発を OTel で計装したダッシュボード（コンテスト）',
});
console.log('group   ', group.id);

// 12カラムグリッドに配置（①②③ + 補助 + ④イベント）
const layout = [
  ['costByAgent', 0, 0, 6, 3],
  ['costBySkill', 6, 0, 6, 3],
  ['costByModel', 0, 3, 6, 3],
  ['tokenBySkill', 6, 3, 6, 3],
  ['eventsApiRequest', 0, 6, 12, 3],
];
const dashboard = await api('POST', '/v2/dashboard', {
  name: '[Claude Code] コスト & エージェント可観測性 (run=zenn)',
  groupId: group.id,
  description: '習慣トラッカーを tech-lead(opus main)+frontend-dev/code-reviewer/qa-tester で開発した実測。①Agentごと ②Skillごと ③Modelごと のコスト内訳。',
  charts: layout.map(([k, column, row, width, height]) => ({
    chartId: charts[k], column, row, width, height,
  })),
});
console.log('dashboard', dashboard.id);

// --- 3) ディテクタ: 直近30分で run=zenn のコストが $0.50 を超えたら警告（記事用に必ず発火する閾値） ---
const detectorProgram =
  "A = data('claude_code.cost.usage', filter=filter('run','zenn'), rollup='sum').sum(by=['run']).sum(over='30m')\n" +
  "detect(when(A > 0.5)).publish('claude-run-cost-over-50c-30m')";
const detector = await api('POST', '/v2/detector', {
  name: '[Claude Code] run cost > $0.50 / 30m (run=zenn)',
  description: 'run=zenn が直近30分で $0.50 を超過したらアラート（暴走/高額モデル検知のデモ。記事スクショ用に発火しやすい閾値）',
  programText: detectorProgram,
  rules: [
    {
      detectLabel: 'claude-run-cost-over-50c-30m',
      severity: 'Warning',
      description: 'Claude Code の run=zenn コストが直近30mで $0.50 超過',
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
