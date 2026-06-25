# captures/

Splunk Observability Cloud に着弾したテレメトリの**実測エビデンス**。

Splunk Web UI のスクリーンショットの代わりに、同じデータを **SignalFlow API / Collector debug exporter から取得**して
テキスト・JSON で保存している（公開リポジトリに秘密や PII を載せないため、API 由来の数値＋伏字化サンプルを採用）。

対象は `run=zenn`（習慣トラッカー開発ビルド本体 1 セッション）の実測。

| ファイル | 内容 |
|----------|------|
| [`signalflow-aggregates.json`](./signalflow-aggregates.json) | SignalFlow API で取得した run=zenn 集計（①〜⑥に対応するコスト/トークン/スパン/アラート）。PII なし。 |
| [`zenn-summary.md`](./zenn-summary.md) | 上記を表に整形した run=zenn のメイン結果（①〜⑥）。記事の数字の根拠。 |
| [`agent-skill-breakdown.md`](./agent-skill-breakdown.md) | `query_source × model × skill.name` で切ったエージェント別・スキル別コスト/トークン。 |
| [`native-usage-cost.txt`](./native-usage-cost.txt) | ネイティブ `/usage`・`/cost` の実出力。Splunk と何が違うか（%のみ・not a breakdown 等）の実証。 |
| [`api-request-events-redacted.txt`](./api-request-events-redacted.txt) | イベント層 `claude_code.api_request` の実捕捉。1指示が102本に展開し合計 $1.7575 のファンアウトを可視化。 |
| [`telemetry-sample-redacted.txt`](./telemetry-sample-redacted.txt) | Collector が受信した生メトリクス＋トレース span の実サンプル（user.email/id・OSパス等を `<redacted>` 化）。 |
| [`splunk-provisioned.json`](./splunk-provisioned.json) | API で作成した実ダッシュボード/ディテクタの ID と URL（秘密なし）。`scripts/provision-splunk.mjs` の成果物。 |

## Splunk Web UI で同じものを見るには

1. **Metrics Finder** で `claude_code.cost.usage` を検索 → フィルタ `run:zenn`、group by `query_source` / `model` / `skill.name`。
2. **APM** → service `claude-code` → トレース一覧。委譲スパンを開くと
   tech-lead 配下に frontend-dev / code-reviewer / qa-tester がネストした waterfall が見える。
3. **Dashboard**（`scripts/provision-splunk.mjs` が作成）で ①Agent ②Skill ③Model ④イベント を一覧。
   詳しい撮影場所は [`docs/screenshot-guide.md`](../../docs/screenshot-guide.md)。

## 再取得

```bash
# realm/token は collector/.env から読む
node scripts/fetch-aggregates.mjs   # → signalflow-aggregates.json を再生成
```

## ダッシュボード/ディテクタの作成・撤去（observability-as-code）

```bash
node scripts/provision-splunk.mjs            # ダッシュボード+チャート6+ディテクタを作成
node scripts/provision-splunk.mjs --destroy  # 上記を全削除
```

作成後の URL は `splunk-provisioned.json` に保存される。スクショの撮影場所は
[`docs/screenshot-guide.md`](../../docs/screenshot-guide.md) に①〜⑥でまとめてある。
