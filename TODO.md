# TODO

## 完了済み

- [x] eval:normal / crisis / injection 全合格確認
- [x] System プロンプト修正(段階5の断定締めを禁止)
- [x] runner.ts に .env.local 自動読み込みを追加
- [x] README.md に eval 3コマンドを追記

## 🔴 法令・コンプライアンス(MVP 公開前・必須)

- [ ] `docs/legal/terms-of-service.md` の `[要記入]` を実際の事業者情報で埋める
- [ ] `docs/legal/privacy-policy.md` の `[要記入]` を埋める(Anthropic API 送信・Supabase 越境移転の同意文言含む)
- [ ] `docs/legal/tokushoho.md` の `[要記入]` を埋める(特商法第11条の全必須項目)
- [ ] IT・消費者法専門の弁護士に 3 文書をレビュー依頼
- [ ] LINE 初回利用時の利規・プライポリ同意取得フローを設計・実装
- [ ] AI であることをサービス UI 上に明示する箇所を設ける(利規第 2 条と連動)

## 🟠 安全・セキュリティ(Phase 1 実装中に対処)

- [ ] LINE Webhook の `X-Line-Signature` HMAC-SHA256 署名検証を実装必須
- [ ] Supabase Row Level Security(RLS)の設計・実装
- [ ] API キー漏洩時のローテーション手順をドキュメント化
- [ ] Rate limiting / abuse 対策の設計(大量リクエストによるコスト爆増防止)

## Phase 1: MVP 構築

- [ ] Supabase スキーマ設計(users / conversations / readings / subscriptions)
- [ ] LINE 公式アカウント開設・Messaging API 連携
- [ ] LINE Webhook 処理(Next.js Route Handler)
- [ ] LIFF でカード引き UX
- [ ] 課金導線(LINE 内課金 or Stripe)
