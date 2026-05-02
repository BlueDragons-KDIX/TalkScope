/**
 * 設定のアクセント色（SettingsModal の theme と同一キー）に対し、
 * 色相環上の補色に近い別テーマを返す。発表後フェーズのアクセント切替に使う。
 *
 * ペア: blue↔orange, rose↔emerald。indigo / purple はパレット上の補色に近い色へ割当。
 */
const OPPOSITE: Record<string, string> = {
  blue: 'orange',
  orange: 'blue',
  indigo: 'orange',
  purple: 'emerald',
  rose: 'emerald',
  emerald: 'rose',
}

export function getOppositeThemeColor(themeColor: string): string {
  return OPPOSITE[themeColor] ?? themeColor
}
