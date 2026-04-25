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
├── divine.ts            # 鑑定実行のメイン関数
├── test-fixtures.ts     # 動作確認・QA用のテストケース
└── README.md
```

## アーキテクチャ

### 静的部分(キャッシュ対象)

`STATIC_SYSTEM_PROMPT` は約 2700〜3000 トークン。
Anthropic API の Prompt Caching の最小要件(1024 トークン)を満たす。

```
identity + voice + principles + safety + format + examples
        → cache_control: { type: "ephemeral" }
```

2回目以降のリクエストでは、入力コストが約 90% 削減される
($3/MTok → $0.30/MTok)。

### 動的部分(キャッシュされない)

ユーザーメッセージとして毎回組み立てる:

```
[コンテキスト]
ユーザー名 / スプレッド / カテゴリ

[引かれたカード]
カード情報 + 語り口の指針

[ユーザーの問い]
質問テキスト
```

### 多層防御(セーフティ)

3層で危機ケースに対応:

1. **事前フィルター(`crisis-detector.ts`)** — 明らかな危機キーワードを正規表現で検知。重度なら API を呼ばず固定の支援メッセージを返す
2. **System プロンプト内のセーフティルール(`safety.ts`)** — Claude 自身に判断させる
3. **アプリ層での監視** — 応答ログをモニタリング、危機ケースは人間レビューに回す

## セットアップ

```bash
pnpm add @anthropic-ai/sdk
```

環境変数:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## 使い方

### 基本的な鑑定

```typescript
import { divine } from './packages/malachi-prompt/divine'
import { drawCards } from './packages/tarot/loader'

const [drawn] = drawCards(1)

const response = await divine({
  userName: '美咲',
  question: '彼の気持ちが知りたい',
  questionCategory: 'love',
  spread: 'single',
  drawnCards: [drawn],
})

console.log(response.text)
console.log(response.meta) // input/output トークン数、キャッシュヒット情報
```

### 会話の継続(履歴を渡す)

```typescript
const response2 = await divine({
  userName: '美咲',
  question: 'でも、本当に終わりが正しいの?',
  spread: 'single',
  drawnCards: [
    /* 新しく引いたカード */
  ],
  conversationHistory: [
    { role: 'user', content: '前回の質問テキスト' },
    { role: 'assistant', content: response.text },
  ],
})
```

### 危機検知のテスト

```typescript
import { detectCrisis } from './packages/malachi-prompt/crisis-detector'

const result = detectCrisis('もう死にたい')
// { level: "severe", matched: ["死にたい"], category: "self_harm" }
```

## トークン数とコスト試算

`estimateTokens()` で System プロンプトのトークン数を確認:

```typescript
import { estimateTokens } from './packages/malachi-prompt/system-prompt'

const { chars, estimatedTokens } = estimateTokens()
console.log(`${chars} 文字、約 ${estimatedTokens} トークン`)
```

### コスト見積もり(Claude Sonnet 4.6、2025年4月時点)

1回の鑑定あたり:

| 項目                        | トークン | 単価         | コスト  |
| --------------------------- | -------- | ------------ | ------- |
| 入力(初回・キャッシュなし)  | ~3,000   | $3 / MTok    | $0.0090 |
| 入力(2回目以降・キャッシュ) | ~3,000   | $0.30 / MTok | $0.0009 |
| 動的部分(毎回)              | ~300     | $3 / MTok    | $0.0009 |
| 出力                        | ~500     | $15 / MTok   | $0.0075 |

- 初回: 約 $0.017(2.5円程度)
- 2回目以降: 約 $0.009(1.4円程度)

サブスク 980円/月、月20回利用想定なら、API コストは約30〜50円。粗利率 95% 以上。

## モデル選定の指針

| モデル            | 用途           | 理由                                       |
| ----------------- | -------------- | ------------------------------------------ |
| Claude Sonnet 4.6 | 通常の鑑定     | 一貫した語り口、複雑な象徴の読み解きに必要 |
| Claude Opus 4.7   | プレミアム鑑定 | 深い洞察、長文の総合鑑定                   |
| Claude Haiku 4.5  | 不適           | キャラ一貫性に課題、語り口が崩れやすい     |

MVP では全てのプランで Sonnet 4.6 を推奨。スケール後にプラン別に最適化する。

## カスタマイズ

### 語り口の調整

`components/voice.ts` を編集する。
特に「トーンサンプル」セクションの良い例・悪い例を追加するとAIが学習しやすい。

### セーフティルールの追加

`components/safety.ts` の該当セクションに追記する。
新しいルールを追加した場合、`test-fixtures.ts` にもテストケースを追加する。

### 新しい質問カテゴリの追加

1. `packages/tarot/types/card.ts` の `QuestionContext` に追加
2. `packages/tarot/data/major-arcana.yaml` の各カードの `contexts` に解釈を追加
3. `card-context.ts` の `formatCardForPrompt` は自動的に新カテゴリに対応

## QA・テスト

`test-fixtures.ts` に定義されたテストケースを使い、定期的に応答品質を確認する。

```typescript
import { ALL_FIXTURES } from './packages/malachi-prompt/test-fixtures'
import { divine } from './packages/malachi-prompt/divine'

for (const fixture of ALL_FIXTURES.normal) {
  const response = await divine(fixture.request)
  console.log(`[${fixture.name}]`)
  console.log(response.text)
  console.log('Expected features:', fixture.expectedFeatures)
  console.log('---')
}
```

応答が `expectedFeatures` を満たしているか、`expectedAvoidance` を避けているかを目視レビューする。
将来的には Claude を使って自動評価する仕組み(LLM-as-Judge)も組み込み可能。

## 変更管理

System プロンプトは Malachi のブランドそのもの。
変更時は以下のプロセスを推奨:

1. 変更前後の応答を `test-fixtures.ts` で比較
2. 主要シナリオで意図しない退行(regression)がないか確認
3. 変更履歴を Git の commit message と CHANGELOG に明記
4. プロンプトのバージョン番号を `system-prompt.ts` 内で管理(将来的に)
