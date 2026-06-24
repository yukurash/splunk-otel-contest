---
name: commit-convention
description: Conventional Commits 形式のコミットメッセージ規約を定義する。コミット作成時の書式基準として参照する。
user-invocable: false
---

# コミットメッセージ規約 (Conventional Commits)

## 形式
type(scope): 要約（命令形・50字以内）

本文（任意・何をなぜ）

## type
feat / fix / refactor / test / chore / docs / style

## 例
feat(habit): 習慣の追加と削除を実装

localStorageに永続化し、空状態のプレースホルダを表示
