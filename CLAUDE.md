# Malachi - AI 占いサービス

LINE + LIFF で動く AI タロット占い。ターゲット: 30代女性。収益: サブスク月額980円 + 単発鑑定。
スタック: Next.js (App Router) + TypeScript + Supabase + Anthropic Claude API。

颯駿は方針決定・レビューを担う。Claude Code は要件整理・実装・ドキュメント更新まで主体的に進める。

## 開発コマンド

```bash
pnpm dev          # apps/line-bot 開発サーバー起動
pnpm build        # 全パッケージビルド
pnpm lint         # ESLint
pnpm typecheck    # TypeScript 型チェック
```

LINE Webhook のローカルテストは ngrok 等で公開し、LINE Developers Console の Webhook URL を更新する。

## 原則

1. **セーフティ最優先** — 実装・公開前に `.claude/skills/divination-law/SKILL.md` を確認する
2. **マラキの世界観を守る** — 文言・UI すべてキャラクターと整合させる。迷ったら `.claude/skills/malachi-voice/SKILL.md`
3. **ドキュメント駆動** — 決定事項は docs/ に記録。機能仕様は `docs/design/`、法的判断は `docs/legal/`、KPI は `docs/ops/kpi.md`
4. **コード変更後はドキュメントを更新する**

| 変更の種類                | 更新するファイル                                   |
| ------------------------- | -------------------------------------------------- |
| API の追加・変更・削除    | `apps/line-bot/README.md` のエンドポイント仕様     |
| セキュリティ・認証の変更  | `apps/line-bot/README.md` のセキュリティセクション |
| 新機能・UX の追加         | `TODO.md` の該当タスクを完了に                     |
| packages/ の公開 API 変更 | 該当 `packages/*/README.md`                        |
| 環境変数の追加・削除      | `apps/line-bot/README.md` の環境変数セクション     |

## 現在の状態

進行フェーズ: Phase 1 — MVP 構築(次のマイルストーン: 課金導線 Stripe)
詳細タスク: **TODO.md** を参照
