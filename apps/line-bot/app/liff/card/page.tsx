'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './card.module.css'

type Phase = 'loading' | 'ready' | 'drawing' | 'streaming' | 'revealed' | 'error'

type ThemeKey = 'love' | 'work' | 'relationships' | 'today'

const THEMES: { key: ThemeKey; label: string; category?: string; placeholder: string }[] = [
  {
    key: 'love',
    label: '恋愛',
    category: 'love',
    placeholder: '彼のこと、恋愛の悩みを書いてください',
  },
  {
    key: 'work',
    label: '仕事・お金',
    category: 'work',
    placeholder: '仕事の悩み、転職、お金のことを書いてください',
  },
  {
    key: 'relationships',
    label: '人間関係',
    category: 'relationships',
    placeholder: '友人、家族、職場の人間関係について書いてください',
  },
  {
    key: 'today',
    label: '今日の一枚',
    placeholder: '質問は省略できます。今日のメッセージを引きます',
  },
]

const DRAWING_PHASES = [
  '星の配置を読んでいます…',
  'カードにエネルギーを込めています…',
  'あなたへのメッセージを紡いでいます…',
  'タロットの声に耳を澄ませています…',
]

const TAROT_TRIVIA = [
  'タロットは15世紀のイタリアで誕生。当初は貴族が楽しむゲーム用のカードでした。',
  '大アルカナ22枚は「愚者」から「世界」まで、魂の成長の旅を象徴しています。',
  '「アルカナ」はラテン語で「秘密」「神秘」を意味します。',
  'タロットが占いに使われ始めたのは18世紀末のヨーロッパ。神秘主義の高まりが背景にあります。',
  '逆位置は「負のエネルギー」ではなく、そのカードのテーマが内側や遅延として現れている状態です。',
  '「愚者（0番）」は唯一番号を持たないカード。無限の可能性と純粋な魂を表します。',
  '古来より、占いは「未来を当てる」ではなく「自分自身を知る鏡」とされてきました。',
  '「世界（21番）」は旅の完結と新たなサイクルの始まり。次の「愚者」へとつながります。',
]

interface ReadingResult {
  conversationId: string
  cardSlug: string
  cardName: string
  cardNameEn: string
  cardImage: string
  orientation: 'upright' | 'reversed'
  text: string
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface FollowUpExchange {
  question: string
  answer: string
}

export default function CardPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [liffAccessToken, setLiffAccessToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<ReadingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [followUpText, setFollowUpText] = useState('')
  const [isFollowingUp, setIsFollowingUp] = useState(false)
  const [followUpExchanges, setFollowUpExchanges] = useState<FollowUpExchange[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [drawingPhaseIndex, setDrawingPhaseIndex] = useState(0)
  const [triviaIndex, setTriviaIndex] = useState(0)
  const liffRef = useRef<(typeof import('@line/liff'))['default'] | null>(null)
  const followUpAbortRef = useRef<AbortController | null>(null)
  const streamingTextRef = useRef('')

  useEffect(() => {
    ;(async () => {
      try {
        const liff = (await import('@line/liff')).default
        liffRef.current = liff
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        const profile = await liff.getProfile()
        setLineUserId(profile.userId)
        setUserName(profile.displayName)
        setLiffAccessToken(liff.getAccessToken())

        // LINE メッセージから渡された質問を自動入力
        const params = new URLSearchParams(window.location.search)
        const q = params.get('q')
        if (q) setQuestion(decodeURIComponent(q))

        setPhase('ready')
      } catch {
        setErrorMsg('LIFF の起動に失敗しました。LINEアプリから開き直してください。')
        setPhase('error')
      }
    })()
  }, [])

  // 鑑定中フェーズメッセージのサイクル
  useEffect(() => {
    if (phase !== 'drawing') return
    const interval = setInterval(() => {
      setDrawingPhaseIndex((prev) => (prev + 1) % DRAWING_PHASES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [phase])

  // 豆知識のサイクル
  useEffect(() => {
    if (phase !== 'drawing') return
    const interval = setInterval(() => {
      setTriviaIndex((prev) => (prev + 1) % TAROT_TRIVIA.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [phase])

  async function handleDraw() {
    if (!lineUserId || !liffAccessToken || phase === 'drawing') return
    setPhase('drawing')
    setFlipped(false)
    setStreamingText('')
    streamingTextRef.current = ''
    setDrawingPhaseIndex(0)
    setTriviaIndex(Math.floor(Math.random() * TAROT_TRIVIA.length))

    const resolvedQ = question.trim() || '今の私へのメッセージを聞かせてください'

    try {
      const res = await fetch('/api/liff/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          liffAccessToken,
          userName,
          question: resolvedQ,
          questionCategory: THEMES.find((t) => t.key === selectedTheme)?.category,
        }),
      })

      if (!res.ok) throw new Error('API error')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: { type: string; [key: string]: unknown }
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          if (event.type === 'init') {
            setReading({
              conversationId: event.conversationId as string,
              cardSlug: event.cardSlug as string,
              cardName: event.cardName as string,
              cardNameEn: event.cardNameEn as string,
              cardImage: event.cardImage as string,
              orientation: event.orientation as 'upright' | 'reversed',
              text: '',
            })
            setPhase('streaming')
            setChatHistory([{ role: 'user', content: resolvedQ }])
            setTimeout(() => setFlipped(true), 100)
          } else if (event.type === 'text') {
            streamingTextRef.current += event.chunk as string
            setStreamingText(streamingTextRef.current)
          } else if (event.type === 'done') {
            const fullText = streamingTextRef.current
            setReading((prev) => (prev ? { ...prev, text: fullText } : null))
            setChatHistory((prev) => [...prev, { role: 'assistant', content: fullText }])
            setPhase('revealed')
          } else if (event.type === 'error') {
            throw new Error(event.message as string)
          }
        }
      }
    } catch {
      setErrorMsg('鑑定の取得に失敗しました。もう一度お試しください。')
      setPhase('error')
    }
  }

  async function handleFollowUp() {
    if (!lineUserId || !liffAccessToken || !reading || !followUpText.trim() || isFollowingUp) return
    setIsFollowingUp(true)
    const currentQuestion = followUpText.trim()
    setFollowUpText('')

    // 前のリクエストが残っていればキャンセル
    followUpAbortRef.current?.abort()
    const controller = new AbortController()
    followUpAbortRef.current = controller

    try {
      const res = await fetch('/api/liff/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          liffAccessToken,
          userName,
          followUpQuestion: currentQuestion,
          cardSlug: reading.cardSlug,
          orientation: reading.orientation,
          conversationId: reading.conversationId,
          conversationHistory: chatHistory,
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('API error')
      const data: { text: string } = await res.json()

      setFollowUpExchanges((prev) => [...prev, { question: currentQuestion, answer: data.text }])
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: data.text },
      ])
    } catch (err) {
      // 新しい鑑定への切り替えによるキャンセルは無視する
      if (err instanceof DOMException && err.name === 'AbortError') return
      setFollowUpExchanges((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: '申し訳ありません、うまく聞き取れませんでした。もう一度お試しください。',
        },
      ])
    } finally {
      setIsFollowingUp(false)
    }
  }

  function handleNewReading() {
    // フォローアップ中のリクエストをキャンセルしてから state をリセット
    followUpAbortRef.current?.abort()
    followUpAbortRef.current = null
    setPhase('ready')
    setReading(null)
    setFlipped(false)
    setQuestion('')
    setSelectedTheme(null)
    setChatHistory([])
    setFollowUpText('')
    setIsFollowingUp(false)
    setFollowUpExchanges([])
    setStreamingText('')
    streamingTextRef.current = ''
  }

  if (phase === 'loading') {
    return (
      <div className={styles.center}>
        <div className={styles.mysticSpinner} />
        <p style={{ color: '#b89fd4', fontSize: '0.9rem' }}>マラキを呼び出しています…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{errorMsg}</p>
      </div>
    )
  }

  return (
    <main className={styles.page}>
      <p className={styles.title}>✦ マラキの導き ✦</p>

      {/* テーマ選択 + 質問入力(ready/drawing のみ) */}
      {(phase === 'ready' || phase === 'drawing') && (
        <>
          <div className={styles.themeRow}>
            {THEMES.map((theme) => (
              <button
                key={theme.key}
                className={`${styles.themeBtn} ${selectedTheme === theme.key ? styles.themeBtnActive : ''}`}
                onClick={() => setSelectedTheme(selectedTheme === theme.key ? null : theme.key)}
                disabled={phase === 'drawing'}
              >
                {theme.label}
              </button>
            ))}
          </div>
          <div className={styles.questionWrap}>
            <textarea
              className={styles.questionInput}
              rows={3}
              placeholder={
                THEMES.find((t) => t.key === selectedTheme)?.placeholder ??
                '悩みや質問を書いてください（省略可）'
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={phase === 'drawing'}
            />
          </div>
        </>
      )}

      {/* カード */}
      <div className={styles.scene}>
        <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
          {/* 裏面 */}
          <div className={`${styles.cardFace} ${styles.cardBack}`}>
            <span className={styles.backSymbol} />
          </div>
          {/* 表面 */}
          {reading && (
            <div
              className={`${styles.cardFace} ${styles.cardFront} ${
                reading.orientation === 'reversed' ? styles.reversed : ''
              }`}
            >
              <img src={`/images/major-arcana/${reading.cardImage}`} alt={reading.cardName} />
            </div>
          )}
        </div>
      </div>

      {/* カードを引くボタン */}
      {phase === 'ready' && (
        <button className={styles.drawBtn} onClick={handleDraw}>
          カードを引く
        </button>
      )}

      {/* 鑑定中ローディング */}
      {phase === 'drawing' && (
        <div className={styles.drawingInfo}>
          <div className={styles.mysticSpinner} />
          <p key={drawingPhaseIndex} className={styles.phaseMessage}>
            {DRAWING_PHASES[drawingPhaseIndex]}
          </p>
          <div key={triviaIndex} className={styles.triviaBox}>
            <p className={styles.triviaLabel}>✦ タロットの豆知識 ✦</p>
            <p className={styles.triviaText}>{TAROT_TRIVIA[triviaIndex]}</p>
          </div>
        </div>
      )}

      {/* 結果テキスト(streaming / revealed) */}
      {(phase === 'streaming' || phase === 'revealed') && reading && flipped && (
        <>
          <div className={styles.result}>
            <div className={styles.cardLabel}>
              <span className={styles.cardName}>{reading.cardName}</span>
              <span className={styles.orientationBadge}>
                {reading.orientation === 'upright' ? '正位置' : '逆位置'}
              </span>
            </div>
            <div className={styles.readingText}>
              {phase === 'streaming' ? streamingText : reading.text}
              {phase === 'streaming' && <span className={styles.streamingCursor}>▌</span>}
            </div>
          </div>

          {/* フォローアップ(revealed のみ) */}
          {phase === 'revealed' && (
            <div className={styles.followUpSection}>
              {followUpExchanges.map((ex, i) => (
                <div key={i} className={styles.exchange}>
                  <div className={styles.chatQ}>{ex.question}</div>
                  <div className={styles.chatA}>{ex.answer}</div>
                </div>
              ))}

              <p className={styles.divider}>— マラキにもっと聞く —</p>
              <textarea
                className={styles.questionInput}
                rows={2}
                placeholder="もっと詳しく教えて、など..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                disabled={isFollowingUp}
              />
              <div className={styles.btnRow}>
                <button
                  className={styles.sendBtn}
                  onClick={handleFollowUp}
                  disabled={isFollowingUp || !followUpText.trim()}
                >
                  {isFollowingUp ? '考え中…' : '聞く'}
                </button>
                <button className={styles.newReadingBtn} onClick={handleNewReading}>
                  新しい鑑定へ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
