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

LIFF からカード鑑定リクエストを受け取る。**SSE (Server-Sent Events) でストリーミングレスポンスを返す。**

**リクエスト**:

```json
{
  "lineUserId": "U...",
  "liffAccessToken": "eyJ...",
  "userName": "美咲",
  "question": "彼の気持ちが知りたい",
  "questionCategory": "love",
  "spread": "single"
}
```

`questionCategory` は省略可。`love` / `work` / `relationships` / `self` / `decision` のいずれか。
指定するとマラキの解釈がテーマに特化する(カードの `contexts` フィールドを使用)。

`spread` は省略可。`single`(1枚引き・デフォルト) または `three`(3枚引き = 過去 / 現在 / 未来)。
`three` の場合 3 枚を引き、各カードに `past` / `present` / `future` の位置を割り当て、
マラキは 3 枚を一つの物語として読む(出力上限を引き上げ、900〜1300字目安)。

**レスポンス**: `Content-Type: text/event-stream`

```
data: {"type":"init","conversationId":"uuid","spread":"single","cards":[{"cardSlug":"fool","cardName":"愚者","cardNameEn":"The Fool","cardImage":"00-fool.jpg","orientation":"upright","position":null}],"cardSlug":"fool","cardName":"愚者","cardNameEn":"The Fool","cardImage":"00-fool.jpg","orientation":"upright"}

data: {"type":"text","chunk":"マラキの"}

data: {"type":"text","chunk":"鑑定テキスト..."}

data: {"type":"done"}
```

| イベント | タイミング         | 内容                           |
| -------- | ------------------ | ------------------------------ |
| `init`   | ストリーム開始直後 | カードメタデータ一式           |
| `text`   | 生成中(複数回)     | テキストの断片                 |
| `done`   | DB保存完了後       | 終了シグナル                   |
| `error`  | エラー発生時       | `message` フィールドにエラー文 |

`init` イベントの `cards` 配列が主データ(1枚引きは1要素、3枚引きは3要素で各 `position` 付き)。
トップレベルの `cardSlug` / `cardName` / `orientation` 等は 1枚引き向けの後方互換フィールド。

LIFF トークン検証とカード抽選は並列実行される。危機対応テンプレートの場合は `text` が1イベントで全文送信される。

`done` イベントには `readingId` フィールドが含まれる。鑑定完了後、LINE チャットへ Flex Message(カード画像)と鑑定全文テキストが push される。

> ~~`GET /api/liff/history/:reading_id`~~ — 削除済み。「鑑定を見返す」ボタン方式を廃止し、鑑定全文テキスト push 方式に変更したため。

### `POST /api/liff/followup`

鑑定結果に対する追加質問を処理する。新しいカードは引かず、同じカードの文脈で会話を継続。**SSE (Server-Sent Events) でストリーミングレスポンスを返す。**

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

**レスポンス**: `Content-Type: text/event-stream`

```
data: {"type":"text","chunk":"マラキの"}

data: {"type":"text","chunk":"追加応答テキスト..."}

data: {"type":"done"}
```

`/api/liff/reading` と同じ SSE 形式。`init` イベントはなく `text` / `done` / `error` のみ。

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

# アプリの公開URL (鑑定結果のLINEプッシュ通知でカード画像を表示するために必要)
# 例: https://your-app.vercel.app
APP_URL=https://...
```

`APP_URL` が未設定の場合はカード画像なしでテキストのみ送信される。

## ローカル開発

```bash
cd apps/line-bot
pnpm dev
```

LINE Webhook の動作確認には ngrok 等でローカルを公開し、LINE Developers Console の Webhook URL を更新する。
