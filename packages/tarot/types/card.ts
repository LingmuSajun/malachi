/**
 * タロットカードのデータ構造定義
 *
 * yaml ファイル(packages/tarot/data/major-arcana.yaml)を読み込む際の型として使用。
 * js-yaml で parse した結果をこの型でアサートする。
 */

/** カードの位置(正位置 / 逆位置) */
export type Orientation = 'upright' | 'reversed'

/** 質問のカテゴリ */
export type QuestionContext =
  | 'love' // 恋愛
  | 'relationships' // 人間関係
  | 'self' // 自分自身・内面
  | 'work' // 仕事・キャリア
  | 'decision' // 選択・決断

/** スプレッド内のカード位置 */
export type SpreadPosition =
  | 'past' // 過去
  | 'present' // 現在
  | 'future' // 未来
  | 'self_mind' // 自分の気持ち(2枚引き用)
  | 'other_mind' // 相手の気持ち(2枚引き用)
  | 'single' // 1枚引き(位置なし)

/** カテゴリ別の解釈テキスト */
export interface ContextInterpretation {
  upright: string
  reversed: string
}

/** タロットカード1枚の完全なデータ */
export interface TarotCard {
  /** 0〜21(大アルカナ) */
  id: number

  /** スラグ(ファイル名やAPI識別子に使用) 例: "death", "lovers" */
  slug: string

  /** 日本語名 例: "死神" */
  name: string

  /** 英語名 例: "Death" */
  name_en: string

  /** 元素・象徴(タロット伝統の対応) */
  symbolism: {
    element?: string
    planet?: string
    hebrew_letter?: string
    keywords: string[]
  }

  /** 正位置のキーワード(3〜5個) */
  keywords_upright: string[]

  /** 逆位置のキーワード(3〜5個) */
  keywords_reversed: string[]

  /** カテゴリ別の解釈 */
  contexts: Record<QuestionContext, ContextInterpretation>

  /** スプレッド位置別の追加解釈ヒント(任意) */
  positions?: Partial<Record<SpreadPosition, string>>

  /** マラキの語り口ヒント(System プロンプトに渡す) */
  voice_hint: string

  /** 画像ファイル名(images/major-arcana/ 配下) */
  image: string
}

/** 大アルカナ全体のデータ */
export interface MajorArcanaData {
  version: string
  cards: TarotCard[]
}
