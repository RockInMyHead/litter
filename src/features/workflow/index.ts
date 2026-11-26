import { current, documentStatus, hasApproval, readyCount, reviewBlocked } from '../../store.ts'
import type { State } from '../../store.ts'
import { criticalPath, isScope, nodes, scopeIds } from '../../engine/dependencies/index.ts'
import type { NodeId } from '../../engine/dependencies/index.ts'
import { risks } from '../../engine/validation/index.ts'
import { lineNames } from '../../data/factory/index.ts'
import { button, date, fmt, h, heading, icon, iconButton, metric, option, panel, empty } from '../../ui/shared.ts'
import type { View } from '../../ui/view.ts'

export const nodeTitle = (state: State, id: NodeId) => state.nodeOverrides[id]?.title ?? nodes.find(node => node.id === id)!.title
export const owner = (state: State, id: NodeId) => state.nodeOverrides[id]?.owner ?? nodes.find(node => node.id === id)!.owner
export const due = (state: State, id: NodeId) => state.nodeOverrides[id]?.due || (id === 'final' ? '2026-11-06' : '2026-11-04')

export function statuses(state: State) {
  const version = current(state)
  const issues = risks(version.input, version.results)
  return Object.fromEntries(nodes.map(node => {
    const id = node.id
    if (id === 'erp') return [id, [state.sync ? 'Обмен выполнен' : 'Данные из XLSX', 'green']]
    if (id === 'sales') return [id, ['Передано в ПДО', 'green']]
    if (id === 'pdo') return [id, ['Рассчитано', 'blue']]
    if (id === 'final') return [id, version.approvedAt ? ['Утверждено', 'green'] : ['Ожидает решения', 'gray']]
    if (issues.some(risk => risk.node === id)) return [id, id === 'spec' ? ['Требуется уточнение', 'red'] : ['Требуется проверка', 'amber']]
    if (isScope(id) && version.reviews[id]?.decision === 'returned') return [id, ['На доработке', 'amber']]
    if (isScope(id) && hasApproval(version, id)) return [id, ['Согласовано', 'green']]
    if (isScope(id) && reviewBlocked(version, id)) return [id, ['Ожидает данные', 'gray']]
    return [id, ['Рассчитано', 'blue']]
  })) as Record<NodeId, [string, string]>
}

const W = 158
const H = 74
const lanes = ['Заказы и программа', 'Исходные данные', 'Расчёты', 'Проверка ресурсов', 'Согласование']

function edgePath(from: NodeId, to: NodeId) {
  const a = nodes.find(node => node.id === from)!
  const b = nodes.find(node => node.id === to)!
  const ax = a.x + W
  const ay = a.y + H / 2
  const by = b.y + H / 2
  if (a.x === b.x) {
    return `M${a.x + W / 2} ${a.y + H}V${b.y - 4}`
  }
  if ((from === 'pdo' && to === 'masters') || (from === 'spec' && to === 'masters') ||
      (from === 'masters' && to === 'supply') || (from === 'labor' && to === 'chief') ||
      (from === 'energy' && to === 'final')) {
    const y = from === 'labor' || from === 'energy' ? 438 : from === 'spec' ? 205 : from === 'pdo' ? 322 : 212
    const bx = b.x - 7
    return `M${ax} ${ay}H${ax + 9}V${y}H${bx}V${by}H${b.x - 4}`
  }
  if (from === 'spec' && to === 'materials' || from === 'pdo' && to === 'metal') {
    const y = from === 'spec' ? 102 : 214
    return `M${ax} ${ay}H${ax + 12}V${y}H${b.x + W / 2}V${from === 'spec' ? b.y - 4 : b.y + H + 4}`
  }
  if (a.x > b.x) return `M${a.x + W / 2} ${a.y + H}V211H${b.x + W / 2}V${b.y - 4}`
  const middle = b.x - 14
  return `M${ax} ${ay}H${middle}V${by}H${b.x - 4}`
}

function graph(state: State, view: View) {
  const s = statuses(state)
  const version = current(state)
  const issues = risks(version.input, version.results)
  const criticalIds = criticalPath(issues[0]?.node ?? 'final', state.branches)
  const visible = (id: NodeId) => view.filter === 'all' || s[id][1] === view.filter
  const assetLinks = state.branches.map(([from, to, label], i) => {
    const hot = view.flow.includes(to) && (view.flow.includes(from) || from === 'erp')
    const critical = view.critical && criticalIds.indexOf(to) === criticalIds.indexOf(from) + 1 && criticalIds.includes(from)
    const key = 'flow-' + view.activation + '-' + i
    const tone = hot || critical ? 'active' : 'normal'
    const delta = from === 'metal' ? ' · ' + fmt(version.results.metal, 4) + ' т' : from === 'sales' ? ' · ' + fmt(version.results.count) + ' шт.' : ''
    return `<g class="edge ${tone} ${!visible(from) || !visible(to) ? 'faded' : ''} ${view.graphMode === 'services' && ['energy-final', 'hr-final', 'pdo-metal', 'spec-masters', 'metal-energy', 'labor-chief', 'spec-materials'].includes(from + '-' + to) && !hot && !critical ? 'secondary-edge' : ''}"><title>${h(label + delta + ' · v' + version.number)}</title><path class="edge-hit" d="${edgePath(from, to)}"/><path id="${key}" class="edge-line" d="${edgePath(from, to)}" marker-end="url(#arrow-${tone})"/>${hot ? `<circle class="data-packet" r="3"><animateMotion dur="1.25s" begin="${Math.max(0, view.flow.indexOf(to)) * .12}s" repeatCount="2" path="${edgePath(from, to)}"/></circle>` : ''}</g>`
  }).join('')
  const cards = nodes.map(node => {
    const [label, tone] = s[node.id]
    const count = issues.filter(risk => risk.node === node.id).length
    const short = view.graphMode === 'calcs' ? ({
      erp: 'Импорт заказов', sales: 'Объём заказов', pdo: 'Формы и смены', spec: 'Сверка источников',
      metal: 'Расход сплава', materials: 'Потребность в шихте', energy: 'Лимит энергии',
      labor: 'Человеко-часы', masters: 'Остаток к потребности', chief: 'Проверка готовности',
      hr: 'Лимит численности', supply: 'Покрытие поставками', final: 'Сводный паспорт',
    }[node.id]) : nodeTitle(state, node.id)
    return `<foreignObject x="${node.x}" y="${node.y}" width="${W}" height="${H}"><button xmlns="http://www.w3.org/1999/xhtml" class="flow-node ${tone} ${node.id === 'pdo' ? 'central' : ''} ${node.id === 'final' ? 'final-node' : ''} ${!visible(node.id) ? 'faded' : ''} ${view.flow.includes(node.id) ? 'flow-updated' : ''}" data-action="node:${node.id}" title="${h(owner(state, node.id) + ' · v' + version.number + ' · до ' + due(state, node.id))}"><span class="node-top"><b>${node.code}</b>${count ? `<span class="node-count">${count}</span>` : ''}</span><span class="node-title">${h(short)}</span><span class="node-status"><i></i>${h(label)}</span></button></foreignObject>`
  }).join('')
  return `<div class="graph-viewport" id="graph-viewport"><svg id="workflow-svg" viewBox="0 73 942 385" aria-label="Карта взаимодействия подразделений" role="group"><defs><marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill="#9badc2"/></marker><marker id="arrow-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill="#2563eb"/></marker></defs><g id="graph-camera" transform="translate(${view.panX} ${view.panY}) translate(471 265) scale(${view.zoom}) translate(-471 -265)">${lanes.map((lane,i) => `<text class="lane-label" x="${24 + i * 184}" y="93">${lane}</text>`).join('')}${assetLinks}${cards}</g></svg><div class="graph-controls">${iconButton('Увеличить', 'zoom:in', 'plus')}${iconButton('Уменьшить', 'zoom:out', 'minus')}${iconButton('Вписать карту', 'zoom:fit', 'fit')}</div><span class="zoom-label">${Math.round(view.zoom * 100)}%</span></div>`
}

export function eventsList(state: State, limit = 8) {
  const list = state.events.slice(0, limit)
  if (!list.length) return empty('Изменений пока нет.')
  return `<div class="activity-list">${list.map(event => `<div class="activity"><span class="activity-icon">${icon(event.node === 'sales' ? 'edit' : event.node === 'erp' ? 'refresh' : 'clock', 14)}</span><div><b>${h(event.title)}</b><small>${h(event.detail)}</small><time>${date(event.at)} · v${event.version}</time></div></div>`).join('')}</div>`
}

export function mapPage(state: State, view: View) {
  const v = current(state)
  const r = v.results
  const issues = risks(v.input, r)
  const ready = readyCount(v)
  const firstIssue = issues[0]
  const path = criticalPath(firstIssue?.node ?? 'final', state.branches).filter(id => id !== 'sales' && id !== 'erp')
  const routeLabels: Partial<Record<NodeId,string>> = {
    spec: 'Спецификации', metal: 'Баланс металла', masters: 'Мастера', chief: 'Начальник цеха',
  }
  const route = path.map((id, index) => {
    const node = nodes.find(node => node.id === id)!
    return (index ? icon('chevron', 13) : '') +
      `<button class="route-stop ${id === firstIssue?.node ? firstIssue.severity : ''}" data-action="node:${id}" aria-label="${h(nodeTitle(state,id))}" title="${h(nodeTitle(state,id))}">${h(routeLabels[id] ?? node.code)}</button>`
  }).join('')
  const loadRows = r.lines.map(line => `<div class="load-row"><div><b>АФЛ №${line.id}</b><small>${h(lineNames[line.id])}</small></div><strong>${fmt(line.excel, 2)} <small>из ${fmt(v.input.norms.shifts)} смен</small></strong></div>`).join('')
  const riskRows = issues.slice(0,4).map(risk =>
    `<button class="risk-row ${risk.severity}" data-action="${risk.node === 'spec' ? 'conflict:' + risk.id : 'node:' + risk.node}"><span><b>${h(risk.title)}</b><small>${h(risk.detail)}</small></span>${icon('chevron',15)}</button>`).join('')

  return `${heading('Карта взаимодействия', '', button('Сравнить версии', 'go:versions') + button('Паспорт программы', 'go:passport'))}
  <div class="metrics map-summary">
    ${metric('Заказ', fmt(r.count) + ' шт.', r.rows.length + ' позиций')}
    ${metric('Масса заказа', fmt(r.tonnes, 2) + ' т', 'По методике Excel')}
    <div class="metric"><span>Согласования</span><strong>${ready} из ${scopeIds.length}</strong><button class="link" data-action="go:approvals">${documentStatus(v)} ${icon('chevron',12)}</button></div>
  </div>
  <div class="workspace">
    <section class="panel map-panel" aria-label="Рабочие блоки">
      <div class="map-toolbar">
        <div class="segmented">${button('Подразделения', 'graph:services', '', view.graphMode === 'services' ? 'active' : '')}${button('Расчёты', 'graph:calcs', '', view.graphMode === 'calcs' ? 'active' : '')}</div>
        <div class="map-head-actions"><label class="filter-select"><select aria-label="Фильтр статуса" data-change="graph-filter">${[['all','Все статусы'],['green','Готово'],['blue','Рассчитано'],['amber','Требуется проверка'],['red','Противоречия'],['gray','Ожидание']].map(([id,label])=>option(id,label,view.filter===id)).join('')}</select></label>${iconButton(view.collapsed ? 'Раскрыть карту' : 'Свернуть карту', 'collapse', view.collapsed ? 'plus' : 'minus')}</div>
      </div>
      ${view.collapsed ? `<div class="collapsed">${nodes.map(node => button(node.code + ' · ' + nodeTitle(state,node.id), 'node:' + node.id)).join('')}</div>` : graph(state,view)}
      <div class="map-route"><button class="btn ${view.critical ? 'selected' : ''}" data-action="critical" aria-pressed="${view.critical}">Критический путь</button><div class="critical-route">${route}</div>${firstIssue ? `<time datetime="${h(due(state, firstIssue.node))}">Срок в демо · ${h(new Date(due(state, firstIssue.node) + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }))}</time>` : ''}</div>
    </section>
    <aside class="insights" aria-label="Контроль плана">
      ${panel('Отклонения', `<div class="risk-list">${riskRows || empty('Отклонений нет.')}</div><div class="panel-foot">${button('Сверить исходные данные', 'go:quality', '', 'text-btn')}${issues.length > 4 ? button('Все отклонения', 'ask:0', '', 'text-btn') : ''}</div>`, `<span class="rail-count">${issues.length}</span>`)}
      ${panel('Загрузка АФЛ', `<div class="line-load">${loadRows}</div><div class="panel-foot">${button('График АФЛ','go:planning','','text-btn')}</div>`)}
      ${state.events.length ? panel('Последнее изменение', eventsList(state,1), iconButton('Открыть журнал','notify','history')) : ''}
    </aside>
  </div>`
}
