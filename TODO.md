# TODO

> タスクの単一ソース。CLAUDE.md の開発フェーズ一覧はここに集約済み。

---

## Phase 0: 基盤設計 — 完了

- [x] 事業コンセプト確定
- [x] サービス名 Malachi 確定
- [x] 占術選定(タロット22枚)
- [x] マラキ人格仕様
- [x] System プロンプト v1(段階5の断定締め禁止を含む)
- [x] 大アルカナデータ整備
- [x] 大アルカナ画像(元画像 + LINE最適化済み)git管理化
- [x] 危機検知 + LLM-as-Judge 品質評価(eval 3コマンド整備、runner.ts の .env.local 自動読み込み)
- [x] Supabase スキーマ設計・実装(`packages/database/` — SQL マイグレーション + 型 + リポジトリ + RLS)

---

## 🔴 法令・コンプライアンス — MVP 公開前・必須

- [ ] `docs/legal/terms-of-service.md` の `[要記入]` を実際の事業者情報で埋める
- [ ] `docs/legal/privacy-policy.md` の `[要記入]` を埋める(Anthropic API 送信・Supabase 越境移転の同意文言含む)
- [ ] `docs/legal/tokushoho.md` の `[要記入]` を埋める(特商法第11条の全必須項目)
- [ ] IT・消費者法専門の弁護士に 3 文書をレビュー依頼
- [ ] LINE 初回利用時の利規・プライポリ同意取得フローを設計・実装
- [ ] AI であることをサービス UI 上に明示する箇所を設ける(利規第 2 条と連動)

---

## 🟠 安全・セキュリティ — Phase 1 実装中に対処

- [x] Supabase RLS 設計 — スキーマに組み込み済み(anon/authenticated アクセスを拒否、サービスロールのみ許可)
- [x] LINE Webhook の `X-Line-Signature` HMAC-SHA256 署名検証を実装 — `lib/line/signature.ts`
- [ ] API キー漏洩時のローテーション手順をドキュメント化
- [ ] Rate limiting / abuse 対策の設計(大量リクエストによるコスト爆増防止)

---

## Phase 1: MVP 構築 — 進行中(LINE Bot 本番稼働済み)

- [x] Supabase スキーマ設計・実装(users / conversations / readings / subscriptions)
- [x] Supabase プロジェクト作成・環境変数設定
- [x] `packages/database/migrations/0001_initial_schema.sql` 実行
- [x] LINE 公式アカウント開設・Messaging API 連携(Channel Secret / Access Token 取得済み)
- [x] LINE Webhook 処理(Next.js Route Handler) — 本番稼働確認済み
- [x] Vercel 本番デプロイ・エンドツーエンド動作確認(マラキの返答を確認)
- [x] LIFF でカード引き UX(カードフリップアニメ・LIFF専用フロー・マラキ応答品質改善)
- [ ] 課金導線(Stripe — サブスク月額980円 + 単発プレミアム鑑定)

---

## 🟡 顧客満足度・UX 改善 — テスト中に優先着手

> 「1回引いて終わり」の体験を、**会話が続く・戻ってきたくなる**体験に変える。
> 課金実装は後回し。まず体験の質を上げる。優先度順。

### 1. フォローアップ質問 — LIFF 内で追加質問できるようにする【✅ 完了】

- [x] 鑑定結果表示後に「もっと詳しく聞く」テキスト入力欄を追加
- [x] フォローアップ時は同じ `conversation_id` で `divine()` を再呼び出し(`/api/liff/followup`)
- [x] 追加質問の応答は format.ts の「短いやり取り」ルール(200〜300字)を適用(conversationHistory 渡し)
- [x] 「新しい鑑定へ」ボタンで状態リセット

### 2. userName パーソナライズ【✅ 完了】

- [x] LIFF の `liff.getProfile()` で取得済みの `displayName` を `/api/liff/reading` に渡す
- [x] `divine()` 呼び出し時の `userName` に反映(現在 `undefined` のまま)
- [x] マラキがユーザーの名前を呼ぶことで親密感を演出

### 3. 鑑定結果を LINE チャットに送り返す【✅ 完了】

- [x] 鑑定 API 完了後、サーバーから LINE プッシュ通知で Flex Message を送信(`lib/line/push.ts`)
- [x] LINE に残ることで見返せる・友人にシェアしやすくなる
- [x] Flex Message でカード名+正逆+鑑定冒頭抜粋を表示。`APP_URL` 設定時はカード画像も付与

### 4. テーマ選択 UI — 質問の質を上げる【✅ 完了】

- [x] 質問入力前に「恋愛」「仕事・お金」「人間関係」「今日の一枚」のボタンを表示
- [x] 選択したテーマを `divine()` に渡してマラキの解釈をテーマ特化させる
- [x] テーマに応じたプレースホルダー文言に切り替え(質問入力のハードルを下げる)

### 5. API レスポンス高速化 + ローディング UX【離脱防止】

> 現状：鑑定結果が届くまで約1分かかっており、ユーザー離脱の主因。

**バックエンド（速度改善）**

- [x] `divineStart()` でストリーミング対応（`client.messages.stream`）し、SSE で逐次レスポンス送信
- [ ] `/api/liff/reading` に `export const runtime = 'edge'` を追加（コールドスタートを〜100ms に短縮）※DB互換性の確認が必要
- [x] `export const maxDuration = 60` でタイムアウト余裕を確保
- [x] LIFF トークン検証とカード抽選を `Promise.all` で並列化
- [x] `max_tokens` を 1500 → 1000 に削減（生成時間 約30%短縮、読みの質は維持）

**フロントエンド（待ち時間の体験改善）**

- [x] SSE 受信対応：カード画像を即表示し、テキストをリアルタイムで流し込む
- [x] 鑑定中フェーズメッセージをアニメーション切り替え（2.5秒サイクル）
- [x] タロット豆知識カルーセル（4.5秒サイクル・スタートランダム）

### 6. 鑑定結果を LINE チャットに送り返す(改訂)【✅ 完了】

> 当初「鑑定を見返す」ボタン付き Flex Message を実装したが、LIFF ディープリンクの技術的制約(liff.state パスがエンドポイント配下でなければならない仕様)により安定した動作が困難だったため、仕様を変更。「見返す」リンクを廃止し、鑑定全文をテキストメッセージとして直接 LINE に送信する方式に変更した。

- [x] 鑑定終了後に Flex Message(カード画像) + テキストメッセージ(鑑定全文)を同一 push で送信
  - `lib/line/push.ts`: Flex からボタン・抜粋を削除。鑑定全文をプレーンテキストの第2メッセージとして追加
  - `api/liff/reading/route.ts`: `pushReadingResult` を `await` に変更(fire-and-forget だと Vercel がプロセスを終了し送信失敗する問題を修正)
- [x] 廃止: LIFF 鑑定詳細ページ(`/liff/history/[reading_id]`) およびその API ルートを削除
- [x] 廃止: `liff/card/page.tsx` の履歴ディープリンクリダイレクトを削除

### 7. 3枚スプレッド鑑定【コンテンツ深化】【✅ 完了】

- [x] 「過去・現在・未来」3枚引きの LIFF UI 実装（card 画面に 1枚/3枚 切替トグル＋順番フリップ演出）
- [x] 3枚を統合して物語として読む System プロンプト拡張（`format.ts` に複数枚セクション追加・`spread: 'three-card'`、3枚時は max_tokens 1500）
- [x] 1枚との使い分けをユーザーが選べるようにする（両方無料。課金ゲートは Stripe フェーズで）
- [x] history 詳細・LINE push（3枚横並び Flex）・followup（3枚文脈）も3枚対応。DB はマイグレ不要（`spread_type`/`cards` が既にN枚対応）

### 8. フォローアップ自動メッセージ【リテンション】

- [ ] 鑑定から3日後に「その後どうでしたか?」を Vercel Cron で自動送信
- [ ] 返信が次の鑑定への自然な入口になるよう設計

---

## 🔮 鑑定精度改善 — 本質的な品質向上

> 現状の診断: マラキに渡るカード解釈テキストが平均22文字と極端に薄く、
> 応答の深さはカードデータの質に律速されている。

### 1. カードデータ (`major-arcana.yaml`) の解釈テキスト充実【最優先・最大効果】

> `contexts[category][orientation]` の文字数: 現在**平均22文字**。
> マラキが深い鑑定をするための素材が不足している。

- [ ] 全22枚 × 5カテゴリ(love/relationships/self/work/decision) × 正逆 = 220フィールドを
      平均**100文字以上**に書き直す
  - 「なぜこのカードがこの文脈でこの意味を持つのか」の理由・背景を含める
  - マラキが引用・変形できる具体的な比喩・情景を1つ以上含める
  - 現在の「〜の時。」という1文完結を、2〜3文の解釈文に拡張する

### 2. カード固有の象徴情景データ (`symbolism.scene`) の追加【大効果】

> 現在 `symbolism` には `element / planet / keywords` しかなく、
> 実際のカード絵柄が持つ象徴情景(死神の白い薔薇、審判のラッパ、星の水瓶 等)が
> プロンプトに渡っていない。

- [ ] `major-arcana.yaml` の各カードに `symbolism.scene` フィールドを追加
      (例: `「白馬に乗った骸骨が白い薔薇を手に進む。旗には白い薔薇—新しい始まりの象徴」`)
- [ ] `formatCardForPrompt` で `symbolism.scene` を「絵柄が語るもの:」として渡す
- [ ] `TarotCard` 型定義 (`packages/tarot/types/card.ts`) を更新

### 3. `voice_hint` の充実【大効果】

> 現在平均93文字。カード固有の語り口ヒントが薄いカードで応答がパターン化する。

- [ ] 全22枚の `voice_hint` を**200文字以上**に拡張する
  - マラキが具体的に使える比喩・問いかけを1〜2個明示する
  - そのカードで「やりがちな誤った解釈」を1行で示す(negative example)

### 4. `detectCategory` の精度向上【中効果】

> キーワードマッチのみで、マッチしない質問はすべて `'love'` にフォールバック。
> 「今日の一枚」「運勢が知りたい」→ love カテゴリの解釈テキストが渡ってしまう。

- [ ] `'general'` カテゴリを `SpreadType` に追加し、カードデータに対応フィールドを用意する
      (汎用的な解釈: カードの本質的な意味を特定カテゴリに縛らず渡す)
- [ ] または `detectCategory` を LLM ベースの分類に切り替える(API コスト vs 精度のトレードオフ評価が必要)

### 5. Few-shot examples の拡充【中効果】

> 現在4例のみ(死神逆、運命の輪正、星正、フォローアップ)。
> work / decision / relationships カテゴリの例が存在しない。

- [ ] `components/examples.ts` に以下のカテゴリ例を追加:
  - work: 仕事の行き詰まり × 隠者 or 塔
  - relationships: 友人・家族の軋轢 × 正義 or 力
  - decision: 二択に迷う × 女教皇 or 恋人
  - self: 自己肯定 × 太陽 or 世界

### 6. `temperature` の明示的設定【小効果・即対応可】

> 現在 temperature 未設定(Anthropic デフォルト)。
> 毎回似た書き出しパターンに収束しやすい。FORMAT.ts でバリエーションを求めているが、
> モデル側の設定と整合していない。

- [ ] `divine.ts` の `DivineOptions` に `temperature?: number` を追加
      推奨値: `0.9`(創造性 ↑)。評価で最適値を確認する

---

## 💳 課金導線 — UX 改善後に着手

- [ ] フリーミアム制限設計(無料枠: 月3回)
- [ ] サブスク加入状態を `subscriptions` テーブルで判定するミドルウェア実装
- [ ] Stripe 連携(サブスク月額980円 + 単発プレミアム鑑定)
- [ ] 課金誘導メッセージをマラキの口調で作成(3枚スプレッドへの自然な誘導)
- [ ] 月次レポートをサブスク特典として実装

---

## 📋 リッチメニュー改善 — 課金設計確定後に合わせて実装

- [ ] 「恋愛」「仕事・お金」「人間関係」「今日の一枚」の4ボタン構成に変更

---

## Phase 2: グロース

- [ ] CPA 最適化のチャネル整備(SEO / Instagram / TikTok)
- [ ] 数秘術(無料入口)追加
- [ ] 西洋占星術(プレミアム)追加

---

## Phase 3: 拡張

- [ ] 小アルカナ56枚追加
- [ ] 自己啓発・ヒーリング領域への拡張
- [ ] B2B(法人向け)展開検討
