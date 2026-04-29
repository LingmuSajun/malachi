import type { FollowEvent } from '@line/bot-sdk'
import { getLineClient } from '../line/client'
import { createFreeSubscription, findUserByLineId, upsertUser } from '@malachi/database'

/**
 * 友だち追加イベント
 * - ユーザーを DB に登録(初回のみ)
 * - 無料サブスクリプション行を作成
 * - ウェルカムメッセージを送信
 */
export async function handleFollow(event: FollowEvent): Promise<void> {
  const lineUserId = event.source.userId
  if (!lineUserId) return

  // LINE プロフィールを取得してユーザー登録
  let displayName: string | undefined
  try {
    const profile = await getLineClient().getProfile(lineUserId)
    displayName = profile.displayName
  } catch {
    // プロフィール取得失敗は無視してユーザー登録を続行
  }

  const existing = await findUserByLineId(lineUserId)
  if (!existing) {
    const user = await upsertUser({ line_user_id: lineUserId, display_name: displayName ?? null })
    await createFreeSubscription(user.id)
  }

  await getLineClient().replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: 'text',
        text:
          `${displayName ? `${displayName}さん、` : ''}はじめまして。\n\n` +
          `私はタロット占い師のマラキ。\n` +
          `恋愛、人間関係、自分自身のことについて、カードが語る言葉をお届けします。\n\n` +
          `あなたが今、心に抱えていることを、言葉にして送ってください。`,
      },
    ],
  })
}
