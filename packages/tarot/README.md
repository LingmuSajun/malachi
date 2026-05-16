# Malachi Tarot Package

Malachi の大アルカナ22枚分のデータ。

## ディレクトリ構成

```
packages/tarot/
├── data/
│   └── major-arcana.yaml      # 22枚の意味データ(編集対象)
├── types/
│   └── card.ts                # TypeScript型定義
└── loader.ts                  # yamlロード・カード取得ヘルパー
```

カード画像は `apps/line-bot/public/images/major-arcana/` で管理。

## データの使い方

```typescript
import { loadMajorArcana, getCardById, getCardBySlug, drawCards } from '@malachi/tarot'

// ランダムに1枚引く(正逆位置付き)
const [drawn] = drawCards(1)
// { card: TarotCard, orientation: "upright" | "reversed" }

// IDまたはslugで取得
const death = getCardById(13)
const fool = getCardBySlug('fool')
```

`@malachi/prompt` の `divine()` / `divineStart()` に渡すのが主な用途。

## yamlデータのスキーマ

各カードは以下のフィールドを持つ(詳細は `types/card.ts` 参照):

| フィールド          | 型       | 説明                                                  |
| ------------------- | -------- | ----------------------------------------------------- |
| `id`                | number   | 0〜21                                                 |
| `slug`              | string   | API識別子 例: "death"                                 |
| `name`              | string   | 日本語名                                              |
| `name_en`           | string   | 英語名                                                |
| `image`             | string   | 画像ファイル名                                        |
| `symbolism`         | object   | 元素・惑星・キーワード                                |
| `keywords_upright`  | string[] | 正位置のキーワード                                    |
| `keywords_reversed` | string[] | 逆位置のキーワード                                    |
| `contexts`          | object   | カテゴリ別解釈(love/relationships/self/work/decision) |
| `positions`         | object   | スプレッド位置別ヒント(任意)                          |
| `voice_hint`        | string   | マラキの語り口ガイド                                  |

## ライセンス上の注意

A.E. Waite と Pamela Colman Smith による1909年初版のライダー・ウェイト・タロット。Smith は1951年没。日本・米国ともに著作者の死後70年経過済みでパブリックドメイン化。

**U.S. Games Systems 社の再販版(1971年〜)とは別物**。再販版にはリマスター部分の権利が及ぶため、必ず Wikimedia Commons の1909年版オリジナルスキャンを使うこと。
