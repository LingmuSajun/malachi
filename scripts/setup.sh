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

# タロット画像確認 + 最適化(git 管理のため常に存在するはず)
echo "[3/4] タロット画像確認・最適化..."
IMAGE_DIR="packages/tarot/images/major-arcana"
IMAGE_COUNT=$(ls "$IMAGE_DIR"/*.jpg 2>/dev/null | wc -l)
if [ "$IMAGE_COUNT" -lt 22 ]; then
  echo "  警告: 画像が $IMAGE_COUNT 枚しか見つかりません(期待値: 22)。"
  echo "  git checkout packages/tarot/images/ を試してください。"
else
  echo "  画像 $IMAGE_COUNT 枚を確認。"
  OPTIMIZED_COUNT=$(ls "$IMAGE_DIR/optimized"/*.jpg 2>/dev/null | wc -l)
  if [ "$OPTIMIZED_COUNT" -lt 22 ]; then
    echo "  最適化済み画像が不足($OPTIMIZED_COUNT/22)。前処理を実行します..."
    pnpm tarot:preprocess
  else
    echo "  最適化済み画像 $OPTIMIZED_COUNT 枚を確認。スキップ。"
  fi
fi

# データ検証
echo "[4/4] タロットデータ検証..."
pnpm validate:tarot

echo ""
echo "=== セットアップ完了 ==="
echo "次のステップ: .env.local に ANTHROPIC_API_KEY を設定後、pnpm eval:normal で動作確認できます。"
