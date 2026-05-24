'use client'

import { use, useEffect, useState } from 'react'
import styles from '../../card/card.module.css'

interface CardInfo {
  slug: string
  orientation: 'upright' | 'reversed'
  cardName: string
  cardImage: string
}

interface ReadingDetail {
  id: string
  question: string
  response_text: string
  created_at: string
  cards: CardInfo[]
}

type Phase = 'loading' | 'ready' | 'error'

export default function HistoryPage({ params }: { params: Promise<{ reading_id: string }> }) {
  const { reading_id } = use(params)
  const [phase, setPhase] = useState<Phase>('loading')
  const [reading, setReading] = useState<ReadingDetail | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const liff = (await import('@line/liff')).default
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        const profile = await liff.getProfile()
        const liffAccessToken = liff.getAccessToken()

        const res = await fetch(
          `/api/liff/history/${reading_id}?lineUserId=${encodeURIComponent(profile.userId)}&liffAccessToken=${encodeURIComponent(liffAccessToken!)}`
        )

        if (res.status === 404) {
          setErrorMsg('この鑑定は見つかりませんでした。')
          setPhase('error')
          return
        }
        if (!res.ok) {
          setErrorMsg('鑑定の取得に失敗しました。')
          setPhase('error')
          return
        }

        setReading(await res.json())
        setPhase('ready')
      } catch {
        setErrorMsg('LIFF の起動に失敗しました。LINEアプリから開き直してください。')
        setPhase('error')
      }
    })()
  }, [reading_id])

  if (phase === 'loading') {
    return (
      <div className={styles.center}>
        <div className={styles.mysticSpinner} />
        <p style={{ color: '#b89fd4', fontSize: '0.9rem' }}>鑑定を呼び出しています…</p>
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

  if (!reading) return null

  const card = reading.cards[0]
  const orientationLabel = card?.orientation === 'upright' ? '正位置' : '逆位置'

  return (
    <main className={styles.page}>
      <p className={styles.title}>✦ マラキの導き ✦</p>

      {card?.cardImage && (
        <div className={styles.scene}>
          <div className={`${styles.card} ${styles.flipped}`}>
            <div className={`${styles.cardFace} ${styles.cardBack}`}>
              <span className={styles.backSymbol} />
            </div>
            <div
              className={`${styles.cardFace} ${styles.cardFront} ${card.orientation === 'reversed' ? styles.reversed : ''}`}
            >
              <img src={`/images/major-arcana/${card.cardImage}`} alt={card.cardName} />
            </div>
          </div>
        </div>
      )}

      <div className={styles.result}>
        <div className={styles.cardLabel}>
          <span className={styles.cardName}>{card?.cardName}</span>
          <span className={styles.orientationBadge}>{orientationLabel}</span>
        </div>
        <p style={{ color: 'rgba(232,217,197,0.5)', fontSize: '0.78rem', margin: '0 0 12px' }}>
          {reading.question}
        </p>
        <div className={styles.readingText}>{reading.response_text}</div>
      </div>

      <p style={{ color: 'rgba(184,159,212,0.4)', fontSize: '0.72rem', textAlign: 'center' }}>
        {new Date(reading.created_at).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        の鑑定
      </p>
    </main>
  )
}
