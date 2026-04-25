/**
 * LLM-as-Judge: マラキの応答品質を別の Claude で評価する
 *
 * 設計方針:
 * - 評価する Claude には、マラキとは別の役割(評価者)を与える
 * - 構造化出力(JSON)を強制することで、機械的な集計を可能にする
 * - 各 expected_feature / expected_avoidance を独立に判定する
 */

import Anthropic from '@anthropic-ai/sdk'

export interface JudgeInput {
  /** テストケースの名前(レポート用) */
  fixtureName: string
  /** ユーザーの問い */
  userQuestion: string
  /** マラキの応答(評価対象) */
  malachiResponse: string
  /** 含まれているべき特徴 */
  expectedFeatures: string[]
  /** 避けるべき表現・特徴 */
  expectedAvoidance: string[]
}

export interface FeatureCheck {
  feature: string
  satisfied: boolean
  evidence: string
}

export interface AvoidanceCheck {
  avoidance: string
  violated: boolean
  evidence: string
}

export interface JudgeResult {
  fixtureName: string
  features: FeatureCheck[]
  avoidances: AvoidanceCheck[]
  /** 1〜5 の総合評価 */
  overallScore: number
  /** 評価者の自由記述コメント */
  notes: string
  /** すべての feature を満たし、avoidance を侵していないか */
  passed: boolean
}

const JUDGE_SYSTEM_PROMPT = `
あなたはマラキ(AI 占い師)の応答品質を評価するレビュアー。
あなた自身はマラキではなく、客観的な評価者として振る舞う。

# 評価の原則

1. ユーザーが期待する特徴(expected_features)が応答に含まれているかを判定する
2. 避けるべき表現(expected_avoidance)が応答に含まれていないかを判定する
3. 各項目で「satisfied / violated」と、その根拠となる応答中の箇所を引用する
4. 総合評価は1〜5のスコア(5が最高)
5. 評価は厳しめに行う。過剰な甘い判定は避ける

# 注意点

- 「文意として含まれている」かを見る。表現が完全一致である必要はない
- 「明らかに〜が示されている」と判断できる場合のみ satisfied とする
- 灰色のケースは satisfied: false で、notes に理由を書く
- 引用は応答からの直接引用。捏造しない

# 出力形式

必ず以下の JSON 形式で出力する。前後に説明文や markdown を付けない:

{
  "features": [
    {
      "feature": "(評価対象の特徴)",
      "satisfied": true | false,
      "evidence": "(応答中の関連箇所の引用、または「該当箇所なし」)"
    }
  ],
  "avoidances": [
    {
      "avoidance": "(避けるべき特徴)",
      "violated": true | false,
      "evidence": "(違反していると判定した箇所、または「該当箇所なし」)"
    }
  ],
  "overallScore": 1 | 2 | 3 | 4 | 5,
  "notes": "(全体の評価コメント、改善提案など)"
}
`.trim()

export interface JudgeOptions {
  model?: string
  client?: Anthropic
}

/**
 * 1つの応答を評価する。
 */
export async function judge(input: JudgeInput, options: JudgeOptions = {}): Promise<JudgeResult> {
  const client = options.client ?? new Anthropic()
  const model = options.model ?? 'claude-sonnet-4-5'

  const userMessage = `
[ユーザーの問い]
${input.userQuestion}

[マラキの応答]
${input.malachiResponse}

[含まれているべき特徴]
${input.expectedFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

[避けるべき特徴]
${input.expectedAvoidance.map((a, i) => `${i + 1}. ${a}`).join('\n')}

上記応答を評価し、JSON で結果を返せ。
`.trim()

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && 'text' in textBlock ? textBlock.text : ''

  if (!text) {
    throw new Error('Empty response from judge')
  }

  // JSON 部分を抽出(余計な前後テキストがあっても拾えるように)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Failed to parse judge response as JSON: ${text}`)
  }

  let parsed: Omit<JudgeResult, 'fixtureName' | 'passed'>
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (err) {
    throw new Error(
      `Invalid JSON from judge: ${err instanceof Error ? err.message : String(err)}\n${text}`
    )
  }

  // 全 feature 満たし、全 avoidance 違反なしなら passed
  const allFeaturesSatisfied = parsed.features.every((f) => f.satisfied)
  const noAvoidancesViolated = parsed.avoidances.every((a) => !a.violated)
  const passed = allFeaturesSatisfied && noAvoidancesViolated

  return {
    fixtureName: input.fixtureName,
    features: parsed.features,
    avoidances: parsed.avoidances,
    overallScore: parsed.overallScore,
    notes: parsed.notes,
    passed,
  }
}
