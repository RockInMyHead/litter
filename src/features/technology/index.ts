import { documentFor, lineNames, products, specification } from '../../data/factory/index.ts'
import type { Resource } from '../../data/factory/index.ts'
import { current } from '../../store.ts'
import type { State } from '../../store.ts'
import { badge, button, fmt, h, heading, option, panel, table } from '../../ui/shared.ts'
import type { View } from '../../ui/view.ts'

function branch(rows: readonly Resource[], parent: string, ancestry: string[], code: string): string {
  const group = new Set<string>()
  return rows.filter(row => row.parentCode === parent && row.code).map(row => {
    const signature = JSON.stringify([row.code,row.construction,row.consumption,row.unit])
    const duplicate = group.has(signature)
    group.add(signature)
    const descendants = !ancestry.includes(row.code) && !duplicate ? branch(rows, row.code, [...ancestry,row.code], code) : ''
    const label = `<span class="tree-name">${h(row.name)} <small class="mono">${row.code}</small></span><span class="tree-norm">${fmt(row.construction,3)} / ${fmt(row.consumption,3)} ${h(row.unit)}</span><span class="tree-source" title="Маршрут ${row.route}, позиция ${row.position}; количество ${row.quantity}; композитность ${row.composite ? 'да' : 'нет'}">${code}!J${row.row}:O${row.row}</span>${duplicate ? badge('Повтор','amber') : ''}`
    return descendants ? `<details open class="tree-details"><summary>${label}</summary><div class="tree-children">${descendants}</div></details>` : `<div class="tree-leaf">${label}</div>`
  }).join('')
}

export function technologyPage(state: State, view: View) {
  const row = current(state).results.rows[view.product]
  const doc = documentFor(row.code)
  const spec = specification(row.code)
  const main = doc.resources.filter(resource => !resource.semiCode)
  return `${heading('Технологические карты', 'Маршруты и ресурсные спецификации из XLSX', button('Контроль качества', 'go:quality', 'alert'))}
  <div class="section-toolbar standalone"><label>Изделие <select data-change="product" aria-label="Выбрать изделие">${products.map((product,i)=>option(String(i),'Изделие №'+(i+1)+' · '+product.code,view.product===i)).join('')}</select></label><div class="segmented">${['Маршрут','Спецификация'].map(tab=>button(tab,'tech-tab:'+tab,'',view.techTab===tab?'active':'')).join('')}</div></div>
  ${panel(row.name+' · '+doc.process,`<div class="record-summary"><div><small>Техпроцесс</small><strong>${doc.processCode}</strong></div><div><small>Формовочная линия</small><strong>АФЛ №${row.line} · ${lineNames[row.line]}</strong></div><div><small>Модельный комплект</small><strong>${row.set}</strong></div><div><small>Вес / брак</small><strong>${fmt(row.weight,2)} кг / ${fmt(row.scrap*100,1)}%</strong></div><div><small>Сплав в спецификации</small><strong>${spec.alloy}</strong></div></div>`,badge(row.code,'blue'))}
  ${view.techTab==='Маршрут' ? panel('Последовательность операций',table(['Операция','Наименование','Подразделение','Оборудование','Источник'],doc.operations.map(op=>`<tr><td class="mono"><b>${op.number}</b><small class="cell-sub">${op.code}</small></td><td>${h(op.name)}</td><td>${h(op.area)}</td><td>${op.equipment.length ? op.equipment.map(eq=>`<div class="equipment">${h(eq.name)} <small class="mono">${eq.code}</small></div>`).join('') : '—'}</td><td class="mono">${row.code}!A${op.rows[0]}${op.rows.length>1?':K'+op.rows.at(-1):''}</td></tr>`).join('')),badge(String(doc.operations.length)+' операций')) : panel('Иерархия ресурсной спецификации',`<div class="tree"><div class="info-strip">Нормы в строках представлены как конструктивная / расходная. Источник и служебная нумерация доступны у каждой позиции.</div><div class="tree-root"><b>${row.name}</b> <small class="mono">${row.code}</small></div><div class="tree-children">${branch(main,'',[],row.code)}<details open class="tree-details"><summary>Полуфабрикаты и стержни</summary><div class="tree-children">${spec.semis.map(semi=>`<details class="tree-details"><summary>${h(semi.semi)} <small class="mono">${semi.semiCode}</small><span class="tree-norm">${fmt(semi.quantity,2)} ${semi.semiUnit}/отл.</span></summary><div class="tree-children">${[...new Set(doc.resources.filter(x=>x.semiCode===semi.semiCode).map(x=>x.parentCode))].map(parent=>`<details class="tree-details"><summary>${h(doc.resources.find(x=>x.parentCode===parent)?.parent||parent||'Ресурсы')}</summary><div class="tree-children">${branch(doc.resources.filter(x=>x.semiCode===semi.semiCode),parent,[],row.code)}</div></details>`).join('')}</div></details>`).join('')}</div></details></div></div>`,badge(String(doc.resources.length)+' строк XLSX'))}`
}
