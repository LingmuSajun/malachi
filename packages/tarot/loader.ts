import type { MajorArcanaData, TarotCard } from './types/card'
import rawData from './data/major-arcana.json'

const data = rawData as unknown as MajorArcanaData

export function loadMajorArcana(): MajorArcanaData {
  return data
}

export function getCardById(id: number): TarotCard {
  const card = data.cards.find((c) => c.id === id)
  if (!card) throw new Error(`Card not found: ${id}`)
  return card
}

export function getCardBySlug(slug: string): TarotCard {
  const card = data.cards.find((c) => c.slug === slug)
  if (!card) throw new Error(`Card not found: ${slug}`)
  return card
}

export function drawCards(
  count: number
): Array<{ card: TarotCard; orientation: 'upright' | 'reversed' }> {
  if (count > data.cards.length) {
    throw new Error(`Cannot draw ${count} cards from a deck of ${data.cards.length}`)
  }
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
