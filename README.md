# Malachi

> 迷える夜に、最後の預言者を

LINE 上で動作する AI タロット占いサービス。
旧約聖書最後の預言者「マラキ」を擬したキャラクターが、
タロットカードを通じて30代女性の恋愛・人間関係の悩みに導きを与える。

## アプリ構成

```
malachi/
├── apps/
│   └── line-bot/           # Next.js — LINE Bot + LIFF (本番稼働中)
├── packages/
│   ├── tarot/              # 大アルカナ22枚データ・カードドロー
│   ├── malachi-prompt/     # System プロンプト + 危機検知 + Claude API 統合
│   ├── database/           # Supabase スキーマ・型・リポジトリ
│   └── eval/               # LLM-as-Judge 応答品質評価
└── docs/                   # 法令・マーケ・運用ドキュメント
```

## クイックスタート

### devcontainer / Docker

VS Code の Dev Containers または `docker compose up` で起動すると、セットアップが自動実行されます。
起動後に `.env.local` の `ANTHROPIC_API_KEY` を設定してください。

### ローカル / CI

```bash
bash scripts/setup.sh
# .env.local に ANTHROPIC_API_KEY を設定後:
pnpm eval:normal    # 通常鑑定の品質評価
pnpm eval:crisis    # 危機検知の評価
pnpm eval:injection # プロンプトインジェクション耐性の評価
```

`scripts/setup.sh` は冪等です。`.env.local` の上書きは行いません。

## ドキュメント

- **プロジェクト全体の方針**: [CLAUDE.md](./CLAUDE.md)
- **LINE Bot / LIFF アプリ**: [apps/line-bot/README.md](./apps/line-bot/README.md)
- **タロットデータ**: [packages/tarot/README.md](./packages/tarot/README.md)
- **マラキの System プロンプト**: [packages/malachi-prompt/README.md](./packages/malachi-prompt/README.md)
- **応答品質評価**: [packages/eval/README.md](./packages/eval/README.md)
- **法令対応**: [.claude/skills/divination-law/SKILL.md](./.claude/skills/divination-law/SKILL.md)

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: Next.js (App Router)
- **DB**: Supabase (PostgreSQL + RLS)
- **AI**: Anthropic Claude API (Sonnet 4.6 / Haiku 4.5)
- **プラットフォーム**: LINE Messaging API + LIFF
- **デプロイ**: Vercel
- **開発**: Claude Code

## ライセンス

Private. All rights reserved.

タロットカード画像は Pamela Colman Smith (1878-1951) による1909年版ライダー・ウェイト・タロットを使用。
著作者の死後70年経過によりパブリックドメイン化済み。
