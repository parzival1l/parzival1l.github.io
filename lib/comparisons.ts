import fs from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'

/** Where a group of changes lives: only in the local checkout, or already
    merged upstream through another branch. */
export const GROUP_STATUSES = ['local', 'landed'] as const
export type GroupStatus = (typeof GROUP_STATUSES)[number]

/** A set of changed files that belong to one task. The files drive the
    grading and are never shown to readers. */
export interface DiffGroup {
  name: string
  status: GroupStatus
  files: string[]
}

/** One thing I judge every answer on. */
export interface Criterion {
  id: string
  label: string
  /** What passing looks like. Renders after the label in the post's
      numbered list, so write it as a sentence. */
  detail: string
  /** Shown on the model's column when it passes. Marks the uncommon
      criteria that separate good answers from merely correct ones. */
  praise?: string
}

export interface ModelResult {
  name: string
  /** 1 is best. Drives column order and the default best/worst pair. */
  rank: number
  verdict: string
  /** Criterion id → passed. Every criterion needs an entry. */
  checks: Record<string, boolean>
  /** The model's answer, transcribed as the groups it described. */
  groups: DiffGroup[]
}

export interface Comparison {
  id: string
  prompt: string
  /** Tag text for landed groups, e.g. "on develop". */
  landedLabel: string
  expected: DiffGroup[]
  criteria: Criterion[]
  models: ModelResult[]
}

/** How one model handled one expected group. Derived, never authored. */
export interface GroupCell {
  correct: boolean
  /** The model's own groups that hold these files. */
  labels: { name: string; status: GroupStatus }[]
  notes: string[]
}

export interface ModelView extends ModelResult {
  /** One cell per expected group, in the same order. */
  cells: GroupCell[]
  /** Files the model described that are not in the diff. */
  invented: string[]
  /** Praise lines for the praise-carrying criteria it passed. */
  praise: string[]
}

export interface ComparisonView extends Omit<Comparison, 'models'> {
  /** Sorted best first. */
  models: ModelView[]
}

const DIR = path.join(process.cwd(), 'content/comparisons')

function fail(id: string, why: string): never {
  throw new Error(`content/comparisons/${id}.yaml: ${why}`)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toGroup(id: string, where: string, raw: unknown): DiffGroup {
  if (typeof raw !== 'object' || raw === null) fail(id, `${where} is not a mapping`)
  const item = raw as Record<string, unknown>
  const name = str(item.name) ?? fail(id, `${where} has no name`)
  const status = str(item.status)
  if (!status || !GROUP_STATUSES.includes(status as GroupStatus)) {
    fail(id, `${where} (${name}) status must be one of: ${GROUP_STATUSES.join(', ')}`)
  }
  const files = Array.isArray(item.files) ? item.files.map(String) : []
  if (files.length === 0) fail(id, `${where} (${name}) has no files`)
  return { name, status: status as GroupStatus, files }
}

function toCriterion(id: string, raw: unknown, index: number): Criterion {
  if (typeof raw !== 'object' || raw === null) fail(id, `criterion ${index + 1} is not a mapping`)
  const item = raw as Record<string, unknown>
  const cid = str(item.id) ?? fail(id, `criterion ${index + 1} has no id`)
  return {
    id: cid,
    label: str(item.label) ?? fail(id, `criterion ${cid} has no label`),
    detail: str(item.detail) ?? fail(id, `criterion ${cid} has no detail`),
    praise: str(item.praise),
  }
}

function toModel(id: string, raw: unknown, index: number, criteria: Criterion[]): ModelResult {
  if (typeof raw !== 'object' || raw === null) fail(id, `model ${index + 1} is not a mapping`)
  const item = raw as Record<string, unknown>
  const name = str(item.name) ?? fail(id, `model ${index + 1} has no name`)
  const rank = item.rank
  if (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1) {
    fail(id, `model ${name} rank must be a positive integer`)
  }
  const verdict = str(item.verdict) ?? fail(id, `model ${name} has no verdict`)

  const rawChecks = (item.checks ?? {}) as Record<string, unknown>
  const checks: Record<string, boolean> = {}
  for (const c of criteria) {
    const value = rawChecks[c.id]
    if (typeof value !== 'boolean') fail(id, `model ${name} has no true/false check for ${c.id}`)
    checks[c.id] = value
  }

  const groups = Array.isArray(item.groups)
    ? item.groups.map((g, i) => toGroup(id, `model ${name} group ${i + 1}`, g))
    : []
  if (groups.length === 0) fail(id, `model ${name} has no groups`)

  return { name, rank, verdict, checks, groups }
}

function parse(id: string, raw: unknown): Comparison {
  if (typeof raw !== 'object' || raw === null) fail(id, 'top level must be a mapping')
  const item = raw as Record<string, unknown>
  const prompt = str(item.prompt) ?? fail(id, 'has no prompt')

  const expected = Array.isArray(item.expected)
    ? item.expected.map((g, i) => toGroup(id, `expected group ${i + 1}`, g))
    : []
  if (expected.length === 0) fail(id, 'has no expected groups')

  const criteria = Array.isArray(item.criteria)
    ? item.criteria.map((c, i) => toCriterion(id, c, i))
    : []
  if (criteria.length === 0) fail(id, 'has no criteria')

  const models = Array.isArray(item.models)
    ? item.models.map((m, i) => toModel(id, m, i, criteria))
    : []
  if (models.length === 0) fail(id, 'has no models')
  const ranks = new Set(models.map(m => m.rank))
  if (ranks.size !== models.length) fail(id, 'two models share a rank')

  return {
    id,
    prompt,
    landedLabel: str(item.landedLabel) ?? 'already landed',
    expected,
    criteria,
    models,
  }
}

/** Compare the files a model grouped against one expected group. */
function gradeGroup(expected: DiffGroup, all: DiffGroup[], answer: DiffGroup[]): GroupCell {
  const mine = new Set(expected.files)
  const hits = answer.filter(g => g.files.some(f => mine.has(f)))
  const mentioned = new Set(hits.flatMap(g => g.files))
  const notes: string[] = []

  if (hits.length === 0) {
    return { correct: false, labels: [], notes: ['Not mentioned'] }
  }
  if (hits.length > 1) notes.push(`Split across ${hits.length} groups`)

  const mixedWith = all.filter(
    other => other !== expected && other.files.some(f => mentioned.has(f)),
  )
  if (mixedWith.length > 0) {
    notes.push(`Mixed with ${mixedWith.map(g => g.name).join(', ')}`)
  }

  const missing = expected.files.filter(f => !mentioned.has(f))
  if (missing.length > 0) {
    notes.push(`Left out ${missing.length} of ${expected.files.length} files`)
  }

  const statusWrong = hits.some(g => g.status !== expected.status)
  if (statusWrong) {
    notes.push(
      expected.status === 'landed'
        ? 'Missed that it already landed'
        : 'Called local work landed',
    )
  }

  return {
    correct: notes.length === 0,
    labels: hits.map(g => ({ name: g.name, status: g.status })),
    notes,
  }
}

function toView(c: Comparison): ComparisonView {
  const known = new Set(c.expected.flatMap(g => g.files))
  const models = [...c.models]
    .sort((a, b) => a.rank - b.rank)
    .map(m => ({
      ...m,
      cells: c.expected.map(g => gradeGroup(g, c.expected, m.groups)),
      invented: m.groups.flatMap(g => g.files).filter(f => !known.has(f)),
      praise: c.criteria
        .filter(cr => cr.praise && m.checks[cr.id])
        .map(cr => cr.praise as string),
    }))
  return { ...c, models }
}

/** Load one comparison by file name. A missing or malformed file throws at
    build time, so a typo fails the deploy instead of shipping a broken table. */
export function getComparison(id: string): ComparisonView {
  const file = path.join(DIR, `${id}.yaml`)
  if (!fs.existsSync(file)) fail(id, 'file not found')
  return toView(parse(id, load(fs.readFileSync(file, 'utf8'))))
}
