import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Trash2 } from 'lucide-react'
import {
  Button,
  ConfirmModal,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '../ui'
import { hostname, type Evidence, type Row, type Stance } from '../../domain'
import { date } from './shared'

export function SourceReader({
  source,
  demo,
  disabled,
  busy,
  onClose,
  onSave,
  onStance,
  onRemove,
}: {
  source: Row<Evidence>
  demo: boolean
  disabled: boolean
  busy: string
  onClose: () => void
  onSave: (note: string) => Promise<unknown>
  onStance: (stance: Stance) => Promise<unknown>
  onRemove: () => Promise<unknown>
}) {
  const [note, setNote] = useState(source.data.note)
  const [removeOpen, setRemoveOpen] = useState(false)
  return (
    <>
      <Modal open onClose={onClose} size="xl" className="source-reader">
        <Modal.Header>
          <span className="source-domain">{hostname(source.data.url)}</span>
          <Modal.Title>{source.data.title}</Modal.Title>
          <Modal.Description>
            {demo ? 'Curated example snapshot' : `Snapshot read ${date(source.data.capturedAt)}`} ·{' '}
            {source.data.content.length.toLocaleString()} characters saved
          </Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <div className="reader-grid">
            <div>
              <a
                href={source.data.url}
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original page <ArrowUpRight size={13} />
              </a>
              <div className="snapshot-label">
                {demo ? 'ILLUSTRATIVE READING NOTES' : 'SAVED PAGE TEXT · FIRST 18,000 CHARACTERS'}
              </div>
              <pre className="source-text">{source.data.content}</pre>
            </div>
            <div className="reader-notes">
              <Label htmlFor="source-stance">What does this add?</Label>
              <Select
                value={source.data.stance}
                onValueChange={(v) => {
                  if (v) void onStance(v as Stance)
                }}
                disabled={disabled}
              >
                <SelectTrigger id="source-stance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supports">Supports the idea</SelectItem>
                  <SelectItem value="challenges">Challenges the idea</SelectItem>
                  <SelectItem value="context">Adds context</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="source-note">Your take</Label>
              <Textarea
                id="source-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1200}
                rows={7}
                placeholder="What matters here? What is missing?"
                disabled={disabled}
              />
              <p className="small-hint">
                Annotations guide the draft. Labeling a source doesn’t verify its claims.
              </p>
              <Button
                onClick={() => onSave(note)}
                disabled={disabled || note === source.data.note}
                loading={busy === 'Saving annotation'}
              >
                Save annotation <Check size={14} />
              </Button>
              <button
                className="remove-source-button"
                onClick={() => setRemoveOpen(true)}
                disabled={disabled}
              >
                <Trash2 size={13} />
                Remove from evidence
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      <ConfirmModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove this source?"
        description="Its saved text and annotation will be removed. Existing draft citations keep the original source link."
        confirmText="Remove source"
        loading={!!busy}
        onConfirm={() => void onRemove()}
      />
    </>
  )
}

export function NewBriefModal({
  open,
  onClose,
  onSubmit,
  busy,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (question: string, context: string) => Promise<unknown>
  busy: boolean
}) {
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <span className="eyebrow">A FRESH PAGE</span>
        <Modal.Title>What are you deciding?</Modal.Title>
        <Modal.Description>
          A specific question makes useful evidence easier to find.
        </Modal.Description>
      </Modal.Header>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit(question.trim(), context.trim())
        }}
      >
        <Modal.Body>
          <Label htmlFor="brief-question">Your question</Label>
          <Textarea
            id="brief-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            minLength={12}
            maxLength={240}
            rows={2}
            placeholder="Should our small team…"
            required
            autoFocus
            disabled={busy}
          />
          <div className="field-spacer" />
          <Label htmlFor="brief-context">
            What matters here? <span className="optional">Optional</span>
          </Label>
          <Textarea
            id="brief-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={1200}
            rows={3}
            placeholder="Your situation, constraints, and what a good outcome looks like."
            disabled={busy}
          />
          <div className="question-prompts">
            <span>NEED A STARTING POINT?</span>
            {[
              'Should our small team replace weekly status meetings with async updates?',
              'Is a repair café a practical first event for our neighborhood?',
            ].map((q) => (
              <button type="button" key={q} onClick={() => setQuestion(q)}>
                {q} <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Not yet
          </Button>
          <Button type="submit" disabled={busy || question.trim().length < 12} loading={busy}>
            Open a brief <ArrowRight size={14} />
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
