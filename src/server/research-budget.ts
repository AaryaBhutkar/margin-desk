import { DurableObject } from 'cloudflare:workers'
import type { Env } from '../../worker'

export type Operation = 'search' | 'capture' | 'draft' | 'manage'
export const DAILY_LIMITS: Record<Operation, number> = {
  search: 6,
  capture: 12,
  draft: 4,
  manage: 60,
}
export const APP_DAILY_LIMIT = 100

/** One app-wide native Durable Object provides atomic counters and leases.
 * No public route reaches this class. Counters count attempts, including failed
 * upstream calls. Expiring leases recover from an interrupted Worker request.
 */
export class ResearchBudget extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS usage (day TEXT, who TEXT, kind TEXT, count INTEGER, PRIMARY KEY(day, who, kind))',
    )
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS leases (resource TEXT PRIMARY KEY, token TEXT, expires INTEGER)',
    )
  }

  async fetch(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      userId: string
      resource: string
      kind: Operation
      token?: string
    }
    const sql = this.ctx.storage.sql
    if (new URL(request.url).pathname === '/release') {
      sql.exec(
        'DELETE FROM leases WHERE resource = ? AND token = ?',
        body.resource,
        body.token ?? '',
      )
      return Response.json({ ok: true })
    }
    const now = Date.now()
    const day = new Date(now).toISOString().slice(0, 10)
    return this.ctx.storage.transactionSync(() => {
      sql.exec('DELETE FROM usage WHERE day < ?', day)
      sql.exec('DELETE FROM leases WHERE expires < ?', now)
      if (sql.exec('SELECT token FROM leases WHERE resource = ?', body.resource).toArray().length) {
        return Response.json({
          ok: false,
          error: 'Another operation is running for this brief. Wait a moment, then try again.',
        })
      }
      const count = (who: string, kind: string) =>
        Number(
          sql
            .exec<{ count: number }>(
              'SELECT count FROM usage WHERE day = ? AND who = ? AND kind = ?',
              day,
              who,
              kind,
            )
            .toArray()[0]?.count ?? 0,
        )
      if (count(body.userId, body.kind) >= DAILY_LIMITS[body.kind]) {
        return Response.json({
          ok: false,
          error: `Daily limit reached: ${DAILY_LIMITS[body.kind]} ${body.kind} operations per person. It resets at 00:00 UTC. Saved research is still available.`,
        })
      }
      if (body.kind !== 'manage' && count('*', '*') >= APP_DAILY_LIMIT) {
        return Response.json({
          ok: false,
          error:
            'Margin has reached its shared daily research limit. It resets at 00:00 UTC. You can still read, annotate, and export.',
        })
      }
      const increment = (who: string, kind: string) =>
        sql.exec(
          'INSERT INTO usage (day, who, kind, count) VALUES (?, ?, ?, 1) ON CONFLICT(day, who, kind) DO UPDATE SET count = count + 1',
          day,
          who,
          kind,
        )
      increment(body.userId, body.kind)
      if (body.kind !== 'manage') increment('*', '*')
      const token = crypto.randomUUID()
      sql.exec(
        'INSERT INTO leases (resource, token, expires) VALUES (?, ?, ?)',
        body.resource,
        token,
        now + 130000,
      )
      return Response.json({ ok: true, token })
    })
  }
}
