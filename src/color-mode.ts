/**
 * Light and dark mode, carried on the SDK's `data-ui-theme` attribute.
 *
 * index.html applies the saved or system mode before first paint, so a page
 * never flashes the wrong paper. This module keeps it in sync afterwards:
 * `applyUIThemeTokens` restyles DeepSpace's own components, and
 * `canvas-theme-changed` is the event the SDK's `useIsDarkTheme` listens for.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { applyUIThemeTokens } from 'deepspace'

export type ColorMode = 'light' | 'dark'

/** Keep in sync with the inline script in index.html. */
export const COLOR_MODE_KEY = 'margin:color-mode'
const CHANGE_EVENT = 'canvas-theme-changed'
const SYSTEM_DARK = '(prefers-color-scheme: dark)'

/** A choice the reader made wins; otherwise follow the system setting. */
export function resolveColorMode(saved: string | null, systemPrefersDark: boolean): ColorMode {
  if (saved === 'light' || saved === 'dark') return saved
  return systemPrefersDark ? 'dark' : 'light'
}

function currentMode(): ColorMode {
  return document.documentElement.dataset.uiTheme === 'dark' ? 'dark' : 'light'
}

function savedMode(): string | null {
  try {
    return localStorage.getItem(COLOR_MODE_KEY)
  } catch {
    return null // Storage can be blocked; the system setting still applies.
  }
}

function apply(mode: ColorMode) {
  const root = document.documentElement
  root.dataset.uiTheme = mode
  applyUIThemeTokens(mode, root)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * Switch modes. Where the browser supports view transitions, the new mode is
 * revealed as a circle growing from `origin` (the toggle); see desk.css.
 */
export function setColorMode(mode: ColorMode, origin?: { x: number; y: number }) {
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode)
  } catch {
    // Switch anyway; the choice just will not persist.
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduceMotion) return apply(mode)
  const root = document.documentElement
  root.style.setProperty('--reveal-x', `${origin?.x ?? window.innerWidth / 2}px`)
  root.style.setProperty('--reveal-y', `${origin?.y ?? 0}px`)
  // flushSync lets React re-render (the toggle's icon) inside the transition's snapshot.
  document.startViewTransition(() => flushSync(() => apply(mode)))
}

/** Sync SDK tokens with the pre-paint mode and follow system changes until the reader chooses. */
export function installColorMode() {
  apply(currentMode())
  window.matchMedia(SYSTEM_DARK).addEventListener('change', (event) => {
    if (!savedMode()) apply(resolveColorMode(null, event.matches))
  })
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export function useColorMode() {
  const mode = useSyncExternalStore(subscribe, currentMode, () => 'light' as const)
  const toggle = useCallback(
    (origin?: { x: number; y: number }) => setColorMode(mode === 'dark' ? 'light' : 'dark', origin),
    [mode],
  )
  return { mode, toggle }
}
