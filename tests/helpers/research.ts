import { request, expect, type APIRequestContext } from '@playwright/test'
import { loadAllTestAccounts, getStatePathForEmail } from 'deepspace/testing'
import { clientBuild, encode } from 'deepspace'
import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export const appId = readFileSync(new URL('../../wrangler.toml', import.meta.url), 'utf8').match(
  /DEEPSPACE_APP_ID\s*=\s*"([^"]+)"/,
)![1]
export const scope = `app:${appId}`
export const accountCount = loadAllTestAccounts().length

export async function signedApi(baseURL: string, index = 0) {
  const account = loadAllTestAccounts()[index]
  if (!account)
    throw new Error(
      'Create test accounts using the DeepSpace CLI before running authenticated checks.',
    )
  const statePath = getStatePathForEmail(account.email, baseURL)
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
    storageState: existsSync(statePath) ? statePath : undefined,
  })
  let tokenResponse = await api.post('/api/auth/token')
  if (!tokenResponse.ok()) {
    const login = await api.post('/api/auth/sign-in/email', {
      data: { email: account.email, password: account.password },
    })
    expect(login.status(), 'test account sign-in').toBe(200)
    tokenResponse = await api.post('/api/auth/token')
  }
  expect(tokenResponse.status(), 'JWT for authenticated API checks').toBe(200)
  const { token } = (await tokenResponse.json()) as { token: string }
  expect(typeof token).toBe('string')
  mkdirSync(dirname(statePath), { recursive: true })
  await api.storageState({ path: statePath })
  chmodSync(statePath, 0o600)
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  return { api, token, userId: claims.sub as string }
}

export async function action(
  api: APIRequestContext,
  token: string,
  name: string,
  params: Record<string, unknown>,
) {
  const response = await api.post(`/api/actions/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: params,
    timeout: 110000,
  })
  return { status: response.status(), body: await response.json() }
}

type Message = { type: string; payload: Record<string, any> }

/** Real SDK wire messages against the real RecordRoom; no app routes or hooks
 * are mocked. Tokens stay in memory and are never included in test reports.
 */
export class RecordSocket {
  private socket: WebSocket
  private messages: Message[] = []
  private listeners = new Set<() => void>()
  private constructor(url: string) {
    this.socket = new WebSocket(url)
    this.socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return
      try {
        this.messages.push(JSON.parse(event.data))
        this.listeners.forEach((f) => f())
      } catch {
        /* Yjs binary frames are irrelevant here. */
      }
    })
  }
  static async connect(baseURL: string, token?: string) {
    const url = new URL(`/ws/${encodeURIComponent(scope)}`, baseURL)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    if (token) url.searchParams.set('token', token)
    const connection = new RecordSocket(url.href)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Record socket did not open in time.')),
        15000,
      )
      connection.socket.addEventListener(
        'open',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
      connection.socket.addEventListener(
        'error',
        () => {
          clearTimeout(timer)
          reject(new Error('Record socket connection failed.'))
        },
        { once: true },
      )
    })
    return connection
  }
  next(predicate: (message: Message) => boolean, timeout = 10000): Promise<Message> {
    return new Promise((resolve, reject) => {
      const inspect = () => {
        const index = this.messages.findIndex(predicate)
        if (index < 0) return
        clearTimeout(timer)
        this.listeners.delete(inspect)
        resolve(this.messages.splice(index, 1)[0])
      }
      const timer = setTimeout(() => {
        this.listeners.delete(inspect)
        reject(new Error('Expected RecordRoom acknowledgement did not arrive.'))
      }, timeout)
      this.listeners.add(inspect)
      inspect()
    })
  }
  async query(collection: string, where: Record<string, unknown> = {}) {
    const subscriptionId = randomUUID()
    const reply = this.next(
      (m) => m.type === 'core.query_result' && m.payload.subscriptionId === subscriptionId,
    )
    this.socket.send(
      encode(clientBuild.subscribe(subscriptionId, { collection, where, limit: 30 })),
    )
    return (await reply).payload.records as { recordId: string; data: Record<string, any> }[]
  }
  async put(collection: string, id: string, data: Record<string, unknown>) {
    const requestId = randomUUID()
    const reply = this.next((m) => m.type === 'records.ack' && m.payload.requestId === requestId)
    this.socket.send(encode(clientBuild.put(collection, id, data, requestId)))
    return (await reply).payload
  }
  close() {
    this.socket.close()
  }
}
