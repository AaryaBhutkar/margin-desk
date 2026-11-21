import { Moon, Sun } from 'lucide-react'
import { useColorMode } from '../../color-mode'

/** Sun/moon switch. Both icons stay mounted; desk.css turns one into the other. */
export default function ThemeToggle() {
  const { mode, toggle } = useColorMode()
  const label = `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        toggle({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
      }}
    >
      <Sun className="theme-icon theme-icon-sun" size={15} aria-hidden />
      <Moon className="theme-icon theme-icon-moon" size={15} aria-hidden />
    </button>
  )
}
