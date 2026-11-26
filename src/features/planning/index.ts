import { current } from '../../store.ts'
import type { State } from '../../store.ts'
import { calculate } from '../../engine/calculation/index.ts'
import { demoLabel, lineNames, period } from '../../data/factory/index.ts'
import { badge, button, fmt, heading, option, panel, table } from '../../ui/shared.ts'
import type { View } from '../../ui/view.ts'

export const scenarios = ['Сбалансированный','Приоритет сроков','Минимизация переналадок','Минимизация смен сплава','Баланс загрузки','Увеличение заказов на 20%','Простой АФЛ №1']
const workdays = Array.from({length:30},(_,i)=>i+1).filter(day=>![0,6].includes(new Date(2026,10,day).getDay())).slice(0,20)

export function planningPage(state: State, view: View) {
  const v = current(state)
  const stress = view.scenario === scenarios[5]
  const downtime = view.scenario === scenarios[6]
  const input = stress ? { ...v.input, orders: Object.fromEntries(Object.entries(v.input.orders).map(([code,n])=>[code,Math.ceil(n*1.2)])) } : v.input
  const r = stress ? calculate(input) : v.results
  const max = v.input.norms.shifts
  const shown = view.planningScale==='Месяц' ? max : Math.min(max,view.planningScale==='Смены'?8:12)
  const baseSegments = view.planningScale==='Месяц' ? 4 : view.planningScale==='Дни' ? Math.ceil(shown/2) : Math.ceil(shown)
  const tickLabels = Array.from({length:baseSegments},(_,i) =>
    view.planningScale==='Месяц' ? ((i+1)+' нед.') : view.planningScale==='Дни' ? ((workdays[i] ?? i+1)+' ноя.') : (i+1)+' смена')
  const lanes = r.lines.map(line=>{
    const jobs = [...line.jobs]
    if (view.scenario===scenarios[3]) jobs.sort((a,b)=>a.alloy.localeCompare(b.alloy,'ru')||a.index-b.index)
    let cursor=0
    const jobsHtml=jobs.map((job,i)=>{
      if (downtime&&line.id===1) return ''
      const gap=i?v.input.norms.changeover:0
      const start=cursor+gap
      cursor=start+job.shifts
      const pos=(n:number)=>n/shown*100
      const segment = gap&&cursor>0 ? `<span class="gantt-setup" title="Переналадка ${fmt(gap,2)} смены" style="left:${pos(start-gap)}%;width:${pos(gap)}%"></span>` : ''
      return segment+`<button class="gantt-job job-${job.index}" data-action="job:${job.index}" style="left:${pos(start)}%;width:${pos(job.shifts)}%" title="${job.name} · ${job.alloy} · ${fmt(job.shifts,4)} смены"><span>${job.name}</span></button>`
    }).join('')
    return `<div class="gantt-lane"><div><b>АФЛ №${line.id}</b><small>${lineNames[line.id]}</small></div><div class="gantt-track" style="--columns:${baseSegments}">${downtime&&line.id===1?'<div class="gantt-stop">Простой · линия недоступна</div>':jobsHtml}</div></div>`
  }).join('')
  return `${heading('Планирование АФЛ','Диаграмма загрузки · '+period,button('Производственная программа','go:program','clipboard'))}
  <div class="section-toolbar standalone"><label>Вариант <select data-change="scenario">${scenarios.map(s=>option(s,s,s===view.scenario)).join('')}</select></label><div class="segmented">${['Дни','Смены','Месяц'].map(s=>button(s,'scale:'+s,'',s===view.planningScale?'active':'')).join('')}</div></div>
  ${panel('Производственные задания',`<div class="gantt"><div class="gantt-axis"><span>Оборудование</span><div style="--columns:${baseSegments}">${tickLabels.map(label=>`<span>${label}</span>`).join('')}</div></div>${lanes}</div><div class="graph-legend"><span class="blue"><i></i>Формовка</span><span class="amber"><i></i>Переналадка</span><span class="gray"><i></i>Свободная мощность</span>${downtime?'<span class="red"><i></i>Простой</span>':''}</div>`,badge(stress||downtime?'Стресс-сценарий':'Сценарий плана',stress||downtime?'amber':'blue'))}
  ${panel('Резерв производственных мощностей',table(['Линия','Методика Excel','Формовка','Переналадка','Доступно','Резерв'],r.lines.map(line=>`<tr><td><b>АФЛ №${line.id}</b><small class="cell-sub">${lineNames[line.id]}</small></td><td>${fmt(line.excel,4)}</td><td>${fmt(line.production,4)}</td><td>${fmt(line.setup,2)}</td><td>${downtime&&line.id===1?'0':fmt(max)}</td><td>${fmt((downtime&&line.id===1?0:max)-line.scheduled,2)} смены</td></tr>`).join('')))}
  <p class="info-strip">${demoLabel}. Календарь · 20 рабочих дней, 2 смены в день. Перенос между линиями доступен при наличии данных о совместимости и выпуске на альтернативной линии. Для текущих пяти изделий альтернативные параметры не подтверждены. ${stress||downtime?'Действует только для просмотра сценария.':'При фиксированных линиях и равных сроках некоторые варианты дают одинаковый результат.'}</p>`
}
