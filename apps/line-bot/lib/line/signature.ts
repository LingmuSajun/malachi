import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * LINE Webhook の署名を検証する。
 * タイミング攻撃を防ぐため timingSafeEqual を使用。
 *
 * @see https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#signature-validation
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string
): boolean {
  if (!signature) return false

  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64')

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
