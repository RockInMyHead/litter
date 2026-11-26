import { current, documentStatus } from '../../store.ts'
import type { State } from '../../store.ts'
import { lineNames, period, sourceLabel } from '../../data/factory/index.ts'
import { badge, button, fmt, heading, metric, panel, table } from '../../ui/shared.ts'
import type { View } from '../../ui/view.ts'

export function programPage(state: State, view: View) {
  const v = current(state)
  const r = v.results
  const excel = view.mode === 'excel'
  return `${heading('Производственная программа', period + ' · ' + sourceLabel, button('Заказы', 'go:orders', 'shopping') + button('Сравнить версии', 'go:versions', 'compare') + button('Паспорт', 'go:passport', 'file', 'primary'))}
  <div class="metrics four">${metric('Заказы', fmt(r.count)+' шт.', '5 номенклатурных позиций')}${metric('Масса заказа',fmt(r.tonnes,4)+' т','По весу отливки')}${metric('Формовка',fmt(excel?r.excelShifts:r.lines.reduce((sum,line)=>sum+line.production,0),4)+' смены',excel?'Методика предприятия':'Производственное округление')}${metric('Жидкий металл',fmt(r.metal,4)+' т','По нормам ресурсных спецификаций')}</div>
  ${panel('План выпуска',`<div class="section-toolbar"><div class="segmented">${button('Методика предприятия','method:excel','',excel?'active':'')}${button('Производственное округление','method:production','',!excel?'active':'')}</div></div>${table(['Изделие','Заказ, шт.','Сплав','АФЛ','Брак','Комплект','В форме','С учётом брака','Формы','Заливка','Форм/смену','Смены','Вес, кг','Масса, т','Металл, кг/шт.','Ресурсы',''],r.rows.map(row => `<tr><td><button class="link" data-action="tech:${row.index}">${row.name}</button><small class="mono cell-sub">${row.code}</small></td><td><b>${fmt(row.order)}</b>${row.order!==row.initial?`<small class="cell-sub">из 1С · ${fmt(row.initial)}</small>`:''}</td><td>${row.alloy}${row.alloy !== row.recipeAlloy ? '<span class="inline-flag" title="Сплав отличается от спецификации">!</span>' : ''}</td><td>№${row.line}</td><td>${fmt(row.scrap*100,1)}%</td><td>${row.set}</td><td>${row.cavity}</td><td>${fmt(excel?row.excelCast:row.cast,excel?3:0)}</td><td>${fmt(excel?row.excelForms:row.forms,excel?3:0)}</td><td>${excel?'—':fmt(row.poured)}</td><td>${fmt(row.rate)}</td><td>${fmt(excel?row.excelShifts:row.shifts,4)}</td><td>${fmt(row.weight,2)}</td><td>${fmt(row.planned,4)}</td><td>${fmt(row.metalRate,1)}</td><td>${badge(row.index===2&&r.coreGap?'Дефицит':row.alloy!==row.recipeAlloy?'Уточнение':'Предварительно',row.index===2&&r.coreGap?'red':'amber')}</td><td>${button('Изменить','edit:'+row.index,'edit')}</td></tr>`).join(''))}`,badge('v'+v.number+' · '+documentStatus(v),'blue'))}
  <div class="bottom-grid">${r.lines.map(line => panel('АФЛ №'+line.id+' · '+lineNames[line.id],`<div class="stat-list"><div><span>Методика Excel</span><b>${fmt(line.excel,4)} смены</b></div><div><span>Производственное округление</span><b>${fmt(line.production,4)} смены</b></div></div>`)).join('')}</div>
  <p class="page-note">Масса заказа рассчитывается по заказанным изделиям. Металл и стержни рассчитываются по объёму заливки с производственным округлением.</p>`
}
