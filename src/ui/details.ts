import { conflictFacts, demoLabel, products, sourceLabel, specification } from '../data/factory/index.ts'
import { normFields } from '../data/factory/demo.ts'
import { current, documentStatus, readyCount } from '../store.ts'
import type { State } from '../store.ts'
import { nodes, scopeIds, isScope } from '../engine/dependencies/index.ts'
import type { NodeId } from '../engine/dependencies/index.ts'
import { risks } from '../engine/validation/index.ts'
import { badge, button, date, empty, fmt, h, heading, icon, metric, option, panel, table } from './shared.ts'
import type { View } from './view.ts'
import { due, eventsList, nodeTitle, owner, statuses } from '../features/workflow/index.ts'
import { approvalForm } from '../features/approvals/index.ts'

export function commentForm(state: State, key: string) {
  const log=state.comments[key]??[]
  return `<section class="comment-box"><h3>Обсуждение</h3>${log.length?log.slice().reverse().map(c=>`<div class="comment"><b>${h(c.actor)}</b><small>${date(c.at)} · v${c.version}</small><p>${h(c.text)}</p></div>`).join(''):empty('Комментариев пока нет.')}<form data-form="comment:${h(key)}" class="form-stack"><label>Комментарий<textarea required name="text" rows="2" maxlength="1000" placeholder="Уточнение для ответственной службы"></textarea></label><button class="btn">Добавить комментарий</button></form></section>`
}

export function qualityPage(state: State) {
  const v=current(state)
  return `${heading('Контроль качества данных','Расхождения между примером расчёта и ресурсными спецификациями',button('Технологические карты','go:technology','book'))}
  ${panel('Расхождения исходных данных', table(['Изделие','Показатель','Пример расчёта','Ресурсная спецификация','Ответственный','Решение',''],conflictFacts.map(item=>{
    const d=v.input.decisions[item.id]
    return `<tr><td><b>Изделие №${item.product+1}</b><small class="cell-sub mono">${products[item.product].code}</small></td><td>${item.title}</td><td>${h(item.example)}${item.field==='weight'?' кг':''}</td><td>${h(item.specification)}${item.field==='weight'?' кг':''}</td><td>ОГМет</td><td>${d?badge('Подтверждено · '+d.value,'green'):badge('На уточнении','red',true)}</td><td>${button('Сравнить источники','conflict:'+item.id,'compare')}</td></tr>`
  }).join('')),badge(String(conflictFacts.filter(item=>!v.input.decisions[item.id]).length)+' открыто','red'))}
  <p class="info-strip">Плановый тоннаж отражает массу заказа. Потребность в жидком металле рассчитывается отдельно по расходным нормам ресурсных спецификаций.</p>`
}

export function conflictPanel(state: State, id: string) {
  const item=conflictFacts.find(x=>x.id===id)!
  const product=products[item.product]
  const d=current(state).input.decisions[id]
  const units=item.field==='weight'?' кг':''
  return `<div class="form-stack"><div class="conflict-sources"><div><small>Пример расчета · ${item.field==='weight'?'N':'D'}${product.row}</small><strong>${item.example}${units}</strong></div><div><small>${product.code} · ${item.field==='weight'?'M':'K'}${specification(product.code).root.row}</small><strong>${item.specification}${units}</strong></div></div><p class="info-strip">${item.impact}</p>
  ${d?`<div class="comment"><b>${h(d.value)}${units} · ${h(d.source)}</b><small>${date(d.at)} · ${h(d.actor)}</small><p>${h(d.reason)}</p></div>`:badge('Ожидается решение ОГМет','red',true)}
  ${state.role!=='spec' ? button('Войти как технолог ОГМет','role:spec','users') : `<form data-form="conflict:${id}" class="form-stack"><label>Источник решения<select name="source" data-change="conflict-source">${option('specification','Ресурсная спецификация')}${option('example','Пример расчёта')}${option('manual','Уточнённое значение')}</select></label><label id="manual-conflict" hidden>Уточнённое значение<input name="value" ${item.field==='weight'?'type="number" min="0.001" step="any"':'maxlength="40" placeholder="ВЧ 40"'}></label><label>Обоснование<textarea name="reason" rows="3" required maxlength="500" placeholder="Укажите основание решения"></textarea></label><button class="btn primary">Подтвердить значение</button></form>`}
  ${commentForm(state,'conflict-'+id)}</div>`
}

const calculations: Partial<Record<NodeId,string>> = {
  pdo:'C = N × (1 + b), F = C / k, T = F / P, M = N × w / 1000',
  spec:'Сравнение исходных значений XLSX и решений ОГМет',
  metal:'M = Z × m / 1000',
  materials:'Потребность = тоннаж × норма. Стержни = ceil(заливка × норма)',
  energy:'E = тоннаж × норматив электроэнергии',
  labor:'Человеко-часы = масса годного × трудоёмкость',
  hr:'Дефицит = max(0, потребность − доступный персонал)',
  supply:'Дефицит = max(0, потребность − остаток − подтверждённые поставки)',
}
export const nodeTabs=['Обзор','Входящие данные','Расчёты','Исходящие данные','Документы','Согласование','Обсуждение','История']

function nodeOutput(state: State,id:NodeId) {
  const v=current(state), r=v.results
  const n=v.input.norms
  const map: Record<NodeId,string> = {
    erp:'5 заказов · 5 ресурсных спецификаций',
    sales:fmt(r.count)+' шт. по заказам',
    pdo:fmt(r.tonnes,4)+' т массы заказа · '+fmt(r.excelShifts,4)+' смены',
    spec:conflictFacts.filter(c=>!v.input.decisions[c.id]).length+' расхождений к уточнению',
    metal:fmt(r.metal,4)+' т жидкого металла',
    materials:r.materials.length+' позиций шихты и добавок · '+fmt(r.coreNeed)+' стержней изделия №3',
    labor:fmt(r.hours,2)+' чел·ч · '+fmt(r.staff)+' чел.',
    energy:fmt(r.energy,2)+' кВт·ч · лимит '+fmt(n.energyLimit)+' кВт·ч',
    masters:'Стержни изделия №3: дефицит '+fmt(r.coreGap)+' шт. · металл: '+fmt(r.metalGap,2)+' т дефицита',
    supply:fmt(r.coreSupply)+' шт. ожидается до конца периода · дефицит '+fmt(r.coreGap)+' шт.',
    chief:fmt(r.lines[0].scheduled,2)+' / '+fmt(r.lines[1].scheduled,2)+' смены с переналадками',
    hr:fmt(r.staff)+' из '+fmt(n.staff)+' сотрудников · дефицит '+fmt(r.staffGap)+' чел.',
    final:documentStatus(v)+' · '+readyCount(v)+' из '+scopeIds.length+' согласований',
  }
  return map[id]
}
const nodePages: Record<NodeId,[string,string]> = {
  erp:['orders','Реестр заказов'],sales:['orders','Открыть заказы'],pdo:['program','Открыть программу'],
  spec:['quality','Контроль качества данных'],metal:['materials','Баланс металла'],materials:['materials','Материальная потребность'],
  labor:['settings','Нормативы трудоёмкости'],energy:['settings','Нормативы энергии'],masters:['materials','Проверить ресурсы'],
  chief:['planning','Открыть загрузку АФЛ'],hr:['settings','Нормативы персонала'],supply:['settings','Остатки и поставки'],final:['approvals','Открыть согласования'],
}

export function nodePanel(state: State,view: View,id: NodeId) {
  const v=current(state)
  const status=statuses(state)[id]
  const [page,label]=nodePages[id]
  const issues=risks(v.input,v.results).filter(x=>x.node===id)
  const action=(id==='erp'?button('Синхронизировать с 1С','sync','refresh','primary'):'') +
    (id==='sales'?button('Изменить заказ','edit:2','edit','primary')+button('Передать в ПДО','handoff','send'):'') +
    button(label,id==='metal'?'material:Металл':id==='masters'?'material:Стержни':'go:'+page,'diagonal')
  let content=''
  if(view.tab==='Обзор') content=`<div class="stat-list"><div><span>Ответственный</span><b>${h(owner(state,id))}</b></div><div><span>Контрольная дата</span><b>${h(due(state,id))} · демо</b></div><div><span>Задачи / проблемы</span><b>${Math.max(1,issues.length)} / ${issues.length}</b></div><div><span>Версия / обновление</span><b>v${v.number} · ${date(v.at)}</b></div></div><div class="drawer-result"><small>Текущий результат</small><strong>${nodeOutput(state,id)}</strong></div>${issues.map(r=>`<p class="info-strip">${h(r.title)} · ${h(r.detail)}</p>`).join('')}<div class="heading-actions">${action}</div>`
  if(view.tab==='Входящие данные'||view.tab==='Исходящие данные'){
    const incoming=view.tab==='Входящие данные'
    const links=state.branches.filter(edge=>edge[incoming?1:0]===id)
    content=links.length?`<div class="stat-list">${links.map(edge=>`<div><span>${h(nodeTitle(state,edge[incoming?0:1]))}</span><b>${h(edge[2])} · v${v.number} · ${date(v.at)}</b></div>`).join('')}</div>`:empty('На схеме нет связей в этом направлении.')
  }
  if(view.tab==='Расчёты')content=`<div class="drawer-result"><small>${h(id)} · Методика 1 · Входы v${v.number} · ${date(v.at)}</small><b>${h(id==='energy'?v.input.norms.energyFormula:id==='labor'?v.input.norms.laborFormula:calculations[id]??'Операция по текущей версии производственной программы')}</b><strong>${nodeOutput(state,id)}</strong></div>`
  if(view.tab==='Документы')content=`<div class="heading-actions">${button('Паспорт программы','go:passport','file')}${button(label,'go:'+page,'diagonal')}</div><p class="panel-note">${sourceLabel}</p>`
  if(view.tab==='Согласование')content=isScope(id)?approvalForm(state,id):button('Открыть согласование','go:approvals','shield')
  if(view.tab==='Обсуждение')content=commentForm(state,'node-'+id)
  if(view.tab==='История')content=eventsList({...state,events:state.events.filter(event=>event.node===id)})
  return `<div class="drawer-subhead">${badge(status[0],status[1],true)}${badge('v'+v.number,'blue')}</div><div class="drawer-tabs">${nodeTabs.map(tab=>button(tab,'node-tab:'+tab,'',view.tab===tab?'selected':'')).join('')}</div><div class="drawer-section">${content}</div>`
}

export function settingsPage(state: State,view: View) {
  const v=current(state)
  const n=v.input.norms
  const selected=nodes.find(node=>node.id===view.selected)??nodes[3]
  return `${heading('Настройки','Нормативы, остатки и конфигурация процесса',button('Сбросить демонстрацию','reset','refresh'))}
  <div class="section-toolbar standalone"><div class="segmented">${['Нормативы','Карта процесса'].map(tab=>button(tab,'settings-tab:'+tab,'',view.settingsTab===tab?'active':'')).join('')}</div></div>
  ${view.settingsTab==='Нормативы'?panel('Демонстрационные параметры',`<p class="info-strip">${demoLabel}. Изменение создаёт новую версию программы и обновляет только зависимые результаты.</p><form class="form-grid" data-form="norms">
  ${Object.entries(normFields).map(([key,[label,step]])=>`<label>${label}<input type="number" name="${key}" min="${key==='shiftHours'||key==='shifts'?step:0}" max="100000000" step="${step}" value="${n[key as keyof typeof normFields]}" required></label>`).join('')}
  <label>Поставка стержней · дата<input type="date" name="coreArrivalDate" value="${h(n.coreArrivalDate)}"></label>
  ${[['energyBase','База энергии'],['recipeBase','База рецептуры']].map(([key,label])=>`<label>${label}<select name="${key}">${option('liquid','Жидкий металл',n[key as 'energyBase']==='liquid')}${option('good','Масса годного',n[key as 'energyBase']==='good')}</select></label>`).join('')}
  <label>Формула энергии · СГЭ<input name="energyFormula" value="${h(n.energyFormula)}" required maxlength="120"><small>M — тоннаж, K — кВт·ч/т. Результат ${fmt(v.results.energy,2)} кВт·ч.</small></label>
  <label>Формула трудоёмкости · ЭО<input name="laborFormula" value="${h(n.laborFormula)}" required maxlength="120"><small>M — масса годного, K — чел·ч/т. Результат ${fmt(v.results.hours,2)} чел·ч.</small></label>
  <div class="form-footer"><button class="btn primary">Сохранить нормативы</button></div></form>`) :
  panel('Конфигурация карты',`<div class="panel-body"><p class="panel-note">Редактирование подразделений и информационных связей. Циклические зависимости проверяются при сохранении.</p>
  <label>Рабочий блок <select data-change="config-node">${nodes.map(node=>option(node.id,nodeTitle(state,node.id),selected.id===node.id)).join('')}</select></label>
  <form class="form-grid no-padding" data-form="node-config:${selected.id}"><label>Наименование<input name="title" required maxlength="70" value="${h(nodeTitle(state,selected.id))}"></label><label>Ответственный<input name="owner" required maxlength="70" value="${h(owner(state,selected.id))}"></label><label>Срок<input type="date" name="due" required value="${due(state,selected.id)}"></label><div class="form-footer"><button class="btn primary">Сохранить блок</button></div></form>
  <form class="form-grid no-padding" data-form="edge"><label>Откуда<select name="from">${nodes.map(node=>option(node.id,nodeTitle(state,node.id))).join('')}</select></label><label>Куда<select name="to">${nodes.map(node=>option(node.id,nodeTitle(state,node.id),node.id==='pdo')).join('')}</select></label><label>Показатель<input name="label" required maxlength="90"></label><div class="form-footer"><button class="btn primary">Добавить связь</button></div></form>
  ${table(['Откуда','Куда','Показатель',''],state.branches.map(([a,b,label],i)=>`<tr><td>${h(nodeTitle(state,a))}</td><td>${h(nodeTitle(state,b))}</td><td>${h(label)}</td><td>${button('Удалить','delete-edge:'+i,'close')}</td></tr>`).join(''))}</div>`)}`
}

export function analyticsPage(state: State) {
  const v=current(state), r=v.results
  const statusesFor= statuses(state)
  const all=risks(v.input,r)
  return `${heading('Панель руководителя','Готовность, узкие места и журнал программы v'+v.number,button('Карта взаимодействия','go:map','workflow')+button('Паспорт программы','go:passport','file','primary'))}
  <div class="metrics four">${metric('Согласовано',readyCount(v)+' / '+scopeIds.length,'Зоны ответственности')}${metric('Риски',String(all.length),'Текущая версия')}${metric('События',String(state.events.length),'За текущую сессию')}${metric('Масса заказа',fmt(r.tonnes,4)+' т','Фактические веса XLSX')}</div>
  ${panel('Состояние подразделений',table(['Рабочий блок','Задачи','Выполнено','Ожидает данные','События','Статус'],nodes.filter(n=>n.id!=='erp'&&n.id!=='final').map(node=>{const [label,tone]=statusesFor[node.id];return `<tr><td><button class="link" data-action="node:${node.id}">${h(nodeTitle(state,node.id))}</button></td><td>1</td><td>${['green','blue'].includes(tone)?'1':'0'}</td><td>${tone==='gray'?'1':'0'}</td><td>${state.events.filter(e=>e.node===node.id).length}</td><td>${badge(label,tone,true)}</td></tr>`}).join('')))}
  ${panel('История сессии',eventsList(state))}`
}

export function referencesPage() {
  return `${heading('Справочники','Номенклатура, оборудование и источники нормативов',button('Контроль качества','go:quality','alert'))}
  ${panel('Номенклатура из XLSX',table(['Код','Изделие','Пример расчёта','Сплав спецификации','Расход, кг/отл.',''],products.map((p,i)=>`<tr><td class="mono">${p.code}</td><td>Изделие №${i+1}</td><td>${p.alloy} · ${fmt(p.weight,2)} кг</td><td>${specification(p.code).alloy}</td><td>${fmt(specification(p.code).root.consumption,2)}</td><td>${button('Технологическая карта','tech:'+i,'book')}</td></tr>`).join('')))}
  ${panel('Формовочные линии',table(['Линия','Оборудование','Назначение'], '<tr><td>АФЛ №1</td><td>DISA-230A</td><td>Изделия №3–5</td></tr><tr><td>АФЛ №2</td><td>Belloi &amp; Romagnoli</td><td>Изделия №1–2</td></tr>'))}`
}
