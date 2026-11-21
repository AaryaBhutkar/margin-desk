import { describe, expect, it } from 'vitest'
import { evidenceFingerprint, exportBrief, parseMemo, publicUrl } from './domain'
import { DEMO_BRIEF, DEMO_MEMO, DEMO_SOURCES } from './demo'

describe('evidence provenance', () => {
  it('accepts a structured brief only when every cited source belongs to the supplied evidence', () => {
    expect(
      parseMemo(
        JSON.stringify(DEMO_MEMO),
        DEMO_SOURCES.map((s) => s.recordId),
      ),
    ).toEqual(DEMO_MEMO)
    const hallucination = structuredClone(DEMO_MEMO)
    hallucination.findings[0].sourceIds = ['invented-source']
    expect(() =>
      parseMemo(
        JSON.stringify(hallucination),
        DEMO_SOURCES.map((s) => s.recordId),
      ),
    ).toThrow('unknown source')
  })
  it('rejects unstructured text and uncited claims', () => {
    expect(() => parseMemo('Probably yes', [])).toThrow()
    const uncited = structuredClone(DEMO_MEMO)
    uncited.counterargument.sourceIds = []
    expect(() =>
      parseMemo(
        JSON.stringify(uncited),
        DEMO_SOURCES.map((s) => s.recordId),
      ),
    ).toThrow()
  })
  it('marks changed selection, stance, or annotations as stale, independent of query order', () => {
    const original = evidenceFingerprint(DEMO_SOURCES)
    expect(evidenceFingerprint([...DEMO_SOURCES].reverse())).toBe(original)
    for (const patch of [
      { included: false },
      { stance: 'context' },
      { note: 'A revised interpretation' },
    ]) {
      const changed = structuredClone(DEMO_SOURCES)
      Object.assign(changed[0].data, patch)
      expect(evidenceFingerprint(changed)).not.toBe(original)
    }
  })
  it('keeps a draft’s source references in the export after a source is removed', () => {
    const brief = structuredClone(DEMO_BRIEF.data)
    brief.finalNote = 'Run a two-week trial.'
    const markdown = exportBrief(brief, DEMO_SOURCES.slice(1))
    expect(markdown).toContain('Run a two-week trial.')
    expect(markdown).toContain(DEMO_SOURCES[0].data.url)
    expect(markdown).toContain('Evidence selection or annotations have changed')
    expect(markdown).not.toContain('[0]')
  })
})

describe('public page URLs', () => {
  it('normalizes fragments so the same page cannot be saved twice under different anchors', () => {
    expect(publicUrl('https://example.com/guide#section')).toBe('https://example.com/guide')
  })
  it.each([
    'javascript:alert(1)',
    'http://example.com',
    'https://localhost/a',
    'https://localhost./a',
    'https://127.0.0.1/a',
    'https://2130706433/a',
    'https://[::1]/a',
    'https://user:password@example.com',
    'https://host.internal/a',
    'https://example.com:8443/a',
  ])('refuses private or executable URL %s', (url) => {
    expect(publicUrl(url)).toBeNull()
  })
})
