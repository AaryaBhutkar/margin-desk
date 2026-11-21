import {
  evidenceFingerprint,
  type Brief,
  type Evidence,
  type Row,
  type SearchHit,
  type Memo,
} from './domain'

// Curated, paraphrased teaching example. These are NOT live integration results.
// A visitor can explore the product without creating an account or spending credits.
const stamp = '2026-11-20T16:00:00.000Z'
const samples = [
  {
    id: 'example-1',
    title: 'Asynchronous communication is a practice, not a tool',
    url: 'https://basecamp.com/guides/how-we-communicate',
    excerpt:
      'Written updates let people contribute across time zones. The useful part is the shared context: a clear request, a named owner, and enough time to respond.',
    content:
      'CURATED EXAMPLE — a short paraphrase for exploring Margin, not a captured page.\n\n37signals favors long-form written communication and gives meaningful discussions time to unfold. Its guide treats meetings as an exception, stresses adding enough context, and values a written record people can revisit later.\n\nThe guide also suggests regular written questions to keep teammates informed. For this example team, a useful next step would be agreeing on an update format and how blockers are escalated.\n\nOpen the original source to read the full context.',
    stance: 'supports' as const,
    note: 'Use the same three prompts each week: progress, next, blocked. Name an owner for every blocker.',
  },
  {
    id: 'example-2',
    title: 'Your brain needs a break between meetings',
    url: 'https://www.microsoft.com/en-us/worklab/work-trend-index/brain-research',
    excerpt:
      'A small Microsoft study compared back-to-back video calls with calls separated by breaks. Its guidance also suggests considering written channels for informational updates.',
    content:
      'CURATED EXAMPLE — a short paraphrase for exploring Margin, not a captured page.\n\nMicrosoft Human Factors Lab studied 14 participants wearing EEG equipment during video meetings. In one session, meetings were back to back. In another, participants took meditation breaks between meetings.\n\nThe study associated the breaks with reduced accumulation of stress-related brain activity. The article advises considering other communication modes: informational updates can use documents, chat, or email, while more dynamic or emotional topics may call for a meeting.\n\nThis is a small study of meeting breaks. It does not establish that removing one weekly meeting will improve this specific team’s performance.',
    stance: 'context' as const,
    note: 'Useful context, but not evidence that our particular meeting is unnecessary. Measure the pilot.',
  },
  {
    id: 'example-3',
    title: 'Some conversations still deserve a meeting',
    url: 'https://www.atlassian.com/blog/teamwork/asynchronous-communication',
    excerpt:
      'Async updates can make room for focused work, but ambiguity and sensitive discussions are harder to resolve in a thread. Choose the channel to fit the conversation.',
    content:
      'CURATED EXAMPLE — illustrative editorial notes for exploring Margin, not a captured page or a direct quotation.\n\nAtlassian describes a balance between live and asynchronous communication. Written updates create a record and offer flexibility, while tone can be misunderstood and personal connection can suffer.\n\nThe format should fit the message. A richer conversation can carry tone and context that written words miss. For this example team, that suggests preserving a way to ask for a live discussion.\n\nThis sample represents the counterargument a researcher should actively seek. Open the original source and assess whether its advice fits the team.',
    stance: 'challenges' as const,
    note: 'Keep a 15-minute optional huddle for blockers. Don’t make “async first” a ban on talking.',
  },
]

export const DEMO_SOURCES: Row<Evidence>[] = samples.map((s, i) => ({
  recordId: s.id,
  createdAt: stamp,
  updatedAt: stamp,
  data: {
    ownerId: 'example',
    briefId: 'example',
    title: s.title,
    url: s.url,
    excerpt: s.excerpt,
    content: s.content,
    capturedAt: stamp,
    publishedAt: i === 1 ? '2021-04-20' : '',
    included: true,
    stance: s.stance,
    note: s.note,
  },
}))

export const DEMO_HITS: SearchHit[] = samples.map((s) => ({
  title: s.title,
  url: s.url,
  excerpt: s.excerpt,
}))

export const DEMO_MEMO: Memo = {
  headline: 'Try a smaller meeting before making a permanent change.',
  recommendation: {
    text: 'Run a two-week pilot: replace the round-robin status update with a short written check-in, and keep a 15-minute huddle for blockers. Agree on when updates are due and who responds before cancelling the recurring meeting.',
    sourceIds: ['example-1', 'example-3'],
  },
  findings: [
    {
      text: 'Written updates need a shared structure and explicit response expectations. Moving the same conversation into a chat channel is only a change of location.',
      sourceIds: ['example-1'],
    },
    {
      text: 'There is a reason to protect time between calls, but the small study on meeting breaks does not prove that this particular weekly meeting should disappear.',
      sourceIds: ['example-2'],
    },
    {
      text: 'A live conversation remains useful for ambiguity or disagreement. Preserve an easy way to escalate a blocker.',
      sourceIds: ['example-3'],
    },
  ],
  counterargument: {
    text: 'The status meeting may be doing work that is missing from the agenda: building context, catching confusion, or helping someone ask for help. A written update could hide those signals unless the pilot explicitly checks for them.',
    sourceIds: ['example-3'],
  },
  uncertainties: [
    'How many blockers are first discovered during the existing meeting?',
    'Will everyone read and respond to the written updates on time?',
    'Does the team value the social contact enough to retain a separate touchpoint?',
  ],
  nextStep:
    'Ask the team to record meeting time, missed context, and unresolved blockers for two weeks. Review those three signals together before deciding.',
}

export const DEMO_BRIEF: Row<Brief> = {
  recordId: 'example',
  createdAt: stamp,
  updatedAt: stamp,
  data: {
    ownerId: 'example',
    question: 'Could our weekly status meeting be an async update?',
    context:
      'A remote team of six. Our 45-minute Monday meeting is mostly round-robin updates. We want the time back, without letting blockers slip through.',
    searchQuery: 'when to replace status meetings with asynchronous updates',
    searchResults: DEMO_HITS,
    searchedAt: stamp,
    memo: DEMO_MEMO,
    memoFingerprint: evidenceFingerprint(DEMO_SOURCES),
    memoSources: DEMO_SOURCES.map((s) => ({
      id: s.recordId,
      title: s.data.title,
      url: s.data.url,
      capturedAt: stamp,
    })),
    draftedAt: stamp,
    finalNote: '',
  },
}
