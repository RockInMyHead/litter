import { blockers, current, documentStatus, readyCount, reviewBlocked, roleName } from '../../store.ts'
import type { State } from '../../store.ts'
import { nodes, scopeIds } from '../../engine/dependencies/index.ts'
import type { Scope } from '../../engine/dependencies/index.ts'
import { badge, button, date, h, heading, option, panel, table } from '../../ui/shared.ts'

export function approvalForm(state: State, id: Scope) {
  const v=current(state)
  const blocked=reviewBlocked(v,id)
  return `<div class="form-stack">${state.role!==id ? `<p class="info-strip">Активная роль · ${h(roleName(state.role))}</p>${button('Войти как '+roleName(id),'role:'+id,'users')}`:''}
  ${v.approvedAt?'<p>Решения утверждённой версии зафиксированы.</p>':v.submitted?`<form data-form="review:${id}" class="form-stack"><label>Решение <select name="decision">${option('approved','Согласовать')}${option('note','Согласовать с замечанием')}${option('returned','Вернуть на доработку')}</select></label><label>Комментарий<textarea name="comment" rows="3" maxlength="1000" placeholder="Обязателен при возврате"></textarea></label>${id==='supply'?`<label class="checkbox-label"><input name="coverage" type="checkbox">Подтверждаю обеспеченность по ведомости материалов v${v.number}</label>`:''}${blocked?'<small class="notice-text">Требуется устранить противоречия или дефициты в этой зоне. Доступен возврат на доработку.</small>':''}<div class="form-footer"><button class="btn primary" ${state.role!==id?'disabled':''}>Зафиксировать решение</button></div></form>`: '<p class="info-strip">Согласование запускается из ПДО.</p>'}</div>`
}

export function approvalsPage(state: State) {
  const v=current(state)
  const pending=blockers(v)
  return `${heading('Согласование программы','Решения служб для версии v'+v.number,button('Паспорт программы','go:passport','file')+(!v.submitted?button('Запустить согласование','submit-approvals','send','primary'):''))}
  ${panel('Статус программы',`<div class="record-summary"><div><small>Документ</small><strong>${documentStatus(v)}</strong></div><div><small>Решения служб</small><strong>${readyCount(v)} из ${scopeIds.length}</strong></div><div><small>Текущая роль</small><strong>${h(roleName(state.role))}</strong></div>${v.approvedAt?`<div><small>Утверждение</small><strong>${date(v.approvedAt)} · ${v.approvedBy}</strong></div>`:''}</div>`,badge('v'+v.number,'blue'))}
  ${panel('Зоны ответственности',table(['Подразделение','Ответственный','Статус','Версия решения','Дата / комментарий',''],scopeIds.map(id=>{
    const node=nodes.find(n=>n.id===id)!
    const review=v.reviews[id]
    return `<tr><td><b>${node.code} · ${id==='pdo'?'Загрузка АФЛ №2':node.title}</b></td><td>${node.owner}</td><td>${review?badge(review.decision==='approved'?'Согласовано':review.decision==='note'?'С замечанием':'На доработке',review.decision==='returned'?'amber':'green'):badge(reviewBlocked(v,id)?'Ожидает данные':'Ожидает решения',reviewBlocked(v,id)?'amber':'gray')}</td><td>${review?'v'+review.version:'—'}</td><td>${review?h(date(review.at)+(review.comment?' · '+review.comment:'')):'—'}</td><td>${button(v.approvedAt?'Просмотр':'Открыть','review:'+id,'file')}</td></tr>`
  }).join('')))}
  ${panel('Итоговое утверждение',`<div class="panel-body">${v.approvedAt ? '<p>Утверждённый план доступен в паспорте программы.</p>' : `${pending.length?`<ul class="plain-list">${pending.map(issue=>`<li>${h(issue)}</li>`).join('')}</ul>`:'<p>Все обязательные проверки завершены.</p>'}<div class="heading-actions">${state.role!=='Руководитель'?button('Переключиться на руководителя','role:Руководитель','users'):''}<button class="btn primary" data-action="finalize" ${state.role!=='Руководитель'||pending.length?'disabled':''}>Утвердить производственную программу</button></div>`}</div>`)}`
}
