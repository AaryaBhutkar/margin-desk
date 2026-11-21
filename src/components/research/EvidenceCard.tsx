import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Checkbox } from '../ui'
import { hostname, type Evidence, type Row } from '../../domain'
import { date, stanceLabels } from './shared'

export default function EvidenceCard({
  source,
  index,
  demo,
  disabled,
  onRead,
  onInclude,
}: {
  source: Row<Evidence>
  index: number
  demo: boolean
  disabled: boolean
  onRead: () => void
  onInclude: (value: boolean) => void
}) {
  const s = source.data
  return (
    <article
      className={`evidence-card ${s.included ? '' : 'is-excluded'}`}
      data-testid="evidence-card"
    >
      <span className="source-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="source-main">
        <div className="source-topline">
          <span className="source-domain">
            <span className="domain-mark">{hostname(s.url).slice(0, 1).toUpperCase()}</span>
            {hostname(s.url)}
          </span>
          <span className={`stance-label ${s.stance}`}>
            <i />
            {stanceLabels[s.stance]}
          </span>
        </div>
        <button className="source-title" onClick={onRead}>
          {s.title}
          <ArrowUpRight size={16} />
        </button>
        <p className="source-excerpt">{s.excerpt}</p>
        {s.note && (
          <div className="source-annotation">
            <span>YOUR TAKE</span>
            <p>{s.note}</p>
          </div>
        )}
        <div className="source-bottomline">
          <label>
            <Checkbox
              checked={s.included}
              onCheckedChange={onInclude}
              disabled={disabled}
              aria-label={`Include ${s.title}`}
            />
            <span>{s.included ? 'Included in brief' : 'Set aside'}</span>
          </label>
          <span className="captured-date">
            {demo ? 'Example snapshot' : `Read ${date(s.capturedAt)}`}
          </span>
          <button className="read-source" onClick={onRead}>
            Read & annotate <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}
