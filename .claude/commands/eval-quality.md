# /eval-quality - 応答品質を自動評価

`packages/eval/runner.ts` を実行し、結果を解釈してユーザーに報告する。

## 使うタイミング

- System プロンプトを変更した後(リグレッションチェック)
- 新しいテストフィクスチャを追加した後
- 月次の品質レビュー
- リリース前の最終確認

## 動作

1. 評価対象を確認:
   - 全フィクスチャ(`--fixtures all`)
   - カテゴリ指定(normal / crisis / injection)

2. `npx tsx packages/eval/runner.ts` を実行

3. 出力される `eval-report.md` を読む

4. 結果をユーザーに報告:
   - 合格/不合格の数
   - 不合格ケースの理由
   - スコアの分布
   - 改善提案

## レポートの解釈

### 不合格ケースの分析方法

1. どの `expected_features` を満たしていないか
2. どの `expected_avoidance` を侵しているか
3. Judge の `notes` を読み、修正方針を立てる

### よくある不合格パターン

- **語り口の崩れ** — `voice.ts` のサンプルを増やす
- **問いの立て直し不足** — `principles.ts` の例を強化
- **不安を煽る表現** — `safety.ts` の禁止リストに追加
- **第三者断罪** — Few-shot 例を追加

### スコア分布の見方

- 全体平均 4.0 以上 → 健全
- 3.5 未満が出てくる → 体系的な問題、System プロンプト見直し
- 1〜2 のケース → 緊急度高、本番投入を停止

## CI 連携

GitHub Actions で PR 作成時に自動実行することを推奨。
詳細は `packages/eval/README.md` 参照。

## 記録

評価レポートは `tmp/eval-reports/YYYY-MM-DD.md` として日付別に保存し、
時系列での品質推移を追えるようにする。
