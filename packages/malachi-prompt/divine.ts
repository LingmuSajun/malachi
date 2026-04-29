/**
 * 鑑定実行のメイン関数
 *
 * 危機検知 → System プロンプト構築 → カードコンテキスト構築
 *  → Anthropic API 呼び出し → 応答テキスト返却 までを行う。
 *
 * 必要パッケージ: pnpm add @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'
import { aiCrisisCheck } from './ai-crisis-check'
import { buildMessages, type DivineRequest } from './card-context'
import {
  detectCrisis,
  getSevereResponseTemplate,
  type CrisisAssessment,
  type CrisisLevel,
} from './crisis-detector'
import { buildSystemMessages } from './system-prompt'

export interface DivineResponse {
  /** マラキの応答テキスト */
  text: string
  /** 応答が AI生成 か、危機対応の固定文か */
  source: 'ai' | 'crisis_template'
  /** 危機判定結果 */
  crisis: CrisisAssessment
  /** API のメタデータ(AI 生成時のみ) */
  meta?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheCreationTokens: number
    model: string
  }
}

export interface DivineOptions {
  /** 使用するモデル(デフォルト: Sonnet 4.6) */
  model?: string
  /** 最大出力トークン数(デフォルト: 1024) */
  maxTokens?: number
  /** Anthropic クライアント(テスト用に注入可能) */
  client?: Anthropic
}

const LEVEL_ORDER: Record<CrisisLevel, number> = { none: 0, moderate: 1, severe: 2 }

/** 正規表現判定と AI 判定を統合し、高い方を採用する */
function mergeWithAI(regexCrisis: CrisisAssessment, aiLevel: CrisisLevel): CrisisAssessment {
  const regexOrder = LEVEL_ORDER[regexCrisis.level]
  const aiOrder = LEVEL_ORDER[aiLevel]

  if (aiOrder <= regexOrder) {
    return { ...regexCrisis, detectedBy: aiOrder > 0 ? 'both' : 'regex' }
  }
  return {
    level: aiLevel,
    matched: regexCrisis.matched,
    category: regexCrisis.category,
    detectedBy: regexOrder > 0 ? 'both' : 'ai',
  }
}

/**
 * 鑑定を実行する。
 */
export async function divine(
  request: DivineRequest,
  options: DivineOptions = {}
): Promise<DivineResponse> {
  // 1-a. 危機検知ステップ1: 正規表現(高速・API不要)
  const regexCrisis = detectCrisis(request.question)

  // 重度なら即座に固定テンプレートを返す
  if (regexCrisis.level === 'severe') {
    return {
      text: getSevereResponseTemplate(regexCrisis.category, request.userName),
      source: 'crisis_template',
      crisis: regexCrisis,
    }
  }

  // 2. Anthropic クライアント初期化(AI チェックと鑑定で共用)
  const client = options.client ?? new Anthropic()

  // 1-b. 危機検知ステップ2: AI セカンドスクリーニング(Haiku)
  // 正規表現をすり抜けた婉曲・文脈依存表現を補足する
  const aiLevel = await aiCrisisCheck(request.question, client)
  const crisis = mergeWithAI(regexCrisis, aiLevel)

  if (crisis.level === 'severe') {
    return {
      text: getSevereResponseTemplate(crisis.category, request.userName),
      source: 'crisis_template',
      crisis,
    }
  }
  const model = options.model ?? 'claude-sonnet-4-6'
  const maxTokens = options.maxTokens ?? 1024

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: buildSystemMessages(),
    messages: buildMessages(request),
  })

  // 応答テキストを抽出
  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && 'text' in textBlock ? textBlock.text : ''

  if (!text) {
    throw new Error('Empty response from Anthropic API')
  }

  return {
    text,
    source: 'ai',
    crisis,
    meta: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      // SDK 型定義にないが API からは返される拡張フィールド
      cacheReadTokens: (response.usage as unknown as Record<string, number>)['cache_read_input_tokens'] ?? 0,
      cacheCreationTokens: (response.usage as unknown as Record<string, number>)['cache_creation_input_tokens'] ?? 0,
      model,
    },
  }
}
