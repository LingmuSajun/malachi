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
│   ├── database/                   # Supabase スキーマ・型・リポジトリ
│   │   ├── migrations/             # SQL マイグレーションファイル
│   │   ├── types.ts                # Row / Insert / Update 型 + Database ジェネリック
│   │   ├── client.ts               # Supabase クライアント(サービスロールキー)
│   │   ├── repositories.ts         # DB アクセスの薄いラッパー
│   │   └── index.ts                # re-export
│   └── eval/                       # LLM-as-Judge による品質評価
├── apps/
│   └── line-bot/                   # LINE Messaging API + LIFF (今後実装)
└── scripts/                        # セットアップスクリプト
```

## 開発フェーズ

タスクの詳細と進捗は **TODO.md** で一元管理する。

| Phase   | 状態      | 概要                                                          |
| ------- | --------- | ------------------------------------------------------------- |
| Phase 0 | ✅ 完了   | 基盤設計(コンセプト・プロンプト・タロットデータ・DB スキーマ) |
| Phase 1 | 🚧 進行中 | MVP 構築(LINE Bot + Supabase + LIFF + 課金)                   |
| Phase 2 | 未着手    | グロース(CPA 最適化・数秘術・西洋占星術)                      |
| Phase 3 | 未着手    | 拡張(小アルカナ・ヒーリング・B2B)                             |

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

### 5. コード変更後はドキュメントを更新する

実装が完了したら、影響するドキュメントを必ず更新する。

更新対象の判断基準:

| 変更の種類                | 更新するファイル                                             |
| ------------------------- | ------------------------------------------------------------ |
| API の追加・変更・削除    | `apps/line-bot/README.md` のエンドポイント仕様               |
| セキュリティ・認証の変更  | `apps/line-bot/README.md` のセキュリティセクション           |
| 新機能・UX の追加         | `CLAUDE.md` の「現在の状態」、`TODO.md` の該当タスクを完了に |
| packages/ の公開 API 変更 | 該当 `packages/*/README.md`                                  |
| 環境変数の追加・削除      | `apps/line-bot/README.md` の環境変数セクション               |

「コードは動いたが README が古いまま」という状態を作らない。

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

最終更新: 2026-05-16
進行フェーズ: Phase 1 — MVP 構築(顧客満足度改善フェーズ)
直近の達成:

- LIFF フォローアップ質問機能 — 鑑定結果からそのまま追加質問できる会話 UI
- userName パーソナライズ — LINE displayName をマラキの応答に反映
- LIFF API セキュリティ強化 — アクセストークン検証・入力長制限・conversationHistory バリデーション
- タロット画像の最適化版差し替え — packages/tarot/images/ を削除、public/ を軽量化
- テーマ選択 UI — 恋愛/仕事・お金/人間関係/今日の一枚の4ボタン、questionCategory をプロンプトに反映

次のマイルストーン: 鑑定結果の LINE チャット送り返し or 課金導線(Stripe)
詳細タスク: TODO.md を参照
