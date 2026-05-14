/** SettingsModal / LayoutEngine と同一キー。値は CSS `rgb(r,g,b)` 用のカンマ区切りチャンネル。 */
export const ACCENT_RGB: Record<string, string> = {
  blue: '59,130,246',
  indigo: '99,102,241',
  purple: '168,85,247',
  rose: '244,63,94',
  emerald: '16,185,129',
  orange: '249,115,22',
}

export type AccentThemeKey = keyof typeof ACCENT_RGB

export function getAccentRgb(themeColor: string): string {
  return ACCENT_RGB[themeColor] ?? ACCENT_RGB.indigo
}
