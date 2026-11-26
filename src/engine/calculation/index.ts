import { conflictFacts, documentFor, products, specification } from '../../data/factory/index.ts'
import { tryExpression } from './expression.ts'
import type { Norms } from '../../data/factory/demo.ts'

export type Decision = { value: string | number; source: string; reason: string; at: string; actor: string }
export type Inputs = {
  orders: Record<string, number>;
  decisions: Record<string, Decision>;
  norms: Norms;
  metalNorms: Record<string, number>;
  inventory: Record<string, { stock: number; arrival: number; date: string }>;
}

export const precision = (value: number, digits = 4) => Number(value.toFixed(digits))
const sum = (items: number[]) => items.reduce((total, value) => total + value, 0)

export function calculate({ orders, decisions, norms, metalNorms, inventory }: Inputs) {
  const rows = products.map((product, index) => {
    const order = orders[product.code]
    const alloyDecision = conflictFacts.find(item => item.product === index && item.field === 'alloy')
    const weight = index === 1 ? Number(decisions.weight2?.value ?? product.weight) : product.weight
    const alloy = String((alloyDecision && decisions[alloyDecision.id]?.value) ?? product.alloy)
    const excelCast = order * (1 + product.scrap)
    const excelForms = excelCast / product.cavity
    const cast = Math.ceil(order / (1 - product.scrap))
    const forms = Math.ceil(cast / product.cavity)
    const poured = forms * product.cavity
    const good = Math.floor(poured * (1 - product.scrap))
    const spec = specification(product.code)
    const metalRate = metalNorms[product.code] ?? spec.root.consumption
    const coreRate = sum(spec.semis.map(semi => semi.quantity))
    const cores = Math.ceil(poured * coreRate)
    const recipeAlloy = spec.alloy
    const recipeAvailable = !alloyDecision || !decisions[alloyDecision.id] || alloy === recipeAlloy
    const metal = order === 0 ? 0 : metalRate === null || !recipeAvailable ? null : precision(poured * metalRate / 1000)
    return {
      ...product, index, name: 'Изделие №' + (index + 1), initial: product.order,
      order, alloy, weight, excelCast, excelForms, excelShifts: excelForms / product.rate,
      cast, forms, poured, good, shifts: forms / product.rate, metalRate, metal, cores, coreRate, recipeAlloy, recipeAvailable,
      planned: precision(order * weight / 1000), goodMass: precision(good * weight / 1000),
    }
  })

  const focus = rows[2]
  const knownMetal = precision(sum(rows.map(row => row.metal ?? 0)))
  const metal = rows.every(row => row.metal !== null) ? knownMetal : null
  const materials = new Map<string, { code: string; name: string; need: number; category: string; sources: string[] }>()
  const recipeConflicts: string[] = []
  const missingRecipes: string[] = []
  let duplicates = 0
  for (const row of rows) {
    const recipe = documentFor(row.code).resources.filter(resource => !resource.semiCode && resource.parentCode && resource.code)
    const groups = new Map<string, typeof recipe>()
    for (const resource of recipe) {
      const key = resource.parentCode + '/' + resource.code
      const group = groups.get(key) ?? []
      group.push(resource)
      groups.set(key, group)
    }
    if (!row.recipeAvailable && row.order > 0) missingRecipes.push(row.code)
    for (const group of groups.values()) {
      const resource = group[0]
      if (new Set(group.map(item => JSON.stringify([item.unit, item.construction, item.consumption]))).size > 1) {
        recipeConflicts.push(row.code + ' · ' + resource.code)
        continue
      }
      duplicates += group.length - 1
      if (!row.recipeAvailable || !resource.consumption || row.metal === null || !row.order) continue
      // The source does not specify a nested recipe for every composite return.
      // Count a returned alloy as a charge input when it has no children.
      if (recipe.some(child => child.parentCode === resource.code)) continue
      const name = resource.name
      const category = /возврат/i.test(name) ? 'Возврат' : /модификатор/i.test(name) ? 'Модификаторы'
        : /ферросилиций|ферромарганец/i.test(name) ? 'Ферросплавы' : 'Шихта'
      const unit = resource.unit
      if (unit !== 'кг') continue
      const material = materials.get(resource.code) ?? { code: resource.code, name, need: 0, category, sources: [] }
      const base = norms.recipeBase === 'good' ? row.goodMass : row.metal
      material.need += base * resource.consumption
      material.sources.push(row.code + ' · ' + group.map(item => 'N' + item.row).join(', ') + ' · ' + resource.consumption + ' кг/т')
      materials.set(resource.code, material)
    }
  }
  const count = sum(rows.map(row => row.order))
  const tonnes = precision(sum(rows.map(row => row.planned)))
  const goodMass = precision(sum(rows.map(row => row.goodMass)))
  const energyBase = norms.energyBase === 'liquid' ? metal : goodMass
  const energyComputed = energyBase === null ? null : tryExpression(norms.energyFormula ?? 'M*K', { M: energyBase, K: norms.energyRate })
  const hoursComputed = tryExpression(norms.laborFormula ?? 'M*K', { M: goodMass, K: norms.laborRate })
  const energy = energyComputed === null ? null : precision(energyComputed, 2)
  const hours = hoursComputed === null ? null : precision(hoursComputed, 2)
  const staff = hours === null ? null : Math.ceil(hours / norms.shiftHours)
  const coreNeed = focus.cores ?? 0
  const lines = ([1, 2] as const).map(id => {
    const jobs = rows.filter(row => row.line === id && row.order > 0)
    const setup = Math.max(0, jobs.length - 1) * norms.changeover
    const excel = sum(jobs.map(row => row.excelShifts))
    const production = sum(jobs.map(row => row.shifts))
    return { id, jobs, setup, excel, production, scheduled: production + setup }
  })
  const coreSupply = norms.coreArrivalDate && norms.coreArrivalDate <= '2026-11-30' ? norms.coreArrival : 0
  return {
    rows, focus, count, tonnes, goodMass, knownMetal, metal, materials: [...materials.values()].map(item => {
      const provision = inventory?.[item.code]
      const arrivalsInPeriod = provision?.date && provision.date <= '2026-11-30' ? provision.arrival : 0
      return { ...item, provision, arrivalsInPeriod,
        gap: provision ? Math.max(0, precision(item.need - provision.stock - arrivalsInPeriod, 2)) : null }
    }), duplicates, recipeConflicts, missingRecipes, lines, energy,
    hours, staff, coreNeed, coreSupply, coreGap: Math.max(0, coreNeed - norms.coreStock - coreSupply),
    energyGap: energy === null ? null : Math.max(0, precision(energy - norms.energyLimit, 2)),
    staffGap: staff === null ? null : Math.max(0, staff - norms.staff),
    metalGap: metal === null ? null : Math.max(0, precision(metal - norms.metalStock)),
    excelShifts: sum(lines.map(line => line.excel)),
  }
}

export type Results = ReturnType<typeof calculate>
