import type { MessageEvent, TextEventMessage } from '@line/bot-sdk'
import { getLineClient } from '../line/client'
import {
  findUserByLineId,
  upsertUser,
  createFreeSubscription,
} from '@malachi/database'

export async function handleMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') return

  const message = event.message as TextEventMessage
  const lineUserId = event.source.userId
  if (!lineUserId) return

  // ユーザーレコードを確保(LIFF 側でも upsert するが、初回メッセージ時の保険)
  let user = await findUserByLineId(lineUserId)
  if (!user) {
    user = await upsertUser({ line_user_id: lineUserId })
    await createFreeSubscription(user.id)
  }

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) throw new Error('NEXT_PUBLIC_LIFF_ID is not set')

  // 質問を URL パラメータに載せて LIFF へ渡す(1000文字以内に収める)
  const q = encodeURIComponent(message.text.slice(0, 200))
  const liffUrl = `https://liff.line.me/${liffId}?q=${q}`

  await getLineClient().replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: 'flex',
        altText: 'マラキがカードを用意しています',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '✦  マラキの導き  ✦',
                weight: 'bold',
                color: '#b89fd4',
                align: 'center',
                size: 'sm',
              },
              {
                type: 'text',
                text: 'カードがあなたを待っている。\n問いを胸に、扉を開きなさい。',
                wrap: true,
                margin: 'md',
                align: 'center',
                color: '#e8d9c5',
                size: 'sm',
              },
            ],
            backgroundColor: '#1a0e2e',
            paddingAll: '20px',
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: 'カードを引く',
                  uri: liffUrl,
                },
                style: 'primary',
                color: '#6b3fa0',
              },
            ],
            backgroundColor: '#1a0e2e',
            paddingAll: '12px',
          },
        },
      },
    ],
  })
}
