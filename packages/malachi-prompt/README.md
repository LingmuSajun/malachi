# Malachi Prompt Package

マラキ(AI 占い師)の System プロンプトと、Anthropic API 統合ロジック。

## 構成

```
packages/malachi-prompt/
├── components/
│   ├── identity.ts      # マラキのアイデンティティ・来歴
│   ├── voice.ts         # 語り口・語彙ルール
│   ├── principles.ts    # 行動原則
│   ├── safety.ts        # セーフティルール(危機対応・法令・倫理)
│   ├── format.ts        # 応答構造
│   └── examples.ts      # Few-shot 応答例
├── system-prompt.ts     # 6つのコンポーネントを束ねる + キャッシュ制御
├── card-context.ts      # カード情報をユーザーメッセージとして組み立て
├── crisis-detector.ts   # 危機検知の事前フィルター(API呼び出し前)
├── ai-crisis-check.ts   # AI セカンドスクリーニング(Haiku)
├── divine.ts            # 鑑定実行のメイン関数
└── test-fixtures.ts     # 動作確認・QA用のテストケース
```

## アーキテクチャ

### 静的部分(キャッシュ対象)

`STATIC_SYSTEM_PROMPT` は約 2700〜3000 トークン。
Anthropic の Prompt Caching(最小 1024 トークン)を満たし、2回目以降の入力コストを約90%削減。

### 動的部分(キャッシュされない)

ユーザーメッセージとして毎回組み立てる:

```
[コンテキスト] ユーザー名 / スプレッド / カテゴリ
[引かれたカード] カード情報 + 語り口の指針
[ユーザーの問い] 質問テキスト
```

### 多層防御(セーフティ)

1. **事前フィルター(`crisis-detector.ts`)** — 正規表現で重度キーワードを検知。重度なら API 非呼び出しで固定テンプレートを返す
2. **AI セカンドスクリーニング(`ai-crisis-check.ts`)** — Haiku で婉曲・文脈依存表現を補足
3. **System プロンプト内のセーフティルール** — Claude 自身に判断させる

## 使い方

### ストリーミング鑑定(推奨)

SSE レスポンスを返す API に使う。

```typescript
import { divineStart } from '@malachi/prompt'
import { drawCards } from '@malachi/tarot'

const [drawn] = drawCards(1)

const result = await divineStart({
  userName: '美咲',
  question: '彼の気持ちが知りたい',
  questionCategory: 'love',
  spread: 'single',
  drawnCards: [drawn],
})

if (result.kind === 'crisis') {
  // 重度ケース: result.text に固定テンプレートが入っている
  console.log(result.text)
} else {
  // 通常: result.stream を for await で受け取る
  for await (const event of result.stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text)
    }
  }
}
```

### 非ストリーミング鑑定

```typescript
import { divine } from '@malachi/prompt'

const response = await divine({
  userName: '美咲',
  question: '彼の気持ちが知りたい',
  questionCategory: 'love',
  spread: 'single',
  drawnCards: [drawn],
})

console.log(response.text)
console.log(response.meta) // トークン数・キャッシュヒット情報
```

### 会話の継続(フォローアップ)

```typescript
const result = await divineStart({
  userName: '美咲',
  question: 'でも、本当に終わりが正しいの?',
  spread: 'single',
  drawnCards: [drawn],
  conversationHistory: [
    { role: 'user', content: '最初の質問' },
    { role: 'assistant', content: '最初の応答' },
  ],
})
```

### 危機検知のテスト

```typescript
import { detectCrisis } from '@malachi/prompt'

const result = detectCrisis('もう死にたい')
// { level: "severe", matched: ["死にたい"], category: "self_harm" }
```

## トークン数とコスト試算

1回の鑑定あたり(Claude Sonnet 4.6):

| 項目                        | トークン | 単価         | コスト  |
| --------------------------- | -------- | ------------ | ------- |
| 入力(初回・キャッシュなし)  | ~3,000   | $3 / MTok    | $0.0090 |
| 入力(2回目以降・キャッシュ) | ~3,000   | $0.30 / MTok | $0.0009 |
| 動的部分(毎回)              | ~300     | $3 / MTok    | $0.0009 |
| 出力                        | ~500     | $15 / MTok   | $0.0075 |

- 初回: 約 $0.017 (2.5円)
- 2回目以降: 約 $0.009 (1.4円)

サブスク 980円/月・月20回利用想定で API コストは約30〜50円。粗利率 95%以上。

## モデル選定

| モデル            | 用途                   | 理由                                 |
| ----------------- | ---------------------- | ------------------------------------ |
| Claude Sonnet 4.6 | 通常の鑑定             | キャラ一貫性と象徴読み解きのバランス |
| Claude Opus 4.7   | プレミアム鑑定         | 深い洞察・長文総合鑑定向け           |
| Claude Haiku 4.5  | 危機スクリーニングのみ | 鑑定には語り口が崩れやすく不適       |

## カスタマイズ

- **語り口の調整**: `components/voice.ts` のトーンサンプル(良い例・悪い例)を編集
- **セーフティルールの追加**: `components/safety.ts` に追記 + `test-fixtures.ts` にテストケース追加
- **新しい質問カテゴリの追加**: `tarot/types/card.ts` の `QuestionContext` → `major-arcana.yaml` の `contexts` → `card-context.ts` は自動対応

## QA

`test-fixtures.ts` のケースを `pnpm eval:normal` / `pnpm eval:crisis` で定期実行して品質を確認する。
System プロンプト変更時は必ず実行すること。
