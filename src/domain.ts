import { z } from 'zod/v4'

export type SearchHit = {
  title: string
  url: string
  excerpt: string
  publishedAt?: string
}

const claimSchema = z.object({
  text: z.string().min(1).max(700),
  sourceIds: z.array(z.string()).min(1).max(6),
})

export const memoSchema = z.object({
  headline: z.string().min(1).max(160),
  recommendation: claimSchema,
  findings: z.array(claimSchema).min(2).max(4),
  counterargument: claimSchema,
  uncertainties: z.array(z.string().min(1).max(400)).min(1).max(4),
  nextStep: z.string().min(1).max(400),
})

export type Memo = z.infer<typeof memoSchema>
export type Claim = z.infer<typeof claimSchema>
export type Stance = 'supports' | 'challenges' | 'context'

export type Brief = {
  ownerId: string
  question: string
  context: string
  searchQuery: string
  searchResults: SearchHit[]
  searchedAt: string
  memo: Memo | null
  memoFingerprint: string
  memoSources: SourceSnapshot[]
  draftedAt: string
  finalNote: string
}

export type Evidence = {
  ownerId: string
  briefId: string
  title: string
  url: string
  excerpt: string
  content: string
  capturedAt: string
  publishedAt: string
  included: boolean
  stance: Stance
  note: string
}

export type Row<T> = { recordId: string; data: T; createdAt: string; updatedAt: string }
export type SourceSnapshot = { id: string; title: string; url: string; capturedAt: string }

/** A stable, explicit input representation makes a changed source visibly stale.
 * The full value is stored, rather than a lossy client hash. Content is immutable.
 */
export function evidenceFingerprint(sources: Row<Evidence>[]): string {
  return JSON.stringify(
    sources
      .filter((s) => s.data.included)
      .map((s) => ({
        id: s.recordId,
        capturedAt: s.data.capturedAt,
        stance: s.data.stance,
        note: s.data.note,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  )
}

export function publicUrl(input: string): string | null {
  try {
    const u = new URL(input)
    const h = u.hostname.toLowerCase().replace(/\.$/, '')
    // Page extraction is for ordinary public HTTPS documents. No credentials,
    // IP literals, local hostnames, alternate ports, or executable URL schemes.
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443'))
      return null
    if (!h.includes('.') || /[\[\]:]/.test(h) || /^\d+(\.\d+)*$/.test(h)) return null
    if (/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(h)) return null
    u.hash = ''
    return u.href
  } catch {
    return null
  }
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}

/** Citation membership is checked on the server before anything is saved. This
 * verifies provenance, not that a model's interpretation is factually correct.
 */
export function parseMemo(raw: string, allowedIds: string[]): Memo {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const memo = memoSchema.parse(JSON.parse(text))
  const allowed = new Set(allowedIds)
  for (const claim of [memo.recommendation, ...memo.findings, memo.counterargument]) {
    if (claim.sourceIds.some((id) => !allowed.has(id)))
      throw new Error(
        'The draft referenced an unknown source. Your evidence is safe; try drafting again.',
      )
    claim.sourceIds = [...new Set(claim.sourceIds)]
  }
  return memo
}

export function exportBrief(brief: Brief, sources: Row<Evidence>[]): string {
  const refs = brief.memoSources ?? []
  const cite = (c: Claim) =>
    `${c.text} ${c.sourceIds.map((id) => `[${refs.findIndex((r) => r.id === id) + 1}]`).join(' ')}`
  const lines = [
    `# ${brief.question}`,
    '',
    brief.context,
    '',
    '## Your decision',
    '',
    brief.finalNote || 'No decision recorded yet.',
    '',
  ]
  if (brief.memo) {
    lines.push(
      '## AI-assisted decision brief',
      '',
      brief.memo.headline,
      '',
      cite(brief.memo.recommendation),
      '',
      '### What the evidence says',
      '',
    )
    brief.memo.findings.forEach((c) => lines.push(`- ${cite(c)}`))
    lines.push(
      '',
      '### The strongest counterargument',
      '',
      cite(brief.memo.counterargument),
      '',
      '### Still unknown',
      '',
    )
    brief.memo.uncertainties.forEach((t) => lines.push(`- ${t}`))
    lines.push('', '### Next step', '', brief.memo.nextStep, '', `Drafted: ${brief.draftedAt}`, '')
    if (evidenceFingerprint(sources) !== brief.memoFingerprint)
      lines.push(
        'NOTE: Evidence selection or annotations have changed since this draft. Regenerate before relying on it.',
        '',
      )
    lines.push('## Sources used in this draft', '')
    refs.forEach((r, i) => lines.push(`${i + 1}. ${r.title} — ${r.url} (captured ${r.capturedAt})`))
  }
  lines.push('', '## Research notes', '')
  sources.forEach((s) =>
    lines.push(
      `### ${s.data.title}`,
      '',
      `${s.data.url} · ${s.data.stance} · ${s.data.included ? 'included' : 'excluded'}`,
      '',
      s.data.note || 'No annotation.',
      '',
    ),
  )
  lines.push(
    'Created with Margin. AI text is a draft; citations identify supplied evidence, not independent fact verification.',
  )
  return lines.join('\n')
}
