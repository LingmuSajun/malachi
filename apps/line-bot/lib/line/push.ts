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
  readingId?: string
}

/** スプレッド位置の日本語ラベル */
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

function extractExcerpt(text: string, maxLen = 120): string {
  const first = text.split('\n\n')[0].trim()
  return first.length <= maxLen ? first : first.slice(0, maxLen) + '…'
}

export async function pushReadingResult({
  lineUserId,
  cards,
  text,
  readingId,
}: ReadingPushParams): Promise<void> {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '')
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const excerpt = extractExcerpt(text)
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

  const separator: messagingApi.FlexSeparator = {
    type: 'separator',
    color: '#3d2060',
    margin: 'sm',
  }

  const excerptText: messagingApi.FlexText = {
    type: 'text',
    text: excerpt,
    color: '#e8d9c5',
    size: 'xs',
    wrap: true,
    margin: 'md',
  }

  // 単一カードのラベル(1枚引き)
  const singleCardLabel: messagingApi.FlexText = {
    type: 'text',
    text: `${cards[0].cardName}　${orientationLabelOf(cards[0].orientation)}`,
    color: '#d4b4f0',
    size: 'sm',
    align: 'center',
    margin: 'md',
  }

  // 3枚引き: カード画像を横並びにする box(位置ラベル + 画像 + カード名)
  const buildCardColumn = (card: PushCard): messagingApi.FlexBox => {
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

  const multiCardRow: messagingApi.FlexBox = {
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    spacing: 'sm',
    contents: cards.map(buildCardColumn),
  }

  let contents: messagingApi.FlexComponent[]
  if (isMultiCard) {
    contents = [header, multiCardRow, separator, excerptText]
  } else if (appUrl) {
    contents = [
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
      singleCardLabel,
      separator,
      excerptText,
    ]
  } else {
    contents = [header, singleCardLabel, separator, excerptText]
  }

  // 「鑑定を見返す」リンク。LIFF URL (liff.line.me) 経由にすることで LINE 内(LIFF)で開く。
  // APP_URL 直リンクだと LINE 外の外部ブラウザが起動してしまうため。
  let historyUrl: string | null = null
  if (readingId) {
    const historyPath = `/liff/history/${readingId}`
    if (liffId) {
      historyUrl = `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(historyPath)}`
    } else if (appUrl) {
      historyUrl = `${appUrl}${historyPath}`
    }
  }

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
            contents,
          },
          ...(historyUrl
            ? {
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#1a0e2e',
                  paddingAll: '12px',
                  paddingTop: '0px',
                  contents: [
                    {
                      type: 'button',
                      action: {
                        type: 'uri',
                        label: '鑑定を見返す',
                        uri: historyUrl,
                      } as messagingApi.URIAction,
                      style: 'secondary',
                      color: '#2d1a4a',
                      height: 'sm',
                    } as messagingApi.FlexButton,
                  ],
                } as messagingApi.FlexBox,
              }
            : {}),
        },
      },
    ],
  })
}
