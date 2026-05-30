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
    spread?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { lineUserId, liffAccessToken, userName, question, questionCategory, spread } = body
  if (!lineUserId || !liffAccessToken) {
    return Response.json({ error: 'lineUserId and liffAccessToken are required' }, { status: 400 })
  }

  // スプレッド種別。未指定や不正値は 1枚引き(後方互換)
  const isThreeCard = spread === 'three'
  const cardCount = isThreeCard ? 3 : 1
  // 3枚引きの位置(過去 / 現在 / 未来)
  const POSITIONS = ['past', 'present', 'future'] as const

  // LIFF トークン検証とカード抽選を並列実行
  const [verifiedUserId, drawnCards] = await Promise.all([
    verifyLiffAccessToken(liffAccessToken),
    Promise.resolve(drawCards(cardCount)),
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

  // 各カードに位置を割り当てる(1枚引きは位置なし)
  const positionedCards = drawnCards.map((d, i) => ({
    card: d.card,
    orientation: d.orientation,
    position: isThreeCard ? POSITIONS[i] : undefined,
  }))

  const startResult = await divineStart(
    {
      userName: userName?.trim() || undefined,
      question: resolvedQuestion,
      questionCategory: resolvedCategory,
      drawnCards: positionedCards,
      spread: isThreeCard ? 'three-card' : 'single',
    },
    // 3枚引きは物語が長くなるため出力上限を引き上げる
    isThreeCard ? { maxTokens: 1500 } : {}
  )

  const cardRecords: DrawnCardRecord[] = positionedCards.map((d) => ({
    card_id: d.card.id,
    slug: d.card.slug,
    orientation: d.orientation,
    position: d.position ?? null,
  }))

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // init イベント: cards 配列を主とする。1枚引きは後方互換のため単一フィールドも併送。
  const initCards = positionedCards.map((d) => ({
    cardSlug: d.card.slug,
    cardName: d.card.name,
    cardNameEn: d.card.name_en,
    cardImage: d.card.image,
    orientation: d.orientation,
    position: d.position ?? null,
  }))

  const firstCard = positionedCards[0]
  const initPayload = {
    type: 'init',
    conversationId: conversation.id,
    spread: isThreeCard ? 'three' : 'single',
    cards: initCards,
    // --- 後方互換(1枚引きの旧フロント向け) ---
    cardSlug: firstCard.card.slug,
    cardName: firstCard.card.name,
    cardNameEn: firstCard.card.name_en,
    cardImage: firstCard.card.image,
    orientation: firstCard.orientation,
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
          spread_type: isThreeCard ? 'three_card' : 'single',
          cards: cardRecords,
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
          cards: positionedCards.map((d) => ({
            cardName: d.card.name,
            cardImage: d.card.image,
            orientation: d.orientation,
            position: d.position ?? null,
          })),
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
