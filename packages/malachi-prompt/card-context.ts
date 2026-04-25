/**
 * カードコンテキストの組み立て
 *
 * 動的部分(キャッシュされない)。
 * 引かれたカード情報、ユーザー名、質問カテゴリなどをユーザーメッセージとして組み立てる。
 */

import type { TarotCard } from '../tarot/types/card'

export type Orientation = 'upright' | 'reversed'

export type SpreadType = 'single' | 'two-card' | 'three-card'

export interface DrawnCard {
  card: TarotCard
  orientation: Orientation
  /** スプレッド内の位置(該当する場合) */
  position?: string
}

export interface DivineRequest {
  /** ユーザー名(任意) */
  userName?: string
  /** ユーザーの質問 */
  question: string
  /** 質問カテゴリ(該当するもの) */
  questionCategory?: 'love' | 'relationships' | 'self' | 'work' | 'decision'
  /** 引かれたカード(1〜3枚) */
  drawnCards: DrawnCard[]
  /** スプレッドの種類 */
  spread: SpreadType
  /** 過去の会話履歴(任意。マラキが文脈を引き継ぐため) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

/**
 * 1枚のカードの情報を、マラキが解釈できる形式の文字列に整形する。
 */
function formatCardForPrompt(
  drawn: DrawnCard,
  category: DivineRequest['questionCategory'] = 'love'
): string {
  const { card, orientation, position } = drawn
  const orientationLabel = orientation === 'upright' ? '正位置' : '逆位置'

  const keywords = orientation === 'upright' ? card.keywords_upright : card.keywords_reversed

  // カテゴリ別の解釈テキストを取得
  const contextInterpretation = card.contexts[category]
  const categoryText =
    orientation === 'upright' ? contextInterpretation.upright : contextInterpretation.reversed

  // ポジション別ヒント(あれば)
  const positionHint =
    position && card.positions?.[position as keyof NonNullable<typeof card.positions>]

  return [
    `カード: ${card.name} (${card.name_en}) ${orientationLabel}`,
    position ? `位置: ${position}` : null,
    `象徴の核: ${card.symbolism.keywords.join('、')}`,
    `現れているキーワード: ${keywords.join('、')}`,
    `この文脈での意味: ${categoryText}`,
    positionHint ? `位置の含意: ${positionHint}` : null,
    `語り口の指針: ${card.voice_hint}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * リクエストから、Anthropic API の messages 配列を組み立てる。
 *
 * 構造:
 * - 過去の会話履歴(あれば)
 * - 今回のユーザーメッセージ(カード情報 + 質問)
 */
export function buildMessages(
  request: DivineRequest
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages = [...(request.conversationHistory ?? [])]

  // 今回のユーザーメッセージ
  const cardSection = request.drawnCards
    .map((d, i) =>
      request.drawnCards.length > 1
        ? `【${i + 1}枚目】\n${formatCardForPrompt(d, request.questionCategory)}`
        : formatCardForPrompt(d, request.questionCategory)
    )
    .join('\n\n')

  const userBlock = [
    `[コンテキスト]`,
    request.userName ? `ユーザー名: ${request.userName}` : null,
    `スプレッド: ${spreadLabel(request.spread)}`,
    request.questionCategory ? `質問カテゴリ: ${request.questionCategory}` : null,
    '',
    `[引かれたカード]`,
    cardSection,
    '',
    `[ユーザーの問い]`,
    request.question,
    '',
    `上記のカードを解釈し、マラキとして応答せよ。`,
  ]
    .filter(Boolean)
    .join('\n')

  messages.push({ role: 'user', content: userBlock })

  return messages
}

function spreadLabel(spread: SpreadType): string {
  switch (spread) {
    case 'single':
      return '1枚引き(ワンオラクル)'
    case 'two-card':
      return '2枚引き(自分の気持ち / 相手の気持ち)'
    case 'three-card':
      return '3枚引き(過去 / 現在 / 未来)'
  }
}
