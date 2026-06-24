---
name: design-system
description: 習慣トラッカーアプリのUI規約(配色・余白・命名・アクセシビリティ)を定義する。UIの実装・レビュー時の基準として参照する。
user-invocable: false
---

# デザインシステム規約

## 配色(ダークファースト)
| 用途 | 色 |
|------|----|
| 背景 | #0F172A |
| 面(カード) | #1E293B |
| 主テキスト | #F1F5F9 |
| アクセント | #38BDF8 |
| 成功 / 警告 | #34D399 / #FBBF24 |

## 余白・サイズ
8pxグリッド(4/8/16/24/32)、角丸12px、フォーカスリングは2px solid アクセント色

## 命名
コンポーネント=PascalCase(HabitCard)、hooks=use接頭辞、localStorageキー=app:接頭辞

## アクセシビリティ
操作要素は role/aria-label を持つ / コントラスト比4.5:1以上 / キーボード操作(Tab/Enter/Space)で完結
