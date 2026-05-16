import type { DrawnCardRecord } from '@malachi/database'
import { findUserByLineId, saveReading, touchConversation } from '@malachi/database'
import { divine } from '@malachi/prompt'
import { getCardBySlug } from '@malachi/tarot'
import { verifyLiffAccessToken } from '../../../../lib/liff/verify'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MAX_QUESTION_LEN = 500
const MAX_USERNAME_LEN = 50
const MAX_HISTORY_MESSAGES = 20
const MAX_HISTORY_MSG_LEN = 2000
const VALID_ORIENTATIONS = new Set(['upright', 'reversed'])

export async function POST(req: Request) {
  let body: {
    lineUserId?: string
    liffAccessToken?: string
    userName?: string
    followUpQuestion?: string
    cardSlug?: string
    orientation?: 'upright' | 'reversed'
    conversationId?: string
    conversationHistory?: ChatMessage[]
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    lineUserId,
    liffAccessToken,
    userName,
    followUpQuestion,
    cardSlug,
    orientation,
    conversationId,
    conversationHistory,
  } = body

  if (
    !lineUserId ||
    !liffAccessToken ||
    !followUpQuestion ||
    !cardSlug ||
    !orientation ||
    !conversationId
  ) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // LIFFトークン検証
  const verifiedUserId = await verifyLiffAccessToken(liffAccessToken)
  if (verifiedUserId !== lineUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 入力長バリデーション
  if (followUpQuestion.length > MAX_QUESTION_LEN) {
    return Response.json({ error: 'followUpQuestion too long' }, { status: 400 })
  }
  if (userName && userName.length > MAX_USERNAME_LEN) {
    return Response.json({ error: 'userName too long' }, { status: 400 })
  }

  // orientation の実行時チェック
  if (!VALID_ORIENTATIONS.has(orientation)) {
    return Response.json({ error: 'Invalid orientation' }, { status: 400 })
  }

  // conversationHistory のサイズ制限
  if (conversationHistory !== undefined) {
    if (!Array.isArray(conversationHistory) || conversationHistory.length > MAX_HISTORY_MESSAGES) {
      return Response.json({ error: 'conversationHistory too long' }, { status: 400 })
    }
    for (const msg of conversationHistory) {
      if ((msg.role !== 'user' && msg.role !== 'assistant') || typeof msg.content !== 'string') {
        return Response.json({ error: 'Invalid conversationHistory format' }, { status: 400 })
      }
      if (msg.content.length > MAX_HISTORY_MSG_LEN) {
        return Response.json({ error: 'conversationHistory message too long' }, { status: 400 })
      }
    }
  }

  const user = await findUserByLineId(lineUserId)
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  // cardSlug の存在チェック
  let card
  try {
    card = getCardBySlug(cardSlug)
  } catch {
    return Response.json({ error: 'Invalid cardSlug' }, { status: 400 })
  }

  const resolvedQuestion = followUpQuestion.trim()

  const result = await divine({
    userName: userName?.trim() || undefined,
    question: resolvedQuestion,
    drawnCards: [{ card, orientation }],
    spread: 'single',
    conversationHistory: conversationHistory ?? [],
  })

  const cardRecord: DrawnCardRecord = {
    card_id: card.id,
    slug: card.slug,
    orientation,
    position: null,
  }

  await saveReading({
    conversation_id: conversationId,
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

  await touchConversation(conversationId)

  return Response.json({ text: result.text })
}
