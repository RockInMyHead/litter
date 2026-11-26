import { workbook } from './workbook.ts'

export const period = 'Ноябрь 2026'
export const sourceLabel = 'XLSX · «Пример расчета», строки 15–19'
export const demoLabel = 'Демонстрационное значение — требуется подтверждение предприятия'

export const products = workbook.program.map(row => ({ ...row, line: row.line as 1 | 2 }))
export const focusCode = products[2].code
export const lineNames = { 1: 'DISA-230A', 2: 'Belloi & Romagnoli' }
export const documents = workbook.documents
export type ProductCode = keyof typeof documents
export type Resource = (typeof documents)[ProductCode]['resources'][number]
export function documentFor(code: string) {
  return documents[code as ProductCode]
}

export function specification(code: string) {
  const resources = documentFor(code).resources
  const root = resources.find(row => !row.semiCode && !row.parentCode && row.code)!
  const semis = [...new Map(resources.filter(row => row.semiCode).map(row => [row.semiCode, row])).values()]
  const match = root.name.match(/^(ВЧ|СЧ)\s*(\d+)/)
  return { root, semis, alloy: match ? match[1] + ' ' + match[2] : root.name }
}

export const conflictFacts = [
  { id: 'weight2', product: 1, field: 'weight', title: 'Вес отливки', example: products[1].weight, specification: specification(products[1].code).root.construction!, impact: 'Изменится масса заказа и расчёт по её тоннажу.' },
  { id: 'alloy3', product: 2, field: 'alloy', title: 'Марка сплава', example: products[2].alloy, specification: specification(products[2].code).alloy, impact: 'Изменится разнесение потребности в металле по маркам.' },
  { id: 'alloy5', product: 4, field: 'alloy', title: 'Марка сплава', example: products[4].alloy, specification: specification(products[4].code).alloy, impact: 'Требуется проверить марку перед формированием баланса.' },
] as const
