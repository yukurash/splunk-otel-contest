---
name: test-strategy
description: Vitestによるテスト方針(構成・モック・カバレッジ目標)を定義する。テスト作成時の基準として参照する。
user-invocable: false
---

# テスト戦略

## 構成(AAA)
Arrange / Act / Assert を分け、1テスト=1意図

## 優先順位
1. ロジック層(状態遷移・localStorage の read/write)
2. 受け入れ条件(Given/When/Then)
3. 主要コンポーネントのスモークテスト

## モック方針
localStorage はインメモリの fake に差し替え / 時刻依存は Date を固定注入

## 目標
ロジック層カバレッジ80%以上 / npx vitest run が5秒以内
