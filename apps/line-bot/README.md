# apps/line-bot

Malachi の LINE Bot + LIFF アプリ。Next.js (App Router) で実装。Vercel にデプロイ。

## ディレクトリ構造

```
apps/line-bot/
├── app/
│   ├── api/
│   │   ├── line/webhook/       # LINE Messaging API Webhook
│   │   └── liff/
│   │       ├── reading/        # カード鑑定 API
│   │       └── followup/       # フォローアップ質問 API
│   └── liff/card/              # LIFF カード引き画面
├── lib/
│   ├── handlers/               # Webhook イベントハンドラ
│   ├── liff/verify.ts          # LIFF アクセストークン検証
│   └── line/                   # LINE クライアント・署名検証
└── public/images/major-arcana/ # タロットカード画像 (22枚)
```

## ユーザーフロー

```
LINE でメッセージ送信
  → Webhook が受信 → LIFF の URL を Flex Message で返信
  → ユーザーが「カードを引く」ボタンをタップ
  → LIFF が開く → 質問入力 → カードフリップアニメ → マラキの鑑定テキスト表示
  → 「もっと詳しく聞く」でフォローアップ質問 (何度でも)
  → 「新しい鑑定へ」でリセット
```

## API エンドポイント

### `POST /api/line/webhook`

LINE Messaging API からのイベントを受け取る。

- `X-Line-Signature` ヘッダーの HMAC-SHA256 署名を検証
- `follow` イベント: ウェルカムメッセージ送信
- `message` イベント: LIFF URL を含む Flex Message を返信

### `POST /api/liff/reading`

LIFF からカード鑑定リクエストを受け取る。

**リクエスト**:

```json
{
  "lineUserId": "U...",
  "liffAccessToken": "eyJ...",
  "userName": "美咲",
  "question": "彼の気持ちが知りたい",
  "questionCategory": "love"
}
```

`questionCategory` は省略可。`love` / `work` / `relationships` / `self` / `decision` のいずれか。
指定するとマラキの解釈がテーマに特化する(カードの `contexts` フィールドを使用)。

**レスポンス**:

```json
{
  "conversationId": "uuid",
  "cardSlug": "fool",
  "cardName": "愚者",
  "cardNameEn": "The Fool",
  "cardImage": "00-fool.jpg",
  "orientation": "upright",
  "text": "マラキの鑑定テキスト..."
}
```

### `POST /api/liff/followup`

鑑定結果に対する追加質問を処理する。新しいカードは引かず、同じカードの文脈で会話を継続。

**リクエスト**:

```json
{
  "lineUserId": "U...",
  "liffAccessToken": "eyJ...",
  "userName": "美咲",
  "followUpQuestion": "もっと詳しく教えて",
  "cardSlug": "fool",
  "orientation": "upright",
  "conversationId": "uuid",
  "conversationHistory": [
    { "role": "user", "content": "彼の気持ちが知りたい" },
    { "role": "assistant", "content": "..." }
  ]
}
```

**レスポンス**:

```json
{ "text": "マラキの追加応答テキスト..." }
```

## セキュリティ

### LINE Webhook

`X-Line-Signature` ヘッダーを HMAC-SHA256 で検証。不一致は 401 を返す。

### LIFF API (reading / followup)

**LIFF アクセストークン検証** (`lib/liff/verify.ts`):

1. フロントエンドが `liff.getAccessToken()` でトークンを取得してリクエストに含める
2. サーバーが `https://api.line.me/v2/profile` にトークンを送り、LINE API から返ってきた `userId` と一致するか照合
3. 不一致・無効トークンは 401 を返す

これにより、`lineUserId` の自称だけではAPIを呼び出せない。

**入力バリデーション**:

| フィールド                      | 上限                           |
| ------------------------------- | ------------------------------ |
| `question` / `followUpQuestion` | 500 文字                       |
| `userName`                      | 50 文字                        |
| `conversationHistory`           | 20 メッセージ、各 2000 文字    |
| `orientation`                   | `upright` / `reversed` のみ    |
| `cardSlug`                      | tarot データに存在するもののみ |

## 環境変数

```
# LINE
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
NEXT_PUBLIC_LIFF_ID=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## ローカル開発

```bash
cd apps/line-bot
pnpm dev
```

LINE Webhook の動作確認には ngrok 等でローカルを公開し、LINE Developers Console の Webhook URL を更新する。
