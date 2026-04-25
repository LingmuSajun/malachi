# Malachi Tarot Package

Malachi の大アルカナ22枚分のデータと画像処理ツール。

## ディレクトリ構成

```
packages/tarot/
├── data/
│   └── major-arcana.yaml      # 22枚の意味データ(編集対象)
├── images/
│   └── major-arcana/           # ライダー版PD画像(1909年)
│       └── optimized/          # LINE用に最適化された画像
├── types/
│   └── card.ts                 # TypeScript型定義
├── loader.ts                   # yamlロード・カード抽出ヘルパー
└── README.md                   # このファイル

scripts/
├── download-images.ts          # Wikimedia から画像取得
└── preprocess-images.ts        # 画像のリサイズ・最適化
```

## セットアップ

依存パッケージのインストール:

```bash
pnpm add js-yaml
pnpm add -D @types/js-yaml sharp tsx
```

## 画像の準備

### 1. 画像ダウンロード

Wikimedia Commons から1909年版ライダー・ウェイト・タロットの大アルカナ22枚を取得する。

```bash
npx tsx scripts/download-images.ts
```

成功すると `packages/tarot/images/major-arcana/` に `00-fool.jpg` 〜 `21-world.jpg` が保存される。

### 2. 画像の最適化

LINE Flex Message での表示に最適化(幅1024px、JPEG品質85%)。

```bash
npx tsx scripts/preprocess-images.ts
```

`packages/tarot/images/major-arcana/optimized/` に出力される。

### 3. CDN へのアップロード

最適化済み画像を Supabase Storage または Vercel Blob にアップロードし、得られた公開URLを LINE Flex Message の `hero.url` で参照する。

## ライセンス上の注意

- **画像**: A.E. Waite と Pamela Colman Smith による1909年初版のライダー・ウェイト・タロット。Smith は1951年没。日本・米国ともに著作者の死後70年経過済みでパブリックドメイン化。
- **U.S. Games Systems社の再販版(1971年〜)とは別物**。再販版にはリマスター部分の権利が及ぶため、必ずWikimedia Commons の1909年版オリジナルスキャンを使うこと。

## データの使い方

### 基本的な読み込み

```typescript
import { loadMajorArcana, getCardById, drawCards } from './packages/tarot/loader'

// 全22枚をロード
const data = loadMajorArcana()
console.log(data.cards.length) // 22

// IDから取得
const death = getCardById(13)
console.log(death.name) // "死神"

// ランダムに3枚引く(正逆位置付き)
const reading = drawCards(3)
// [{ card: TarotCard, orientation: "upright" | "reversed" }, ...]
```

### マラキの応答生成での使用例

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { drawCards } from './packages/tarot/loader'

const anthropic = new Anthropic()

async function generateReading(userQuestion: string): Promise<string> {
  // 1枚引く
  const [drawn] = drawCards(1)
  const { card, orientation } = drawn

  // カード情報を System プロンプトの一部として渡す
  const cardContext = `
引かれたカード: ${card.name} (${orientation === 'upright' ? '正位置' : '逆位置'})
象徴: ${card.symbolism.keywords.join(', ')}
キーワード: ${
    orientation === 'upright' ? card.keywords_upright.join(', ') : card.keywords_reversed.join(', ')
  }

恋愛文脈の解釈:
${orientation === 'upright' ? card.contexts.love.upright : card.contexts.love.reversed}

語り口の指針:
${card.voice_hint}
  `.trim()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: `あなたは「マラキ」、最後の預言者。詳細は別途指定の人格仕様書に従う。\n\n${cardContext}`,
    messages: [{ role: 'user', content: userQuestion }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

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

## 拡張ロードマップ

- **Phase 1 (現在)**: 大アルカナ22枚、ライダー版そのまま使用
- **Phase 2**: 小アルカナ56枚追加、フル78枚化
- **Phase 3**: マラキ世界観でのオリジナルカード(色調補正 or 再描画)
