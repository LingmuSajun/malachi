# Malachi - AI 占いサービス開発プロジェクト

## このプロジェクトの目的

LINE 上で動作する AI 占いサービス「Malachi(マラキ)」を、
企画・開発・マーケティング・運用まで一貫して構築する。

ターゲット: 30代女性・恋愛/人間関係悩み
収益モデル: サブスク(月額980円想定) + プレミアム単発鑑定
LINE プラットフォーム: Messaging API + LIFF
バックエンド: Next.js (App Router) + TypeScript + Supabase + Anthropic Claude API

## あなた(Claude Code)の役割

このプロジェクトは「人がやることを補助するアシスタント」ではなく、
**エージェント的に企画から実装まで主体的に進める** 構造になっている。

ユーザー(颯駿)は方針決定とレビューを担い、あなたは:

- 要件を docs/ にまとめ、
- データを packages/ で実装し、
- セーフティ・法令を `.claude/skills/` で参照し、
- 役割別の判断は `.claude/agents/` の subagent を呼び出す。

## ディレクトリ構造

```
malachi/
├── CLAUDE.md                       # このファイル
├── .claude/
│   ├── commands/                   # よく使うタスクのテンプレート
│   ├── agents/                     # 役割別 subagent
│   └── skills/                     # 領域別の参照知識
├── docs/
│   ├── business/                   # 事業計画、市場分析、競合調査
│   ├── legal/                      # 利用規約、特商法表示、コンプラチェック
│   ├── marketing/                  # ペルソナ、LP、SNS、CPA設計
│   ├── ops/                        # 運用手順、KPI、障害対応
│   └── design/                     # ブランドガイド、世界観
├── packages/
│   ├── tarot/                      # 大アルカナ22枚のデータと画像
│   ├── malachi-prompt/             # System プロンプト + 危機検知 + 統合
│   └── eval/                       # LLM-as-Judge による品質評価
├── apps/
│   └── line-bot/                   # LINE Messaging API + LIFF (今後実装)
└── scripts/                        # セットアップスクリプト
```

## 開発フェーズ

### Phase 0(完了): 基盤設計

- [x] 事業コンセプト確定
- [x] サービス名 Malachi 確定
- [x] 占術選定(タロット22枚)
- [x] マラキ人格仕様
- [x] System プロンプト v1
- [x] 大アルカナデータ整備
- [x] 大アルカナ画像(元画像 + LINE最適化済み)git管理化
- [x] 危機検知 + Judge による品質評価

### Phase 1(進行中): MVP 構築

- [ ] LINE 公式アカウント開設・Messaging API 連携
- [ ] Supabase スキーマ設計(users, conversations, readings, subscriptions)
- [ ] LINE Webhook 処理(Next.js Route Handler)
- [ ] LIFF でカード引き UX
- [ ] 課金導線(LINE 内課金 or Stripe)

### Phase 2: グロース

- [ ] CPA 最適化のチャネル整備(SEO / Instagram / TikTok)
- [ ] 数秘術(無料入口)追加
- [ ] 西洋占星術(プレミアム)追加

### Phase 3: 拡張

- [ ] 小アルカナ56枚追加
- [ ] 自己啓発・ヒーリング領域への拡張
- [ ] B2B(法人向け)展開検討

## 開発時の重要原則

### 1. セーフティ最優先

占いビジネスには法令(特商法・景表法・薬機法)と倫理(危機対応、第三者保護)の制約が多い。
何かを実装・公開する前に、必ず `.claude/skills/divination-law/SKILL.md` を参照する。

### 2. マラキの一貫性を守る

Malachi はキャラクターであり、ブランドそのもの。
LP コピー、メッセージ、エラー表示、すべてが「マラキの世界観」と整合していなければならない。
迷ったら `.claude/skills/malachi-voice/SKILL.md` を参照する。

### 3. データドリブンに進める

直感ではなく、市場データ・競合データ・自社のメトリクスで判断する。
KPI 設計は `docs/ops/kpi.md` に集約する。

### 4. ドキュメント駆動

- 機能仕様 → `docs/design/` または `docs/business/`
- 法的判断 → `docs/legal/` に記録
- マーケ施策 → `docs/marketing/` に記録
- 運用ノウハウ → `docs/ops/` に蓄積

口頭でやり取りした決定も必ず文書化する。
これは Erasmus パターン(章別実行 + 進捗トラッキング)を継承する。

## subagent と skill の使い分け

### subagent を呼ぶ時

役割の異なる視点が必要な時。
複数の subagent の意見を統合して判断する。

例:

- 新機能を考える → `pm.md` で要件整理
- LP コピーを書く → `marketer.md` で原稿作成 + `voice-coach.md` でレビュー
- 利用規約を更新する → `compliance.md` で法的チェック

### skill を読む時

特定領域の参照知識が必要な時。
Read-only な参照で完結する。

例:

- 「LINE Messaging API の配信単価は?」→ `line-platform/`
- 「タロットの『塔』の伝統的解釈は?」→ `tarot-meaning/`
- 「マラキは絵文字を使う?」→ `malachi-voice/`
- 「占いビジネスで NG な表現は?」→ `divination-law/`

## 現在の状態

(このセクションは進捗に応じて随時更新する)

最終更新: 2026-04-25
進行中タスク: LINE Bot MVP の実装準備
次のマイルストーン: LINE 公式アカウント開設 + Webhook 受信のプロトタイプ
