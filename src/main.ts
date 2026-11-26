import { addEvent, current, finalize, initial, load, recordReview, revise, roleName, save, syncOrders } from './store.ts'
import type { Review, Role } from './store.ts'
import { conflictFacts, period } from './data/factory/index.ts'
import { calculate } from './engine/calculation/index.ts'
import { evaluateExpression } from './engine/calculation/expression.ts'
import { normFields } from './data/factory/demo.ts'
import { hasCycle, isScope, nodes, scopeIds } from './engine/dependencies/index.ts'
import type { Edge, NodeId } from './engine/dependencies/index.ts'
import { mapPage, eventsList, nodeTitle } from './features/workflow/index.ts'
import { ordersPage, orderForm } from './features/orders/index.ts'
import { programPage } from './features/program/index.ts'
import { passportPage } from './features/program/passport.ts'
import { technologyPage } from './features/technology/index.ts'
import { materialsPage, stockPanel } from './features/materials/index.ts'
import { planningPage } from './features/planning/index.ts'
import { versionsPage } from './features/versions/index.ts'
import { approvalForm, approvalsPage } from './features/approvals/index.ts'
import { assistantPanel, questions } from './features/assistant/index.ts'
import { demoBar, steps } from './features/demo/index.ts'
import { analyticsPage, conflictPanel, nodePanel, qualityPage, referencesPage, settingsPage } from './ui/details.ts'
import { badge, button, date, fmt, h, icon, iconButton, option } from './ui/shared.ts'
import { initialView } from './ui/view.ts'
import type { Page } from './ui/view.ts'

const nav = [
  ['program','Производственная программа','clipboard'],
  ['map','Карта взаимодействия','workflow'], ['planning','Планирование АФЛ','gantt'],
  ['materials','Материалы и ресурсы','boxes'], ['technology','Технологические карты','book'],
  ['approvals','Согласование','shield'], ['references','Справочники','layers'],
  ['analytics','Панель руководителя','chart'], ['settings','Настройки','settings'],
] as const
const roles: Role[] = ['ПДО', 'Руководитель', 'ОП', ...scopeIds]
const root = document.querySelector<HTMLElement>('#root')!
let state=load()
let view=initialView()
let message=''
let messageTimer=0
let flowTimer=0
let lastFocus=''
const split=(text:string)=>[text.split(':',1)[0],text.slice(text.indexOf(':')+1)] as const

function navigate(page:Page) {
  view.page=page
  view.drawer=''
  window.scrollTo(0,0)
}
function toast(text:string) {
  message=text
  clearTimeout(messageTimer)
  messageTimer=window.setTimeout(()=>{
    message=''
    document.querySelector('.toast')?.remove()
  },4000)
}
function persist() {
  if(!save(state)) toast('Хранилище браузера недоступно. Изменения действуют до перезагрузки.')
}
function animate(flow: NodeId[]) {
  clearTimeout(flowTimer)
  view.flow=flow
  view.activation+=1
  flowTimer=window.setTimeout(()=>{
    view.flow=[]
    document.querySelectorAll('.data-packet').forEach(packet=>packet.remove())
    document.querySelectorAll('.flow-updated').forEach(node=>node.classList.remove('flow-updated'))
  },4800)
}
function drawer(key:string) {
  lastFocus = (document.activeElement as HTMLElement | null)?.dataset.action ?? ''
  view.drawer=key
  view.tab='Обзор'
}
function closeDrawer() {
  view.drawer=''
  const restore=lastFocus
  requestAnimationFrame(()=>[...document.querySelectorAll<HTMLElement>('[data-action]')].find(el=>el.dataset.action===restore)?.focus({preventScroll:true}))
}
function goStep(index:number) {
  view.demo=index
  navigate(steps[index].page)
}

function renderPage() {
  switch(view.page) {
    case 'map': return mapPage(state,view)
    case 'program': return programPage(state,view)
    case 'orders': return ordersPage(state)
    case 'technology': return technologyPage(state,view)
    case 'materials': return materialsPage(state,view)
    case 'planning': return planningPage(state,view)
    case 'versions': return versionsPage(state,view)
    case 'approvals': return approvalsPage(state)
    case 'quality': return qualityPage(state)
    case 'settings': return settingsPage(state,view)
    case 'passport': return passportPage(state)
    case 'references': return referencesPage()
    case 'analytics':
      return analyticsPage(state)
  }
}

function renderDrawer() {
  if(!view.drawer) return ''
  const [kind,value]=split(view.drawer)
  const v=current(state)
  let title='', detail='', content='', symbol='file'
  switch(kind) {
    case 'node': {
      const id=value as NodeId
      const node=nodes.find(n=>n.id===id)!
      title=nodeTitle(state,id); detail=node.code+' · Состояние процесса'; symbol=node.icon
      content=nodePanel(state,view,id)
      break
    }
    case 'edit': {
      const row=v.results.rows[Number(value)]
      title='Изменить заказ'; detail=row.name+' · '+row.code; symbol='edit'
      content=orderForm(state,Number(value))
      break
    }
    case 'conflict': {
      const item=conflictFacts.find(c=>c.id===value)!
      title=item.title+' · Изделие №'+(item.product+1); detail='Сверка источников · ОГМет'; symbol='alert'
      content=conflictPanel(state,value)
      break
    }
    case 'review':
      title=nodes.find(n=>n.id===value)!.title; detail='Согласование · v'+v.number; symbol='shield'
      content=isScope(value)?approvalForm(state,value):''
      break
    case 'assistant':
      title='Сводка по плану'; detail='Версия v'+v.number; symbol='clipboard'
      content=assistantPanel(state,view.assistantQuestion)
      break
    case 'stock':
      title='Обеспечение · '+value; detail='ОМТО · '+(v.results.materials.find(item=>item.code===value)?.name??''); symbol='truck'
      content=stockPanel(state,value)
      break
    case 'job': {
      const row=v.results.rows[Number(value)]
      const stress=view.scenario==='Увеличение заказов на 20%'
      const order=stress?Math.ceil(row.order*1.2):row.order
      const forms=Math.ceil(Math.ceil(order/(1-row.scrap))/row.cavity)
      title=row.name+' · АФЛ №'+row.line; detail='Производственное задание'; symbol='gantt'
      content=`<div class="stat-list"><div><span>Сплав</span><b>${h(row.alloy)}</b></div><div><span>Количество форм</span><b>${fmt(forms)}</b></div><div><span>Продолжительность</span><b>${fmt(forms/row.rate,4)} смены</b></div><div><span>Комплект</span><b>${row.set}</b></div></div>${button('Технологическая карта','tech:'+value,'book')}`
      break
    }
    case 'reset':
      title='Сбросить демонстрацию'; detail='Ноябрь 2026 · исходная версия v1'; symbol='refresh'
      content=`<p>Заказы, нормативы и согласования вернутся к исходным значениям. Журнал и изменения этой сессии будут очищены.</p><div class="heading-actions">${button('Отмена','close')}${button('Сбросить демонстрацию','reset-now','refresh','danger')}</div>`
      break
    default:
      title='Журнал изменений'; detail='События текущей сессии'; symbol='history'
      content=eventsList(state,50)
  }
  return `<div class="overlay" data-action="close"></div><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1"><header><span class="drawer-icon">${icon(symbol,22)}</span><div><h2 id="drawer-title">${h(title)}</h2><p>${h(detail)}</p></div>${iconButton('Закрыть панель','close','close')}</header><div class="drawer-content">${content}</div></section>`
}

function render(focusDrawer=false) {
  const v=current(state)
  const related = ['orders','versions','passport'].includes(view.page) ? 'program' : view.page==='quality'?'technology':view.page
  root.innerHTML=`<div class="app-shell">
  <aside class="sidebar"><button class="brand" data-action="go:map" aria-label="Карта взаимодействия"><span class="brand-mark">${icon('factory',22)}</span></button>
  <div class="nav-group"><nav aria-label="Основное меню">${nav.map(([page,label,symbol])=>`${page==='references'?'<div class="nav-separator" aria-hidden="true"></div>':''}<button class="nav-item ${related===page?'active':''}" data-action="go:${page}" aria-label="${label}" title="${label}" ${related===page?'aria-current="page"':''}>${icon(symbol,18)}<span>${label}</span></button>`).join('')}</nav></div>
  <div class="sidebar-foot">${button('Сбросить демонстрацию','reset','refresh','sidebar-reset')}</div></aside>
  <div class="app-column"><header class="topbar"><div class="top-factory"><b>Мценский литейный завод</b></div><div class="top-controls">
    <div class="top-period"><span>${period}</span></div>${button('v'+v.number,'go:versions','','version-button')}
    <button class="integration" title="${state.sync?'Последний обмен '+h(date(state.sync.at)):'Локальная имитация обмена'}" data-action="node:erp"><span>1С:ERP</span><small>Имитация</small></button>
    <div class="top-divider"></div><button class="icon-btn notifications" data-action="notify" aria-label="Журнал изменений" title="Журнал изменений">${icon('history',18)}</button>
    <label class="role-button"><select aria-label="Демонстрационная роль" data-change="role">${roles.map(role=>option(role,roleName(role),state.role===role)).join('')}</select>${icon('down',13)}</label>
    ${button('Сводка','assistant','','assistant-top')}${view.demo<0?button('Запустить демо','demo:start','play','primary demo-top'):''}
  </div></header>
  <main class="main">${demoBar(view.demo)}${renderPage()}</main></div></div>
  ${renderDrawer()}${message?`<div class="toast" role="status">${icon('info',18)}${h(message)}</div>`:''}`
  if(focusDrawer&&view.drawer) root.querySelector<HTMLElement>('.drawer')?.focus({preventScroll:true})
}

root.addEventListener('click', event=>{
  const element=(event.target as Element).closest<HTMLElement>('[data-action]')
  if(!element) return
  const action=element.dataset.action!
  const [command,value]=split(action)
  const wasDrawer=view.drawer
  switch(command) {
    case 'go': navigate(value as Page); break
    case 'node': case 'edit': case 'review': case 'conflict': case 'job': case 'stock': drawer(action); break
    case 'node-tab': view.tab=value; break
    case 'tech': view.product=Number(value);view.techTab='Маршрут';navigate('technology');break
    case 'tech-tab': view.techTab=value;break
    case 'method': view.mode=value as typeof view.mode;break
    case 'material': view.materialTab=value;if(view.page!=='materials'||view.drawer)navigate('materials');break
    case 'scale': view.planningScale=value;break
    case 'settings-tab': view.settingsTab=value;break
    case 'graph': view.graphMode=value as typeof view.graphMode;break
    case 'critical': view.critical=!view.critical;break
    case 'collapse': view.collapsed=!view.collapsed;break
    case 'zoom':
      if(value==='fit'){view.zoom=1;view.panX=0;view.panY=0}
      else view.zoom=Math.min(2.5,Math.max(.6,Number((view.zoom+(value==='in'?.15:-.15)).toFixed(2))))
      break
    case 'notify': drawer('notify');break
    case 'assistant': drawer('assistant');break
    case 'ask': view.assistantQuestion=questions[Number(value)];if(view.drawer!=='assistant')drawer('assistant');break
    case 'close': closeDrawer();break
    case 'role': state.role=value as Role;persist();toast('Активная роль · '+roleName(state.role));break
    case 'sync': {
      const changed=syncOrders(state)
      animate(changed.length?changed:['erp','sales','pdo'])
      persist();toast('Получено 5 заказов. Проверено 5 ресурсных спецификаций.');break
    }
    case 'handoff': addEvent(state,'Заказы переданы в ПДО',fmt(current(state).results.count)+' шт.','sales');persist();navigate('map');animate(['sales','pdo']);toast('Заказы переданы в ПДО.');break
    case 'submit-approvals':
      if(state.role!=='ПДО')toast('Запуск доступен в роли ПДО.')
      else {current(state).submitted=true;addEvent(state,'Запущено согласование','Программа передана ответственным службам','pdo');persist()}
      break
    case 'finalize':
      if(finalize(state)){persist();toast('Производственная программа утверждена.');navigate('passport')}
      break
    case 'demo':
      if(value==='start')goStep(view.demo<0?0:view.demo)
      if(value==='prev')goStep(Math.max(0,view.demo-1))
      if(value==='next'&&view.demo<steps.length-1)goStep(view.demo+1)
      else if(value==='close'||value==='next'){view.demo=-1;closeDrawer()}
      break
    case 'reset': drawer('reset');break
    case 'reset-now': clearTimeout(flowTimer);state=initial();view=initialView();persist();window.scrollTo(0,0);toast('Исходная версия v1 восстановлена.');break
    case 'delete-edge':
      state.branches.splice(Number(value),1);persist();toast('Связь удалена.');break
    case 'print': window.print();return
    default: return
  }
  render(wasDrawer!==view.drawer)
})

root.addEventListener('change',event=>{
  const select=(event.target as Element).closest<HTMLSelectElement>('select[data-change]')
  if(!select)return
  const value=select.value
  switch(select.dataset.change) {
    case 'role':state.role=value as Role;persist();break
    case 'product':view.product=Number(value);break
    case 'scenario':view.scenario=value;break
    case 'summary-topic':
      view.assistantQuestion=questions[Number(value)]
      render()
      root.querySelector<HTMLSelectElement>('#summary-topic')?.focus({preventScroll:true})
      return
    case 'graph-filter':view.filter=value;break
    case 'compare-from':view.compareFrom=Number(value);break
    case 'compare-to':view.compareTo=Number(value);break
    case 'config-node':view.selected=value;break
    case 'conflict-source': {
      const manual=root.querySelector<HTMLLabelElement>('#manual-conflict')!
      manual.hidden=value!=='manual'
      manual.querySelector('input')!.required=!manual.hidden
      return
    }
    default:return
  }
  render()
})

root.addEventListener('submit', event=>{
  const form=event.target as HTMLFormElement
  if(!form.dataset.form)return
  event.preventDefault()
  const [command,value]=split(form.dataset.form)
  const values=new FormData(form)
  const field=(name:string)=>String(values.get(name)??'').trim()
  const version=current(state)
  const input=structuredClone(version.input)
  let changed:NodeId[]=[]
  switch(command) {
    case 'order': {
      const row=version.results.rows[Number(value)]
      const count=Number(field('amount'))
      const reason=field('reason')
      if(!reason||!field('amount')||!Number.isSafeInteger(count)||count<0||count>100000000){toast('Укажите целое количество и причину.');render();return}
      input.orders[row.code]=count
      changed=revise(state,input,row.name+': '+fmt(row.order)+' → '+fmt(count)+' шт. · '+reason,'sales')
      if(changed.length)navigate('map')
      else closeDrawer()
      break
    }
    case 'conflict': {
      if(state.role!=='spec')return
      const item=conflictFacts.find(x=>x.id===value)!
      const source=field('source')
      const reason=field('reason')
      let choice=source==='example'?item.example:item.specification
      if(source==='manual')choice=item.field==='weight'?Number(field('value')):field('value').toUpperCase().replace(/\s+/g,' ')
      if(!reason||(item.field==='weight'&&(!Number.isFinite(choice)||Number(choice)<=0))||(item.field==='alloy'&&!/^[А-ЯA-Z0-9 .-]{2,40}$/u.test(String(choice)))){
        toast('Проверьте введённое значение и обоснование.');render();return
      }
      input.decisions[value]={value:choice,source:source==='example'?'Пример расчёта':source==='manual'?'Решение ОГМет':'Ресурсная спецификация',reason,at:new Date().toISOString(),actor:roleName(state.role)}
      changed=revise(state,input,'ОГМет подтвердил значение · Изделие №'+(item.product+1)+' · '+choice,'spec')
      break
    }
    case 'norms': {
      for(const key of Object.keys(normFields) as (keyof typeof normFields)[])input.norms[key]=Number(field(key))
      input.norms.energyBase=field('energyBase') as 'liquid'|'good'
      input.norms.recipeBase=field('recipeBase') as 'liquid'|'good'
      input.norms.coreArrivalDate=field('coreArrivalDate')
      input.norms.energyFormula=field('energyFormula').toUpperCase()
      input.norms.laborFormula=field('laborFormula').toUpperCase()
      try {
        const results=calculate(input)
        evaluateExpression(input.norms.energyFormula,{M:input.norms.energyBase==='good'?results.goodMass:results.metal??1,K:input.norms.energyRate})
        evaluateExpression(input.norms.laborFormula,{M:results.goodMass,K:input.norms.laborRate})
      } catch(error) {
        toast(error instanceof Error?error.message:'Проверьте формулу.')
        const existing=root.querySelector('.toast')
        if(existing)existing.remove()
        root.insertAdjacentHTML('beforeend',`<div class="toast" role="status">${icon('info',18)}${h(message)}</div>`)
        return
      }
      if(input.norms.coreArrival>0&&!input.norms.coreArrivalDate){toast('Укажите дату ожидаемой поставки.');render();return}
      changed=revise(state,input,'Обновлены демонстрационные нормативы','pdo')
      break
    }
    case 'review': {
      if(!isScope(value))return
      const error=recordReview(state,value,field('decision') as Review['decision'],field('comment'),values.has('coverage'))
      if(error){toast(error);render();return}
      closeDrawer();toast('Решение сохранено для v'+version.number+'.');break
    }
    case 'stock': {
      const material=version.results.materials.find(item=>item.code===value)
      if(!material)return
      const stock=Number(field('stock'))
      const arrival=Number(field('arrival'))
      const date=field('date')
      if(arrival&&!date){toast('Укажите дату ожидаемой поставки.');render();return}
      input.inventory[value]={stock,arrival,date}
      changed=revise(state,input,'ОМТО обновил обеспечение · '+value,'supply')
      closeDrawer()
      break
    }
    case 'comment': {
      const text=field('text')
      if(!text)return
      const comments=state.comments[value]??=[]
      comments.push({text,actor:roleName(state.role),at:new Date().toISOString(),version:version.number})
      const id=value.startsWith('node-')?value.slice(5) as NodeId:'spec'
      addEvent(state,'Добавлен комментарий',text,id)
      toast('Комментарий сохранён.');break
    }
    case 'node-config': {
      const id=value as NodeId
      if(!nodes.some(node=>node.id===id)||!field('owner')||!field('title')||!field('due'))return
      state.nodeOverrides[id]={title:field('title'),owner:field('owner'),due:field('due')}
      toast('Рабочий блок обновлён.');break
    }
    case 'edge': {
      const edge:Edge=[field('from') as NodeId,field('to') as NodeId,field('label')]
      if(!edge[2]||state.branches.some(([a,b])=>a===edge[0]&&b===edge[1])){toast('Такая связь уже существует или не указан показатель.');render();return}
      if(hasCycle([...state.branches,edge])){toast('Связь создаёт цикл. Выберите другие блоки.');render();return}
      state.branches.push(edge);toast('Связь добавлена.');break
    }
    default:return
  }
  if(changed.length){animate(changed);toast('v'+current(state).number+' · результаты пересчитаны и переданы службам.')}
  else if(['order','norms'].includes(command))toast('Значения совпадают с текущей версией.')
  persist()
  render()
})

let drag: { x:number;y:number;panX:number;panY:number;scale:number }|null=null
root.addEventListener('pointerdown',event=>{
  const target=event.target as Element
  const graph=target.closest('#workflow-svg')
  if(event.button!==0||!graph||target.closest('button'))return
  const bounds=graph.getBoundingClientRect()
  drag={x:event.clientX,y:event.clientY,panX:view.panX,panY:view.panY,scale:Math.max(942/bounds.width,385/bounds.height)}
  graph.setPointerCapture(event.pointerId)
  event.preventDefault()
})
root.addEventListener('pointermove',event=>{
  if(!drag)return
  view.panX=drag.panX+(event.clientX-drag.x)*drag.scale
  view.panY=drag.panY+(event.clientY-drag.y)*drag.scale
  root.querySelector('#graph-camera')?.setAttribute('transform',`translate(${view.panX} ${view.panY}) translate(471 265) scale(${view.zoom}) translate(-471 -265)`)
})
root.addEventListener('lostpointercapture',()=>{drag=null})
document.addEventListener('keydown',event=>{
  if(!view.drawer)return
  if(event.key==='Escape'){closeDrawer();render();return}
  if(event.key==='Tab'){
    const items=[...root.querySelectorAll<HTMLElement>('.drawer button:not([disabled]), .drawer input, .drawer select, .drawer textarea, .drawer summary')].filter(el=>el.getClientRects().length)
    const first=items[0],last=items.at(-1)
    if(!first||!last)return
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.querySelector('.drawer'))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
})
render()
