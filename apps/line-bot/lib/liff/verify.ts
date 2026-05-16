/**
 * LIFFアクセストークンをLINE APIで検証し、実際のuserIdを返す。
 * トークンが無効なら null を返す。
 */
export async function verifyLiffAccessToken(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const profile = (await res.json()) as { userId?: string }
    return profile.userId ?? null
  } catch {
    return null
  }
}
