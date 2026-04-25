# /test-prompt - マラキの応答をテスト

System プロンプトの動作確認や、新しい鑑定パターンの試験のためのコマンド。

## 動作

1. ユーザーから受け取った質問・カード指定で `divine()` を呼ぶ
2. 応答を表示する
3. 必要なら `judge()` で評価もする

## 使い方

```
/test-prompt
質問: 彼の本心が知りたい
カード: 月(逆位置)
カテゴリ: love
```

## 実装手順

1. `packages/malachi-prompt/divine.ts` の `divine()` を import
2. ユーザーから受け取った情報で `DivineRequest` を組み立てる
3. 実行し、応答テキストとメタ情報(トークン数、キャッシュヒット)を表示
4. 「評価する?」と聞き、yes なら `packages/eval/judge.ts` で評価

## 注意事項

- 必ず `.env.local` の `ANTHROPIC_API_KEY` を読み込む
- 危機キーワードを含む入力でテストする時は、`crisis-detector.ts` の動作確認も兼ねる
- 結果は `tmp/test-runs/` に時刻付きで保存しておくと、後で比較できる
