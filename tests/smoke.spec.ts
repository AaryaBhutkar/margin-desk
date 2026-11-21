import { test, expect } from '@playwright/test'

// Browser interaction and responsive layout are also checked in the in-app
// browser. These checks deliberately need no local Chromium installation.
for (const path of ['/', '/home']) {
  test(`app shell and metadata are served at ${path}`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('Margin — A decision desk')
    expect(html).toContain('id="root"')
    expect(html).toContain('noindex, nofollow')
    const script = html.match(/<script[^>]+src="([^"]+)"/)
    expect(script).not.toBeNull()
    const bundle = await request.get(script![1])
    expect(bundle.ok()).toBeTruthy()
    expect(bundle.headers()['content-type']).toMatch(/javascript/)
  })
}

test('missing assets and API routes return real 404 responses', async ({ request }) => {
  const asset = await request.get('/assets/removed-build-chunk.js')
  expect(asset.status()).toBe(404)
  const api = await request.get('/api/this-route-does-not-exist')
  expect(api.status()).toBe(404)
  expect(await api.text()).not.toContain('id="root"')
})
