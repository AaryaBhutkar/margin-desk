import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button, Label, Textarea } from '../ui'
import type { Claim, SourceSnapshot } from '../../domain'

export function CitedClaim({
  claim,
  refs,
  onCite,
}: {
  claim: Claim
  refs: SourceSnapshot[]
  onCite: (id: string) => void
}) {
  return (
    <p className="cited-claim">
      {claim.text}{' '}
      <span className="citations">
        {claim.sourceIds.map((id) => (
          <button
            key={id}
            onClick={() => onCite(id)}
            aria-label={`Read source ${refs.findIndex((r) => r.id === id) + 1}: ${refs.find((r) => r.id === id)?.title ?? 'source'}`}
          >
            {refs.findIndex((r) => r.id === id) + 1}
          </button>
        ))}
      </span>
    </p>
  )
}

export function DecisionNote({
  value,
  disabled,
  onSave,
}: {
  value: string
  disabled: boolean
  onSave: (value: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState({ base: value, text: value })
  return (
    <section className="decision-note">
      <div className="section-heading">
        <div>
          <span className="eyebrow">IN YOUR OWN WORDS</span>
          <h2>Your decision, for now.</h2>
        </div>
        <span className="handwritten-arrow" aria-hidden>
          ↙
        </span>
      </div>
      <p>What will you do, and what would change your mind?</p>
      <Label className="sr-only" htmlFor="your-decision">
        Your decision
      </Label>
      <Textarea
        id="your-decision"
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        maxLength={3000}
        placeholder="We’ll try… We’ll revisit this if…"
        disabled={disabled}
        rows={4}
      />
      {value !== draft.base && value !== draft.text && (
        <p className="conflict-note">
          A saved version is available.{' '}
          <button onClick={() => setDraft({ base: value, text: value })}>
            Load saved decision
          </button>{' '}
          or save to replace it.
        </p>
      )}
      <div className="note-save-row">
        <span>
          {draft.text === value && value ? (
            <>
              <Check size={13} />
              Saved to this brief
            </>
          ) : (
            `${draft.text.length} / 3,000`
          )}
        </span>
        <Button
          size="sm"
          onClick={async () => {
            const saved = await onSave(draft.text)
            if (saved) setDraft({ base: draft.text, text: draft.text })
          }}
          disabled={disabled || draft.text === value}
        >
          Save decision <ArrowRight size={13} />
        </Button>
      </div>
    </section>
  )
}
