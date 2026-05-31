import type { DrawnCardRecord } from '@malachi/database'
import { findUserByLineId, getReadingById, getReadingsByConversationId } from '@malachi/database'
import { getCardBySlug } from '@malachi/tarot'
import { verifyLiffAccessToken } from '../../../../../lib/liff/verify'

export async function GET(req: Request, { params }: { params: Promise<{ reading_id: string }> }) {
  const { reading_id } = await params
  const { searchParams } = new URL(req.url)
  const lineUserId = searchParams.get('lineUserId')
  const liffAccessToken = searchParams.get('liffAccessToken')

  if (!lineUserId || !liffAccessToken) {
    return Response.json({ error: 'lineUserId and liffAccessToken are required' }, { status: 400 })
  }

  const verifiedUserId = await verifyLiffAccessToken(liffAccessToken)
  if (verifiedUserId !== lineUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await findUserByLineId(lineUserId)
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const reading = await getReadingById(reading_id, user.id)
  if (!reading) {
    return Response.json({ error: 'Reading not found' }, { status: 404 })
  }

  const cards = (reading.cards as DrawnCardRecord[]).map((c) => {
    try {
      const card = getCardBySlug(c.slug)
      return { ...c, cardName: card.name, cardImage: card.image }
    } catch {
      return { ...c, cardName: c.slug, cardImage: '' }
    }
  })

  const allReadings = await getReadingsByConversationId(reading.conversation_id, user.id)
  const followUps = allReadings
    .filter((r) => r.id !== reading.id)
    .map((r) => ({
      id: r.id,
      question: r.question,
      response_text: r.response_text,
      created_at: r.created_at,
    }))

  return Response.json({ ...reading, cards, followUps })
}
