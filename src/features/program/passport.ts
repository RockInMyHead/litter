import { current, documentStatus, readyCount } from '../../store.ts'
import type { State } from '../../store.ts'
import { demoLabel, period, sourceLabel } from '../../data/factory/index.ts'
import { risks } from '../../engine/validation/index.ts'
import { scopeIds } from '../../engine/dependencies/index.ts'
import { badge, button, date, fmt, h, heading, panel, table } from '../../ui/shared.ts'
import { eventsList } from '../workflow/index.ts'

export function passportPage(state: State) {
  const v=current(state),r=v.results
  const items=risks(v.input,r)
  return `${heading('Паспорт производственной программы',period+' · v'+v.number+' · '+documentStatus(v),button('Согласование','go:approvals','shield')+button('Печатная форма','print','print','primary'))}
  ${panel('Сводка программы',`<div class="record-summary"><div><small>Заказ · ОП</small><strong>${fmt(r.count)} шт.</strong></div><div><small>Масса заказа · ПДО</small><strong>${fmt(r.tonnes,4)} т</strong></div><div><small>Масса годного · ПДО</small><strong>${fmt(r.goodMass,4)} т</strong></div><div><small>Жидкий металл · ОГМет</small><strong>${fmt(r.metal,4)} т</strong></div><div><small>Согласовано</small><strong>${readyCount(v)} / ${scopeIds.length}</strong></div></div>`,badge(v.approvedAt?'Утверждён '+date(v.approvedAt):'Рабочий паспорт',v.approvedAt?'green':'blue'))}
  ${panel('Заказы, маршруты и план выпуска',table(['Изделие','Заказ','Годные отливки','Формы','АФЛ','Сплав плана','Маршрут / источник'],r.rows.map(row=>`<tr><td><b>${row.name}</b></td><td>${fmt(row.order)}</td><td>${fmt(row.good)}</td><td>${fmt(row.forms)}</td><td>№${row.line}</td><td>${h(row.alloy)}</td><td>${button(row.code,'tech:'+row.index,'book','text-btn')}</td></tr>`).join('')),`<small>${sourceLabel}</small>`)}
  <div class="bottom-grid">${panel('Загрузка и баланс',`<div class="stat-list"><div><span>АФЛ №1 · ПДО</span><b>${fmt(r.lines[0].scheduled,4)} смены с переналадкой</b></div><div><span>АФЛ №2 · ПДО</span><b>${fmt(r.lines[1].scheduled,4)} смены с переналадкой</b></div><div><span>Шихта и добавки · ЭО</span><b>${fmt(r.materials.reduce((acc,item)=>acc+item.need,0),2)} кг · предварительно</b></div></div>`,button('Ведомость','go:materials','','text-btn'))}
  ${panel('Обеспеченность',`<div class="stat-list"><div><span>Стержни №3 · ЭО / ОМТО</span><b>${fmt(r.coreNeed)} шт. · дефицит ${fmt(r.coreGap)}</b></div><div><span>Персонал · ЭО / ОУК</span><b>${fmt(r.staff)} чел. · дефицит ${fmt(r.staffGap)}</b></div><div><span>Энергия · СГЭ</span><b>${fmt(r.energy,2)} кВт·ч</b></div></div>`,badge('Демо лимиты','amber'))}</div>
  ${panel('Риски и статус данных',`<div class="panel-body">${items.length?items.map(risk=>`<p>${badge(risk.severity==='critical'?'Критический':'Проверка',risk.severity==='critical'?'red':'amber')} ${h(risk.title)} · ${h(risk.detail)}</p>`).join(''):'<p>Открытых рисков в демонстрационных проверках нет.</p>'}<p class="panel-note">${demoLabel}. Остатки отдельных материалов и нормы последующих операций требуют данных предприятия.</p></div>`)}
  ${panel('История изменений',eventsList(state))}`
}
