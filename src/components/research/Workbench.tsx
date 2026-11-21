import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  Link2,
  LockKeyhole,
  Plus,
  Search,
} from 'lucide-react'
import {
  Button,
  EmptyState,
  Input,
  Label,
  Modal,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui'
import { evidenceFingerprint, hostname, type Brief, type Row, type Stance } from '../../domain'
import { date, stanceLabels, type DeskProps } from './shared'
import EvidenceCard from './EvidenceCard'
import { CitedClaim, DecisionNote } from './BriefNotes'

type WorkbenchProps = DeskProps & {
  current: Row<Brief>
  disabled: boolean
  busy: string
  run: (label: string, action: () => Promise<void>, success?: string) => Promise<boolean>
  onRead: (id: string) => void
  onCite: (id: string) => void
}

export default function Workbench(p: WorkbenchProps) {
  const { current, sources, disabled, run, demo } = p
  const [tab, setTab] = useState('evidence')
  const [query, setQuery] = useState(current.data.searchQuery || current.data.question)
  const [showSearch, setShowSearch] = useState(!sources.length)
  const [urlOpen, setUrlOpen] = useState(false)
  const [url, setUrl] = useState('')
  const included = sources.filter((s) => s.data.included)
  const stale = !!current.data.memo && current.data.memoFingerprint !== evidenceFingerprint(sources)
  const results = current.data.searchResults ?? []
  const [resultFilter, setResultFilter] = useState('')
  const visibleResults = results.filter((r) =>
    `${r.title} ${r.excerpt}`.toLowerCase().includes(resultFilter.toLowerCase()),
  )

  const draft = () =>
    run(
      'Drafting your brief',
      async () => {
        await p.onDraft()
        setTab('brief')
      },
      'Decision brief ready',
    )
  const capture = (sourceUrl: string) =>
    run(
      'Reading and saving source',
      async () => {
        const id = await p.onCapture(sourceUrl)
        p.onRead(id)
        setUrlOpen(false)
        setUrl('')
      },
      'Source read and saved',
    )

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="workbench">
      <div className="workbench-tabs">
        <TabsList className="desk-tabs">
          <TabsTrigger value="evidence">
            <BookOpen size={15} />
            Evidence <span className="tab-count">{sources.length}</span>
          </TabsTrigger>
          <TabsTrigger value="brief">
            <FileText size={15} />
            Decision brief
            {current.data.memo && <span className={`tab-dot ${stale ? 'stale' : ''}`} />}
          </TabsTrigger>
        </TabsList>
        <span className="selection-count">{included.length} of 6 sources included</span>
      </div>
      <TabsContent value="evidence" className="workbench-panel">
        <div className="workbench-grid">
          <section className="evidence-column" aria-label="Evidence workspace">
            <div className="section-heading">
              <div>
                <h2>Your evidence</h2>
                <p>Read first. Keep what matters.</p>
              </div>
              <div className="source-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUrlOpen(true)}
                  disabled={disabled}
                >
                  <Link2 size={14} />
                  Add URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={showSearch}
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search size={14} />
                  Find sources
                </Button>
              </div>
            </div>
            {showSearch && (
              <div className="search-panel">
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    void run('Searching the web', () => p.onSearch(query), 'Search complete')
                  }}
                >
                  <Label htmlFor="source-search">Look beyond the first answer.</Label>
                  <div className="search-row">
                    <Input
                      id="source-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      minLength={4}
                      maxLength={300}
                      placeholder="Search for evidence, alternatives, or a counterargument…"
                      disabled={disabled}
                      required
                    />
                    <Button
                      type="submit"
                      disabled={disabled || query.trim().length < 4}
                      loading={p.busy === 'Searching the web'}
                    >
                      <Search size={15} />
                      Search{demo ? ' example' : ''}
                    </Button>
                  </div>
                </form>
                {demo && (
                  <p className="small-hint">
                    Example search shows the curated sample below. Your own desk searches the live
                    web.
                  </p>
                )}
                {current.data.searchedAt && (
                  <>
                    <div className="search-results-label">
                      <span>
                        {results.length} results ·{' '}
                        {demo ? 'curated sample' : `searched ${date(current.data.searchedAt)}`}
                      </span>
                      {results.length > 2 && (
                        <Input
                          aria-label="Filter search results"
                          placeholder="Filter results"
                          value={resultFilter}
                          onChange={(e) => setResultFilter(e.target.value)}
                        />
                      )}
                    </div>
                    {!visibleResults.length ? (
                      <p className="inline-empty">
                        No matching sources. Try a more specific query or add a public URL.
                      </p>
                    ) : (
                      <div className="search-results">
                        {visibleResults.map((hit) => {
                          const saved = sources.find((s) => s.data.url === hit.url)
                          return (
                            <article key={hit.url} className="search-result">
                              <div>
                                <span className="source-domain">{hostname(hit.url)}</span>
                                <h3>
                                  <a href={hit.url} target="_blank" rel="noopener noreferrer">
                                    {hit.title} <ArrowUpRight size={12} />
                                  </a>
                                </h3>
                                <p>{hit.excerpt}</p>
                              </div>
                              <Button
                                variant={saved ? 'ghost' : 'outline'}
                                size="sm"
                                disabled={!saved && disabled}
                                onClick={() =>
                                  saved ? p.onRead(saved.recordId) : void capture(hit.url)
                                }
                              >
                                {saved ? (
                                  <>
                                    <Check size={13} />
                                    Read
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} />
                                    Read & save
                                  </>
                                )}
                              </Button>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {!sources.length ? (
              <EmptyState
                icon={<BookOpen />}
                title="The question is a starting point."
                description="Search above or add a public URL. Read at least two sources before drafting, including a different point of view."
              />
            ) : (
              <div className="source-stack">
                {sources.map((source, index) => (
                  <EvidenceCard
                    key={source.recordId}
                    source={source}
                    index={index}
                    demo={demo}
                    disabled={disabled || (!source.data.included && included.length >= 6)}
                    onRead={() => p.onRead(source.recordId)}
                    onInclude={(value) =>
                      run(
                        'Updating evidence',
                        () => p.onPatchSource(source.recordId, { included: value }),
                        value ? 'Source included' : 'Source set aside',
                      )
                    }
                  />
                ))}
              </div>
            )}
          </section>
          <aside className="research-rail">
            <div className="rail-block">
              <span className="eyebrow">IN THE MARGIN</span>
              <h3>A little perspective.</h3>
              <p className="rail-description">
                A strong case has room for
                <br />a different point of view.
              </p>
              <div className="evidence-balance">
                {(['supports', 'challenges', 'context'] as Stance[]).map((stance) => {
                  const count = included.filter((s) => s.data.stance === stance).length
                  return (
                    <div key={stance} className={`balance-row ${stance}`}>
                      <span>
                        <i />
                        {stanceLabels[stance]}
                      </span>
                      <div className="balance-track">
                        <div
                          style={{
                            width: `${included.length ? (count / included.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  )
                })}
              </div>
              {included.length > 1 && !included.some((s) => s.data.stance === 'challenges') ? (
                <div className="margin-prompt">
                  <span>Worth asking</span>
                  <p>
                    What would someone who disagrees point to? Try a search for the counterargument.
                  </p>
                </div>
              ) : (
                <div className="margin-prompt">
                  <span>Keep this in mind</span>
                  <p>
                    {included.length
                      ? 'These labels are your reading of the evidence. They’re a prompt to think, not a vote to count.'
                      : 'Two useful sources will tell you more than twenty unread tabs.'}
                  </p>
                </div>
              )}
            </div>
            <div className="rail-block draft-block">
              <span className="draft-step">NEXT / THE BIGGER PICTURE</span>
              <h3>Put the pieces together.</h3>
              <p>
                Turn {included.length ? 'your selected' : 'two to six'} sources into a brief with
                findings, a counterargument, and the questions still open.
              </p>
              <Button
                className="draft-button"
                disabled={disabled || included.length < 2 || included.length > 6}
                onClick={draft}
                loading={p.busy === 'Drafting your brief'}
              >
                {current.data.memo ? 'Redraft the brief' : 'Draft decision brief'}
                <ArrowRight size={15} />
              </Button>
              <small>
                {included.length < 2
                  ? `${2 - included.length} more read ${included.length === 1 ? 'source' : 'sources'} to get started.`
                  : `${included.length} sources selected · citations included`}
              </small>
            </div>
            <div className="rail-footnote">
              <LockKeyhole size={13} />
              <p>
                {demo
                  ? 'Explore freely. No account or credits used in this example.'
                  : 'Only your selected sources and annotations are used to draft.'}
              </p>
            </div>
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="brief" className="workbench-panel">
        {!current.data.memo ? (
          <div className="undrafted">
            <EmptyState
              icon={<FileText />}
              title="A considered answer takes a little evidence."
              description="Read and include at least two sources, then draft a brief. Your own decision will always have the last word."
              action={{
                label: included.length >= 2 ? 'Draft decision brief' : 'Go to evidence',
                onClick: () => (included.length >= 2 ? void draft() : setTab('evidence')),
              }}
            />
          </div>
        ) : (
          <div className="workbench-grid">
            <div>
              <div className="memo-notice">
                <span className="small-line" />
                <p>
                  {demo
                    ? 'Example brief · written to demonstrate the format'
                    : 'AI-assisted draft · check the sources before deciding'}
                </p>
              </div>
              {stale && (
                <div className="stale-banner" role="status">
                  <strong>The evidence has moved on.</strong>
                  <p>
                    A selection or annotation changed after this draft. Redraft to use the current
                    evidence.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || included.length < 2 || included.length > 6}
                    onClick={draft}
                  >
                    Update brief <ArrowRight size={13} />
                  </Button>
                </div>
              )}
              <article className="memo-paper">
                <div className="paper-kicker">
                  <span>THE DECISION BRIEF</span>
                  <span>{String(current.data.memoSources.length).padStart(2, '0')} SOURCES</span>
                </div>
                <h2>{current.data.memo.headline}</h2>
                <div className="memo-recommendation">
                  <span className="eyebrow">THE RECOMMENDATION</span>
                  <CitedClaim
                    claim={current.data.memo.recommendation}
                    refs={current.data.memoSources}
                    onCite={p.onCite}
                  />
                </div>
                <section>
                  <h3>What the evidence says</h3>
                  {current.data.memo.findings.map((claim, i) => (
                    <div className="finding" key={i}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <CitedClaim claim={claim} refs={current.data.memoSources} onCite={p.onCite} />
                    </div>
                  ))}
                </section>
                <section className="counterargument">
                  <span className="eyebrow">THE STRONGEST CASE AGAINST</span>
                  <CitedClaim
                    claim={current.data.memo.counterargument}
                    refs={current.data.memoSources}
                    onCite={p.onCite}
                  />
                </section>
                <section>
                  <h3>Still an open question</h3>
                  <ul className="uncertainties">
                    {current.data.memo.uncertainties.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </section>
                <section className="next-step">
                  <span className="eyebrow">ONE SMALL NEXT STEP</span>
                  <p>{current.data.memo.nextStep}</p>
                </section>
                <div className="paper-footer">
                  <span>
                    Drafted {demo ? 'as a curated example' : date(current.data.draftedAt)}
                  </span>
                  <span className="footer-brand">margin.</span>
                </div>
              </article>
              <DecisionNote
                key={current.recordId}
                value={current.data.finalNote}
                disabled={disabled}
                onSave={(finalNote) =>
                  run(
                    'Saving your decision',
                    () => p.onPatchBrief({ finalNote }),
                    'Your decision is recorded',
                  )
                }
              />
            </div>
            <aside className="research-rail">
              <div className="rail-block">
                <span className="eyebrow">FOLLOW THE THREAD</span>
                <h3>Every claim has a source.</h3>
                <p className="rail-description">
                  Tap a citation in the brief to return to the page and your notes.
                </p>
                <ol className="memo-source-list">
                  {current.data.memoSources.map((source, i) => (
                    <li key={source.id}>
                      <button onClick={() => p.onCite(source.id)}>
                        <span>{i + 1}</span>
                        <div>
                          <strong>{source.title}</strong>
                          <small>{hostname(source.url)}</small>
                        </div>
                        <ArrowUpRight size={12} />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rail-block">
                <h3>You have the last word.</h3>
                <p>
                  A draft can connect the evidence. Only you can weigh it against what matters here.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={draft}
                  disabled={disabled || included.length < 2 || included.length > 6}
                  loading={p.busy === 'Drafting your brief'}
                >
                  Redraft from evidence <ArrowRight size={13} />
                </Button>
              </div>
            </aside>
          </div>
        )}
      </TabsContent>
      <Modal open={urlOpen} onClose={() => setUrlOpen(false)}>
        <Modal.Header>
          <Modal.Title>Bring a source to the desk.</Modal.Title>
          <Modal.Description>
            Paste a public HTTPS page. Margin reads and saves its main text so your brief has a
            stable reference.
          </Modal.Description>
        </Modal.Header>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void capture(url)
          }}
        >
          <Modal.Body>
            <Label htmlFor="source-url">Page URL</Label>
            <Input
              id="source-url"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={2000}
              required
              autoFocus
            />
            <p className="small-hint">
              Pages behind a sign-in or paywall may not be readable. Eight sources per brief.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setUrlOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={disabled || !url.startsWith('https://')}
              loading={p.busy === 'Reading and saving source'}
            >
              Read & save <ArrowRight size={14} />
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </Tabs>
  )
}
