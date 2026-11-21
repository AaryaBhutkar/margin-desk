import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import { COLOR_MODE_KEY, resolveColorMode } from './color-mode'

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''

const cases: [saved: string | null, systemDark: boolean, expected: 'light' | 'dark'][] = [
  [null, false, 'light'],
  [null, true, 'dark'],
  ['light', true, 'light'],
  ['dark', false, 'dark'],
  ['sepia', true, 'dark'], // an unknown value falls back to the system
  ['sepia', false, 'light'],
]

describe('color mode', () => {
  it.each(cases)('saved %s with system dark=%s resolves to %s', (saved, systemDark, expected) => {
    expect(resolveColorMode(saved, systemDark)).toBe(expected)
  })

  it('the pre-paint script in index.html applies the same rule and storage key', () => {
    expect(script).toContain(COLOR_MODE_KEY)
    for (const [saved, systemDark, expected] of cases) {
      const root = { dataset: {} as Record<string, string> }
      new Function('localStorage', 'matchMedia', 'document', script)(
        { getItem: (key: string) => (key === COLOR_MODE_KEY ? saved : null) },
        () => ({ matches: systemDark }),
        { documentElement: root },
      )
      expect(root.dataset.uiTheme).toBe(expected)
    }
  })

  it('still applies the system mode when storage is blocked', () => {
    const root = { dataset: {} as Record<string, string> }
    new Function('localStorage', 'matchMedia', 'document', script)(
      {
        getItem: () => {
          throw new Error('blocked')
        },
      },
      () => ({ matches: true }),
      { documentElement: root },
    )
    expect(root.dataset.uiTheme).toBe('dark')
  })
})
