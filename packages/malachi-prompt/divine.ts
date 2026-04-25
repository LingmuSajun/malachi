/**
 * 鑑定実行のメイン関数
 *
 * 危機検知 → System プロンプト構築 → カードコンテキスト構築
 *  → Anthropic API 呼び出し → 応答テキスト返却 までを行う。
 *
 * 必要パッケージ: pnpm add @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'
import { buildMessages, type DivineRequest } from './card-context'
import { detectCrisis, getSevereResponseTemplate, type CrisisAssessment } from './crisis-detector'
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
  /** 使用するモデル(デフォルト: Sonnet 4.5) */
  model?: string
  /** 最大出力トークン数(デフォルト: 1024) */
  maxTokens?: number
  /** Anthropic クライアント(テスト用に注入可能) */
  client?: Anthropic
}

/**
 * 鑑定を実行する。
 */
export async function divine(
  request: DivineRequest,
  options: DivineOptions = {}
): Promise<DivineResponse> {
  // 1. 危機検知(API 呼び出し前のローカルチェック)
  const crisis = detectCrisis(request.question)

  // 重度危機なら API を呼ばず、固定の支援メッセージを返す
  if (crisis.level === 'severe') {
    return {
      text: getSevereResponseTemplate(crisis.category, request.userName),
      source: 'crisis_template',
      crisis,
    }
  }

  // 2. Anthropic API 呼び出し
  const client = options.client ?? new Anthropic()
  const model = options.model ?? 'claude-sonnet-4-5'
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
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      model,
    },
  }
}
