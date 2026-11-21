import { test, expect } from '@playwright/test'
import { accountCount, action, RecordSocket, signedApi } from './helpers/research'

test.skip(accountCount < 2, 'Requires two usable DeepSpace CLI test accounts.')

test('private records survive reconnect, sync across sessions, and reject cross-account access', async ({
  baseURL,
}) => {
  test.setTimeout(60000)
  const a = await signedApi(baseURL!, 0)
  const b = await signedApi(baseURL!, 1)
  const sockets: RecordSocket[] = []
  let briefId = ''
  try {
    const created = await action(a.api, a.token, 'createBrief', {
      question: `__test-${Date.now()}__ Should our team replace a weekly status meeting?`,
      context: 'A disposable test fixture.',
    })
    expect(created.body.success, created.body.error).toBe(true)
    briefId = created.body.data.recordId
    const a1 = await RecordSocket.connect(baseURL!, a.token)
    sockets.push(a1)
    const a2 = await RecordSocket.connect(baseURL!, a.token)
    sockets.push(a2)
    const other = await RecordSocket.connect(baseURL!, b.token)
    sockets.push(other)
    const anonymous = await RecordSocket.connect(baseURL!)
    sockets.push(anonymous)
    const mine = await a1.query('briefs', { recordId: briefId })
    expect(mine).toHaveLength(1)
    expect(mine[0].data.ownerId).toBe(a.userId)
    expect(await other.query('briefs', { recordId: briefId, ownerId: a.userId })).toEqual([])
    expect(await anonymous.query('briefs', { recordId: briefId })).toEqual([])
    await a2.query('briefs', { recordId: briefId })
    const change = a2.next(
      (m) =>
        m.type === 'core.record_change' &&
        m.payload.record?.recordId === briefId &&
        m.payload.record?.data?.finalNote === 'A verified, durable decision.',
    )
    const saved = await a1.put('briefs', briefId, { finalNote: 'A verified, durable decision.' })
    expect(saved.success).toBe(true)
    await change
    expect((await other.put('briefs', briefId, { finalNote: 'forged change' })).success).toBe(false)
    expect((await a1.put('briefs', briefId, { ownerId: b.userId })).success).toBe(false)
    expect(
      (await a1.put('briefs', briefId, { memo: { headline: 'Forged model output' } })).success,
    ).toBe(false)
    expect(
      (
        await other.put('evidence', 'forged-source', {
          ownerId: b.userId,
          briefId,
          title: 'forged',
        })
      ).success,
    ).toBe(false)
    const denied = await action(b.api, b.token, 'captureSource', {
      briefId,
      url: 'https://example.com',
    })
    expect(denied.body).toEqual({ success: false, error: 'Brief not found.' })
    const refusedDelete = await action(b.api, b.token, 'deleteBrief', { briefId })
    expect(refusedDelete.body).toEqual({ success: false, error: 'Brief not found.' })
    a1.close()
    const reconnected = await RecordSocket.connect(baseURL!, a.token)
    sockets.push(reconnected)
    expect((await reconnected.query('briefs', { recordId: briefId }))[0].data.finalNote).toBe(
      'A verified, durable decision.',
    )
  } finally {
    sockets.forEach((s) => s.close())
    if (briefId) {
      const deleted = await action(a.api, a.token, 'deleteBrief', { briefId })
      expect(deleted.body.success, deleted.body.error).toBe(true)
    }
    await a.api.dispose()
    await b.api.dispose()
  }
})
