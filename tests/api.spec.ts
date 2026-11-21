import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { accountCount, action, signedApi } from './helpers/research'

const actionNames = [
  'createBrief',
  'searchEvidence',
  'captureSource',
  'draftBrief',
  'removeSource',
  'deleteBrief',
]
for (const name of actionNames) {
  test(`${name} requires a verified caller`, async ({ request }) => {
    const response = await request.post(`/api/actions/${name}`, { data: {} })
    expect(response.status()).toBe(401)
  })
}

test('forged bearer token is refused', async ({ request }) => {
  const response = await request.post('/api/actions/createBrief', {
    headers: { Authorization: 'Bearer forged-token' },
    data: { question: 'Should this caller be trusted?' },
  })
  expect(response.status()).toBe(401)
})

test('generic integration proxy cannot spend developer credits', async ({ request }) => {
  const response = await request.post('/api/integrations/openai/chat-completion', {
    data: { messages: [] },
  })
  expect(response.status()).toBe(403)
  expect(await response.json()).toMatchObject({ success: false })
})

test.describe('authenticated action validation', () => {
  test.skip(accountCount < 1, 'Requires a DeepSpace CLI test account.')
  let api: APIRequestContext
  let token: string
  test.beforeAll(async ({ baseURL }) => {
    ;({ api, token } = await signedApi(baseURL!))
  })
  test.afterAll(async () => {
    await api?.dispose()
  })

  test('prototype names are not callable actions', async () => {
    const result = await action(api, token, 'constructor', {})
    expect(result.status).toBe(404)
    expect(result.body).not.toHaveProperty('env')
  })
  test('invalid questions are rejected before creating a record', async () => {
    const result = await action(api, token, 'createBrief', { question: 'yes?' })
    expect(result.body.success).toBe(false)
    expect(result.body.error).toContain('question')
  })
  test('a missing brief is handled consistently', async () => {
    const result = await action(api, token, 'searchEvidence', {
      briefId: 'missing-test-brief',
      query: 'No provider should be called',
    })
    expect(result.body).toEqual({ success: false, error: 'Brief not found.' })
  })
})
