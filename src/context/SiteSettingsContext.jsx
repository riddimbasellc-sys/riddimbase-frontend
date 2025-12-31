import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const STORAGE_KEY = 'rb_site_settings_v1'

// Default design system settings for RiddimBase
const defaultSettings = {
  theme: {
    primaryColor: '#ef4444',
    secondaryColor: '#0f172a',
    accentColor: '#f97316',
    backgroundColor: '#020617',
    surfaceColor: '#020617',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  announcement: {
    enabled: true,
    text: 'Welcome to RiddimBase – the home of Caribbean beats.',
    backgroundColor: '#111827',
    textColor: '#e5e7eb',
  },
  navigation: {
    links: [
      { id: 'home', label: 'Home', href: '/', visible: true, external: false },
      { id: 'beats', label: 'Beats', href: '/beats', visible: true, external: false },
      { id: 'producers', label: 'Producers', href: '/producers', visible: true, external: false },
      { id: 'jobs', label: 'Jobs', href: '/jobs', visible: true, external: false },
    ],
  },
  hero: {
    banners: [
      {
        id: 'main',
        title: 'Your first hit starts here.',
        subtitle: 'Browse curated Caribbean beats, soundkits and services.',
        backgroundUrl: '',
        ctaText: 'Explore beats',
        ctaHref: '/beats',
        active: true,
      },
    ],
    // Used when no hero media background is configured.
    backgroundColor: '#050505',
  },
  advancedCss: '',
}

const SETTINGS_STYLE_ID = 'rb-custom-css-settings'

const SiteSettingsContext = createContext({
  settings: defaultSettings,
  loading: true,
  error: null,
  saving: false,
  setSettings: () => {},
  saveSettings: async () => {},
})

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      let stored = null
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object') {
              stored = parsed
            }
          }
        } catch (e) {
          console.warn('[SiteSettings] failed to parse stored settings', e)
        }
      }
      try {
        const endpoint = API_BASE ? `${API_BASE}/api/settings` : '/api/settings'
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`)
        const data = await res.json()
        if (!cancelled && data) {
          const merged = { ...defaultSettings, ...data }
          setSettings(merged)
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
            } catch (e) {
              console.warn('[SiteSettings] failed to store settings', e)
            }
          }
        }
      } catch (err) {
        console.warn('[SiteSettings] fallback -> defaults:', err.message)
        if (!cancelled) {
          if (stored) {
            setSettings({ ...defaultSettings, ...stored })
          } else {
            setSettings(defaultSettings)
          }
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const theme = settings.theme || {}

    root.style.setProperty('--rb-primary', theme.primaryColor || '#ef4444')
    root.style.setProperty('--rb-secondary', theme.secondaryColor || '#0f172a')
    root.style.setProperty('--rb-accent', theme.accentColor || '#f97316')
    root.style.setProperty('--rb-bg', theme.backgroundColor || '#020617')
    root.style.setProperty('--rb-surface', theme.surfaceColor || '#020617')
    root.style.setProperty(
      '--rb-font',
      theme.fontFamily || defaultSettings.theme.fontFamily,
    )

    document.body.style.setProperty(
      'font-family',
      theme.fontFamily || defaultSettings.theme.fontFamily,
    )
  }, [settings])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const css = settings.advancedCss || ''
    let styleEl = document.getElementById(SETTINGS_STYLE_ID)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = SETTINGS_STYLE_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css
  }, [settings.advancedCss])

  const saveSettings = useCallback(
    async (nextSettings) => {
      setSaving(true)
      setError(null)
      try {
        const endpoint = API_BASE ? `${API_BASE}/api/settings` : '/api/settings'
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextSettings),
        })
        if (!res.ok) throw new Error(`Failed to save settings (${res.status})`)
        const data = await res.json()
        const merged = data || nextSettings
        setSettings(merged)
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          } catch (e) {
            console.warn('[SiteSettings] failed to store settings after save', e)
          }
        }
      } catch (err) {
        console.error('[SiteSettings] save error', err)
        setError(err.message)
        setSettings(nextSettings)
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings))
          } catch (e) {
            console.warn('[SiteSettings] failed to store fallback settings after save', e)
          }
        }
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      saving,
      setSettings,
      saveSettings,
    }),
    [settings, loading, error, saving, saveSettings],
  )

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
