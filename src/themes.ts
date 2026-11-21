/** Margin’s theme metadata; its color tokens live in themes.css. */
export const THEMES = [
  {
    id: 'margin',
    label: 'Margin',
    description: 'Warm paper and forest ink, with room for a counterpoint.',
  },
] as const
export type ThemeId = (typeof THEMES)[number]['id']
export function getActiveTheme(): ThemeId {
  return 'margin'
}
export function getTheme(_id: string) {
  return THEMES[0]
}
