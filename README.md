# splunk-otel-contest

Claude Code のエージェント群（main 1 + subagent 3）を **OpenTelemetry** で計装し、
その全工程のメトリクス＋トレースを **Splunk Observability Cloud** へ送って可視化する検証プロジェクト。

エージェントチームには実際の小さな Web アプリ（習慣トラッカー）を作らせ、
- どのモデル（opus / sonnet / haiku）がどれだけコスト・トークンを使ったか
- main → subagent のネストした実行（APM トレース）
- skill の invocation
- npm install / vite build / lighthouse の長尺スパン

を Splunk 側で観測する。

## アーキテクチャ

```
┌────────────────────────────────────────────┐
│ Claude Code (tech-lead = opus)             │
│   ├─ frontend-dev   (sonnet) 実装           │
│   ├─ code-reviewer  (haiku)  diffレビュー    │
│   └─ qa-tester      (haiku)  テスト実行       │
│   preload skills: design-system /           │
│     test-strategy / commit-convention       │
│   active skill: quality-gate                │
└──────────────┬─────────────────────────────┘
        OTLP/gRPC :4317 (metrics + traces)
               │
       ┌───────▼─────────┐
       │ OTel Collector  │  redaction + scrub
       │ (Splunk distro) │  でパス/コマンド/秘密を除去
       └───────┬─────────┘
        sapm (traces) / signalfx (metrics)
               │
       ┌───────▼─────────┐
       │ Splunk          │
       │ Observability   │
       │ Cloud (Free)    │
       └─────────────────┘
```

## ディレクトリ

```
splunk-otel-contest/
  .claude/agents/{tech-lead,frontend-dev,code-reviewer,qa-tester}.md
  .claude/skills/{design-system,test-strategy,commit-convention,quality-gate}/SKILL.md
  .claude/settings.json          # OTel テレメトリ設定（A/B切替: run=quality / run=cost）
  collector/{docker-compose.yml,config.yaml,.env.example}
  target-app/                    # エージェントが生成（品質ラン）
  target-app-cost/               # エージェントが生成（コスパラン）
  captures/                      # Splunk 計測データ（A/B集計・トレース/イベントの実サンプル）
```

## セットアップ

### 1. Collector 起動

```bash
cd collector
cp .env.example .env       # SPLUNK_REALM と SPLUNK_ACCESS_TOKEN を自分の値に
docker compose up -d
docker compose logs -f     # OTLP受信を確認
```

> `.env` は `.gitignore` 済み。**realm / token はコミットしない**こと。

### 2. テレメトリ着弾確認

```bash
claude -p "1+1は?"
# → 10秒以内に Splunk の Metrics Finder で
#   claude_code.cost.usage が project=otel-webapp で見える
```

### 3. A/B ラン

**品質ラン**（opus）:
```bash
# settings.json: run=quality / tech-lead.md: model: opus
claude --agent tech-lead "習慣トラッカーを実装して。\
計画→実装(frontend-dev)→レビュー(code-reviewer)→テスト(qa-tester)→/quality-gate→コミット まで通して。"
```

**コスパラン**（sonnet）:
```bash
# settings.json: run=cost / tech-lead.md: model: sonnet / 出力先 target-app-cost
```

## セキュリティ

- `collector/config.yaml` の `redaction` / `attributes/scrub` で
  ファイルパス・コマンド引数・API キー / トークン / パスワードを Splunk 送信前に除去。
- スクショは公開前提なので秘密を写さない。
- `collector/.env`（realm/token）はコミットしない（`.gitignore` 済み）。

## ライセンス

MIT
