/* home pattern: product-preview-first — the working research desk, with a clearly labeled example for visitors. */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AuthOverlay,
  signOut,
  useAuth,
  useAuthProfileReady,
  useMutations,
  useQuery,
} from 'deepspace'
import ResearchDesk from '../../components/ResearchDesk'
import { DEMO_BRIEF, DEMO_HITS, DEMO_MEMO, DEMO_SOURCES } from '../../demo'
import { evidenceFingerprint, type Brief, type Evidence, type Memo, type Row } from '../../domain'
import { callAction } from '../../lib/actions'

export default function HomePage() {
  const { isSignedIn, userId } = useAuth()
  return <>{isSignedIn && userId ? <LiveDesk key={userId} /> : <ExampleDesk />}</>
}

function LiveDesk() {
  const { userId } = useAuth()
  const { user } = useAuthProfileReady({ requireUser: true })
  const [params, setParams] = useSearchParams()
  const briefsQuery = useQuery<Brief>('briefs', {
    where: { ownerId: userId! },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 20,
  })
  const briefs = briefsQuery.records
  const requested = params.get('brief')
  const current =
    briefs.find((b) => b.recordId === requested) ?? (!requested ? briefs[0] : undefined)
  const evidenceQuery = useQuery<Evidence>('evidence', {
    where: { briefId: current?.recordId ?? '__none__', ownerId: userId! },
    orderBy: 'createdAt',
    orderDir: 'asc',
    limit: 8,
  })
  const sourceMutations = useMutations<Evidence>('evidence')
  const briefMutations = useMutations<Brief>('briefs')
  const briefId = current?.recordId ?? ''

  return (
    <ResearchDesk
      key={briefId || 'empty'}
      demo={false}
      loading={
        (briefsQuery.status === 'loading' && !briefs.length) ||
        (!!current && evidenceQuery.status === 'loading' && !evidenceQuery.records.length)
      }
      loadError={briefsQuery.error || evidenceQuery.error || undefined}
      ready={sourceMutations.ready && briefMutations.ready}
      userName={user?.name || 'Your workspace'}
      briefs={briefs}
      current={current}
      sources={evidenceQuery.records}
      onSelect={(id) => setParams({ brief: id })}
      onSignIn={() => {}}
      onSignOut={() => {
        void signOut()
      }}
      onCreate={async (question, context) => {
        const result = await callAction<{ recordId: string }>('createBrief', { question, context })
        setParams({ brief: result.recordId })
      }}
      onSearch={async (query) => {
        await callAction('searchEvidence', { briefId, query })
      }}
      onCapture={async (url) =>
        (await callAction<{ recordId: string }>('captureSource', { briefId, url })).recordId
      }
      onDraft={async () => {
        await callAction('draftBrief', { briefId })
      }}
      onPatchSource={(id, patch) => sourceMutations.putConfirmed(id, patch)}
      onPatchBrief={(patch) => briefMutations.putConfirmed(briefId, patch)}
      onRemoveSource={async (sourceId) => {
        await callAction('removeSource', { briefId, sourceId })
      }}
      onDelete={async () => {
        await callAction('deleteBrief', { briefId })
        setParams({})
      }}
    />
  )
}

function ExampleDesk() {
  const [authOpen, setAuthOpen] = useState(false)
  const [brief, setBrief] = useState<Row<Brief>>(() => structuredClone(DEMO_BRIEF))
  const [sources, setSources] = useState<Row<Evidence>[]>(() => structuredClone(DEMO_SOURCES))

  async function draft() {
    const selected = sources.filter((s) => s.data.included)
    if (selected.length < 2 || selected.length > 6)
      throw new Error('Include two to six sources to explore drafting.')
    const ids = selected.map((s) => s.recordId)
    const memo: Memo =
      selected.length === 3
        ? structuredClone(DEMO_MEMO)
        : {
            headline: 'A smaller evidence set leaves more open.',
            recommendation: {
              text: 'Treat this as a limited reading set and test the idea before making a permanent change.',
              sourceIds: ids,
            },
            findings: selected
              .slice(0, 4)
              .map((s) => ({ text: s.data.note || s.data.excerpt, sourceIds: [s.recordId] })),
            counterargument: {
              text: 'This reading set does not settle how your particular team will respond. Seek a different point of view before deciding.',
              sourceIds: ids,
            },
            uncertainties: [
              'What would change after a two-week trial?',
              'What evidence is missing from this selected reading set?',
            ],
            nextStep:
              'Agree on one reversible experiment and the signals you will review at the end.',
          }
    setBrief((b) => ({
      ...b,
      data: {
        ...b.data,
        memo,
        memoFingerprint: evidenceFingerprint(selected),
        memoSources: selected.map((s) => ({
          id: s.recordId,
          title: s.data.title,
          url: s.data.url,
          capturedAt: s.data.capturedAt,
        })),
      },
    }))
  }

  return (
    <>
      <ResearchDesk
        demo
        ready
        briefs={[brief]}
        current={brief}
        sources={sources}
        onSelect={() => {}}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={() => {}}
        onCreate={async () => {
          setAuthOpen(true)
        }}
        onSearch={async (query) => {
          setBrief((b) => ({
            ...b,
            data: { ...b.data, searchQuery: query, searchResults: DEMO_HITS },
          }))
        }}
        onCapture={async (url) => {
          const existing = sources.find((s) => s.data.url === url)
          if (existing) return existing.recordId
          const sample = DEMO_SOURCES.find((s) => s.data.url === url)
          if (!sample)
            throw new Error(
              'The example reads sample URLs only. Sign in to research any public page.',
            )
          setSources((s) => [...s, structuredClone(sample)])
          return sample.recordId
        }}
        onDraft={draft}
        onPatchSource={async (id, patch) => {
          setSources((items) =>
            items.map((s) => (s.recordId === id ? { ...s, data: { ...s.data, ...patch } } : s)),
          )
        }}
        onPatchBrief={async (patch) => {
          setBrief((b) => ({ ...b, data: { ...b.data, ...patch } }))
        }}
        onRemoveSource={async (id) => {
          setSources((items) => items.filter((s) => s.recordId !== id))
        }}
        onDelete={async () => {}}
      />
      {authOpen && <AuthOverlay onClose={() => setAuthOpen(false)} />}
    </>
  )
}
