# run=zenn ビルド 実測サマリー（Splunk 実測）

> 習慣トラッカー SPA を tech-lead(opus, main) + frontend-dev(sonnet) + code-reviewer(haiku) + qa-tester(haiku)
> の4体＋スキルで開発した 1 回のビルドを、`run=zenn` / `session.id=0834068a…` で isolate して
> Splunk Observability Cloud（realm jp0）の SignalFlow API で集計した**実測値**。
> 生データ: [`signalflow-aggregates.json`](./signalflow-aggregates.json)。記事の①〜⑥はこの数字に対応。

`claude_code.*` は SignalFx の **COUNTER（デルタ）型**。総量は `rollup='sum'` で合算（max では解像度依存で誤る）。

## ① エージェントごとのコスト（query_source × model, USD）

| query_source × model | 実体 | コスト |
|----------------------|------|--------|
| main × opus | tech-lead | **$0.9189** |
| subagent × sonnet | frontend-dev | $0.5253 |
| subagent × haiku | code-reviewer + qa-tester | $0.3122 |
| auxiliary × haiku | 補助（タイトル生成等） | $0.0012 |
| | **ビルド合計** | **$1.7575** |

## ② スキルごとのコスト（skill.name, USD）

| skill.name | 種別 | コスト |
|------------|------|--------|
| `quality-gate` | 能動 invoke（出荷ゲート） | $0.3226 |
| `design-system` | 常駐（規約・知識） | $0.0438 |
| `commit-convention` | 常駐（規約・知識） | $0.0186 |
| `test-strategy` | 常駐（規約・知識） | $0.0141 |

`skill.name` にコストが立つのは「そのスキルがアクティブな間」のリクエスト。quality-gate はビルド中に
`/quality-gate` で能動 invoke した分。残り3つの常駐知識スキルは、明示的にアクティブにした間のコスト
（run=zenn 内の別 session で取得）。run=zenn 全体での skill.name 別合計 $0.3991。

## ③ モデルごとのコスト（model, USD）

| model | コスト |
|-------|--------|
| opus | $0.9189 |
| sonnet | $0.5253 |
| haiku | $0.3133 |

総トークン 2,053,096（haiku 834,277 / sonnet 648,209 / opus 570,610）。cacheRead 支配（約1.85M）。

## ④ イベント（claude_code.api_request）

| 指標 | 値 |
|------|----|
| 1 指示（prompt.id=ea0eda6f…）の api_request 本数 | **102 本** |
| その合計コスト | **$1.7575** |
| 最も高い 1 リクエスト | **$0.08895**（opus） |

「アプリ作って」の1指示が内部で102本のAPI呼び出しに展開。`prompt.id` で1指示の総コストを束ねられる。

## ⑤ トレース（Splunk APM）

`interaction` を親に `llm_request`(102本) と `tool` がネストした waterfall。`agent_id` / `subagent_type` で
同一 haiku の code-reviewer / qa-tester も別スパンとして分離できる。観測 span.type:
`interaction` / `llm_request` / `tool` / `tool.execution` / `tool.blocked_on_user`。

## ⑥ アラート（Detector）

`[Claude Code] run cost > $0.50 / 30m (run=zenn)`。ビルドが閾値を超え **Warning 発火**。

## 品質ゲート / レビュー

| 項目 | 結果 |
|------|------|
| 型チェック (tsc) | エラー 0 |
| ビルド | 成功 |
| テスト (Vitest) | 56 件全 PASS |
| Lighthouse Performance | **1.00**（基準 0.90）|
| Lighthouse Accessibility | **1.00**（基準 0.90）|
| code-reviewer 指摘 | 10 件（うち Critical 2 件）→ frontend-dev が修正 |

`lines_of_code` 2,074 / `active_time` 771.65s（約12.9分）/ `session.count` 1 / `commit.count` 1。
