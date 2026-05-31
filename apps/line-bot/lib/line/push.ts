import type { messagingApi } from '@line/bot-sdk'
import { getLineClient } from './client'

interface PushCard {
  cardName: string
  cardImage: string
  orientation: 'upright' | 'reversed'
  position?: string | null
}

interface ReadingPushParams {
  lineUserId: string
  cards: PushCard[]
  text: string
}

const POSITION_LABELS: Record<string, string> = {
  past: '過去',
  present: '現在',
  future: '未来',
  self_mind: '自分の気持ち',
  other_mind: '相手の気持ち',
}

function orientationLabelOf(orientation: 'upright' | 'reversed'): string {
  return orientation === 'upright' ? '正位置' : '逆位置'
}

function buildCardLabel(cards: PushCard[]): string {
  if (cards.length === 1) {
    return `${cards[0].cardName}（${orientationLabelOf(cards[0].orientation)}）`
  }
  return cards
    .map((c) => {
      const pos = c.position ? (POSITION_LABELS[c.position] ?? '') : ''
      return `${pos ? `${pos}: ` : ''}${c.cardName}（${orientationLabelOf(c.orientation)}）`
    })
    .join('\n')
}

const buildCardColumn = (card: PushCard, appUrl: string | undefined): messagingApi.FlexBox => {
  const posLabel = card.position ? (POSITION_LABELS[card.position] ?? '') : ''
  const columnContents: messagingApi.FlexComponent[] = []
  if (posLabel) {
    columnContents.push({
      type: 'text',
      text: posLabel,
      color: '#b89fd4',
      size: 'xxs',
      align: 'center',
    })
  }
  if (appUrl) {
    columnContents.push({
      type: 'image',
      url: `${appUrl}/images/major-arcana/${card.cardImage}`,
      size: 'full',
      aspectRatio: '3:5',
      aspectMode: 'cover',
      margin: 'xs',
    } as messagingApi.FlexImage)
  }
  columnContents.push({
    type: 'text',
    text: card.cardName,
    color: '#d4b4f0',
    size: 'xxs',
    align: 'center',
    wrap: true,
    margin: 'xs',
  })
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    spacing: 'none',
    contents: columnContents,
  }
}

export async function pushReadingResult({
  lineUserId,
  cards,
  text,
}: ReadingPushParams): Promise<void> {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '')
  const isMultiCard = cards.length > 1
  const altCardName = cards.map((c) => c.cardName).join('・')

  const header: messagingApi.FlexText = {
    type: 'text',
    text: '✦  マラキの導き  ✦',
    color: '#b89fd4',
    size: 'xs',
    align: 'center',
    weight: 'bold',
  }

  let flexBodyContents: messagingApi.FlexComponent[]
  if (isMultiCard) {
    flexBodyContents = [
      header,
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        spacing: 'sm',
        contents: cards.map((c) => buildCardColumn(c, appUrl)),
      } as messagingApi.FlexBox,
    ]
  } else if (appUrl) {
    flexBodyContents = [
      header,
      {
        type: 'image',
        url: `${appUrl}/images/major-arcana/${cards[0].cardImage}`,
        size: 'sm',
        align: 'center',
        margin: 'md',
        aspectRatio: '3:5',
        aspectMode: 'cover',
      } as messagingApi.FlexImage,
      {
        type: 'text',
        text: `${cards[0].cardName}　${orientationLabelOf(cards[0].orientation)}`,
        color: '#d4b4f0',
        size: 'sm',
        align: 'center',
        margin: 'md',
      } as messagingApi.FlexText,
    ]
  } else {
    flexBodyContents = [
      header,
      {
        type: 'text',
        text: `${cards[0].cardName}　${orientationLabelOf(cards[0].orientation)}`,
        color: '#d4b4f0',
        size: 'sm',
        align: 'center',
        margin: 'md',
      } as messagingApi.FlexText,
    ]
  }

  const cardLabel = buildCardLabel(cards)
  const textBody = `✦ マラキの導き ✦\n\n${cardLabel}\n\n${text}`

  await getLineClient().pushMessage({
    to: lineUserId,
    messages: [
      {
        type: 'flex',
        altText: `${altCardName}の鑑定結果`,
        contents: {
          type: 'bubble',
          size: 'kilo',
          body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#1a0e2e',
            paddingAll: '20px',
            contents: flexBodyContents,
          },
        },
      },
      {
        type: 'text',
        text: textBody,
      },
    ],
  })
}
