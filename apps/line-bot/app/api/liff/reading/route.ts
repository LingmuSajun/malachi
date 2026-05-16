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
import { unstable_after as after } from 'next/server'
import { verifyLiffAccessToken } from '../../../../lib/liff/verify'
import { pushReadingResult } from '../../../../lib/line/push'

const MAX_QUESTION_LEN = 500
const MAX_USERNAME_LEN = 50

export async function POST(req: Request) {
  let body: {
    lineUserId?: string
    liffAccessToken?: string
    userName?: string
    question?: string
    questionCategory?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { lineUserId, liffAccessToken, userName, question, questionCategory } = body
  if (!lineUserId || !liffAccessToken) {
    return Response.json({ error: 'lineUserId and liffAccessToken are required' }, { status: 400 })
  }

  // LIFFトークンをLINE APIで検証し、self-reportedのlineUserIdと照合
  const verifiedUserId = await verifyLiffAccessToken(liffAccessToken)
  if (verifiedUserId !== lineUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 入力長バリデーション
  if (question && question.length > MAX_QUESTION_LEN) {
    return Response.json({ error: 'question too long' }, { status: 400 })
  }
  if (userName && userName.length > MAX_USERNAME_LEN) {
    return Response.json({ error: 'userName too long' }, { status: 400 })
  }

  let user = await findUserByLineId(lineUserId)
  if (!user) {
    user = await upsertUser({ line_user_id: lineUserId })
    await createFreeSubscription(user.id)
  }

  const conversation = await startConversation(user.id)
  const [drawn] = drawCards(1)

  const resolvedQuestion = question?.trim() || '今の私へのメッセージを聞かせてください'

  const VALID_CATEGORIES = new Set(['love', 'relationships', 'self', 'work', 'decision'])
  const resolvedCategory =
    questionCategory && VALID_CATEGORIES.has(questionCategory)
      ? (questionCategory as 'love' | 'relationships' | 'self' | 'work' | 'decision')
      : undefined

  const result = await divine({
    userName: userName?.trim() || undefined,
    question: resolvedQuestion,
    questionCategory: resolvedCategory,
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

  // レスポンス返却後にLINEチャットへプッシュ通知
  // after() はレスポンス送信後もサーバーレス関数を生存させる Next.js 15 の仕組み
  after(() => {
    pushReadingResult({
      lineUserId,
      cardName: drawn.card.name,
      cardImage: drawn.card.image,
      orientation: drawn.orientation,
      text: result.text,
    }).catch((err) => console.error('[push] reading result failed:', err))
  })

  return Response.json({
    conversationId: conversation.id,
    cardSlug: drawn.card.slug,
    cardName: drawn.card.name,
    cardNameEn: drawn.card.name_en,
    cardImage: drawn.card.image,
    orientation: drawn.orientation,
    text: result.text,
  })
}
