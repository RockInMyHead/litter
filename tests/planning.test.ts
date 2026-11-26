import assert from 'node:assert/strict'
import test from 'node:test'
import { conflictFacts, documentFor, focusCode, products, specification } from '../src/data/factory/index.ts'
import { calculate, precision } from '../src/engine/calculation/index.ts'
import { criticalPath, edges, hasCycle, scopeIds } from '../src/engine/dependencies/index.ts'
import { risks } from '../src/engine/validation/index.ts'
import { answer, questions } from '../src/features/assistant/index.ts'
import { blockers, current, finalize, initial, recordReview, revise, syncOrders } from '../src/store.ts'

test('all five routes and production source rows agree with the workbook', () => {
  const r = current(initial()).results
  assert.deepEqual(r.rows.map(row => documentFor(row.code).operations.length), [20, 19, 18, 16, 22])
  assert.deepEqual(r.rows.map(row => specification(row.code).root.consumption), [74.5, 62.5, 3.7, 2, 7.3])
  assert.deepEqual(r.rows.map(row => row.coreRate), [2, 2, 1.33, 1, 1])
  assert.ok(documentFor(products[0].code).operations.some(op => op.number === '095.1'))
  assert.ok(r.rows.every((row, index) => Math.abs(row.excelShifts - products[index].excelShifts) < 1e-10))
  assert.deepEqual(r.lines.map(line => precision(line.excel)), [3.4842, .7788])
  assert.equal(precision(r.excelShifts), 4.2629)
  assert.equal(r.count, 20852)
  assert.equal(r.tonnes, 36.6106)
  assert.equal(r.metal, 94.9331)
  assert.equal(r.coreNeed, 26873)
  assert.equal(r.duplicates, 54)
  assert.deepEqual(r.recipeConflicts, [])
  assert.equal(risks(current(initial()).input, r).length, 3)
})

test('24000 orders creates v2 and recalculates affected scopes only', () => {
  const state = initial()
  const v1 = current(state)
  syncOrders(state)
  assert.equal(state.sync?.received, 5)
  assert.equal(current(state).number, 1)
  const input = structuredClone(v1.input)
  input.orders[focusCode] = 24000
  const flow = revise(state, input, 'Увеличение заказа', 'sales')
  const v2 = current(state)
  const r=v2.results
  assert.equal(v2.number, 2)
  assert.equal(v1.results.focus.order, 20000)
  assert.equal(r.count, 24852)
  assert.equal(r.tonnes, 41.7706)
  assert.equal(r.focus.forms, 8081)
  assert.equal(r.focus.poured, 24243)
  assert.equal(precision(r.focus.shifts), 4.1041)
  assert.equal(r.focus.metal, 89.6991)
  assert.equal(r.metal, 109.8737)
  assert.equal(r.coreNeed, 32244)
  assert.equal(r.coreGap, 2244)
  assert.equal(r.lines[1].excel, v1.results.lines[1].excel)
  assert.equal(v2.reviews.pdo, v1.reviews.pdo)
  assert.equal(v2.reviews.energy, undefined)
  assert.ok(flow.indexOf('sales') < flow.indexOf('pdo'))
  assert.ok(flow.indexOf('metal') < flow.indexOf('materials'))
  assert.ok(!flow.includes('spec'))
  assert.match(answer(state, questions[0]).join(' '), /Дефицит стержней/)
  syncOrders(state)
  assert.equal(current(state).results.focus.order, 24000)
  assert.ok(criticalPath('supply',edges).includes('supply'))
  assert.ok(hasCycle([...edges,['final','erp','Цикл']]))
})

test('arbitrary edits and incompatible recipes report the resulting coverage', () => {
  const input = structuredClone(current(initial()).input)
  input.orders[products[3].code] = 0
  const r = calculate(input)
  assert.equal(r.count, 20352)
  assert.equal(r.rows[3].metal, 0)
  assert.equal(r.metal, 93.8451)
  input.decisions.alloy3={value:'ВЧ 50',source:'Пример расчёта',reason:'Проверка',actor:'ОГМет',at:'2026-11-02'}
  const incompatible=calculate(input)
  assert.equal(incompatible.metal, null)
  assert.equal(incompatible.energy, null)
  assert.ok(incompatible.missingRecipes.includes(focusCode))
})

test('final approval requires source decisions, resource confirmation, and distinct roles', () => {
  const state = initial()
  assert.equal(finalize(state), false)
  const input = structuredClone(current(state).input)
  for (const item of conflictFacts) input.decisions[item.id] = {
    value: item.specification, source: 'Спецификация', reason: 'Сверено с XLSX', actor: 'ОГМет', at: '2026-11-02',
  }
  revise(state,input,'Данные подтверждены','spec')
  assert.ok(!risks(current(state).input,current(state).results).length)
  assert.ok(recordReview(state, 'spec', 'approved', ''))
  for (const id of scopeIds) {
    state.role = id
    if(id==='supply') assert.match(recordReview(state,id,'approved',''),/Подтвердите/)
    assert.equal(recordReview(state,id,'approved','',true),'')
  }
  state.role='Руководитель'
  assert.deepEqual(blockers(current(state)),[])
  assert.equal(finalize(state),true)
  const approved=current(state)
  const energy=structuredClone(approved.input)
  energy.norms.energyRate += 10
  assert.deepEqual(revise(state,energy,'Норматив СГЭ','energy'),['energy','final'])
  assert.ok(approved.approvedAt)
  assert.equal(current(state).approvedAt,undefined)
  assert.equal(current(state).reviews.metal,approved.reviews.metal)
  assert.equal(current(state).reviews.energy,undefined)
  const versionSummary = answer(state, questions[2]).join(' ')
  assert.match(versionSummary, /Электроэнергия/)
  assert.doesNotMatch(versionSummary, /Формы изделия №3/)
  const recipe=structuredClone(current(state).input)
  recipe.norms.recipeBase='good'
  revise(state,recipe,'База расчёта шихты','materials')
  assert.equal(current(state).reviews.supply,undefined)
})

test('resource shortages and formulas update the responsible scopes', () => {
  const state=initial()
  const before=current(state)
  const input=structuredClone(before.input)
  const item=before.results.materials[0]
  input.inventory[item.code]={stock:0,arrival:0,date:''}
  const affected=revise(state,input,'Нулевой остаток','supply')
  assert.ok(affected.includes('supply'))
  assert.ok(risks(current(state).input,current(state).results).some(risk=>risk.id==='material-'+item.code))
  input.norms.energyFormula='M*(K+1)'
  assert.equal(calculate(input).energy,precision((before.results.metal??0)*721,2))
  input.norms.energyFormula='K/(M-M)'
  const failed=calculate(input)
  assert.equal(failed.energy,null)
  assert.ok(risks(input,failed).some(risk=>risk.id==='energy-formula'))
})
