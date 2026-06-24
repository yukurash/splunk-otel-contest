# エージェント別・スキル別の消費内訳（Splunk 実測）

> `claude_code.cost.usage` / `claude_code.token.usage`（SignalFx COUNTER）を
> `query_source` / `agent.name` / `model` / `skill.name` dimension で切った実測。`rollup='sum'` 合算。
> 属性の定義は公式 [Monitoring](https://code.claude.com/docs/en/monitoring-usage) の Cost/Token counter に準拠。

## メトリクスに付く主な dimension（公式定義＋実測）

| dimension | 値 / 挙動 |
|-----------|-----------|
| `query_source` | `main` / `subagent` / `auxiliary` の3値。**main とサブエージェントを直接分離できる**（公式定義）。 |
| `agent.name` | サブエージェント種別。**ビルトイン agent と official-marketplace plugin の agent 名はそのまま(verbatim)出る**。**ユーザー定義 agent は `"custom"` に丸められる**。名前付き subagent 由来でないリクエストでは**属性自体が absent**。 |
| `skill.name` | アクティブな skill。**ビルトイン/bundled/ユーザー定義/official-marketplace の skill 名は verbatim**。third-party plugin の skill だけ `"third-party"` に丸まる。skill 不在なら absent。 |
| `model` | モデル識別子（opus/sonnet/haiku）。 |
| `plugin.name` / `marketplace.name` / `mcp_server.name` / `mcp_tool.name` | plugin/MCP 由来の属性（本企画では未使用）。 |

> 重要な訂正: 以前「`agent.name` は `-`/`custom` の2値でサブエージェント名は出ない」と書いていたが**誤り**。
> 本企画の frontend-dev / code-reviewer / qa-tester が `"custom"` になったのは
> **ユーザー定義 agent だから**であり、仕様上サブエージェント名が常に消えるわけではない
> （ビルトイン/公式マーケットプレイス agent なら verbatim で出る）。

## main vs サブエージェント（`query_source`）★推奨の切り口

`agent.name`(main は absent) に頼らず、`query_source` で main/subagent/auxiliary を直接分けられる:

| run | query_source | model | cost (USD) |
|-----|--------------|-------|-----|
| quality | **main**      | opus   | **1.153** |
| quality | subagent     | sonnet | 0.483 |
| quality | subagent     | haiku  | 0.169 |
| quality | auxiliary    | haiku  | 0.001 |
| cost    | **main**      | sonnet | **0.633** |
| cost    | subagent     | sonnet | 0.397 |
| cost    | subagent     | haiku  | 0.319 |
| cost    | auxiliary    | haiku  | 0.001 |

- run合計: quality = main 1.153 + subagent 0.652 + auxiliary 0.001。cost = main 0.633 + subagent 0.715 + auxiliary 0.001。
- **cost ランは tech-lead(main) も frontend-dev(subagent) も sonnet** だが、`query_source` で
  **main=$0.633 / subagent(sonnet)=$0.397** に分離できる（`agent.name` でも同結果）。
- `auxiliary` は補助用途（タイトル生成等）の haiku。どちらの run でも $0.001 程度。

## subagent 同士の分離（reviewer vs qa）— トレースで可能

**メトリクス単体**では code-reviewer と qa-tester は**両方 haiku のユーザー定義 subagent**＝
`query_source=subagent` / `agent.name=custom` / `model=haiku` が同一で**切れない**。

ただし本企画は **`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` と `OTEL_LOG_TOOL_DETAILS=1` を有効化済み**で、
**分散トレース**を実際に取得している。トレースなら:
- `claude_code.llm_request` スパンが `agent_id` / `parent_agent_id` / `query_source`（=サブエージェント名）と
  per-span の `input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_creation_tokens` を持つ。
- `claude_code.tool` スパンが `skill_name` / `subagent_type` を持つ（`OTEL_LOG_TOOL_DETAILS=1` 有効時）。

→ **メトリクスで haiku に潰れて切れなかった reviewer と qa も、トレースの `agent_id` / `subagent_type` で
別スパンとして分離でき、waterfall も得られる**。「切れない」はメトリクス層に限った話で、トレースで覆る。

## スキル別（`skill.name`）

| run | skill.name | 種別 | tokens | cost (USD) |
|-----|-----------|------|--------|-----|
| cost    | commit-convention | preload 知識 | 1,990,950 | 1.069 |
| quality | quality-gate      | 能動 invoke  | 503,071   | 0.476 |
| cost    | quality-gate      | 能動 invoke  | 299,656   | 0.153 |
| cost    | design-system     | preload 知識 | 15,394    | 0.013 |

- **メトリクスの `skill.name` はユーザー定義 skill でも verbatim** で出る（third-party plugin だけ `"third-party"`）。
  quality-gate / commit-convention / design-system がそのまま出たのはこのため。
- 一方 `claude_code.skill_activated` **イベント**側では、ユーザー定義 skill は
  `OTEL_LOG_TOOL_DETAILS=1` でない限り `"custom_skill"` に丸まる（本企画は有効化済みなので verbatim）。
  → 「メトリクスは verbatim / イベントは要フラグ」という差がある。

## 取得層のまとめ（3層）

| 層 | 設定 | 何が得られるか | 本企画 |
|----|------|----------------|--------|
| メトリクス | `OTEL_METRICS_EXPORTER` | agent.name × skill.name × query_source × model の**集計**。ダッシュボード向き | ✅ 取得 |
| イベント | `OTEL_LOGS_EXPORTER` | `api_request` の `cost_usd`＋属性＋`prompt.id`。**リクエスト単位の実コスト明細**・監査向き | ⚠️ 未設定（取得せず）|
| トレース(beta) | `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` + `OTEL_TRACES_EXPORTER` | `agent_id` / `query_source` / per-span トークン。**同一モデルの custom subagent を分離＋waterfall** | ✅ 取得 |

> 注: 直接 Anthropic API 認証時のみ `claude_code.cost.usage` が機能する。
> Bedrock / Vertex / Foundry では Claude Code はコストメトリクスを送らない（公式）。
