import { button, icon } from '../../ui/shared.ts'
import type { Page } from '../../ui/view.ts'

export const steps: {time:string;title:string;page:Page;detail:string;action:string;label:string}[] = [
  {time:'0:00–0:40',title:'Единая карта взаимодействия',page:'map',detail:'Покажите потоки данных между 11 рабочими блоками.',action:'node:erp',label:'Открыть обмен с 1С'},
  {time:'0:40–1:20',title:'Заказы и расчёт производства',page:'program',detail:'Сверьте заказы, нагрузки двух линий и маршрут изделия №3.',action:'tech:2',label:'Открыть технологическую карту'},
  {time:'1:20–2:00',title:'Сверка исходных данных',page:'quality',detail:'Покажите расхождение ВЧ 50 / ВЧ 40 по изделию №3.',action:'conflict:alloy3',label:'Показать два источника'},
  {time:'2:00–3:15',title:'Изменение заказа',page:'orders',detail:'Увеличьте заказ изделия №3 с 20 000 до 24 000 и покажите пересчёт.',action:'edit:2',label:'Изменить заказ изделия №3'},
  {time:'3:15–4:10',title:'Версии и согласование',page:'versions',detail:'Сравните v1 и v2. Затем согласуйте расчёт СГЭ от имени ответственного.',action:'review:energy',label:'Открыть согласование СГЭ'},
  {time:'4:10–5:00',title:'Сводка и паспорт программы',page:'passport',detail:'Проверьте, что мешает утвердить план.',action:'ask:0',label:'Открыть сводку'},
]
export function demoBar(index: number) {
  if (index < 0) return ''
  const step=steps[index]
  return `<div class="demo-bar"><span class="demo-icon">${icon('play',17)}</span><div><b>${index+1} / 6 · ${step.title}</b><small>${step.time} · ${step.detail}</small></div><div class="demo-actions">${button(step.label,step.action,'diagonal')}${index?button('Назад','demo:prev'):''}${button(index===5?'Завершить':'Далее','demo:next','chevron','primary')}${button('Закрыть','demo:close','close','text-btn')}</div></div>`
}
