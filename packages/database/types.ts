/**
 * Supabase スキーマに対応する TypeScript 型定義
 * schema: packages/database/migrations/0001_initial_schema.sql
 */

// ============================================================
// Enum 型
// ============================================================

export type SubscriptionStatus = 'free' | 'active' | 'cancelled' | 'expired'
export type SubscriptionPlan = 'free' | 'standard'
export type QuestionContext = 'love' | 'relationships' | 'self' | 'work' | 'decision'
export type SpreadType = 'single' | 'two_card' | 'three_card'
export type CrisisLevel = 'none' | 'moderate' | 'severe'

/** readings.cards JSONB の要素 */
export type DrawnCardRecord = {
  card_id: number
  slug: string
  orientation: 'upright' | 'reversed'
  position: string | null
}

// ============================================================
// Table 型: Row / Insert / Update
// ============================================================

/** users - SELECT 結果 */
export type UserRow = {
  id: string
  line_user_id: string
  display_name: string | null
  picture_url: string | null
  consent_terms_at: string | null
  consent_privacy_at: string | null
  created_at: string
  updated_at: string
}

/** users - INSERT 時に必要なフィールド */
export type UserInsert = {
  id?: string
  line_user_id: string
  display_name?: string | null
  picture_url?: string | null
  consent_terms_at?: string | null
  consent_privacy_at?: string | null
}

/** users - UPDATE 可能なフィールド */
export type UserUpdate = Partial<
  Pick<UserRow, 'display_name' | 'picture_url' | 'consent_terms_at' | 'consent_privacy_at'>
>

// ------------------------------------------------------------

/** subscriptions - SELECT 結果 */
export type SubscriptionRow = {
  id: string
  user_id: string
  status: SubscriptionStatus
  plan: SubscriptionPlan
  started_at: string | null
  expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

/** subscriptions - UPDATE 可能なフィールド */
export type SubscriptionUpdate = Partial<
  Pick<
    SubscriptionRow,
    | 'status'
    | 'plan'
    | 'started_at'
    | 'expires_at'
    | 'stripe_customer_id'
    | 'stripe_subscription_id'
  >
>

// ------------------------------------------------------------

/** conversations - SELECT 結果 */
export type ConversationRow = {
  id: string
  user_id: string
  last_message_at: string
  created_at: string
}

/** conversations - INSERT 時に必要なフィールド */
export type ConversationInsert = {
  id?: string
  user_id: string
  last_message_at?: string
}

// ------------------------------------------------------------

/** readings - SELECT 結果 */
export type ReadingRow = {
  id: string
  conversation_id: string
  user_id: string
  question: string
  question_context: QuestionContext | null
  spread_type: SpreadType
  cards: DrawnCardRecord[]
  response_text: string
  crisis_level: CrisisLevel
  is_premium: boolean
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_creation_tokens: number | null
  created_at: string
}

/** readings - INSERT 時に必要なフィールド */
export type ReadingInsert = {
  id?: string
  conversation_id: string
  user_id: string
  question: string
  question_context?: QuestionContext | null
  spread_type?: SpreadType
  cards: DrawnCardRecord[]
  response_text: string
  crisis_level?: CrisisLevel
  is_premium?: boolean
  input_tokens?: number | null
  output_tokens?: number | null
  cache_read_tokens?: number | null
  cache_creation_tokens?: number | null
}

// ============================================================
// Supabase Database 型(supabase-js v2 の型引数に渡す)
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
        Relationships: []
      }
      subscriptions: {
        Row: SubscriptionRow
        Insert: { user_id: string }
        Update: SubscriptionUpdate
        Relationships: []
      }
      conversations: {
        Row: ConversationRow
        Insert: ConversationInsert
        Update: { last_message_at?: string }
        Relationships: []
      }
      readings: {
        Row: ReadingRow
        Insert: ReadingInsert
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_status: SubscriptionStatus
      subscription_plan: SubscriptionPlan
      question_context: QuestionContext
      spread_type: SpreadType
      crisis_level: CrisisLevel
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
