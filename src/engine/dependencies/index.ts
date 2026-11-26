import type { Inputs, Results } from '../calculation/index.ts'

export const nodes = [
  { id: 'erp', code: '1С:ERP', title: 'Заказы на производство', icon: 'database', x: 24, y: 119, owner: 'Локальный адаптер' },
  { id: 'sales', code: 'ОП', title: 'Отдел продаж', icon: 'shopping', x: 24, y: 230, owner: 'Менеджер ОП' },
  { id: 'pdo', code: 'ПДО ЦЧЛ', title: 'Производственная программа', icon: 'clipboard', x: 24, y: 341, owner: 'Диспетчер ПДО' },
  { id: 'spec', code: 'ОГМет', title: 'Ресурсные спецификации', icon: 'layers', x: 208, y: 119, owner: 'Технолог ОГМет' },
  { id: 'energy', code: 'СГЭ', title: 'Энергоресурсы', icon: 'zap', x: 208, y: 230, owner: 'Инженер СГЭ' },
  { id: 'labor', code: 'ЭО', title: 'Численность персонала', icon: 'users', x: 208, y: 341, owner: 'Экономист ЭО' },
  { id: 'metal', code: 'ОГМет', title: 'Баланс металла', icon: 'flask', x: 392, y: 119, owner: 'Металлург ОГМет' },
  { id: 'materials', code: 'ЭО', title: 'Материальные ресурсы', icon: 'boxes', x: 576, y: 119, owner: 'Экономист ЭО' },
  { id: 'masters', code: 'ЦЧЛ', title: 'Мастера ЦЧЛ', icon: 'hardhat', x: 576, y: 230, owner: 'Мастер участка' },
  { id: 'hr', code: 'ОУК', title: 'Кадровая обеспеченность', icon: 'contact', x: 392, y: 341, owner: 'Специалист ОУК' },
  { id: 'supply', code: 'ОМТО', title: 'Поставки и дефициты', icon: 'truck', x: 760, y: 119, owner: 'Специалист ОМТО' },
  { id: 'chief', code: 'ЦЧЛ', title: 'Начальник ЦЧЛ', icon: 'factory', x: 760, y: 230, owner: 'Начальник ЦЧЛ' },
  { id: 'final', code: 'Утверждение', title: 'Итоговый план', icon: 'shield', x: 760, y: 341, owner: 'Руководитель' },
] as const
export type NodeId = (typeof nodes)[number]['id']
export const scopeIds = ['pdo', 'spec', 'metal', 'materials', 'labor', 'energy', 'masters', 'supply', 'chief', 'hr'] as const
export type Scope = (typeof scopeIds)[number]

export type Edge = [NodeId, NodeId, string]
export const edges: Edge[] = [
  ['erp', 'sales', 'Пять заказов из 1С:ERP'],
  ['sales', 'pdo', 'Количество и сроки по заказам'],
  ['pdo', 'spec', 'Номенклатура и запрос на проверку'],
  ['pdo', 'energy', 'Тоннаж программы'],
  ['pdo', 'labor', 'Объём производства'],
  ['pdo', 'masters', 'План выпуска и загрузка АФЛ'],
  ['pdo', 'metal', 'Объём заливки по изделиям'],
  ['spec', 'metal', 'Подтверждённые марки и нормы сплавов'],
  ['spec', 'materials', 'Ресурсные спецификации'],
  ['spec', 'masters', 'Нормативы и технологические карты'],
  ['metal', 'materials', 'Баланс жидкого металла по маркам'],
  ['metal', 'energy', 'Масса жидкого металла при выборе этой базы'],
  ['materials', 'masters', 'Ведомость потребностей в ресурсах'],
  ['masters', 'supply', 'Потребность, остатки и дефициты'],
  ['masters', 'chief', 'Готовность участков'],
  ['supply', 'chief', 'Подтверждение поставок'],
  ['labor', 'chief', 'Трудоёмкость и численность'],
  ['labor', 'hr', 'Потребность в персонале'],
  ['hr', 'final', 'Кадровая обеспеченность'],
  ['chief', 'final', 'Готовность цеха'],
  ['energy', 'final', 'Энергетическая обеспеченность'],
]

export function isScope(id: string): id is Scope {
  return scopeIds.some(scope => scope === id)
}

export function fingerprints(input: Inputs, r: Results): Record<NodeId, string> {
  const { norms, orders, decisions, metalNorms, inventory: stocks } = input
  const asKey = JSON.stringify
  const plan = r.rows.map(row => [row.order, row.alloy, row.weight, row.shifts, row.forms])
  const metal = r.rows.map(row => [row.metal, row.recipeAlloy, row.alloy, row.goodMass, row.recipeAvailable])
  const materials = r.materials.map(row => [row.code, row.need])
  const staffing = [r.hours, r.staff, norms.staff, norms.laborFormula]
  const energy = [r.energy, norms.energyBase, norms.energyLimit, norms.energyRate, norms.energyFormula]
  const inventory = [r.coreNeed, norms.coreStock, norms.coreArrival, norms.coreArrivalDate, r.metal, norms.metalStock, stocks]
  const capacity = [r.lines.map(line => line.scheduled), norms.shifts]
  return {
    erp: 'xlsx', sales: asKey(orders), pdo: asKey([plan, capacity]),
    spec: asKey([decisions, metalNorms]), metal: asKey(metal),
    materials: asKey([materials, r.rows.map(row => row.cores), r.missingRecipes, norms.recipeBase]),
    energy: asKey(energy), labor: asKey(staffing), hr: asKey([r.staff, norms.staff]),
    supply: asKey([inventory, materials, r.missingRecipes, norms.recipeBase]), masters: asKey([inventory, capacity, materials, r.missingRecipes, plan]),
    chief: asKey([capacity, staffing, r.coreGap, r.metalGap, r.missingRecipes]),
    final: asKey([input, plan]),
  }
}

export function hasCycle(branches: Edge[]) {
  const visited = new Set<NodeId>()
  const active = new Set<NodeId>()
  function visit(id: NodeId): boolean {
    if (active.has(id)) return true
    if (visited.has(id)) return false
    active.add(id)
    if (branches.some(([from, to]) => from === id && visit(to))) return true
    active.delete(id)
    visited.add(id)
    return false
  }
  return nodes.some(node => visit(node.id))
}

export function flowOrder(ids: NodeId[], branches: Edge[]) {
  const pending = new Set(ids)
  const ordered: NodeId[] = []
  while (pending.size) {
    const ready = [...pending].filter(id => !branches.some(([from, to]) => to === id && pending.has(from)))
    if (!ready.length) throw new Error('Обнаружен цикл в графе')
    for (const id of ready) {
      pending.delete(id)
      ordered.push(id)
    }
  }
  return ordered
}

export function approvalFingerprint(id: Scope, input: Inputs, results: Results) {
  if (id === 'pdo') {
    const line = results.lines[1]
    return JSON.stringify([line.jobs.map(job => [job.code, job.order, job.shifts]),
      line.scheduled, input.norms.shifts])
  }
  return fingerprints(input, results)[id]
}

export function criticalPath(target: NodeId, branches: Edge[]) {
  function longest(id: NodeId, reverse: boolean): NodeId[] {
    const endpoints = branches.filter(edge => edge[reverse ? 1 : 0] === id)
      .map(edge => edge[reverse ? 0 : 1])
    const paths = endpoints.map(next => longest(next, reverse))
    const next = paths.sort((a, b) => b.length - a.length)[0] ?? []
    return [id, ...next]
  }
  return [...longest(target, true).reverse(), ...longest(target, false).slice(1)]
}
