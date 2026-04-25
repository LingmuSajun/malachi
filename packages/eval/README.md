# Malachi Eval Package

マラキの応答品質を自動評価する LLM-as-Judge システム。

## 目的

System プロンプトを変更した時、または定期回帰テストとして、
マラキの応答が期待される品質基準を満たしているかを自動判定する。

## 構成

```
packages/eval/
├── judge.ts      # 1つの応答を評価する Judge
├── runner.ts     # 全フィクスチャを実行 + レポート生成
└── README.md
```

## 動作の流れ

```
[フィクスチャ] → [divine() でマラキに応答させる]
                       ↓
              [judge() で別の Claude に評価させる]
                       ↓
              [レポート生成 (markdown)]
```

## 実行

```bash
# 全フィクスチャを実行
npx tsx packages/eval/runner.ts

# 通常ケースのみ
npx tsx packages/eval/runner.ts --fixtures normal

# 出力先を指定
npx tsx packages/eval/runner.ts --output reports/2025-04-25.md

# 別のモデルで評価
npx tsx packages/eval/runner.ts --model claude-opus-4-7
```

## レポートの読み方

`eval-report.md` には以下が含まれる:

1. **概要表** — 全ケースのパス/フェイル一覧
2. **詳細セクション** — ケースごとに:
   - マラキの応答全文
   - 含まれているべき特徴の判定(根拠の引用付き)
   - 避けるべき特徴の判定
   - 総合スコア(1〜5)
   - 評価者コメント

## CI への組み込み

`runner.ts` は不合格があれば exit code 1 を返すので、CI で使える:

```yaml
# .github/workflows/eval.yml
- name: Quality eval
  run: npx tsx packages/eval/runner.ts --fixtures normal
  env:
    ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
```

System プロンプトを変更する PR で自動実行すれば、
意図しないリグレッションを早期に検知できる。

## コスト目安

1ケースあたり:

- マラキ応答生成: 約 $0.012(Sonnet 4.5、キャッシュヒット時)
- Judge 評価: 約 $0.006(同モデル、システムプロンプト短い)
- 合計: 約 $0.018 (約2.7円)

5ケース実行で約 $0.10(15円)、CI 1回 = ペットボトル1本未満。

## 評価の限界

LLM-as-Judge は完璧ではない:

- **誤判定がある** — 微妙な表現を取り違える
- **同モデルでの自己評価バイアス** — Judge と被評価者が同じモデルだと評価が甘くなる傾向
- **絶対基準ではない** — 期待される特徴の言語化に依存する

対策:

- 重要な変更前は人間レビューも併用する
- 月1回程度、Judge を別モデル(Opus)に変えてクロスチェック
- 不合格ケースは必ず人間が応答全文を読んで判断する

## 拡張アイデア

- **A/Bテスト** — 2つの System プロンプトで同じフィクスチャを実行し、勝率を比較
- **時系列モニタリング** — レポートを日付別に蓄積してスコアの推移を可視化
- **カバレッジ拡張** — `test-fixtures.ts` に新しいシナリオを追加していく(月次10ケースずつなど)
