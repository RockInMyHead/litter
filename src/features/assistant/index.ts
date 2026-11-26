import { blockers, current, hasApproval, readyCount } from '../../store.ts'
import type { State } from '../../store.ts'
import { nodes, scopeIds } from '../../engine/dependencies/index.ts'
import { risks } from '../../engine/validation/index.ts'
import { fmt, h, option } from '../../ui/shared.ts'
import { statuses } from '../workflow/index.ts'
import { measures } from '../versions/index.ts'

export const questions = [
  'Что мешает утвердить производственную программу?',
  'Какие службы ждут данные?',
  'Что изменилось с прошлой версии?',
  'Хватит ли смен на АФЛ?',
  'Где расходятся исходные данные?',
  'Кому нужно согласовать повторно?',
  'Основные показатели',
]

export function answer(state: State, question: string) {
  const v=current(state), r=v.results
  const all=risks(v.input,r)
  const before=state.versions.at(-2)
  const pending=scopeIds.filter(id=>!hasApproval(v,id))
  const waiting=nodes.filter(node=>statuses(state)[node.id][0]==='Ожидает данные').map(node=>node.title)
  const issues=blockers(v)
  const index=questions.indexOf(question)
  let parts: string[]
  switch (index) {
    case 1: parts=waiting.length?['Ожидают подтверждённых данных: '+waiting.join(', ')+'.','Следующее действие: '+(all[0]?.title??'проверить решения служб')+'.']:['Служб в статусе ожидания данных нет.']; break
    case 2: {
      if (!before) return ['Пока доступна только версия v1. Сравнение появится после первого изменения плана.']
      const previous = measures(before)
      const changes = measures(v).flatMap(([label, value, digits, unit], index) => {
        const old = previous[index][1]
        if (fmt(value,digits) === fmt(old,digits)) return []
        const display = (amount: number | null) => amount === null ? 'нет данных' : fmt(amount,digits) + ' ' + unit
        return [label + ': ' + display(old) + ' → ' + display(value) + '.']
      })
      parts = ['v' + before.number + ' → v' + v.number + '. ' + v.reason,
        ...(changes.length ? changes : ['Показатели в сводке не изменились.'])]
      break
    }
    case 3: parts=r.lines.map(line=>'АФЛ №'+line.id+': '+fmt(line.scheduled,2)+' из '+fmt(v.input.norms.shifts)+' смен с переналадками. '+(line.scheduled>v.input.norms.shifts?'Превышен доступный календарь.':'Запас '+fmt(v.input.norms.shifts-line.scheduled,2)+' смены.')); break
    case 4: parts=all.filter(risk=>risk.severity==='critical').map(risk=>risk.title+' — '+risk.detail); if(!parts.length) parts=['Открытых критических противоречий нет.']; break
    case 5: {
      const repeat=pending.filter(id=>before&&hasApproval(before,id))
      parts=[repeat.length?'Повторно согласовать: '+repeat.map(id=>nodes.find(node=>node.id===id)!.title).join(', ')+'.':'Повторных согласований сейчас нет.',
        'Всего ожидается решений: '+pending.length+'. Сохранено или получено: '+readyCount(v)+'.']; break
    }
    case 6: parts=['Текущая версия v'+v.number+': '+fmt(r.count)+' изделий, '+fmt(r.tonnes,4)+' т массы заказа, '+fmt(r.metal,4)+' т жидкого металла.',
      'Зафиксировано '+readyCount(v)+' из '+scopeIds.length+' согласований, выявлено '+all.length+' рисков.',
      issues.length?'Следующее действие: '+(all[0]?.title??'завершить согласование')+'.':'План готов к итоговому утверждению.']; break
    default: parts=issues.length?[
      'Для версии v'+v.number+' получено '+readyCount(v)+' из '+scopeIds.length+' согласований.',
      ...issues.map(issue=>issue+'.'),
      all.some(risk=>risk.node==='spec')?'ОГМет нужно сверить значения в источниках.':all.some(risk=>risk.node==='supply')?'ОМТО нужно подтвердить поставки.':'Ответственным службам нужно завершить согласование.']:
      [v.approvedAt?'Версия v'+v.number+' утверждена.':'Активных препятствий нет. Руководитель может утвердить версию v'+v.number+'.']
  }
  return parts
}

export function assistantPanel(state: State, question: string) {
  const selected = questions.includes(question) ? question : questions[0]
  return `<div class="assistant-drawer">
    <label for="summary-topic">Раздел сводки</label>
    <select id="summary-topic" data-change="summary-topic">${questions.map((topic,index)=>option(String(index),topic,topic===selected)).join('')}</select>
    <section class="assistant-answer" aria-label="Результат проверки плана"><ul class="summary-list">${answer(state,selected).map(part=>`<li>${h(part)}</li>`).join('')}</ul></section>
    <p class="summary-source">Локальный расчёт по данным v${current(state).number}</p>
  </div>`
}
