# エージェント別・スキル別の消費内訳（Splunk 実測）

> `claude_code.token.usage` / `claude_code.cost.usage`（SignalFx COUNTER）を
> `agent.name` × `model` × `skill.name` dimension で切った実測。`rollup='sum'` 合算。
> 取得: `scripts/fetch-aggregates.mjs`（および dimension 確認は SignalFlow `data(...).publish()`）。

## token.usage に付く dimension（実測で確認）

```
agent.name  model  run  skill.name  type  effort  query_source
session.id  user.* organization.id  service.* host.* os.*  project ...
```

ポイントは **`agent.name` と `skill.name` が標準で付く**こと。これで
「どのエージェントが」「どのスキルがアクティブな間に」いくら使ったかを Splunk で切れる。

## エージェント別（`agent.name` × `model`）

`agent.name` は **`-` = main セッション（tech-lead）/ `custom` = サブエージェント** の2値。
個々のサブエージェント名（frontend-dev など）は出ないが、`model` と掛けると大半が分離できる。

| run | agent.name | model | 実体 | tokens | cost (USD) |
|-----|-----------|-------|------|--------|-----|
| quality | `-` (main)  | opus   | **tech-lead**        | 802,865 | **1.153** |
| quality | custom      | sonnet | frontend-dev         | 561,181 | 0.483 |
| quality | custom      | haiku  | code-reviewer + qa   | 394,741 | 0.169 |
| quality | `-` (main)  | haiku  | (タイトル生成等)      | 721     | 0.001 |
| cost    | `-` (main)  | sonnet | **tech-lead**        | 849,304 | **0.633** |
| cost    | custom      | sonnet | frontend-dev         | 436,754 | 0.397 |
| cost    | custom      | haiku  | code-reviewer + qa   | 1,071,901 | 0.319 |
| cost    | `-` (main)  | haiku  | (タイトル生成等)      | 754     | 0.001 |

### 読み取れること
- **`agent.name` で「main 対 サブエージェント」が分離できる**のが効く。とくに **cost ラン**は
  tech-lead と frontend-dev が**両方 sonnet** なので `model` だけでは切れないが、`agent.name` で
  **main(tech-lead)=$0.633 / subagent(frontend-dev)=$0.397** に分けられた。
- main の比率: quality は opus main が $1.153（全体の64%）。cost は sonnet main が $0.633（47%）。
  **main を安くするとサブエージェント側の比重が上がる**（cost の haiku reviewer+qa が 1.07M tokens に膨張）。
- 唯一切れないのは reviewer と qa（**両方 haiku のサブエージェント**で agent.name=custom・model=haiku が同一）。
  分けたければ片方のモデルを変えるか、トレース（APM の Agent スパン名）側で見る。

## スキル別（`skill.name`）

| run | skill.name | 種別 | tokens | cost (USD) |
|-----|-----------|------|--------|-----|
| cost    | commit-convention | preload 知識 | 1,990,950 | 1.069 |
| quality | quality-gate      | 能動 invoke  | 503,071   | 0.476 |
| cost    | quality-gate      | 能動 invoke  | 299,656   | 0.153 |
| cost    | design-system     | preload 知識 | 15,394    | 0.013 |
| cost    | (skill 無し)       | —            | 52,713    | 0.114 |

### 読み取れること
- **preload skill も `skill.name` として集計に出る**（commit-convention / design-system）。
  「規約 skill がアクティブな間にどれだけ使ったか」が見える。
- `skill.name` はそのトークンを使った時点で**どの skill コンテキストが載っていたか**を表すので、
  preload skill が常駐する cost ランでは commit-convention に大きく寄る（≒ ほぼ全行に preload が載る）。
- `quality-gate` は出荷ゲートを回す能動 invoke ぶんで、quality / cost 両方に出る。

> 注: dimension の集計は時間窓（HOURS_BACK）に依存して MTS が出入りするため、`skill.name` の
> 内訳は「直近 48h 窓」での値。run 合計コスト（`captures/signalflow-aggregates.json`）と
> 突き合わせて解釈すること。
