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
        otlp_http (traces) / signalfx (metrics) / events bridge
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
  .claude/settings.json          # OTel テレメトリ設定（run=zenn）
  collector/{docker-compose.yml,config.yaml,.env.example}
  scripts/run-build.sh           # エージェントチームでビルドを起動
  scripts/provision-splunk.mjs   # ダッシュボード+ディテクタを API 生成
  scripts/events-bridge.mjs      # api_request を Splunk Event Feed へ転送
  target-app/                    # エージェントチームが生成した習慣トラッカー
  captures/                      # Splunk 計測データ（run=zenn 集計・トレース/イベントの実サンプル）
  docs/screenshot-guide.md       # ①〜⑥ のスクショ取得場所
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

### 3. ビルド実行（エージェントチーム）

tech-lead(opus, main) が frontend-dev / code-reviewer / qa-tester に委譲し、習慣トラッカーを
計画→実装→レビュー→テスト→`/quality-gate`→コミット まで一気通貫で作る。

```bash
bash scripts/run-build.sh
# 中身: claude --agent tech-lead -p "..."（settings.json の run=zenn で計装）
```

### 4. ダッシュボード/ディテクタ生成 & スクショ

```bash
node scripts/provision-splunk.mjs   # ①Agent ②Skill ③Model ④イベント のダッシュボード + ⑥アラート
node scripts/events-bridge.mjs      # ④イベント(api_request)を Splunk Event Feed へ転送
```

撮影場所は [`docs/screenshot-guide.md`](docs/screenshot-guide.md) に ①〜⑥ でまとめてある。

## セキュリティ

- `collector/config.yaml` の `redaction` / `attributes/scrub` で
  ファイルパス・コマンド引数・API キー / トークン / パスワードを Splunk 送信前に除去。
- スクショは公開前提なので秘密を写さない。
- `collector/.env`（realm/token）はコミットしない（`.gitignore` 済み）。

## ライセンス

MIT
