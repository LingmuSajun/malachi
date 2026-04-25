/**
 * System プロンプト組み立て
 *
 * 6つのコンポーネントを統合し、Anthropic API の Prompt Caching に最適化された
 * 配列形式で返す。
 *
 * 静的部分は全て cache_control: ephemeral でマークされ、
 * 同じ system プロンプトでの2回目以降のリクエストは入力コストが約90%削減される。
 */

import { EXAMPLES } from './components/examples'
import { FORMAT } from './components/format'
import { IDENTITY } from './components/identity'
import { PRINCIPLES } from './components/principles'
import { SAFETY } from './components/safety'
import { VOICE } from './components/voice'

/**
 * 完全な静的 System プロンプト
 *
 * トークン数は約 2700-3000 (日本語含む)。
 * Claude Sonnet/Opus の prompt caching の最小要件(1024 tokens)を満たす。
 */
export const STATIC_SYSTEM_PROMPT = [
  '# あなたへの指示書',
  '',
  'あなたは「マラキ」というキャラクターを完全に体現する。',
  '以下のすべてのセクションを、絶対のルールとして守ること。',
  '',
  '---',
  '',
  IDENTITY,
  '',
  '---',
  '',
  VOICE,
  '',
  '---',
  '',
  PRINCIPLES,
  '',
  '---',
  '',
  SAFETY,
  '',
  '---',
  '',
  FORMAT,
  '',
  '---',
  '',
  EXAMPLES,
  '',
  '---',
  '',
  '# 最終確認',
  '',
  '応答を生成する前に、自問せよ:',
  '1. これはマラキの語り口になっているか?',
  '2. ユーザーの自主性を奪っていないか?',
  '3. セーフティルールに違反していないか?',
  '4. 占い結果として断定的すぎないか?',
  '',
  'すべて満たしているなら、応答せよ。',
].join('\n')

/**
 * Anthropic API messages.create に渡す形式の System プロンプト
 *
 * 使用例:
 * ```
 * await anthropic.messages.create({
 *   model: "claude-sonnet-4-6",
 *   max_tokens: 1024,
 *   system: buildSystemMessages(),
 *   messages: [...]
 * });
 * ```
 */
export function buildSystemMessages() {
  return [
    {
      type: 'text' as const,
      text: STATIC_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' as const },
    },
  ]
}

/**
 * デバッグ用: System プロンプトのトークン数概算を出力
 * 日本語1文字 ≈ 1.5〜2トークン、英語1単語 ≈ 1〜1.5トークン
 */
export function estimateTokens(): { chars: number; estimatedTokens: number } {
  const chars = STATIC_SYSTEM_PROMPT.length
  // 日本語主体なので 1.6 倍程度を目安
  const estimatedTokens = Math.round(chars * 1.6)
  return { chars, estimatedTokens }
}
