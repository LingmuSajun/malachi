#!/bin/bash
set -e

echo "=== Malachi セットアップ ==="

# node_modules ボリュームの権限修正
if [ -d node_modules ] && [ ! -w node_modules ]; then
  sudo chown node:node node_modules
fi

# 依存関係インストール
echo "[1/4] 依存関係インストール..."
pnpm install

# 環境変数ファイル
echo "[2/4] 環境変数ファイル確認..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  .env.local を作成しました。ANTHROPIC_API_KEY を設定してください。"
else
  echo "  .env.local は既に存在します。スキップ。"
fi

# タロット画像取得(未取得の場合のみ)
echo "[3/4] タロット画像確認..."
IMAGE_DIR="packages/tarot/images/major-arcana"
if [ ! -d "$IMAGE_DIR" ] || [ -z "$(ls -A "$IMAGE_DIR" 2>/dev/null)" ]; then
  echo "  画像を取得します..."
  pnpm tarot:download
  pnpm tarot:preprocess
else
  echo "  画像は既に存在します。スキップ。"
fi

# データ検証
echo "[4/4] タロットデータ検証..."
pnpm validate:tarot

echo ""
echo "=== セットアップ完了 ==="
echo "次のステップ: .env.local に ANTHROPIC_API_KEY を設定後、pnpm eval:normal で動作確認できます。"
