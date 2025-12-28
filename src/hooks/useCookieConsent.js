import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'rb_cookie_consent'

export function useCookieConsent() {
  const [status, setStatus] = useState('unknown') // 'unknown' | 'accepted' | 'rejected' | 'customized'

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.status === 'string') {
        setStatus(parsed.status)
      }
    } catch {
      // ignore parse errors; treat as unknown
    }
  }, [])

  const save = useCallback((nextStatus, prefs) => {
    const payload = {
      status: nextStatus,
      preferences: prefs || null,
      updatedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage failures
    }
    setStatus(nextStatus)
  }, [])

  const acceptAll = useCallback(() => {
    save('accepted', { necessary: true, analytics: true, marketing: true })
  }, [save])

  const rejectAll = useCallback(() => {
    save('rejected', { necessary: true, analytics: false, marketing: false })
  }, [save])

  const setCustom = useCallback((prefs) => {
    save('customized', { necessary: true, ...prefs })
  }, [save])

  const hasConsent = status === 'accepted' || status === 'customized'

  return {
    status,
    hasConsent,
    acceptAll,
    rejectAll,
    setCustom,
  }
}
