# Malachi

> 迷える夜に、最後の預言者を

LINE 上で動作する AI タロット占いサービス。
旧約聖書最後の預言者「マラキ」を擬したキャラクターが、
タロットカードを通じて30代女性の恋愛・人間関係の悩みに導きを与える。

## クイックスタート

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集して ANTHROPIC_API_KEY を設定

# タロット画像取得(Wikimedia Commons の1909年版PD)
pnpm tarot:download
pnpm tarot:preprocess

# データの妥当性確認
pnpm validate:tarot

# 応答品質の自動評価(要 ANTHROPIC_API_KEY)
pnpm eval:normal
```

## ドキュメント

- **プロジェクト全体**: [CLAUDE.md](./CLAUDE.md)
- **タロットデータ**: [packages/tarot/README.md](./packages/tarot/README.md)
- **マラキの System プロンプト**: [packages/malachi-prompt/README.md](./packages/malachi-prompt/README.md)
- **応答品質評価**: [packages/eval/README.md](./packages/eval/README.md)
- **法令対応**: [.claude/skills/divination-law/SKILL.md](./.claude/skills/divination-law/SKILL.md)

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: Next.js (App Router)
- **DB**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **プラットフォーム**: LINE Messaging API + LIFF
- **デプロイ**: Vercel
- **開発**: Claude Code

## ライセンス

Private. All rights reserved.

タロットカード画像は Pamela Colman Smith (1878-1951) による1909年版ライダー・ウェイト・タロットを使用。
著作者の死後70年経過によりパブリックドメイン化済み。
