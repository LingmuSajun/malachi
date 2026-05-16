import type { DrawnCardRecord } from '@malachi/database'
import {
  createFreeSubscription,
  findUserByLineId,
  saveReading,
  startConversation,
  touchConversation,
  upsertUser,
} from '@malachi/database'
import { divine } from '@malachi/prompt'
import { drawCards } from '@malachi/tarot'

export async function POST(req: Request) {
  let body: { lineUserId?: string; userName?: string; question?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { lineUserId, userName, question } = body
  if (!lineUserId) {
    return Response.json({ error: 'lineUserId is required' }, { status: 400 })
  }

  let user = await findUserByLineId(lineUserId)
  if (!user) {
    user = await upsertUser({ line_user_id: lineUserId })
    await createFreeSubscription(user.id)
  }

  const conversation = await startConversation(user.id)
  const [drawn] = drawCards(1)

  const resolvedQuestion = question?.trim() || '今の私へのメッセージを聞かせてください'

  const result = await divine({
    userName: userName?.trim() || undefined,
    question: resolvedQuestion,
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
    question: resolvedQuestion,
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

  return Response.json({
    cardSlug: drawn.card.slug,
    cardName: drawn.card.name,
    cardNameEn: drawn.card.name_en,
    cardImage: drawn.card.image,
    orientation: drawn.orientation,
    text: result.text,
  })
}
