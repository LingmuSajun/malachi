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

# タロット画像確認(git 管理)
echo "[3/4] タロット画像確認..."
IMAGE_COUNT=$(ls packages/tarot/images/major-arcana/*.jpg 2>/dev/null | wc -l)
OPTIMIZED_COUNT=$(ls packages/tarot/images/major-arcana/optimized/*.jpg 2>/dev/null | wc -l)
if [ "$IMAGE_COUNT" -lt 22 ] || [ "$OPTIMIZED_COUNT" -lt 22 ]; then
  echo "  警告: 画像が不足しています(元画像: $IMAGE_COUNT/22, 最適化済み: $OPTIMIZED_COUNT/22)。"
  echo "  git checkout packages/tarot/images/ を試してください。"
else
  echo "  元画像 $IMAGE_COUNT 枚、最適化済み $OPTIMIZED_COUNT 枚を確認。"
fi

# データ検証
echo "[4/4] タロットデータ検証..."
pnpm validate:tarot

echo ""
echo "=== セットアップ完了 ==="
echo "次のステップ: .env.local に ANTHROPIC_API_KEY を設定後、pnpm eval:normal で動作確認できます。"
