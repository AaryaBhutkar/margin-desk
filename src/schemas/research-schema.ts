import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

const privatePolicy = (fields: string[]): Record<string, RolePermissions> => ({
  '*': { read: false, create: false, update: false, delete: false },
  viewer: { read: false, create: false, update: false, delete: false },
  member: { read: 'own', create: false, update: 'own', delete: false, writableFields: fields },
  admin: { read: 'own', create: false, update: 'own', delete: false, writableFields: fields },
})
const text = (name: string, maxLength = 2000) => ({
  name,
  storage: 'text' as const,
  interpretation: 'plain',
  maxLength,
})
const json = (name: string) => ({
  name,
  storage: 'text' as const,
  interpretation: { kind: 'json' as const },
})
const owner = { ...text('ownerId', 128), required: true, userBound: true, immutable: true }

export const briefsSchema: CollectionSchema = {
  name: 'briefs',
  ownerField: 'ownerId',
  columns: [
    owner,
    text('question', 240),
    text('context', 1200),
    text('searchQuery', 300),
    json('searchResults'),
    text('searchedAt'),
    json('memo'),
    text('memoFingerprint', 20000),
    json('memoSources'),
    text('draftedAt'),
    text('finalNote', 3000),
  ],
  permissions: privatePolicy(['finalNote']),
}

export const evidenceSchema: CollectionSchema = {
  name: 'evidence',
  ownerField: 'ownerId',
  uniqueOn: ['briefId', 'url'],
  columns: [
    owner,
    { ...text('briefId'), immutable: true, required: true },
    text('title', 400),
    text('url', 2000),
    text('excerpt', 700),
    text('content', 18000),
    text('capturedAt'),
    text('publishedAt'),
    { name: 'included', storage: 'number', interpretation: { kind: 'boolean' } },
    {
      name: 'stance',
      storage: 'text',
      interpretation: { kind: 'select', options: ['supports', 'challenges', 'context'] },
    },
    text('note', 1200),
  ],
  permissions: privatePolicy(['included', 'stance', 'note']),
}
