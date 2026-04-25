/**
 * AI セカンドスクリーニング
 *
 * 正規表現で検知できない婉曲表現・文脈依存の危機を Haiku で検出する。
 * divine() の正規表現チェック後、本鑑定 API 呼び出し前に実行する。
 *
 * エラー時は 'none' を返してフォールバック(鑑定続行)。
 * Claude の system プロンプトが最終安全網として機能する。
 */

import Anthropic from '@anthropic-ai/sdk'
import type { CrisisLevel } from './crisis-detector'

const SAFETY_SYSTEM = `あなたは危機スクリーニングAIです。ユーザーのメッセージが精神的危機を示しているか判断します。

判定基準:
- none: 日常の悩み・恋愛相談・占い質問。日常的な誇張・比喩は none。
- moderate: 深刻な絶望感・孤立感・被害の示唆。緊急性は不明だが専門支援を案内すべき状態。
- severe: 自殺・自傷の意図、緊急の暴力被害。即座の専門機関介入が必要。

文脈を考慮すること。「疲れた」「消えたい(比喩)」「もう嫌だ」は原則 none。
必ずJSONのみで回答: {"level":"none"}`

export async function aiCrisisCheck(text: string, client: Anthropic): Promise<CrisisLevel> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 30,
      system: SAFETY_SYSTEM,
      messages: [{ role: 'user', content: text }],
    })

    const block = response.content.find((b) => b.type === 'text')
    if (!block || !('text' in block)) return 'none'

    const parsed = JSON.parse(block.text.trim()) as { level?: unknown }
    const level = parsed.level
    if (level === 'severe' || level === 'moderate' || level === 'none') return level
    return 'none'
  } catch {
    return 'none'
  }
}
