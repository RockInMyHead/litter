import { conflictFacts } from '../../data/factory/index.ts'
import type { Inputs, Results } from '../calculation/index.ts'
import type { NodeId } from '../dependencies/index.ts'

export type Risk = { id: string; title: string; detail: string; node: NodeId; severity: 'critical' | 'warning' }
const fmt = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

export function risks(input: Inputs, r: Results): Risk[] {
  const result: Risk[] = conflictFacts.filter(item => !input.decisions[item.id]).map(item => ({
    id: item.id, title: item.title + ' · Изделие №' + (item.product + 1),
    detail: (typeof item.example === 'number' ? fmt(item.example) : item.example) + ' / ' + (typeof item.specification === 'number' ? fmt(item.specification) : item.specification) + (item.field === 'weight' ? ' кг' : ''),
    node: 'spec', severity: 'critical',
  }))
  for (const code of r.missingRecipes) result.push({ id: 'recipe-' + code, title: 'Не найдена рецептура ' + code, detail: 'Для выбранного сплава требуется спецификация.', node: 'materials', severity: 'critical' })
  for (const resource of r.recipeConflicts) result.push({ id: 'duplicate-' + resource, title: 'Разные нормы одного ресурса', detail: resource, node: 'materials', severity: 'critical' })
  if (r.energy === null && (input.norms.energyBase === 'good' || r.metal !== null)) result.push({
    id: 'energy-formula', title: 'Формула СГЭ требует проверки', detail: 'Формула не вычисляется на текущих входных данных.', node: 'energy', severity: 'critical',
  })
  if (r.hours === null) result.push({
    id: 'labor-formula', title: 'Формула трудоёмкости требует проверки', detail: 'Формула не вычисляется на текущем тоннаже.', node: 'labor', severity: 'critical',
  })
  const shortages = [
    ['core', r.coreGap, 'Дефицит стержней №3', 'шт.', 'supply'],
    ['metal', r.metalGap, 'Дефицит жидкого металла', 'т', 'masters'],
    ['energy', r.energyGap, 'Превышение лимита энергии', 'кВт·ч', 'energy'],
    ['staff', r.staffGap, 'Дефицит персонала', 'чел.', 'hr'],
  ] as const
  for (const [id, amount, title, unit, node] of shortages) if (amount && amount > 0) {
    result.push({ id, title, detail: fmt(amount) + ' ' + unit + ' · демонстрационный лимит', node, severity: 'warning' })
  }
  for (const material of r.materials) if (material.gap && material.gap > 0) {
    result.push({ id: 'material-' + material.code, title: 'Дефицит ресурса ' + material.code,
      detail: material.name + ' · ' + fmt(material.gap) + ' кг', node: 'supply', severity: 'warning' })
  }
  for (const line of r.lines) if (line.scheduled > input.norms.shifts) {
    result.push({ id: 'line' + line.id, title: 'Перегрузка АФЛ №' + line.id, detail: fmt(line.scheduled - input.norms.shifts) + ' смен сверх календаря', node: 'chief', severity: 'warning' })
  }
  return result
}
