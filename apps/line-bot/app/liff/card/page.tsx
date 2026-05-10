'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './card.module.css'

type Phase = 'loading' | 'ready' | 'drawing' | 'revealed' | 'error'

interface ReadingResult {
  cardSlug: string
  cardName: string
  cardNameEn: string
  cardImage: string
  orientation: 'upright' | 'reversed'
  text: string
}

export default function CardPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<ReadingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [flipped, setFlipped] = useState(false)
  const liffRef = useRef<typeof import('@line/liff')['default'] | null>(null)

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
    if (!lineUserId || phase === 'drawing') return
    setPhase('drawing')
    setFlipped(false)

    try {
      const res = await fetch('/api/liff/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          question: question.trim() || '今の私へのメッセージを聞かせてください',
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data: ReadingResult = await res.json()
      setReading(data)
      setPhase('revealed')
      // フリップアニメを少し遅らせて revealed フェーズの描画後に起動
      setTimeout(() => setFlipped(true), 100)
    } catch {
      setErrorMsg('鑑定の取得に失敗しました。もう一度お試しください。')
      setPhase('error')
    }
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

      {/* 質問入力(revealed 前のみ表示) */}
      {(phase === 'ready' || phase === 'drawing') && (
        <div className={styles.questionWrap}>
          <textarea
            className={styles.questionInput}
            rows={3}
            placeholder="悩みや質問を書いてください（省略可）"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={phase === 'drawing'}
          />
        </div>
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
              <img
                src={`/images/major-arcana/${reading.cardImage}`}
                alt={reading.cardName}
              />
            </div>
          )}
        </div>
      </div>

      {/* ボタン */}
      {(phase === 'ready' || phase === 'drawing') && (
        <button
          className={styles.drawBtn}
          onClick={handleDraw}
          disabled={phase === 'drawing'}
        >
          {phase === 'drawing' ? '鑑定中…' : 'カードを引く'}
        </button>
      )}

      {/* 結果テキスト */}
      {phase === 'revealed' && reading && flipped && (
        <div className={styles.result}>
          <div className={styles.cardLabel}>
            <span className={styles.cardName}>{reading.cardName}</span>
            <span className={styles.orientationBadge}>
              {reading.orientation === 'upright' ? '正位置' : '逆位置'}
            </span>
          </div>
          <div className={styles.readingText}>{reading.text}</div>
        </div>
      )}
    </main>
  )
}
