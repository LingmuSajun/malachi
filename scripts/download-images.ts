/**
 * Rider-Waite Tarot 大アルカナ画像ダウンロードスクリプト
 *
 * Wikimedia Commons からパブリックドメインの1909年版ライダー版タロット画像を取得する。
 *
 * 著作権:
 * - 作画 Pamela Colman Smith (1878-1951)
 * - 米国・日本ともに著作者の死後70年経過済みでパブリックドメイン化
 * - U.S. Games Systems社の再販版とは異なるオリジナル1909年版を使用
 *
 * 実行: npx tsx scripts/download-images.ts
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

interface CardImageMeta {
  id: number
  slug: string
  wikimediaFile: string
}

// ファイル名は Wikimedia Commons の標準ファイル名(2024年時点)
// 変更されている場合は手動で確認すること
const MAJOR_ARCANA: CardImageMeta[] = [
  { id: 0, slug: 'fool', wikimediaFile: 'RWS_Tarot_00_Fool.jpg' },
  { id: 1, slug: 'magician', wikimediaFile: 'RWS_Tarot_01_Magician.jpg' },
  { id: 2, slug: 'high-priestess', wikimediaFile: 'RWS_Tarot_02_High_Priestess.jpg' },
  { id: 3, slug: 'empress', wikimediaFile: 'RWS_Tarot_03_Empress.jpg' },
  { id: 4, slug: 'emperor', wikimediaFile: 'RWS_Tarot_04_Emperor.jpg' },
  { id: 5, slug: 'hierophant', wikimediaFile: 'RWS_Tarot_05_Hierophant.jpg' },
  { id: 6, slug: 'lovers', wikimediaFile: 'RWS_Tarot_06_Lovers.jpg' },
  { id: 7, slug: 'chariot', wikimediaFile: 'RWS_Tarot_07_Chariot.jpg' },
  { id: 8, slug: 'strength', wikimediaFile: 'RWS_Tarot_08_Strength.jpg' },
  { id: 9, slug: 'hermit', wikimediaFile: 'RWS_Tarot_09_Hermit.jpg' },
  { id: 10, slug: 'wheel-of-fortune', wikimediaFile: 'RWS_Tarot_10_Wheel_of_Fortune.jpg' },
  { id: 11, slug: 'justice', wikimediaFile: 'RWS_Tarot_11_Justice.jpg' },
  { id: 12, slug: 'hanged-man', wikimediaFile: 'RWS_Tarot_12_Hanged_Man.jpg' },
  { id: 13, slug: 'death', wikimediaFile: 'RWS_Tarot_13_Death.jpg' },
  { id: 14, slug: 'temperance', wikimediaFile: 'RWS_Tarot_14_Temperance.jpg' },
  { id: 15, slug: 'devil', wikimediaFile: 'RWS_Tarot_15_Devil.jpg' },
  { id: 16, slug: 'tower', wikimediaFile: 'RWS_Tarot_16_Tower.jpg' },
  { id: 17, slug: 'star', wikimediaFile: 'RWS_Tarot_17_Star.jpg' },
  { id: 18, slug: 'moon', wikimediaFile: 'RWS_Tarot_18_Moon.jpg' },
  { id: 19, slug: 'sun', wikimediaFile: 'RWS_Tarot_19_Sun.jpg' },
  { id: 20, slug: 'judgement', wikimediaFile: 'RWS_Tarot_20_Judgement.jpg' },
  { id: 21, slug: 'world', wikimediaFile: 'RWS_Tarot_21_World.jpg' },
]

const OUTPUT_DIR = path.resolve(__dirname, '../packages/tarot/images/major-arcana')

/**
 * Wikimedia の Special:FilePath は最新のファイルURLにリダイレクトする。
 * これを使うとハッシュベースのCDN URLを直接知らなくても取得できる。
 */
function buildWikimediaUrl(filename: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`
}

async function downloadOne(card: CardImageMeta): Promise<void> {
  const url = buildWikimediaUrl(card.wikimediaFile)
  const fileNumber = String(card.id).padStart(2, '0')
  const outputPath = path.join(OUTPUT_DIR, `${fileNumber}-${card.slug}.jpg`)

  // 既に存在すればスキップ(冪等性)
  try {
    await fs.access(outputPath)
    console.log(`⏭️  ${fileNumber}-${card.slug}.jpg already exists, skipping`)
    return
  } catch {
    // ファイルがない、ダウンロードに進む
  }

  console.log(`⬇️  Downloading ${card.wikimediaFile}...`)

  const response = await fetch(url, {
    headers: {
      // Wikimedia は User-Agent を要求する
      'User-Agent': 'Malachi-Tarot-Bot/1.0 (https://malachi.example.com; contact@example.com)',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(outputPath, buffer)

  console.log(`✅ Saved ${fileNumber}-${card.slug}.jpg (${(buffer.length / 1024).toFixed(1)} KB)`)
}

async function main(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  console.log(`📂 Output directory: ${OUTPUT_DIR}`)
  console.log(`🎴 Downloading ${MAJOR_ARCANA.length} cards from Wikimedia Commons...\n`)

  // 並列度を絞る(Wikimedia への礼儀として)
  const CONCURRENCY = 3
  for (let i = 0; i < MAJOR_ARCANA.length; i += CONCURRENCY) {
    const batch = MAJOR_ARCANA.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(downloadOne))
  }

  console.log(`\n🎉 All cards downloaded to ${OUTPUT_DIR}`)
  console.log(`次のステップ: npx tsx scripts/preprocess-images.ts`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
