import type { DrawnCardRecord } from '@malachi/database'
import {
  createFreeSubscription,
  findUserByLineId,
  saveReading,
  startConversation,
  touchConversation,
  upsertUser,
} from '@malachi/database'
import { divineStart } from '@malachi/prompt'
import { drawCards } from '@malachi/tarot'
import { verifyLiffAccessToken } from '../../../../lib/liff/verify'
import { pushReadingResult } from '../../../../lib/line/push'

export const maxDuration = 60

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

  // LIFF トークン検証とカード抽選を並列実行
  const [verifiedUserId, [drawn]] = await Promise.all([
    verifyLiffAccessToken(liffAccessToken),
    Promise.resolve(drawCards(1)),
  ])

  if (verifiedUserId !== lineUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const resolvedQuestion = question?.trim() || '今の私へのメッセージを聞かせてください'

  const VALID_CATEGORIES = new Set(['love', 'relationships', 'self', 'work', 'decision'])
  const resolvedCategory =
    questionCategory && VALID_CATEGORIES.has(questionCategory)
      ? (questionCategory as 'love' | 'relationships' | 'self' | 'work' | 'decision')
      : undefined

  const startResult = await divineStart({
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

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  const initPayload = {
    type: 'init',
    conversationId: conversation.id,
    cardSlug: drawn.card.slug,
    cardName: drawn.card.name,
    cardNameEn: drawn.card.name_en,
    cardImage: drawn.card.image,
    orientation: drawn.orientation,
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, initPayload)

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

        const reading = await saveReading({
          conversation_id: conversation.id,
          user_id: user.id,
          question: resolvedQuestion,
          spread_type: 'single',
          cards: [cardRecord],
          response_text: fullText,
          crisis_level: startResult.crisis.level,
          input_tokens: inputTokens || null,
          output_tokens: outputTokens || null,
          cache_read_tokens: cacheReadTokens || null,
          cache_creation_tokens: cacheCreationTokens || null,
        })
        await touchConversation(conversation.id)

        pushReadingResult({
          lineUserId,
          cardName: drawn.card.name,
          cardImage: drawn.card.image,
          orientation: drawn.orientation,
          text: fullText,
          readingId: reading.id,
        }).catch((err) => console.error('[push] reading result failed:', err))

        send(controller, { type: 'done', readingId: reading.id })
      } catch (err) {
        console.error('[streaming] error:', err)
        try {
          send(controller, { type: 'error', message: '鑑定中にエラーが発生しました' })
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
