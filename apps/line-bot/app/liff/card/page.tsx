'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './card.module.css'

type Phase = 'loading' | 'ready' | 'drawing' | 'revealed' | 'error'

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
  const liffRef = useRef<(typeof import('@line/liff'))['default'] | null>(null)

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

  async function handleDraw() {
    if (!lineUserId || !liffAccessToken || phase === 'drawing') return
    setPhase('drawing')
    setFlipped(false)

    try {
      const res = await fetch('/api/liff/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          liffAccessToken,
          userName,
          question: question.trim() || '今の私へのメッセージを聞かせてください',
          questionCategory: THEMES.find((t) => t.key === selectedTheme)?.category,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data: ReadingResult = await res.json()
      setReading(data)
      setPhase('revealed')
      const resolvedQ = question.trim() || '今の私へのメッセージを聞かせてください'
      setChatHistory([
        { role: 'user', content: resolvedQ },
        { role: 'assistant', content: data.text },
      ])
      // フリップアニメを少し遅らせて revealed フェーズの描画後に起動
      setTimeout(() => setFlipped(true), 100)
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
      })
      if (!res.ok) throw new Error('API error')
      const data: { text: string } = await res.json()

      setFollowUpExchanges((prev) => [...prev, { question: currentQuestion, answer: data.text }])
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: data.text },
      ])
    } catch {
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
    setPhase('ready')
    setReading(null)
    setFlipped(false)
    setQuestion('')
    setSelectedTheme(null)
    setChatHistory([])
    setFollowUpText('')
    setFollowUpExchanges([])
  }

  if (phase === 'loading') {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
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

      {/* テーマ選択 + 質問入力(revealed 前のみ表示) */}
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
            <span className={styles.backSymbol}>🌙</span>
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

      {/* ボタン */}
      {(phase === 'ready' || phase === 'drawing') && (
        <button className={styles.drawBtn} onClick={handleDraw} disabled={phase === 'drawing'}>
          {phase === 'drawing' ? '鑑定中…' : 'カードを引く'}
        </button>
      )}

      {/* 結果テキスト + フォローアップ */}
      {phase === 'revealed' && reading && flipped && (
        <>
          <div className={styles.result}>
            <div className={styles.cardLabel}>
              <span className={styles.cardName}>{reading.cardName}</span>
              <span className={styles.orientationBadge}>
                {reading.orientation === 'upright' ? '正位置' : '逆位置'}
              </span>
            </div>
            <div className={styles.readingText}>{reading.text}</div>
          </div>

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
        </>
      )}
    </main>
  )
}
