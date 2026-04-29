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
- [ ] LIFF でカード引き UX
- [ ] 課金導線(LINE 内課金 or Stripe)

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
