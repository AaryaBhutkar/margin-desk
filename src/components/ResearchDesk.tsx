import { useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  Leaf,
  LockKeyhole,
  LogOut,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button, ConfirmModal, EmptyState, Modal, useToast } from './ui'
import { exportBrief, type SourceSnapshot } from '../domain'
import { date, type DeskProps } from './research/shared'
import Workbench from './research/Workbench'
import { NewBriefModal, SourceReader } from './research/Dialogs'

export default function ResearchDesk(props: DeskProps) {
  const { current, sources, demo } = props
  const [newOpen, setNewOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [failure, setFailure] = useState<{
    message: string
    label: string
    run: () => Promise<void>
  } | null>(null)
  const [readerId, setReaderId] = useState<string | null>(null)
  const [archivedSource, setArchivedSource] = useState<SourceSnapshot | null>(null)
  const toast = useToast()
  const disabled = !!busy || !props.ready
  const reader = sources.find((s) => s.recordId === readerId)

  async function run(label: string, action: () => Promise<void>, success?: string) {
    setBusy(label)
    setFailure(null)
    try {
      await action()
      if (success) toast.success(success, demo ? 'Example changes stay on this page.' : undefined)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The request could not finish.'
      setFailure({ message, label, run: action })
      toast.error('Couldn’t finish', message)
      return false
    } finally {
      setBusy('')
    }
  }

  function download() {
    if (!current) return
    const file = new Blob([exportBrief(current.data, sources)], {
      type: 'text/markdown;charset=utf-8',
    })
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = `margin-${current.data.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 65)}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(
      'Brief exported',
      'Includes your saved decision, research notes, and source links.',
    )
  }

  function cite(id: string) {
    const source = sources.find((s) => s.recordId === id)
    if (source) setReaderId(id)
    else setArchivedSource(current?.data.memoSources.find((s) => s.id === id) ?? null)
  }

  return (
    <div className="desk-shell">
      <aside className="desk-sidebar" data-testid="app-navigation">
        <a className="wordmark" href="/home" aria-label="Margin home">
          <span className="brand-mark" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          margin<span className="wordmark-period">.</span>
        </a>
        <p className="sidebar-caption">A little research. A clearer decision.</p>
        <Button
          className="new-brief-button"
          onClick={() => (demo ? props.onSignIn() : setNewOpen(true))}
          disabled={!!busy}
        >
          <Plus size={17} /> New brief
        </Button>
        <div className="sidebar-section-label">
          {demo ? 'THE EXAMPLE DESK' : 'YOUR BRIEFS'}
          <span>{props.briefs.length.toString().padStart(2, '0')}</span>
        </div>
        <nav className="brief-list" aria-label="Research briefs">
          {props.briefs.map((brief, i) => (
            <button
              key={brief.recordId}
              className={`brief-link ${current?.recordId === brief.recordId ? 'is-current' : ''}`}
              aria-current={current?.recordId === brief.recordId ? 'page' : undefined}
              onClick={() => props.onSelect(brief.recordId)}
              disabled={!!busy}
            >
              <span className="brief-link-number">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="brief-link-title">{brief.data.question}</span>
                <span className="brief-link-status">
                  <i className={brief.data.memo ? 'dot complete' : 'dot'} />
                  {brief.data.finalNote
                    ? 'Decision recorded'
                    : brief.data.memo
                      ? 'Brief ready'
                      : 'Gathering evidence'}
                </span>
              </span>
            </button>
          ))}
          {!props.loading && !props.briefs.length && (
            <p className="sidebar-empty">
              Good questions go here.
              <br />
              Start with one on your mind.
            </p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span aria-hidden>“</span>
            <p>
              Leave a little room
              <br />
              to change your mind.
            </p>
          </div>
          <button className="how-button" onClick={() => setAboutOpen(true)}>
            <CircleHelp size={15} /> How Margin works <ArrowUpRight size={13} />
          </button>
          <div className="account-row">
            <span className="account-avatar">
              {demo ? <Leaf size={17} /> : (props.userName || 'Y').slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong data-testid={demo ? undefined : 'nav-user-name'}>
                {demo ? 'Make this desk yours' : props.userName || 'Your workspace'}
              </strong>
              <small>{demo ? 'Sign in to save your research' : 'Private workspace'}</small>
            </span>
            {demo ? (
              <button
                data-testid="nav-sign-in-button"
                aria-label="Sign in"
                className="icon-button"
                onClick={props.onSignIn}
              >
                <ArrowRight size={17} />
              </button>
            ) : (
              <button className="icon-button" aria-label="Sign out" onClick={props.onSignOut}>
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="desk-main" id="main-content">
        <header className="desk-topbar">
          <div className="breadcrumb">
            <span>YOUR DESK</span>
            <span>/</span>
            <strong>
              {demo ? 'An open question' : current ? 'Research in progress' : 'A fresh page'}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="privacy-label">
              <LockKeyhole size={12} />
              {demo ? 'Example workspace' : 'Only you'}
            </span>
            <Button variant="outline" size="sm" onClick={download} disabled={!current || !!busy}>
              <ArrowDownToLine size={14} />
              <span>Export</span>
            </Button>
            {!demo && current && (
              <Button
                variant="ghost"
                size="icon"
                className="delete-brief"
                aria-label="Delete brief"
                onClick={() => setDeleteOpen(true)}
                disabled={disabled}
              >
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        </header>

        <div className="desk-page">
          {demo && (
            <div className="example-banner">
              <span>
                <span className="example-tag">EXAMPLE</span> A real desk to try. The research below
                is a curated sample.
              </span>
              <button onClick={props.onSignIn}>
                Start your own <ArrowRight size={14} />
              </button>
            </div>
          )}
          {props.loading ? (
            <div className="desk-loading" aria-busy="true">
              <div className="loading-line w-32" />
              <div className="loading-line w-4/5" />
              <div className="loading-line w-3/5" />
              <p>Opening your research desk…</p>
            </div>
          ) : props.loadError ? (
            <div role="alert" className="error-banner">
              <strong>Your desk couldn’t connect.</strong>
              <p>{props.loadError}</p>
              <p>Saved research will reappear when the connection recovers.</p>
            </div>
          ) : !current ? (
            <div className="first-brief">
              <span className="eyebrow">MAKE A LITTLE SPACE TO THINK</span>
              <h1>
                A good decision starts
                <br />
                with a better question.
              </h1>
              <p>
                Gather a few sources. Notice the tradeoffs.
                <br />
                Make a call you can explain.
              </p>
              <EmptyState
                icon={<BookOpen />}
                title="Your desk is ready"
                description="Start with a specific question and the constraints that matter to you."
                action={{ label: 'Start your first brief', onClick: () => setNewOpen(true) }}
              />
            </div>
          ) : (
            <>
              <div className="brief-heading">
                <div className="eyebrow">
                  <span className="small-line" />
                  RESEARCH{' '}
                  {String(
                    Math.max(
                      0,
                      props.briefs.findIndex((b) => b.recordId === current.recordId),
                    ) + 1,
                  ).padStart(2, '0')}
                  <span className="heading-separator">/</span>
                  {current.data.finalNote ? 'DECIDED, FOR NOW' : 'AN OPEN QUESTION'}
                </div>
                <h1>{current.data.question}</h1>
                {current.data.context && <p className="brief-context">{current.data.context}</p>}
              </div>
              {failure && (
                <div className="error-banner" role="alert">
                  <div>
                    <strong>{failure.label} couldn’t finish.</strong>
                    <p>{failure.message}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run(failure.label, failure.run)}
                    disabled={!!busy}
                  >
                    Try again
                  </Button>
                  <button
                    className="icon-button"
                    aria-label="Dismiss error"
                    onClick={() => setFailure(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {busy && (
                <p className="operation-status" role="status">
                  <span className="status-dot" />
                  {busy}… Your saved research stays here.
                </p>
              )}
              <Workbench
                key={current.recordId}
                {...props}
                current={current}
                disabled={disabled}
                busy={busy}
                run={run}
                onRead={setReaderId}
                onCite={cite}
              />
            </>
          )}
          <footer className="desk-footer">
            <span className="footer-brand">margin.</span>
            <span>
              {demo
                ? 'Curated example · edits reset when you leave'
                : 'Made for considered decisions.'}
            </span>
            <button onClick={() => setAboutOpen(true)}>
              Built with DeepSpace <ArrowUpRight size={11} />
            </button>
          </footer>
        </div>
      </main>

      <NewBriefModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        busy={!!busy}
        onSubmit={(question, context) =>
          run(
            'Creating brief',
            async () => {
              await props.onCreate(question, context)
              setNewOpen(false)
            },
            'Your question has a place',
          )
        }
      />
      {reader && (
        <SourceReader
          key={reader.recordId}
          source={reader}
          demo={demo}
          disabled={disabled}
          busy={busy}
          onClose={() => setReaderId(null)}
          onSave={(note) =>
            run(
              'Saving annotation',
              () => props.onPatchSource(reader.recordId, { note }),
              'Annotation saved',
            )
          }
          onStance={(stance) =>
            run(
              'Saving stance',
              () => props.onPatchSource(reader.recordId, { stance }),
              'Stance updated',
            )
          }
          onRemove={() =>
            run(
              'Removing source',
              async () => {
                await props.onRemoveSource(reader.recordId)
                setReaderId(null)
              },
              'Source removed',
            )
          }
        />
      )}
      <Modal open={!!archivedSource} onClose={() => setArchivedSource(null)}>
        <Modal.Header>
          <Modal.Title>Source used in this draft</Modal.Title>
          <Modal.Description>
            This source has since been removed from your evidence. Its reference is preserved with
            the draft.
          </Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <h3>{archivedSource?.title}</h3>
          <p className="muted">Captured {date(archivedSource?.capturedAt || '')}</p>
          <a
            className="text-link"
            href={archivedSource?.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original page <ArrowUpRight size={14} />
          </a>
        </Modal.Body>
      </Modal>
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Clear this brief from your desk?"
        description="This deletes the question, its evidence, and your decision. Your other briefs stay on your desk."
        confirmText="Delete brief"
        loading={!!busy}
        onConfirm={() =>
          run(
            'Deleting brief',
            async () => {
              await props.onDelete()
              setDeleteOpen(false)
            },
            'Brief deleted',
          )
        }
      />
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} size="lg">
        <Modal.Header>
          <Modal.Title>A little room for better thinking.</Modal.Title>
          <Modal.Description>
            Margin turns an open question into a small, inspectable decision brief.
          </Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <div className="about-steps">
            <p>
              <strong>01 / Find the evidence.</strong> Search for a specific question, or bring a
              public page you already trust.
            </p>
            <p>
              <strong>02 / Read, then keep.</strong> Save a page snapshot. Add your own note and
              mark what it supports or challenges.
            </p>
            <p>
              <strong>03 / Make the call.</strong> Draft from two to six selected sources. Inspect
              the citations, record your decision, and export.
            </p>
          </div>
          <div className="about-limits">
            <h3>A deliberately small desk</h3>
            <p>
              Up to 20 briefs and eight sources per brief. Each person gets six searches, 12 page
              reads, and four drafts per day; there are 100 shared research requests per day. Limits
              reset at 00:00 UTC. Research attempts count toward these limits, including failed
              ones.
            </p>
            <p>
              Your research is private to your account. Selected page text and annotations are sent
              to OpenAI only when you draft. Pages are extracted through Firecrawl; searches use
              Exa. DeepSpace handles sign-in, data sync, and hosting.
            </p>
            <p>
              A citation shows which saved source was supplied. It does not certify that the model’s
              interpretation is correct. Review the evidence before using the brief.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setAboutOpen(false)}>
            Back to the desk <ArrowRight size={14} />
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
