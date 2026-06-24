---
name: quality-gate
description: 型チェック・ビルド・Lighthouse計測を順に実行し、性能とアクセシビリティのスコア基準を満たした場合のみ通過を許可する出荷前の品質ゲート。実装が一段落したら /quality-gate で実行する。
allowed-tools: Bash(npm *), Bash(npx *), Bash(git *)
---

# 出荷前 品質ゲート

## 現在の変更
- !`git -C target-app status --short`

## 実行手順（この順序を厳守）
1. 型チェック: `npx --prefix target-app tsc --noEmit`
2. ビルド: `npm --prefix target-app run build`
3. プレビュー起動 → Lighthouse 計測:
   `npm --prefix target-app run preview &` のあと
   `npx lighthouse http://localhost:4173 --quiet --only-categories=performance,accessibility --output=json --output-path=target-app/lighthouse.json --chrome-flags="--headless"`

## 合格基準（ゲート）
- performance スコア ≥ 0.90
- accessibility スコア ≥ 0.90
- 型チェック・ビルドにエラーがないこと

## 判定
- 全基準を満たす → 「PASS」とともに各スコアを表で報告する
- 1つでも満たさない → 「FAIL」とし、未達項目と原因を要約する。コミットはしない
