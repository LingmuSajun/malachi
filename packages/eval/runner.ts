/**
 * 評価ランナー: テストフィクスチャ全件を実行し、結果をレポート化する
 *
 * 実行: npx tsx packages/eval/runner.ts
 *
 * オプション:
 *   --model <model>     使用するモデル(デフォルト: claude-sonnet-4-6)
 *   --output <path>     レポート出力先(デフォルト: eval-report.md)
 *   --fixtures <type>   実行するフィクスチャ種別(normal/crisis/injection/all、デフォルト: all)
 */

import * as fsSync from 'node:fs'
// Load .env.local (Next.js convention, not auto-loaded by tsx)
try {
  const envLocal = fsSync.readFileSync('.env.local', 'utf-8')
  for (const line of envLocal.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
} catch {
  /* .env.local が無ければ無視 */
}

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { divine, type DivineResponse } from '../malachi-prompt/divine'
import { ALL_FIXTURES } from '../malachi-prompt/test-fixtures'
import { judge, type JudgeResult } from './judge'

interface RunnerOptions {
  model: string
  output: string
  fixtureType: 'normal' | 'crisis' | 'injection' | 'all'
}

interface FixtureExecutionResult {
  fixtureName: string
  fixtureCategory: string
  divineResponse: DivineResponse
  judgeResult: JudgeResult | null // 危機テンプレートの場合は judge をスキップ
  durationMs: number
}

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2)
  const options: RunnerOptions = {
    model: 'claude-sonnet-4-6',
    output: 'eval-report.md',
    fixtureType: 'all',
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model') options.model = args[++i]
    else if (args[i] === '--output') options.output = args[++i]
    else if (args[i] === '--fixtures') {
      const v = args[++i]
      if (v === 'normal' || v === 'crisis' || v === 'injection' || v === 'all') {
        options.fixtureType = v
      }
    }
  }

  return options
}

function selectFixtures(type: RunnerOptions['fixtureType']) {
  switch (type) {
    case 'normal':
      return [{ category: 'normal', fixtures: ALL_FIXTURES.normal }]
    case 'crisis':
      return [{ category: 'crisis', fixtures: ALL_FIXTURES.crisis }]
    case 'injection':
      return [{ category: 'injection', fixtures: ALL_FIXTURES.injection }]
    case 'all':
      return [
        { category: 'normal', fixtures: ALL_FIXTURES.normal },
        { category: 'crisis', fixtures: ALL_FIXTURES.crisis },
        { category: 'injection', fixtures: ALL_FIXTURES.injection },
      ]
  }
}

async function runOne(
  fixture: (typeof ALL_FIXTURES.normal)[number],
  category: string,
  client: Anthropic,
  model: string
): Promise<FixtureExecutionResult> {
  const start = Date.now()

  // 1. マラキに応答させる
  const divineResponse = await divine(fixture.request, { client, model })

  let judgeResult: JudgeResult | null = null

  // 危機テンプレートの場合は LLM-Judge をスキップ(固定文なので評価不要)
  // ただし、テンプレートが返ったこと自体は判定すべき
  if (divineResponse.source === 'ai') {
    judgeResult = await judge(
      {
        fixtureName: fixture.name,
        userQuestion: fixture.request.question,
        malachiResponse: divineResponse.text,
        expectedFeatures: fixture.expectedFeatures,
        expectedAvoidance: fixture.expectedAvoidance,
      },
      { client, model }
    )
  }

  return {
    fixtureName: fixture.name,
    fixtureCategory: category,
    divineResponse,
    judgeResult,
    durationMs: Date.now() - start,
  }
}

function renderReport(results: FixtureExecutionResult[]): string {
  const totalCount = results.length
  const passedCount = results.filter(
    (r) =>
      r.judgeResult?.passed === true ||
      // 危機ケース: source が crisis_template であれば想定通り
      (r.divineResponse.source === 'crisis_template' && r.fixtureCategory === 'crisis')
  ).length

  const totalCost = results.reduce((sum, r) => {
    const meta = r.divineResponse.meta
    if (!meta) return sum
    const inputCost =
      ((meta.inputTokens - meta.cacheReadTokens) * 3 +
        meta.cacheReadTokens * 0.3 +
        meta.cacheCreationTokens * 3.75) /
      1_000_000
    const outputCost = (meta.outputTokens * 15) / 1_000_000
    return sum + inputCost + outputCost
  }, 0)

  const lines: string[] = []
  lines.push(`# Malachi 応答品質評価レポート`)
  lines.push('')
  lines.push(`実行日時: ${new Date().toISOString()}`)
  lines.push(`合計: ${totalCount} ケース / 合格: ${passedCount} ケース`)
  lines.push(`合計 API コスト: $${totalCost.toFixed(4)}`)
  lines.push('')

  // 概要表
  lines.push(`## 概要`)
  lines.push('')
  lines.push(`| カテゴリ | フィクスチャ | 結果 | スコア | 所要時間 |`)
  lines.push(`|---|---|---|---|---|`)
  for (const r of results) {
    const result = (() => {
      if (r.divineResponse.source === 'crisis_template') {
        return r.fixtureCategory === 'crisis' ? '✅ テンプレート発動' : '⚠️ 想定外'
      }
      return r.judgeResult?.passed ? '✅ 合格' : '❌ 不合格'
    })()
    const score = r.judgeResult ? `${r.judgeResult.overallScore}/5` : '-'
    lines.push(
      `| ${r.fixtureCategory} | \`${r.fixtureName}\` | ${result} | ${score} | ${r.durationMs}ms |`
    )
  }
  lines.push('')

  // 詳細
  lines.push(`## 詳細`)
  lines.push('')

  for (const r of results) {
    lines.push(`### ${r.fixtureCategory} / \`${r.fixtureName}\``)
    lines.push('')

    // 応答ソース表示
    if (r.divineResponse.source === 'crisis_template') {
      lines.push(
        `**応答ソース**: 危機テンプレート(${r.divineResponse.crisis.level} / ${r.divineResponse.crisis.category ?? '-'})`
      )
    } else {
      lines.push(`**応答ソース**: AI 生成`)
    }
    lines.push('')

    // マラキの応答
    lines.push(`**マラキの応答**:`)
    lines.push('')
    lines.push(`> ${r.divineResponse.text.split('\n').join('\n> ')}`)
    lines.push('')

    if (r.judgeResult) {
      // 評価
      lines.push(`**評価結果** (スコア ${r.judgeResult.overallScore}/5)`)
      lines.push('')

      lines.push(`含まれているべき特徴:`)
      for (const f of r.judgeResult.features) {
        const mark = f.satisfied ? '✅' : '❌'
        lines.push(`- ${mark} ${f.feature}`)
        if (f.evidence) lines.push(`  - 根拠: ${f.evidence}`)
      }
      lines.push('')

      lines.push(`避けるべき特徴:`)
      for (const a of r.judgeResult.avoidances) {
        const mark = a.violated ? '❌ 違反' : '✅ 回避'
        lines.push(`- ${mark}: ${a.avoidance}`)
        if (a.evidence) lines.push(`  - 根拠: ${a.evidence}`)
      }
      lines.push('')

      lines.push(`**コメント**: ${r.judgeResult.notes}`)
      lines.push('')
    }

    // メタ情報
    if (r.divineResponse.meta) {
      const m = r.divineResponse.meta
      lines.push(
        `**API メタ**: 入力 ${m.inputTokens} (キャッシュ読込 ${m.cacheReadTokens}) / 出力 ${m.outputTokens} tokens / モデル ${m.model}`
      )
      lines.push('')
    }

    lines.push(`---`)
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const options = parseArgs()
  const client = new Anthropic()
  const fixtureGroups = selectFixtures(options.fixtureType)
  const results: FixtureExecutionResult[] = []

  console.log(`🔮 Malachi 応答品質評価を開始`)
  console.log(`モデル: ${options.model}`)
  console.log(
    `フィクスチャ: ${options.fixtureType} (${fixtureGroups.flatMap((g) => g.fixtures).length} ケース)`
  )
  console.log('')

  for (const group of fixtureGroups) {
    for (const fixture of group.fixtures) {
      console.log(`▶️  [${group.category}] ${fixture.name}`)
      try {
        const result = await runOne(fixture, group.category, client, options.model)
        results.push(result)

        const status = (() => {
          if (result.divineResponse.source === 'crisis_template') {
            return group.category === 'crisis'
              ? '✅ 危機テンプレート'
              : '⚠️  想定外のテンプレート発動'
          }
          return result.judgeResult?.passed
            ? `✅ 合格 (${result.judgeResult.overallScore}/5)`
            : `❌ 不合格 (${result.judgeResult?.overallScore ?? '-'}/5)`
        })()
        console.log(`   ${status}`)
      } catch (err) {
        console.error(`   ❌ エラー: ${err instanceof Error ? err.message : String(err)}`)
      }
      console.log('')
    }
  }

  const report = renderReport(results)
  const outputPath = path.resolve(process.cwd(), options.output)
  await fs.writeFile(outputPath, report, 'utf-8')

  console.log(`📝 レポート出力: ${outputPath}`)

  const passed = results.filter(
    (r) =>
      r.judgeResult?.passed ||
      (r.divineResponse.source === 'crisis_template' && r.fixtureCategory === 'crisis')
  ).length
  console.log(`📊 結果: ${passed}/${results.length} 合格`)

  // 不合格があれば exit code 1(CIで使える)
  if (passed < results.length) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
