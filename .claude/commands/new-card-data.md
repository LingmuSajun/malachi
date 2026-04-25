# /new-card-data - 新しいカードのデータを生成

タロットカードの意味データ(yaml)を、既存のフォーマットに沿って生成する。

## 使うタイミング

- 小アルカナ56枚を追加する時(Phase 2)
- マラキ専用のオラクルカードを設計する時
- 既存カードの解釈を更新する時

## 動作

1. カードの基本情報をユーザーから受け取る:
   - カード名(日本語・英語)
   - 大アルカナ/小アルカナ/オラクル
   - 元素・惑星(該当すれば)
   - 伝統的な象徴のキーワード3〜5個

2. `tarot-meaning` skill を読み、伝統的解釈を参照

3. `malachi-voice` skill を読み、voice_hint を作る時のトーンを統一

4. 5つの質問カテゴリすべてに、正位置・逆位置の解釈を書く:
   - love, relationships, self, work, decision

5. positions(過去/現在/未来)のヒントを書く

6. voice_hint を、マラキの語り口で1〜3文で書く

7. `packages/tarot/data/major-arcana.yaml` または該当するファイルに追記

## 品質チェック

書いた後で以下を確認:

- [ ] 全 5カテゴリに upright/reversed の両方を書いたか
- [ ] 「絶対に〜」のような断定表現を使っていないか
- [ ] 30代女性の恋愛悩みに刺さる解釈になっているか
- [ ] voice_hint がマラキの世界観と一貫しているか
- [ ] yaml として valid か(`python3 -c "import yaml; yaml.safe_load(open('...'))"`)

## 既存データを変更する時の注意

- 変更前に該当カードの旧データをコメントとしてバックアップ
- 変更理由を `docs/design/card-changes.md` に記録
- `packages/eval/runner.ts` で関連するフィクスチャを再評価して退行(regression)がないか確認
