import type { messagingApi } from '@line/bot-sdk'
import { getLineClient } from './client'

interface ReadingPushParams {
  lineUserId: string
  cardName: string
  cardImage: string
  orientation: 'upright' | 'reversed'
  text: string
  readingId?: string
}

function extractExcerpt(text: string, maxLen = 120): string {
  const first = text.split('\n\n')[0].trim()
  return first.length <= maxLen ? first : first.slice(0, maxLen) + '…'
}

export async function pushReadingResult({
  lineUserId,
  cardName,
  cardImage,
  orientation,
  text,
  readingId,
}: ReadingPushParams): Promise<void> {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '')
  const orientationLabel = orientation === 'upright' ? '正位置' : '逆位置'
  const excerpt = extractExcerpt(text)

  const header: messagingApi.FlexText = {
    type: 'text',
    text: '✦  マラキの導き  ✦',
    color: '#b89fd4',
    size: 'xs',
    align: 'center',
    weight: 'bold',
  }

  const cardLabel: messagingApi.FlexText = {
    type: 'text',
    text: `${cardName}　${orientationLabel}`,
    color: '#d4b4f0',
    size: 'sm',
    align: 'center',
    margin: 'md',
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

  const contents: messagingApi.FlexComponent[] = appUrl
    ? [
        header,
        {
          type: 'image',
          url: `${appUrl}/images/major-arcana/${cardImage}`,
          size: 'sm',
          align: 'center',
          margin: 'md',
          aspectRatio: '3:5',
          aspectMode: 'cover',
        } as messagingApi.FlexImage,
        cardLabel,
        separator,
        excerptText,
      ]
    : [header, cardLabel, separator, excerptText]

  const historyUrl = appUrl && readingId ? `${appUrl}/liff/history/${readingId}` : null

  await getLineClient().pushMessage({
    to: lineUserId,
    messages: [
      {
        type: 'flex',
        altText: `${cardName}（${orientationLabel}）の鑑定結果`,
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
