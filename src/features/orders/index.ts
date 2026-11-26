import { current, roleName } from '../../store.ts'
import type { State } from '../../store.ts'
import { sourceLabel } from '../../data/factory/index.ts'
import { badge, button, date, fmt, h, heading, panel, table } from '../../ui/shared.ts'
import { eventsList } from '../workflow/index.ts'

export function orderForm(state: State, index: number) {
  const version = current(state)
  const row = version.results.rows[index]
  return `<form data-form="order:${index}" class="form-stack"><div class="record-summary"><div><small>Заказ из 1С</small><strong>${fmt(row.initial)} шт.</strong></div><div><small>Текущая версия</small><strong>v${version.number} · ${fmt(row.order)} шт.</strong></div></div><label>Количество по заказу, шт.<input type="number" name="amount" min="0" max="100000000" step="1" required value="${row.order}"></label><label>Причина изменения<input name="reason" maxlength="200" required value="Уточнение объёма заказа"></label><div class="form-footer"><small>Автор · ${h(roleName(state.role))}</small><button class="btn primary">Применить изменения</button></div></form>`
}

export function ordersPage(state: State) {
  const v = current(state)
  return `${heading('Заказы на производство', 'Отдел продаж · ' + sourceLabel, button('Синхронизировать с 1С', 'sync', 'refresh') + button('Передать в ПДО', 'handoff', 'send', 'primary'))}
  ${panel('Реестр заказов', table(['Изделие','Код','Заказ из 1С','Текущий заказ','Разница','Срок','Приоритет',''],v.results.rows.map(row => `<tr><td><b>${row.name}</b></td><td class="mono">${row.code}</td><td>${fmt(row.initial)}</td><td><b>${fmt(row.order)}</b></td><td>${row.order===row.initial?'—':fmt(row.order-row.initial)}</td><td>30 ноя. *</td><td>${badge('Обычный *')}</td><td>${button('Изменить заказ','edit:' + row.index,'edit')}</td></tr>`).join('')),badge('v'+v.number,'blue'))}
  <p class="page-note">* Срок и приоритет заданы для демонстрации. ${state.sync ? 'Последний обмен ' + date(state.sync.at) + ' · получено ' + state.sync.received + ' · обновлено ' + state.sync.updated + '.' : 'Исходные заказы загружены из приложенного XLSX.'}</p>
  ${panel('История изменений', eventsList(state))}`
}
