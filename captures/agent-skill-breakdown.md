# エージェント別・スキル別の消費内訳（Splunk 実測 / run=zenn）

> `claude_code.cost.usage` / `claude_code.token.usage`（SignalFx COUNTER）を
> `query_source` / `model` / `skill.name` dimension で切った実測。`rollup='sum'` 合算。
> 対象は習慣トラッカー開発ビルド本体 1 セッション（`run=zenn` / `session.id=0834068a…`）。
> 属性の定義は公式 [Monitoring](https://code.claude.com/docs/en/monitoring-usage) の Cost/Token counter に準拠。

## メトリクスに付く主な dimension

| dimension | 値 / 挙動 |
|-----------|-----------|
| `query_source` | `main` / `subagent` / `auxiliary` の3値。**main とサブエージェントを直接分離できる**。 |
| `agent.name` | サブエージェント種別。ビルトイン/公式マーケットプレイスの agent 名は verbatim。**ユーザー定義 agent は `"custom"` に丸まる**（本企画の自作3体はこれ）。 |
| `skill.name` | アクティブな skill。**今回は能動 invoke した `quality-gate` のみ立った**（後述）。 |
| `model` | モデル識別子（opus/sonnet/haiku）。 |

## ① エージェントごと（`query_source` × `model`）★推奨の切り口

自作サブエージェントは `agent.name` が `custom` に丸まるため、`query_source` で main/subagent/auxiliary を分けるのが最も素直:

| query_source × model | 実体 | cost (USD) |
|----------------------|------|-----|
| **main × opus**      | tech-lead（メインスレッド） | **0.9189** |
| subagent × sonnet    | frontend-dev | 0.5253 |
| subagent × haiku     | code-reviewer + qa-tester | 0.3122 |
| auxiliary × haiku    | セッションタイトル生成などの補助 | 0.0012 |

- ビルド合計 = **$1.7575**。司令塔 tech-lead(opus) が約半分。
- **メトリクス単体では code-reviewer と qa-tester（両方 haiku/subagent）は切れない**。これはトレースで分離する（後述）。

## ③ モデルごと（`model`）

| model | cost (USD) |
|-------|-----|
| opus   | 0.9189 |
| sonnet | 0.5253 |
| haiku  | 0.3133 |

トークンは合計 2,053,096（haiku 834,277 / sonnet 648,209 / opus 570,610）。cacheRead が支配的（約1.85M）。

## ② スキルごと（`skill.name`）— アクティブなスキルの分だけ立つ

| skill.name | 種別 | cost (USD) |
|-----------|------|-----|
| `quality-gate` | 能動 invoke（出荷ゲート） | 0.3226 |
| `design-system` | 常駐（規約・知識） | 0.0438 |
| `commit-convention` | 常駐（規約・知識） | 0.0186 |
| `test-strategy` | 常駐（規約・知識） | 0.0141 |

- `skill.name` にコストが立つのは **「そのスキルがアクティブな間」のリクエスト**。
- `quality-gate` はビルド中に `/quality-gate` で能動 invoke した分（$0.3226）。
- 残り3つの常駐(preload)知識スキルは、**紐づけているだけでなく明示的にアクティブにしたとき**に
  `skill.name` に独立して立った（run=zenn 内の別 session a621a31f で各スキルをアクティブ化して取得）。
  → 「どの規約スキルを使っている間にいくらか」まで切れる。
  （※ 紐づけ方/バージョンで挙動が変わりうる。本企画 v2.1.191・自作スキル構成での観測。）

## ⑤ subagent 同士の分離（reviewer vs qa）— トレースで可能

メトリクスでは code-reviewer と qa-tester は両方 `query_source=subagent` / `model=haiku` で**切れない**。
ただし `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` で取得した**分散トレース**なら:

- `claude_code.llm_request` スパンが `agent_id` / `query_source` と per-span の `input_tokens`/`output_tokens`/`cache_*_tokens` を持つ。
- `claude_code.tool` スパンが `subagent_type`（`OTEL_LOG_TOOL_DETAILS=1` 有効時）を持つ。

→ **同一モデルの custom subagent もトレースなら別スパンとして分離でき、waterfall も得られる**。「切れない」はメトリクス層に限った話。

## 取得層のまとめ（3層）

| 層 | 設定 | 何が得られるか |
|----|------|----------------|
| メトリクス | `OTEL_METRICS_EXPORTER` | query_source × model × skill.name の**集計**。ダッシュボード向き |
| イベント | `OTEL_LOGS_EXPORTER` | `api_request` の `cost_usd`＋`prompt.id`。**リクエスト単位の実コスト明細**・監査向き |
| トレース(beta) | `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` + `OTEL_TRACES_EXPORTER` | `agent_id` / per-span トークン。**同一モデルの custom subagent を分離＋waterfall** |

> 注: 直接 Anthropic API 認証時のみ `claude_code.cost.usage` が機能する。
> Bedrock / Vertex / Foundry では Claude Code はコストメトリクスを送らない（公式）。
