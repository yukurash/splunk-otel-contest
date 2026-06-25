#!/usr/bin/env bash
# 習慣トラッカーを tech-lead(opus main) + frontend-dev/code-reviewer/qa-tester で
# 一気通貫ビルドし、run=zenn の OTel テレメトリ(メトリクス/トレース/イベント)を Splunk に流す。
#
# 使い方（Claude Code セッションのプロンプトで、先頭に ! を付けて実行）:
#   !bash scripts/run-build.sh
# もしくは普通のターミナルから:
#   bash scripts/run-build.sh
#
# 注: --dangerously-skip-permissions は -p(非対話)で npm/vite/lighthouse/commit まで
#     自動実行するために必要。ローカルアプリ生成のみで外部公開はしない。
set -e
cd "$(dirname "$0")/.."   # プロジェクトルートへ

PROMPT=$(cat <<'EOF'
習慣トラッカー Web アプリ(SPA)をチームで一気通貫で作ってください。あなたは tech-lead(main)です。

進め方(この順序を厳守し、実装・レビュー・テストは必ず subagent に委譲すること):
1. 計画(自分で): docs/spec.md を読み、ユーザーストーリー/受け入れ条件/画面・状態・データ構造を整理。MVP に絞る。
2. 雛形: カレントディレクトリ直下に target-app を Vite+React+TS+Vitest で初期化する。
   `npm create vite@latest target-app -- --template react-ts` → `npm --prefix target-app install` → vitest 等を追加。
3. 実装: frontend-dev(subagent) に「何を・なぜ・受け入れ条件」を渡して委譲。design-system skill の規約に従わせる。
4. レビュー: code-reviewer(subagent) に diff レビューを委譲。指摘があれば frontend-dev に修正させる。
5. テスト: qa-tester(subagent) に Vitest のテスト作成・実行を委譲(test-strategy skill 準拠)。
6. 出荷: /quality-gate skill を実行し、PASS なら commit-convention skill に従って target-app をコミット。

注意:
- 委譲時の subagent_type は frontend-dev / code-reviewer / qa-tester のみ。
- 自分で UI コードを書くのは最小限にし、計画・統合・判断に集中する。
- 最後に、使ったエージェント/スキル/モデルと成果(quality-gate スコア)を簡潔に要約して終了する。
EOF
)

echo "=== build start $(date) ==="
claude --dangerously-skip-permissions --agent tech-lead -p "$PROMPT" 2>&1 | tee build.log
echo "=== build end $(date) (exit ${PIPESTATUS[0]}) ==="
