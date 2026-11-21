import { test, expect } from '@playwright/test'
import { accountCount, action, RecordSocket, signedApi } from './helpers/research'
import { parseMemo } from '../src/domain'

// Opt-in: one real search, two different page captures (the minimum evidence
// set), and one model call. No provider mocks and no automatic retries.
// This can spend the app owner's DeepSpace credits.
test.skip(
  process.env.MARGIN_LIVE_CHECK !== '1' || accountCount < 1,
  'Set MARGIN_LIVE_CHECK=1 to run the bounded paid integration check.',
)

test('real search → two saved snapshots → cited brief → durable decision', async ({ baseURL }) => {
  test.setTimeout(180000)
  const user = await signedApi(baseURL!)
  let briefId = ''
  let socket: RecordSocket | undefined
  try {
    const created = await action(user.api, user.token, 'createBrief', {
      question: `__test-${Date.now()}__ Should a small internal tool use SQLite?`,
      context:
        'A small team, modest write concurrency, one application server. Compare the suitability and limitations.',
    })
    expect(created.body.success, created.body.error).toBe(true)
    briefId = created.body.data.recordId
    const search = await action(user.api, user.token, 'searchEvidence', {
      briefId,
      query: 'SQLite appropriate uses small website many concurrent writers official documentation',
    })
    expect(search.body.success, search.body.error).toBe(true)
    socket = await RecordSocket.connect(baseURL!, user.token)
    let brief = (await socket.query('briefs', { recordId: briefId }))[0]
    expect(brief.data.searchResults.length).toBeGreaterThan(0)
    const first = await action(user.api, user.token, 'captureSource', {
      briefId,
      url: 'https://www.sqlite.org/whentouse.html',
    })
    expect(first.body.success, first.body.error).toBe(true)
    const second = await action(user.api, user.token, 'captureSource', {
      briefId,
      url: 'https://www.sqlite.org/lockingv3.html',
    })
    expect(second.body.success, second.body.error).toBe(true)
    const evidence = await socket.query('evidence', { briefId })
    expect(evidence).toHaveLength(2)
    expect(evidence.every((s) => s.data.content.length >= 120)).toBe(true)
    expect(
      (
        await socket.put('evidence', first.body.data.recordId, {
          stance: 'supports',
          note: 'Check whether our actual write concurrency fits this guidance.',
        })
      ).success,
    ).toBe(true)
    const draft = await action(user.api, user.token, 'draftBrief', { briefId })
    expect(draft.body.success, draft.body.error).toBe(true)
    brief = (await socket.query('briefs', { recordId: briefId }))[0]
    expect(
      parseMemo(
        JSON.stringify(brief.data.memo),
        evidence.map((s) => s.recordId),
      ),
    ).toBeTruthy()
    expect(brief.data.memoSources).toHaveLength(2)
    expect(
      (
        await socket.put('briefs', briefId, {
          finalNote: 'Prototype with a representative write load before deciding.',
        })
      ).success,
    ).toBe(true)
    socket.close()
    socket = await RecordSocket.connect(baseURL!, user.token)
    const persisted = (await socket.query('briefs', { recordId: briefId }))[0]
    expect(persisted.data.finalNote).toContain('representative write load')
    console.info(
      'Verified Exa search, two Firecrawl snapshots, OpenAI structured citations, and reconnect persistence.',
    )
  } finally {
    socket?.close()
    if (briefId) {
      const deleted = await action(user.api, user.token, 'deleteBrief', { briefId })
      expect(deleted.body.success, deleted.body.error).toBe(true)
    }
    await user.api.dispose()
  }
})
