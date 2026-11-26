import { readOneC } from './adapters/one-c/index.ts'
import { defaults } from './data/factory/demo.ts'
import { calculate } from './engine/calculation/index.ts'
import type { Inputs, Results } from './engine/calculation/index.ts'
import { approvalFingerprint, edges, fingerprints, flowOrder, isScope, nodes, scopeIds } from './engine/dependencies/index.ts'
import type { Edge, NodeId, Scope } from './engine/dependencies/index.ts'
import { risks } from './engine/validation/index.ts'

export type Review = {
  decision: 'approved' | 'note' | 'returned'; comment: string; actor: string;
  at: string; version: number; fingerprint: string;
}
export type Role = 'ПДО' | 'Руководитель' | 'ОП' | Scope
export type Version = {
  number: number; at: string; actor: string; reason: string; input: Inputs;
  results: Results; changed: NodeId[]; reviews: Partial<Record<Scope, Review>>;
  submitted: boolean; approvedAt?: string; approvedBy?: string;
}
export type Event = { at: string; title: string; detail: string; node: NodeId; version: number }
export type Comment = { at: string; text: string; actor: string; version: number }
export type State = {
  versions: Version[]; events: Event[]; comments: Record<string, Comment[]>; role: Role;
  sync: { at: string; received: number; updated: number } | null; branches: Edge[];
  nodeOverrides: Partial<Record<NodeId, { title: string; owner: string; due: string }>>;
}
const storageKey = 'litey-local-2026-v4'

export function initial(): State {
  const input = { orders: readOneC(), decisions: {}, norms: { ...defaults }, metalNorms: {}, inventory: {} }
  const results = calculate(input)
  const at = '2026-11-02T08:30:00'
  const reviews: Version['reviews'] = {}
  for (const id of ['pdo', 'labor', 'energy', 'hr'] as const) {
    reviews[id] = { decision: 'approved', comment: id === 'pdo' ? 'Согласована загрузка АФЛ №2' : 'Исходное демонстрационное согласование', at, actor: nodes.find(node => node.id === id)!.owner, version: 1, fingerprint: approvalFingerprint(id, input, results) }
  }
  return { versions: [{ number: 1, at, actor: 'ПДО', reason: 'Исходная производственная программа', input, results,
    changed: [], reviews, submitted: true }], events: [], comments: {}, role: 'ПДО', sync: null, branches: [...edges], nodeOverrides: {} }
}

export function load(): State {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const data = JSON.parse(raw) as State
      if (data.versions?.length && data.branches && data.comments && data.nodeOverrides) return data
    }
  } catch {
    return initial()
  }
  return initial()
}

export function save(state: State) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export const current = (state: State) => state.versions.at(-1)!
export const roleName = (role: Role) => role === 'pdo' ? 'ПДО · АФЛ №2' : role === 'materials' ? 'ЭО · материалы' : role === 'labor' ? 'ЭО · персонал' : isScope(role) ? nodes.find(node => node.id === role)!.owner : role
const accepted = (review?: Review) => review?.decision === 'approved' || review?.decision === 'note'
export const readyCount = (version: Version) => scopeIds.filter(id => accepted(version.reviews[id])).length
export const hasApproval = (version: Version, id: Scope) => accepted(version.reviews[id])

export function addEvent(state: State, title: string, detail: string, node: NodeId) {
  state.events.unshift({ title, detail, node, version: current(state).number, at: new Date().toISOString() })
}

export function revise(state: State, input: Inputs, reason: string, source: NodeId) {
  const before = current(state)
  if (JSON.stringify(input) === JSON.stringify(before.input)) return []
  const results = calculate(input)
  const oldKeys = fingerprints(before.input, before.results)
  const keys = fingerprints(input, results)
  const changed = flowOrder(nodes.filter(node => oldKeys[node.id] !== keys[node.id]).map(node => node.id), state.branches)
  const reviews = Object.fromEntries(Object.entries(before.reviews).filter(([id, review]) => review.fingerprint === approvalFingerprint(id as Scope, input, results)))
  state.versions.push({
    number: before.number + 1, at: new Date().toISOString(), actor: roleName(state.role),
    reason, input, results, changed, reviews, submitted: before.submitted || Boolean(before.approvedAt),
  })
  addEvent(state, reason, 'Обновлены результаты: ' + changed.filter(id => id !== 'final').map(id => nodes.find(node => node.id === id)!.title).join(', '), source)
  return changed
}

export function blockers(version: Version) {
  const issues = risks(version.input, version.results).map(risk => risk.title + ' — ' + risk.detail)
  if (!version.submitted) issues.push('ПДО ещё не запустил согласование')
  const pending = scopeIds.filter(id => !hasApproval(version, id))
  if (pending.length) issues.push('Ожидаются решения ' + pending.length + ' из ' + scopeIds.length + ' зон ответственности')
  return issues
}

export function documentStatus(version: Version) {
  if (version.approvedAt) return 'Утверждён'
  if (Object.values(version.reviews).some(review => review.decision === 'returned')) return 'Возвращён на доработку'
  if (risks(version.input, version.results).some(risk => risk.severity === 'critical')) return 'Требуется уточнение'
  if (version.submitted) return 'На согласовании'
  return 'Готов к согласованию'
}

export function reviewBlocked(version: Version, id: Scope) {
  const issues = risks(version.input, version.results)
  return issues.some(risk => risk.node === id || (id === 'pdo' && risk.id === 'line2') ||
    (risk.node === 'spec' && ['metal', 'materials', 'masters', 'chief'].includes(id)) ||
    (risk.node === 'materials' && (['masters', 'supply', 'chief'].includes(id) ||
      (id === 'energy' && version.input.norms.energyBase === 'liquid' && version.results.metal === null))) ||
    (risk.node === 'labor' && ['hr', 'chief'].includes(id)) ||
    (['supply', 'masters', 'hr'].includes(risk.node) && id === 'chief'))
}

export function recordReview(state: State, id: Scope, decision: Review['decision'], comment: string, coverage = false) {
  const version = current(state)
  if (state.role !== id || !version.submitted || version.approvedAt) return 'Выберите ответственную роль и запустите согласование.'
  if (decision === 'returned' && !comment.trim()) return 'Укажите причину возврата.'
  if (decision !== 'returned' && id === 'supply' && !coverage) return 'Подтвердите обеспечение по ведомости потребностей.'
  if (decision !== 'returned' && reviewBlocked(version, id)) return 'Сначала устраните препятствия в зоне согласования.'
  version.reviews[id] = {
    decision, comment: id === 'supply' && coverage && decision !== 'returned' ? ('Обеспечение по ведомости v' + version.number + ' подтверждено. ' + comment.trim()).trim() : comment.trim(), at: new Date().toISOString(), actor: roleName(state.role),
    version: version.number, fingerprint: approvalFingerprint(id, version.input, version.results),
  }
  addEvent(state, decision === 'returned' ? 'Возврат на доработку' : 'Согласование получено',
    nodes.find(node => node.id === id)!.title + (comment ? ' · ' + comment : ''), id)
  return ''
}

export function finalize(state: State) {
  const version = current(state)
  if (state.role !== 'Руководитель' || blockers(version).length || version.approvedAt) return false
  version.approvedAt = new Date().toISOString()
  version.approvedBy = roleName(state.role)
  addEvent(state, 'Производственная программа утверждена', 'Утверждена версия v' + version.number, 'final')
  return true
}

export function syncOrders(state: State) {
  const before = current(state)
  const orders = readOneC()
  // A repeat exchange refreshes the source but preserves locally accepted corrections.
  const updated = Object.keys(orders).filter(code => before.input.orders[code] === undefined).length
  state.sync = { at: new Date().toISOString(), received: Object.keys(orders).length, updated }
  const changed = revise(state, { ...before.input, orders: { ...orders, ...before.input.orders } }, 'Получены заказы из 1С', 'erp')
  addEvent(state, 'Демонстрационный обмен с 1С', 'Получено 5 заказов · найдено 5 спецификаций · обновлено позиций: ' + updated, 'erp')
  return changed
}
