import type { WebhookEvent } from '@line/bot-sdk'
import { verifyLineSignature } from '../../../../lib/line/signature'
import { handleFollow } from '../../../../lib/handlers/follow'
import { handleMessage } from '../../../../lib/handlers/message'

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? ''

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  if (!verifyLineSignature(rawBody, signature, CHANNEL_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { events } = JSON.parse(rawBody) as { events: WebhookEvent[] }

  try {
    await Promise.all(events.map(dispatch))
  } catch (err) {
    console.error('[webhook] error', err)
  }

  return new Response('OK', { status: 200 })
}

async function dispatch(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case 'follow':
      await handleFollow(event)
      break
    case 'message':
      await handleMessage(event)
      break
    case 'unfollow':
      break
    default:
      break
  }
}
