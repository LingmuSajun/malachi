/**
 * 大アルカナデータ ローダー
 *
 * yaml ファイルを読み込み、TarotCard の配列として返す。
 * Next.js の Server Component / Route Handler / Edge Function で使用する想定。
 *
 * 必要パッケージ: pnpm add js-yaml && pnpm add -D @types/js-yaml
 */

import yaml from 'js-yaml'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { MajorArcanaData, TarotCard } from './types/card'

const DATA_PATH = path.resolve(__dirname, 'data/major-arcana.yaml')

let cachedData: MajorArcanaData | null = null

/**
 * yamlファイルを読み込み、メモリにキャッシュする。
 * サーバー起動時に1回だけ読まれる想定。
 */
export function loadMajorArcana(): MajorArcanaData {
  if (cachedData) return cachedData

  const fileContents = fs.readFileSync(DATA_PATH, 'utf-8')
  const parsed = yaml.load(fileContents) as MajorArcanaData

  // 軽い検証
  if (!parsed.cards || parsed.cards.length !== 22) {
    throw new Error(`Expected 22 major arcana cards, got ${parsed.cards?.length ?? 0}`)
  }

  for (const card of parsed.cards) {
    if (typeof card.id !== 'number' || card.id < 0 || card.id > 21) {
      throw new Error(`Invalid card id: ${card.id}`)
    }
    if (!card.slug || !card.name || !card.name_en) {
      throw new Error(`Card ${card.id} missing required fields`)
    }
  }

  cachedData = parsed
  return parsed
}

/**
 * IDからカードを取得
 */
export function getCardById(id: number): TarotCard {
  const data = loadMajorArcana()
  const card = data.cards.find((c) => c.id === id)
  if (!card) {
    throw new Error(`Card not found: ${id}`)
  }
  return card
}

/**
 * スラグからカードを取得
 */
export function getCardBySlug(slug: string): TarotCard {
  const data = loadMajorArcana()
  const card = data.cards.find((c) => c.slug === slug)
  if (!card) {
    throw new Error(`Card not found: ${slug}`)
  }
  return card
}

/**
 * ランダムにN枚のカードを引く(重複なし)
 * @param count 引く枚数
 * @returns カードと正逆位置のペアの配列
 */
export function drawCards(
  count: number
): Array<{ card: TarotCard; orientation: 'upright' | 'reversed' }> {
  const data = loadMajorArcana()
  if (count > data.cards.length) {
    throw new Error(`Cannot draw ${count} cards from a deck of ${data.cards.length}`)
  }

  // Fisher-Yates shuffle
  const shuffled = [...data.cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count).map((card) => ({
    card,
    orientation: Math.random() < 0.5 ? 'upright' : 'reversed',
  }))
}
