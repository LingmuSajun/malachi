import type { MessageEvent, TextEventMessage } from '@line/bot-sdk'
import { drawCards } from '@malachi/tarot'
import { divine } from '@malachi/prompt'
import { getLineClient } from '../line/client'
import {
  findUserByLineId,
  saveReading,
  startConversation,
  touchConversation,
  upsertUser,
  createFreeSubscription,
} from '@malachi/database'
import type { DrawnCardRecord } from '@malachi/database'

export async function handleMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') return

  const message = event.message as TextEventMessage
  const lineUserId = event.source.userId
  if (!lineUserId) return

  let user = await findUserByLineId(lineUserId)
  if (!user) {
    user = await upsertUser({ line_user_id: lineUserId })
    await createFreeSubscription(user.id)
  }

  const conversation = await startConversation(user.id)
  const [drawn] = drawCards(1)

  const result = await divine({
    userName: undefined,
    question: message.text,
    drawnCards: [{ card: drawn.card, orientation: drawn.orientation }],
    spread: 'single',
  })

  const cardRecord: DrawnCardRecord = {
    card_id: drawn.card.id,
    slug: drawn.card.slug,
    orientation: drawn.orientation,
    position: null,
  }

  await saveReading({
    conversation_id: conversation.id,
    user_id: user.id,
    question: message.text,
    spread_type: 'single',
    cards: [cardRecord],
    response_text: result.text,
    crisis_level: result.crisis.level,
    input_tokens: result.meta?.inputTokens ?? null,
    output_tokens: result.meta?.outputTokens ?? null,
    cache_read_tokens: result.meta?.cacheReadTokens ?? null,
    cache_creation_tokens: result.meta?.cacheCreationTokens ?? null,
  })

  await touchConversation(conversation.id)

  await getLineClient().replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: result.text }],
  })
}
