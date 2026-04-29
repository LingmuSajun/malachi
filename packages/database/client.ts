/**
 * Supabase クライアント(サーバーサイド専用)
 *
 * サービスロールキーを使用するため、必ずサーバーサイドのみで import すること。
 * クライアントサイド(LIFF 等)からは anon キーを用いた別クライアントを作成すること。
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

let _db: ReturnType<typeof createClient<Database>> | null = null

export function getDb(): ReturnType<typeof createClient<Database>> {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
    }
    _db = createClient<Database>(url, key, { auth: { persistSession: false } })
  }
  return _db
}

/** 後方互換エイリアス */
export const db = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})
