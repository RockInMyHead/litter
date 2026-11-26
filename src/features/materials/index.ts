import { current } from '../../store.ts'
import type { State } from '../../store.ts'
import { demoLabel, specification } from '../../data/factory/index.ts'
import { badge, button, fmt, h, heading, metric, panel, table, empty } from '../../ui/shared.ts'
import type { View } from '../../ui/view.ts'

export const categories = ['Сводная потребность','Металл','Шихта','Модификаторы','Ферросплавы','Возврат','Полуфабрикаты','Стержни']

function pigIronPurchase(state: State) {
  const { results } = current(state)
  const items = results.materials.filter(item => /^Чугун передельный/i.test(item.name))
  const incomplete = results.missingRecipes.length > 0 || results.recipeConflicts.length > 0
  if (!items.length && !incomplete) return ''

  const needs = items.reduce((total, item) => total + item.need, 0)
  let purchase = 'Введите остатки и поставки по каждой позиции'
  if (incomplete) {
    purchase = 'Сначала уточните рецептуры'
  } else if (items.every(item => item.gap !== null)) {
    const total = items.reduce((sum, item) => sum + (item.gap ?? 0), 0)
    purchase = total > 0 ? fmt(total / 1000, 3) + ' т' : 'Закупка не требуется'
  }

  return panel('Закупка передельного чугуна', `<div class="record-summary">
    <div><small>${incomplete ? 'Потребность по доступным рецептурам' : 'Потребность по плану'}</small><strong>${fmt(needs / 1000, 3)} т</strong></div>
    <div><small>Докупить</small><strong>${purchase}</strong></div>
  </div>
  ${table(['Номенклатура','Потребность, кг','Доступный остаток, кг','Поставки до конца периода, кг','Докупить, кг',''],items.map(item=>`<tr>
    <td>${h(item.name)} <small class="cell-sub mono">${h(item.code)}</small></td><td>${fmt(item.need,2)}</td><td>${fmt(item.provision?.stock,2)}</td>
    <td>${item.provision ? fmt(item.arrivalsInPeriod,2) : '—'}</td><td><b>${incomplete ? 'Рецептуры не уточнены' : item.gap === null ? 'Нет данных' : fmt(item.gap,2)}</b></td>
    <td>${button('Ввести остаток и поставки','stock:'+item.code,'edit')}</td></tr>`).join(''))}
  <p class="panel-note">Из потребности вычитаются доступный остаток и поставки до конца планового периода. Дефицит рассчитывается отдельно по каждому коду.</p>`, badge('Предварительный расчёт','amber'))
}

export function materialsPage(state: State, view: View) {
  const v=current(state), r=v.results, n=v.input.norms
  const tab=view.materialTab
  const materials=r.materials.filter(item => tab==='Сводная потребность'||item.category===tab)
  const metalRows=r.rows.map(row=>`<tr><td>${button(row.name,'tech:'+row.index,'','text-btn')}</td><td>${row.recipeAlloy}${row.alloy!==row.recipeAlloy?badge('План · '+row.alloy,'amber'):''}</td><td>${fmt(row.poured)}</td><td>${fmt(row.metalRate,2)}</td><td>${fmt(row.metal,4)}</td><td>${fmt(row.goodMass,4)}</td><td>${row.metal == null ? '—' : fmt(row.metal-row.goodMass,4)}</td><td>${row.metal ? fmt(row.goodMass/row.metal*100,1)+'%' : '—'}</td></tr>`).join('')
  const semiRows=r.rows.flatMap(row=>specification(row.code).semis.map(semi=>`<tr><td>${h(semi.semi)}</td><td class="mono">${semi.semiCode}</td><td>${row.name}</td><td>${fmt(semi.quantity,2)}</td><td>${fmt(Math.ceil(row.poured*semi.quantity))}</td><td>${row.index===2?'Сводно по изделию':'—'}</td><td>${row.index===2?'Сводно по изделию':'—'}</td><td>ЦЧЛ</td></tr>`)).join('')
  return `${heading('Материалы и ресурсы','Потребность, обеспечение и предварительные нормы · v'+v.number,button('Нормативы и остатки','go:settings','settings'))}
  <div class="metrics four">${metric('Жидкий металл',fmt(r.metal,4)+' т','Ресурсные спецификации')}${metric('Масса годного',fmt(r.goodMass,4)+' т','Производственное округление')}${metric('Стержни изделия №3',fmt(r.coreNeed)+' шт.','Норма XLSX · 1,33 шт./отл.')}${metric('Дефицит стержней №3',fmt(r.coreGap)+' шт.',demoLabel)}</div>
  ${tab==='Сводная потребность'||tab==='Шихта'?pigIronPurchase(state):''}
  <div class="section-toolbar standalone wrap">${categories.map(cat=>button(cat,'material:'+cat,'',cat===tab?'selected':'')).join('')}</div>
  ${tab==='Металл' ? panel('Баланс металла',table(['Изделие','Сплав рецептуры','Заливка, шт.','Норма, кг/шт.','Металл, т','Годное, т','Оценка возврата, т','Выход годного'],metalRows)+`<p class="info-strip">Оценка возврата равна разности жидкого металла и массы годного. ${demoLabel}.</p>`) : ['Стержни','Полуфабрикаты'].includes(tab) ? panel('Полуфабрикаты по спецификациям',table(['Стержень','Код','Изделие','Норма, шт./отл.','Потребность, шт.','Остаток','Поставка','Ответственный'],semiRows)+`<p class="info-strip">У изделия №3 недельный контроль в демо ведётся суммарно. Остаток ${fmt(n.coreStock)} шт., поставка до конца периода ${fmt(r.coreSupply)} шт., дефицит ${fmt(r.coreGap)} шт. Норма 0,33 сохранена из источника и требует сверки с вариантом «один стержень на форму».</p>`) : panel(tab,`${materials.length ? table(['Ресурс','Код','Категория','Норматив и источник','Потребность, кг','Остаток','Поставка','Дефицит','Ответственный',''],materials.map(item=>`<tr><td>${h(item.name)}</td><td class="mono">${item.code}</td><td>${item.category}</td><td><details><summary>Показать нормы</summary>${item.sources.map(source=>`<small class="cell-sub">${h(source)}</small>`).join('')}</details></td><td><b>${fmt(item.need,2)}</b></td><td>${fmt(item.provision?.stock,2)}</td><td>${item.provision?fmt(item.arrivalsInPeriod,2):'—'}</td><td>${item.gap===null?'Нет данных':fmt(item.gap,2)}</td><td>ЭО / ОМТО</td><td>${button('Обеспечение','stock:'+item.code,'edit')}</td></tr>`).join('')) : empty('В этой категории нет рассчитанной потребности.')}`,badge('Предварительно','amber'))}
  <p class="info-strip">В расчёте шихты норма интерпретируется как кг/т. База · ${n.recipeBase==='liquid'?'жидкий металл':'годное литьё'}. Исключено ${r.duplicates} идентичных повторов основной рецептуры. Зеркальные строки полуфабрикатов сохранены в спецификациях. Данные об остатках отдельных шихтовых материалов в книге отсутствуют.</p>`
}

export function stockPanel(state: State, code: string) {
  const item = current(state).results.materials.find(material => material.code === code)!
  return `<p class="info-strip">${demoLabel}. Потребность · ${fmt(item.need,2)} кг.</p>
  <form data-form="stock:${item.code}" class="form-stack">
  <label>Доступный остаток, кг<input type="number" name="stock" required min="0" max="100000000000" step=".01" value="${item.provision?.stock ?? ''}" placeholder="0, если остатка нет"></label>
  <label>Ожидается поставка, кг<input type="number" name="arrival" required min="0" max="100000000000" step=".01" value="${item.provision?.arrival ?? 0}"></label>
  <label>Дата поставки<input type="date" name="date" value="${h(item.provision?.date)}"></label>
  <button class="btn primary">Сохранить обеспечение</button></form>`
}
