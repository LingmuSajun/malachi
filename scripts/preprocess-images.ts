/**
 * タロット画像前処理スクリプト
 *
 * Wikimedia からダウンロードした画像を LINE Flex Message 用に最適化する。
 *
 * - リサイズ: 幅 1024px(LINE Flex Message のhero推奨上限)
 * - フォーマット: JPEG 85% 品質(ファイルサイズと画質のバランス)
 * - 出力先: packages/tarot/images/major-arcana/optimized/
 *
 * 必要なパッケージ: pnpm add -D sharp
 * 実行: npx tsx scripts/preprocess-images.ts
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import sharp from 'sharp'

const INPUT_DIR = path.resolve(__dirname, '../packages/tarot/images/major-arcana')
const OUTPUT_DIR = path.resolve(__dirname, '../packages/tarot/images/major-arcana/optimized')

const TARGET_WIDTH = 1024
const JPEG_QUALITY = 85

async function processOne(inputPath: string, outputPath: string): Promise<void> {
  const filename = path.basename(inputPath)

  // 既に処理済みならスキップ
  try {
    await fs.access(outputPath)
    console.log(`⏭️  ${filename} already optimized, skipping`)
    return
  } catch {
    // 未処理、続ける
  }

  const inputBuffer = await fs.readFile(inputPath)
  const inputSize = inputBuffer.length

  const outputBuffer = await sharp(inputBuffer)
    .resize({
      width: TARGET_WIDTH,
      withoutEnlargement: true, // 元画像が小さければそのまま
      fit: 'inside',
    })
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toBuffer()

  await fs.writeFile(outputPath, outputBuffer)

  const outputSize = outputBuffer.length
  const reduction = (((inputSize - outputSize) / inputSize) * 100).toFixed(1)

  console.log(
    `✅ ${filename}: ${(inputSize / 1024).toFixed(0)} KB → ${(outputSize / 1024).toFixed(0)} KB (-${reduction}%)`
  )
}

async function main(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  // 入力ディレクトリの直下のJPEG/PNGのみを対象(optimizedサブディレクトリは除外)
  const allFiles = await fs.readdir(INPUT_DIR)
  const imageFiles = allFiles.filter(
    (f) => /\.(jpg|jpeg|png)$/i.test(f) && !f.includes('optimized')
  )

  if (imageFiles.length === 0) {
    console.error(`❌ No images found in ${INPUT_DIR}`)
    console.error(`先に npx tsx scripts/download-images.ts を実行してください`)
    process.exit(1)
  }

  console.log(`🎴 Processing ${imageFiles.length} images...`)
  console.log(`📐 Target width: ${TARGET_WIDTH}px, JPEG quality: ${JPEG_QUALITY}\n`)

  for (const file of imageFiles.sort()) {
    const inputPath = path.join(INPUT_DIR, file)
    const outputPath = path.join(OUTPUT_DIR, file)
    await processOne(inputPath, outputPath)
  }

  console.log(`\n🎉 All images optimized to ${OUTPUT_DIR}`)
  console.log(`次のステップ: 画像を Supabase Storage または Vercel Blob にアップロード`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
