import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { ACCENT_RGB, getAccentRgb } from './accentTokens'

export type AccentThemeContextValue = {
  themeKey: string
  /** 例: "99,102,241" — `rgba(${rgb},a)` / `rgb(${rgb})` にそのまま使える */
  rgb: string
}

const defaultValue: AccentThemeContextValue = {
  themeKey: 'indigo',
  rgb: ACCENT_RGB.indigo,
}

const AccentThemeContext = createContext<AccentThemeContextValue>(defaultValue)

export function AccentThemeProvider({
  themeColor,
  children,
}: {
  themeColor: string
  children: React.ReactNode
}) {
  const rgb = useMemo(() => getAccentRgb(themeColor), [themeColor])
  const value = useMemo(
    () => ({ themeKey: themeColor, rgb }),
    [themeColor, rgb],
  )

  useEffect(() => {
    const channels = rgb.split(',').map((s) => s.trim()).join(' ')
    document.documentElement.style.setProperty('--app-accent-rgb', channels)
    return () => {
      document.documentElement.style.removeProperty('--app-accent-rgb')
    }
  }, [rgb])

  return <AccentThemeContext.Provider value={value}>{children}</AccentThemeContext.Provider>
}

export function useAccentTheme(): AccentThemeContextValue {
  return useContext(AccentThemeContext)
}
