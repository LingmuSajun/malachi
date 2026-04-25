# docs/design

ブランドガイドライン・UI/UX 仕様・世界観のドキュメント。

## ファイル構成(推奨)

```
docs/design/
├── README.md
├── brand-guideline.md       # ブランドカラー、ロゴ、タイポグラフィ
├── voice-guideline.md       # マラキの語り口(.claude/skills と連動)
├── ui-flow.md               # 主要 UI フロー
├── flex-message-templates/  # LINE Flex Message テンプレート集
│   ├── card-draw.json
│   ├── reading-result.json
│   └── subscription.json
└── liff-mockups/            # LIFF 画面のモックアップ
```

## ブランドの基本

- **色調**: 深い藍色、金色、夜空のイメージ
- **モチーフ**: 月、星、灯、扉、ヘブライ文字 מַלְאָכִי
- **タイポグラフィ**: 和文は明朝系、欧文はセリフ系(預言者らしい荘厳さ)
- **アニメーション**: 緩やか、フェードイン中心。派手な動きは避ける

## 世界観の核

詳細は `.claude/skills/malachi-voice/SKILL.md` 参照。
