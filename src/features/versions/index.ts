import { current, hasApproval } from '../../store.ts'
import type { State, Version } from '../../store.ts'
import { fingerprints, nodes, scopeIds } from '../../engine/dependencies/index.ts'
import { risks } from '../../engine/validation/index.ts'
import { badge, button, date, fmt, h, heading, option, panel, table } from '../../ui/shared.ts'
import type { View } from '../../ui/view.ts'

export function measures(v: Version) {
  const r=v.results
  return [
    ['Изделие №3',r.focus.order,0,'шт.','ОП'],
    ['Общий заказ',r.count,0,'шт.','ПДО'],
    ['Формы изделия №3',r.focus.forms,0,'шт.','ПДО'],
    ['Заливаемые отливки №3',r.focus.poured,0,'шт.','ПДО'],
    ['Смены изделия №3',r.focus.shifts,4,'смены','ПДО'],
    ['Жидкий металл по изделию №3',r.focus.metal,4,'т','ОГМет'],
    ['Общая потребность в металле',r.metal,4,'т','ОГМет'],
    ['Стержни изделия №3',r.coreNeed,0,'шт.','ЭО'],
    ['Плановый тоннаж заказа по Excel',r.tonnes,4,'т','ПДО'],
    ['АФЛ №1 по методике Excel',r.lines[0].excel,4,'смены','ПДО'],
    ['АФЛ №2 по методике Excel',r.lines[1].excel,4,'смены','ПДО'],
    ['Электроэнергия',r.energy,2,'кВт·ч','СГЭ'],
    ['Трудоёмкость',r.hours,2,'чел·ч','ЭО'],
    ['Дефицит стержней №3',r.coreGap,0,'шт.','ОМТО'],
  ] as const
}

export function versionsPage(state: State, view: View) {
  const last=current(state)
  const before=state.versions.find(v=>v.number===view.compareFrom)??state.versions.at(-2)??last
  const after=state.versions.find(v=>v.number===view.compareTo)??last
  const previous=measures(before)
  const oldRisk=risks(before.input,before.results)
  const newRisk=risks(after.input,after.results)
  const fromKeys=fingerprints(before.input,before.results)
  const toKeys=fingerprints(after.input,after.results)
  const changedNodes=nodes.filter(node=>node.id!=='final'&&fromKeys[node.id]!==toKeys[node.id]).map(node=>node.title)
  const preserved=scopeIds.filter(id=>hasApproval(before,id)&&hasApproval(after,id)&&before.reviews[id]?.fingerprint===after.reviews[id]?.fingerprint&&before.reviews[id]?.at===after.reviews[id]?.at)
  const repeat=scopeIds.filter(id=>hasApproval(before,id)&&!hasApproval(after,id))
  const scopeTitle=(id:typeof scopeIds[number])=>id==='pdo'?'Загрузка АФЛ №2':nodes.find(node=>node.id===id)!.title
  const list=(names:string[])=>names.length?names.join(' · '):'Нет'
  return `${heading('Сравнение версий','История производственной программы',button('Согласование','go:approvals','shield','primary'))}
  <div class="section-toolbar standalone"><label>Было <select data-change="compare-from">${state.versions.map(v=>option(String(v.number),'v'+v.number,v.number===before.number)).join('')}</select></label><label>Стало <select data-change="compare-to">${state.versions.map(v=>option(String(v.number),'v'+v.number,v.number===after.number)).join('')}</select></label>${badge(before===after?'Пока одна версия':'v'+before.number+' → v'+after.number,'blue')}</div>
  <div class="comparison-grid"><div>${panel('Показатели программы',table(['Показатель','v'+before.number,'v'+after.number,'Изменение','Служба'],measures(after).map(([name,value,digits,unit,department],index)=>{
    const was=previous[index][1]
    const delta=value==null||was==null?null:Number((value-was).toFixed(digits))
    return `<tr><td><b>${name}</b></td><td>${fmt(was,digits)} ${unit}</td><td>${fmt(value,digits)} ${unit}</td><td>${delta?`<b class="delta">${delta>0?'+':''}${fmt(delta,digits)} ${unit}</b>`:'—'}</td><td>${department}</td></tr>`
  }).join('')))}</div><div>
  ${panel('Затронутые подразделения',`<div class="panel-body">${list(changedNodes)}</div>`)}
  ${panel('Согласования',`<div class="stat-list"><div><span>Сохранены</span><b>${list(preserved.map(scopeTitle))}</b></div><div><span>Повторить</span><b>${list(repeat.map(scopeTitle))}</b></div></div>`)}
  ${panel('Изменения рисков',`<div class="stat-list"><div><span>Появились</span><b>${list(newRisk.filter(r=>!oldRisk.some(o=>o.id===r.id)).map(r=>r.title))}</b></div><div><span>Устранены</span><b>${list(oldRisk.filter(r=>!newRisk.some(n=>n.id===r.id)).map(r=>r.title))}</b></div></div>`)}
  ${panel('История версий',`<div class="stat-list">${[...state.versions].reverse().map(v=>`<div><span>v${v.number} · ${date(v.at)}</span><b>${v.approvedAt?'Утверждена · ':''}${h(v.actor)} · ${h(v.reason)}</b></div>`).join('')}</div>`)}</div></div>`
}
