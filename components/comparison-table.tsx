'use client'

import { useState } from 'react'
import type {
  ComparisonView,
  Criterion,
  DiffGroup,
  GroupStatus,
  ModelView,
} from '@/lib/comparisons'

const LABEL = 'text-[11px] font-medium uppercase tracking-wider text-neutral-500'

const CELL = 'border-b border-neutral-200 px-4 py-4 text-left align-top'

/** The expected-answer column is the table's spine: it stays pinned while
    model columns scroll sideways on narrow screens. */
const SPINE = `${CELL} sticky left-0 z-10 w-[240px] border-r bg-[var(--bg)]`

const SECTION = 'border-b border-neutral-200 bg-neutral-500/[0.04] px-4 py-2 text-left'

function StatusTag({ status, landedLabel }: { status: GroupStatus; landedLabel: string }) {
  return status === 'landed' ? (
    <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-accent">
      {landedLabel}
    </span>
  ) : (
    <span className="rounded bg-neutral-500/10 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-neutral-600">
      local only
    </span>
  )
}

/** Pass is the one accent moment; a miss stays quiet so the table doesn't
    turn into a wall of red. */
function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" role="img" aria-label="Pass">
      <circle cx="10" cy="10" r="9" className="fill-accent" />
      <path
        d="m6 10.2 2.6 2.6L14 7.4"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0 text-neutral-500" role="img" aria-label="Miss">
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m7.5 7.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Task name and where it lives. The files stay in the data for grading;
    readers don't need the paths. */
function ExpectedGroup({ group, landedLabel }: { group: DiffGroup; landedLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm font-medium text-neutral-900">{group.name}</span>
      <StatusTag status={group.status} landedLabel={landedLabel} />
    </div>
  )
}

/** One model's result on every criterion: a big score, a bar with one
    numbered segment per criterion, and a chip per criterion. */
function Scorecard({ model, criteria }: { model: ModelView; criteria: Criterion[] }) {
  const passed = criteria.filter(c => model.checks[c.id]).length
  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-neutral-900">
          {passed}
        </span>
        <span className="text-sm text-neutral-500">/ {criteria.length}</span>
      </p>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {criteria.map(c => (
          <span
            key={c.id}
            className={`h-1.5 flex-1 rounded-full ${
              model.checks[c.id] ? 'bg-accent' : 'bg-neutral-500/20'
            }`}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col items-start gap-1.5">
        {criteria.map((c, i) => {
          const ok = model.checks[c.id]
          return (
            <li
              key={c.id}
              className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-xs ${
                ok
                  ? 'bg-accent/10 text-accent'
                  : 'border border-neutral-200 text-neutral-500'
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={ok ? 'font-medium' : 'line-through decoration-neutral-500/60'}>
                {c.label}
              </span>
              <span className="sr-only">{ok ? 'passed' : 'missed'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function rankLabel(model: ModelView, total: number) {
  if (model.rank === 1) return 'Best'
  if (model.rank === total) return 'Worst'
  return `#${model.rank}`
}

export function ComparisonTable({ comparison }: { comparison: ComparisonView }) {
  const { models, expected, criteria, landedLabel } = comparison
  const total = models.length

  // Best and worst show first; readers bring in the rest.
  const [shown, setShown] = useState<string[]>(() =>
    Array.from(new Set([models[0].name, models[total - 1].name])),
  )

  const visible = models.filter(m => shown.includes(m.name))
  const anyInvented = visible.some(m => m.invented.length > 0)

  const toggle = (name: string) =>
    setShown(s => (s.includes(name) ? s.filter(n => n !== name) : [...s, name]))

  // Columns that pass a praise criterion get the accent treatment on every
  // cell, so the highlight reads as one column rather than one badge.
  const tint = (m: ModelView) => (m.praise.length > 0 ? 'bg-accent/[0.035]' : '')

  const span = 1 + visible.length
  const landedCount = expected.filter(g => g.status === 'landed').length

  return (
    <div className="not-prose relative left-1/2 my-12 flex w-[min(80rem,calc(100vw-3rem))] -translate-x-1/2 flex-col gap-6 xl:flex-row xl:items-start">
      <figure className="min-w-0 flex-1 overflow-hidden rounded-xl border border-neutral-200">
        {/* relative: keeps the absolutely positioned sr-only labels inside
            the scroll box, so they can't widen the page on mobile. */}
        <div className="relative overflow-x-auto">
          <table
            className="w-full table-fixed border-collapse"
            style={{ minWidth: 240 + visible.length * 210 }}
          >
            <colgroup>
              <col className="w-[240px]" />
              {visible.map(m => (
                <col key={m.name} />
              ))}
            </colgroup>
            <tbody>
              <tr>
                <th scope="col" className={SPINE}>
                  <span className={LABEL}>Expected answer</span>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {expected.length} tasks
                    {landedCount > 0 ? `, ${landedCount} already landed` : ''}
                  </p>
                </th>
                {visible.map(m => (
                  <th
                    key={m.name}
                    scope="col"
                    className={`${CELL} ${tint(m)} ${
                      m.praise.length > 0 ? 'shadow-[inset_0_2px_0_var(--color-accent)]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={
                            m.rank === 1 ? LABEL.replace('text-neutral-500', 'text-accent') : LABEL
                          }
                        >
                          {rankLabel(m, total)}
                        </span>
                        <p className="mt-1 truncate text-sm font-semibold text-neutral-900">
                          {m.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(m.name)}
                        disabled={visible.length === 1}
                        aria-label={`Remove ${m.name}`}
                        title={`Remove ${m.name}`}
                        className="-mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-500/10 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>
                    {m.praise.map(p => (
                      <p key={p} className="mt-2 text-xs leading-5 font-normal text-accent">
                        {p}
                      </p>
                    ))}
                  </th>
                ))}
              </tr>

              <tr>
                <th colSpan={span} scope="rowgroup" className={SECTION}>
                  <span className={LABEL}>How it grouped the files</span>
                </th>
              </tr>
              {expected.map((g, gi) => (
                <tr key={g.name}>
                  <th scope="row" className={`${SPINE} font-normal`}>
                    <ExpectedGroup group={g} landedLabel={landedLabel} />
                  </th>
                  {visible.map(m => {
                    const cell = m.cells[gi]
                    return (
                      <td key={m.name} className={`${CELL} ${tint(m)}`}>
                        <div className="flex gap-2.5">
                          <Mark ok={cell.correct} />
                          <div className="min-w-0 space-y-1.5">
                            {cell.labels.map(l => (
                              <div key={l.name} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm text-neutral-900">&ldquo;{l.name}&rdquo;</span>
                                <StatusTag status={l.status} landedLabel={landedLabel} />
                              </div>
                            ))}
                            {cell.notes.map(n => (
                              <p key={n} className="text-xs leading-5 text-neutral-500">
                                {n}
                              </p>
                            ))}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {anyInvented ? (
                <tr>
                  <th scope="row" className={`${SPINE} font-normal`}>
                    <span className="text-sm font-medium text-neutral-900">Made-up changes</span>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      Things the model described that aren&rsquo;t in the diff.
                    </p>
                  </th>
                  {visible.map(m => (
                    <td key={m.name} className={`${CELL} ${tint(m)}`}>
                      {m.invented.length > 0 ? (
                        <span className="text-sm text-neutral-700">
                          {m.invented.length} {m.invented.length === 1 ? 'file' : 'files'} that
                          {m.invented.length === 1 ? ' doesn\u2019t' : ' don\u2019t'} exist
                        </span>
                      ) : (
                        <span className="text-sm text-neutral-500">None</span>
                      )}
                    </td>
                  ))}
                </tr>
              ) : null}

              <tr>
                <th colSpan={span} scope="rowgroup" className={SECTION}>
                  <span className={LABEL}>How it scored</span>
                </th>
              </tr>
              <tr>
                <th scope="row" className={`${SPINE} font-normal`}>
                  <span className="text-sm font-medium text-neutral-900">Score</span>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    Criteria passed, out of {criteria.length}. Numbers match the list above.
                  </p>
                </th>
                {visible.map(m => (
                  <td key={m.name} className={`${CELL} ${tint(m)}`}>
                    <Scorecard model={m} criteria={criteria} />
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={`${SPINE} border-b-0 font-normal`}>
                  <span className="text-sm font-medium text-neutral-900">My verdict</span>
                </th>
                {visible.map(m => (
                  <td key={m.name} className={`${CELL} border-b-0 ${tint(m)}`}>
                    <p className="border-l-2 border-neutral-200 pl-3 text-sm leading-6 text-neutral-700">
                      {m.verdict}
                    </p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </figure>

      {/* Evaluated models: a rail beside the table at xl, a chip row above it
          on smaller screens. Each entry toggles its column. */}
      <aside className="order-first xl:order-none xl:sticky xl:top-6 xl:w-[200px] xl:shrink-0">
        {/* Not an h3: globals.css sizes `.prose h3` without honoring not-prose. */}
        <p className={LABEL}>Models I evaluated</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          {visible.length} of {total} shown
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5 xl:flex-col xl:gap-0.5">
          {models.map(m => {
            const on = shown.includes(m.name)
            const locked = on && visible.length === 1
            return (
              <li key={m.name}>
                <button
                  type="button"
                  onClick={() => toggle(m.name)}
                  disabled={locked}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-2 rounded-full border px-2.5 py-1 text-left text-sm transition-colors disabled:cursor-not-allowed xl:rounded-md xl:border-transparent xl:px-2 xl:py-1.5 ${
                    on
                      ? 'border-neutral-900 text-neutral-900 xl:bg-neutral-500/10'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 xl:hover:bg-neutral-500/5'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                      on ? 'border-accent bg-accent text-white' : 'border-neutral-500/50'
                    }`}
                  >
                    {on ? (
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m4 8.2 2.6 2.6L12 5.4" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="font-mono text-[11px] text-neutral-500">#{m.rank}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
