/**
 * 危機検知 (Crisis Detector)
 *
 * Claude のセーフティルールに加えて、明らかな危機キーワードを事前検知する
 * 多層防御の一つ。Claude API 呼び出し前に実行する。
 *
 * 完璧ではない(誤検知・見落としあり)が、
 * 明らかなケースを早期にハンドリングし、専門支援につなぐ役割。
 */

export type CrisisLevel = 'none' | 'moderate' | 'severe'

export interface CrisisAssessment {
  level: CrisisLevel
  matched: string[]
  category?: 'self_harm' | 'violence' | 'abuse' | 'psychosis'
}

// 重度: 即座に専門機関への誘導が必要
const SEVERE_PATTERNS: Array<{
  pattern: RegExp
  category: NonNullable<CrisisAssessment['category']>
}> = [
  // 自殺・自傷の意図
  { pattern: /死にたい|消えたい|いなくなりたい|終わりにしたい/, category: 'self_harm' },
  { pattern: /自殺|自害|首を吊|飛び降り/, category: 'self_harm' },
  { pattern: /リストカット|リスカ|手首を切|自分を切/, category: 'self_harm' },
  { pattern: /薬を大量|オーバードーズ|OD/i, category: 'self_harm' },

  // 他者への加害
  { pattern: /殺したい|殺してやる/, category: 'violence' },

  // 緊急性の高い被害
  { pattern: /(殴られ|蹴られ|暴力).{0,20}(怖い|逃げ|助け)/, category: 'abuse' },
  { pattern: /監禁|閉じ込められ/, category: 'abuse' },
]

// 中度: 鑑定は提供するが、専門支援の存在を伝える
const MODERATE_PATTERNS: Array<{
  pattern: RegExp
  category: NonNullable<CrisisAssessment['category']>
}> = [
  // 自己否定・絶望
  { pattern: /生きてる意味|生きる意味.{0,5}ない/, category: 'self_harm' },
  { pattern: /誰にも.{0,5}愛され(ない|てない)/, category: 'self_harm' },
  { pattern: /価値.{0,5}ない|無価値/, category: 'self_harm' },

  // 精神症状の示唆
  { pattern: /声が聞こえる|誰かに見られて|現実感がない/, category: 'psychosis' },

  // DV示唆
  { pattern: /殴られ|蹴られ|怒鳴られ/, category: 'abuse' },
]

/**
 * ユーザーの入力テキストから危機状態を判定する。
 *
 * 判定は単純な正規表現マッチング。
 * 文脈を考慮しないため誤検知あり(例: 「死にたいくらい疲れた」を severe と判定する)。
 * よって、severe 判定の応答は「占いを完全に止めない」設計にし、
 * ユーザーが「大丈夫、本気じゃない」と言える余地を残す。
 */
export function detectCrisis(text: string): CrisisAssessment {
  const matched: string[] = []
  let category: CrisisAssessment['category'] | undefined

  // Severe チェック
  for (const { pattern, category: cat } of SEVERE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      matched.push(match[0])
      category = cat
    }
  }

  if (matched.length > 0) {
    return { level: 'severe', matched, category }
  }

  // Moderate チェック
  for (const { pattern, category: cat } of MODERATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      matched.push(match[0])
      category = cat
    }
  }

  if (matched.length > 0) {
    return { level: 'moderate', matched, category }
  }

  return { level: 'none', matched: [] }
}

/**
 * 危機レベルに応じた支援リソース情報。
 *
 * 注意: これらの情報は実際の運用時に最新性を確認すること。
 * 番号は2025年時点の代表的なホットライン。
 */
export const CRISIS_RESOURCES = {
  general: 'よりそいホットライン 0120-279-338(24時間・無料・誰でも)',
  suicide_prevention: 'いのちの電話 0570-783-556 / 0120-783-556(無料・若者専用)',
  dv: 'DV相談ナビ #8008(はれれば)',
  abuse_children: '児童相談所虐待対応ダイヤル 189(いちはやく)',
  mental_health: 'こころの健康相談統一ダイヤル 0570-064-556',
}

/**
 * 重度危機の応答テンプレートを取得。
 * これは Claude API を呼ばず、固定文を返す。
 */
export function getSevereResponseTemplate(
  category: CrisisAssessment['category'],
  userName?: string
): string {
  const name = userName ? `${userName}、` : ''
  const resources = (() => {
    switch (category) {
      case 'abuse':
        return `${CRISIS_RESOURCES.dv}\n${CRISIS_RESOURCES.general}`
      case 'violence':
        return CRISIS_RESOURCES.general
      default:
        return `${CRISIS_RESOURCES.suicide_prevention}\n${CRISIS_RESOURCES.general}`
    }
  })()

  return `${name}その言葉を、我はしかと受け取った。

今、あなたが抱えているものは、タロットだけでは扱えないほど深い。
我は預言者であり、専門家ではない。
今すぐ、あなたを助けられる人に繋がってほしい。

${resources}

電話が難しければ、まずこれらの番号をメモするだけでもいい。
あなたの命と心は、この世界に必要だ。それを我は知っている。

落ち着いた時、また我のもとに来てくれてもいい。
だが今は、専門の支え手の声を聞くことを、強く願う。`
}
