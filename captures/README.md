# captures/

Splunk Observability Cloud に着弾したテレメトリの**実測エビデンス**。

Splunk Web UI のスクリーンショットの代わりに、同じデータを **SignalFlow API / Collector debug exporter から取得**して
テキスト・JSON で保存している（公開リポジトリに秘密や PII を載せないため、API 由来の数値＋伏字化サンプルを採用）。

| ファイル | 内容 |
|----------|------|
| [`signalflow-aggregates.json`](./signalflow-aggregates.json) | SignalFlow API で取得した A/B 集計（コスト/トークン/所要時間/行数/スパン数）。PII なし。 |
| [`ab-summary.md`](./ab-summary.md) | 上記を表に整形した A/B 比較。記事用のメイン結果。 |
| [`telemetry-sample-redacted.txt`](./telemetry-sample-redacted.txt) | Collector が受信した生メトリクス＋トレース span の実サンプル（user.email/id・OSパス等を `<redacted>` 化）。 |

## Splunk Web UI で同じものを見るには

1. **Metrics Finder** で `claude_code.cost.usage` を検索 → フィルタ `project:otel-webapp`、group by `model` / `run`。
2. **APM** → service `claude-code` → トレース一覧。`Agent` 委譲スパンを開くと
   tech-lead 配下に frontend-dev / code-reviewer / qa-tester がネストした waterfall が見える。
3. **Dashboard** で `run=quality` と `run=cost` を並べると A/B のコスト差が一目で出る。

## 再取得

```bash
# realm/token は collector/.env から読む
node scripts/fetch-aggregates.mjs   # → signalflow-aggregates.json を再生成
```
