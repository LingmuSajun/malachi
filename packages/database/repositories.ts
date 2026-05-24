/**
 * DB アクセスの薄いラッパー
 *
 * Webhook ハンドラや鑑定フローから呼び出す。
 * エラーは throw して呼び出し元で処理する。
 */

import { db } from './client'
import type {
  ConversationRow,
  ReadingInsert,
  ReadingRow,
  SubscriptionRow,
  UserInsert,
  UserRow,
} from './types'

// ============================================================
// Users
// ============================================================

/** LINE ユーザーを upsert し、行を返す */
export async function upsertUser(input: UserInsert): Promise<UserRow> {
  const { data, error } = await db
    .from('users')
    .upsert(input, { onConflict: 'line_user_id', ignoreDuplicates: false })
    .select()
    .single()

  if (error) throw error
  return data
}

/** LINE user ID で検索 */
export async function findUserByLineId(lineUserId: string): Promise<UserRow | null> {
  const { data, error } = await db
    .from('users')
    .select()
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (error) throw error
  return data
}

/** 同意タイムスタンプを記録 */
export async function recordConsent(userId: string, type: 'terms' | 'privacy'): Promise<void> {
  const now = new Date().toISOString()
  const update = type === 'terms' ? { consent_terms_at: now } : { consent_privacy_at: now }
  const { error } = await db.from('users').update(update).eq('id', userId)
  if (error) throw error
}

// ============================================================
// Subscriptions
// ============================================================

/** ユーザーのサブスク状態を取得 */
export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await db
    .from('subscriptions')
    .select()
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/** 新規ユーザー作成時に free 行を挿入 */
export async function createFreeSubscription(userId: string): Promise<void> {
  const { error } = await db.from('subscriptions').insert({ user_id: userId })
  if (error) throw error
}

/** アクティブなサブスクか確認 */
export async function isSubscribed(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId)
  if (!sub) return false
  if (sub.status !== 'active') return false
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false
  return true
}

// ============================================================
// Conversations
// ============================================================

/** 新しい会話セッションを開始 */
export async function startConversation(userId: string): Promise<ConversationRow> {
  const { data, error } = await db
    .from('conversations')
    .insert({ user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

/** 最後のメッセージ時刻を更新 */
export async function touchConversation(conversationId: string): Promise<void> {
  const { error } = await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) throw error
}

// ============================================================
// Readings
// ============================================================

/** 鑑定結果を保存 */
export async function saveReading(input: ReadingInsert): Promise<ReadingRow> {
  const { data, error } = await db.from('readings').insert(input).select().single()
  if (error) throw error
  return data
}

/** ユーザーの直近 N 件の鑑定を取得(会話履歴の再構成に使用) */
export async function getRecentReadings(userId: string, limit = 10): Promise<ReadingRow[]> {
  const { data, error } = await db
    .from('readings')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/** 鑑定を ID で取得(所有者チェック込み) */
export async function getReadingById(id: string, userId: string): Promise<ReadingRow | null> {
  const { data, error } = await db
    .from('readings')
    .select()
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}
