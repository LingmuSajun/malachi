import type { DrawnCardRecord } from '@malachi/database'
import { findUserByLineId, saveReading, touchConversation } from '@malachi/database'
import { divineStart } from '@malachi/prompt'
import { getCardBySlug } from '@malachi/tarot'
import { verifyLiffAccessToken } from '../../../../lib/liff/verify'

export const maxDuration = 60

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MAX_QUESTION_LEN = 500
const MAX_USERNAME_LEN = 50
const MAX_HISTORY_MESSAGES = 20
const MAX_HISTORY_MSG_LEN = 2000
const VALID_ORIENTATIONS = new Set(['upright', 'reversed'])

export async function POST(req: Request) {
  type CardInput = { slug?: string; orientation?: 'upright' | 'reversed'; position?: string | null }
  let body: {
    lineUserId?: string
    liffAccessToken?: string
    userName?: string
    followUpQuestion?: string
    cardSlug?: string
    orientation?: 'upright' | 'reversed'
    cards?: CardInput[]
    spread?: string
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
    cards,
    spread,
    conversationId,
    conversationHistory,
  } = body

  // カード情報を正規化: cards 配列があればそれを、なければ単一フィールドを 1要素配列に(後方互換)
  const cardInputs: CardInput[] =
    Array.isArray(cards) && cards.length > 0
      ? cards
      : cardSlug && orientation
        ? [{ slug: cardSlug, orientation, position: null }]
        : []

  if (
    !lineUserId ||
    !liffAccessToken ||
    !followUpQuestion ||
    cardInputs.length === 0 ||
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

  const MAX_CARDS = 3
  if (cardInputs.length > MAX_CARDS) {
    return Response.json({ error: 'too many cards' }, { status: 400 })
  }
  for (const c of cardInputs) {
    if (!c.slug || !c.orientation || !VALID_ORIENTATIONS.has(c.orientation)) {
      return Response.json({ error: 'Invalid card' }, { status: 400 })
    }
  }

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

  let resolvedCards
  try {
    resolvedCards = cardInputs.map((c) => ({
      card: getCardBySlug(c.slug!),
      orientation: c.orientation!,
      position: c.position ?? undefined,
    }))
  } catch {
    return Response.json({ error: 'Invalid cardSlug' }, { status: 400 })
  }

  const isThreeCard = spread === 'three' || resolvedCards.length > 1

  const resolvedQuestion = followUpQuestion.trim()

  const startResult = await divineStart({
    userName: userName?.trim() || undefined,
    question: resolvedQuestion,
    drawnCards: resolvedCards,
    spread: isThreeCard ? 'three-card' : 'single',
    conversationHistory: conversationHistory ?? [],
  })

  const cardRecords: DrawnCardRecord[] = resolvedCards.map((d) => ({
    card_id: d.card.id,
    slug: d.card.slug,
    orientation: d.orientation,
    position: d.position ?? null,
  }))

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = ''
        let inputTokens = 0
        let outputTokens = 0
        let cacheReadTokens = 0
        let cacheCreationTokens = 0

        if (startResult.kind === 'crisis') {
          fullText = startResult.text
          send(controller, { type: 'text', chunk: fullText })
        } else {
          for await (const event of startResult.stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              send(controller, { type: 'text', chunk: event.delta.text })
            } else if (event.type === 'message_start') {
              const u = event.message.usage as unknown as Record<string, number>
              inputTokens = u['input_tokens'] ?? 0
              cacheReadTokens = u['cache_read_input_tokens'] ?? 0
              cacheCreationTokens = u['cache_creation_input_tokens'] ?? 0
            } else if (event.type === 'message_delta') {
              const u = (event as unknown as { usage: Record<string, number> }).usage
              outputTokens = u?.['output_tokens'] ?? 0
            }
          }
        }

        await saveReading({
          conversation_id: conversationId,
          user_id: user.id,
          question: resolvedQuestion,
          spread_type: isThreeCard ? 'three_card' : 'single',
          cards: cardRecords,
          response_text: fullText,
          crisis_level: startResult.crisis.level,
          input_tokens: inputTokens || null,
          output_tokens: outputTokens || null,
          cache_read_tokens: cacheReadTokens || null,
          cache_creation_tokens: cacheCreationTokens || null,
        })
        await touchConversation(conversationId)

        send(controller, { type: 'done' })
      } catch (err) {
        console.error('[followup streaming] error:', err)
        try {
          send(controller, { type: 'error', message: '応答の取得に失敗しました' })
        } catch {}
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
