import type { Brief, Evidence, Row, Stance } from '../../domain'

export interface DeskProps {
  demo: boolean
  loading?: boolean
  loadError?: string
  ready: boolean
  userName?: string
  briefs: Row<Brief>[]
  current?: Row<Brief>
  sources: Row<Evidence>[]
  onSelect: (id: string) => void
  onSignIn: () => void
  onSignOut: () => void
  onCreate: (question: string, context: string) => Promise<void>
  onSearch: (query: string) => Promise<void>
  onCapture: (url: string) => Promise<string>
  onDraft: () => Promise<void>
  onPatchSource: (id: string, patch: Partial<Evidence>) => Promise<void>
  onPatchBrief: (patch: Partial<Brief>) => Promise<void>
  onRemoveSource: (id: string) => Promise<void>
  onDelete: () => Promise<void>
}

export const stanceLabels: Record<Stance, string> = {
  supports: 'Supports',
  challenges: 'Challenges',
  context: 'Adds context',
}
export const date = (value: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
