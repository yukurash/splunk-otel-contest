# A/B 結果サマリー（Splunk 実測）

> `run=quality`（tech-lead=opus）と `run=cost`（tech-lead=sonnet）の 2 ランを
> `project=otel-webapp` の resource 属性 `run` で区別し、Splunk Observability Cloud の
> SignalFlow API で集計した**実測値**。スクリプト: [`scripts/fetch-aggregates.mjs`](../scripts/fetch-aggregates.mjs) / 生データ: [`signalflow-aggregates.json`](./signalflow-aggregates.json)。
>
> `claude_code.*` は SignalFx の **COUNTER（デルタ）型**。総量は `rollup='sum'` で全期間を合算して求めた
> （max では集計が解像度依存になり誤る）。値は再実行で安定し、サーバ側 `.sum()` ともクロスチェック一致。

## モデル別コスト（claude_code.cost.usage, USD）

| run | tech-lead | opus | sonnet | haiku | **合計** | active_time | tokens | lines |
|-----|-----------|------|--------|-------|----------|-------------|--------|-------|
| **quality** | opus   | $1.153 | $0.483 | $0.169 | **$1.806** | 749s (12.5分) | 1.76M | 1675 |
| **cost**    | sonnet | —      | $1.030 | $0.319 | **$1.349** | 1003s (16.7分) | 2.36M | 1607 |

### 読み取れること
- **コスパランは品質ランより約 25% 安い**（$1.349 vs $1.806）。
- 品質ランは **opus(tech-lead) 単独で全体の 64%**。計画・統合を担う main を opus にする代償は大きい。
- だが**コスト差は単価ほど開かない**。tech-lead を sonnet にしたコスパランは
  **所要時間が約 1.3 倍（749→1003s）、総トークンが約 1.3 倍（1.76M→2.36M）** に膨らんだ。
  安いモデルは 1 ターンあたり安くても、**より多く試行・再読込する**ぶん帳消しになりやすい。
- つまり「main を安いモデルに替える」最適化は、**時間予算と品質**とのトレードオフで判断すべき、というのが
  データで裏付けられた結論。

> 注: `run=quality` には着弾確認の `claude -p "1+1は?"`（opus, 数¢）が 1 セッション混ざる（session.count=2）。
> 差し引いてもビルド本体のコスト差の結論は変わらない。

## トークン内訳（claude_code.token.usage, by type）

| run / model | input | output | cacheRead | cacheCreation |
|-------------|-------|--------|-----------|---------------|
| quality/opus   | 5,845 | 14,054 | 742,820 | 40,146 |
| quality/sonnet | 35 | 13,063 | 512,590 | 35,493 |
| quality/haiku  | 793 | 15,978 | 334,412 | 44,279 |
| cost/sonnet    | 213 | 22,494 | 1,196,250 | 67,101 |
| cost/haiku     | 784 | 28,337 | 980,406 | 63,128 |

`cacheRead` がどの行でも支配的で、新規 `input` はごく僅か。プロンプトキャッシュが強く効いている。
コスパランで `cacheRead` が倍増しているのは、sonnet の tech-lead が文脈を**より多く読み直した**ことを示す。

## APM トレース（cost ランの実測スパン）

| 指標 | 値 |
|------|----|
| `Agent` 委譲スパン数 | 4（frontend-dev / code-reviewer / qa-tester への委譲）|
| `Agent` 委譲の最長 | **424s** → 114s → 70s → 62s |
| `Bash` スパン数 | 35（npm install / vite build / vitest 等）|
| `llm_request`（sonnet）| 63 |
| `llm_request`（haiku）| 39 |
| 観測された span.type | `interaction` / `llm_request` / `tool` / `tool.execution` / `tool.blocked_on_user` |

最長の `Agent` スパン（424s）が tech-lead → frontend-dev の実装委譲で、その内側に
sonnet の `llm_request` と多数の `Bash`/`tool` がぶら下がる**ネスト waterfall** を形成する。

## 品質ゲート（quality ラン）

| 項目 | 結果 |
|------|------|
| 型チェック (tsc) | エラー 0 |
| ビルド | 成功 |
| テスト (Vitest) | 51 件全 PASS（4.3s）|
| Lighthouse Performance | **1.00**（基準 0.90）|
| Lighthouse Accessibility | **1.00**（基準 0.90）|

code-reviewer(haiku) が実バグ（ストリーク計算のタイムゾーン依存、未定義 CSS 変数）を検出し
frontend-dev(sonnet) が修正 → quality-gate PASS、という多モデル分業が機能した。
（コスパランでも code-reviewer が 16 件指摘し、テスト 20 件全 PASS / ビルド成功。）
