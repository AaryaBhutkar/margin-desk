import { getAuthToken } from 'deepspace'

export async function callAction<T = Record<string, unknown>>(
  name: string,
  params: Record<string, unknown>,
): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Sign in to save and research your own questions.')
  const response = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(115000),
  })
  const result = (await response.json()) as { success?: boolean; data?: T; error?: string }
  if (!response.ok || !result.success)
    throw new Error(result.error || 'The request could not finish. Try again.')
  return result.data as T
}
