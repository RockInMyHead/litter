const icons: Record<string, string> = {
  factory: '<path d="M3 21V9l6 4V9l6 4V4h4l2 17H3Z"/><path d="M7 17h2m3 0h2m3 0h1"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clipboard: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6"/>',
  workflow: '<rect x="2" y="3" width="7" height="6" rx="1"/><rect x="15" y="8" width="7" height="6" rx="1"/><rect x="2" y="15" width="7" height="6" rx="1"/><path d="M9 6h3v12H9m3-7h3"/>',
  gantt: '<path d="M4 3v18m0-16h9m-6 5h11m-7 5h9m-4 5h5"/>',
  boxes: '<path d="M12 3 7 6v5l5 3 5-3V6l-5-3Zm0 11-5-3-5 3v5l5 3 5-3v-5Zm0 0 5-3 5 3v5l-5 3-5-3v-5ZM7 6l5 3 5-3M2 14l5 3 5-3m0 0 5 3 5-3"/>',
  book: '<path d="M4 19a2 2 0 0 1 2-2h14V3H6a2 2 0 0 0-2 2v14Zm0 0a2 2 0 0 0 2 2h14m-12-14h8m-8 4h6"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  chart: '<path d="M3 3v18h18M8 17v-5m5 5V8m5 9V5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-.7 2.2-1.7 1-2.3-.5-1.7 3 1.5 1.8v2.9l-1.5 1.8 1.7 3 2.3-.5 1.7 1L9 21h6l.7-2.3 1.7-1 2.3.5 1.7-3-1.5-1.8v-2.9l1.5-1.8-1.7-3-2.3.5-1.7-1L15 3z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 4h2m4 0h2"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  play: '<path d="m8 5 12 7-12 7V5Z"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  shopping: '<path d="M3 4h2l2 11h11l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M2 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M17 4a3 3 0 0 1 0 6m2 4a4 4 0 0 1 3 4v2"/>',
  flask: '<path d="M9 3h6m-5 0v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M8 15h8"/>',
  hardhat: '<path d="M3 16h18v3H3v-3Zm2 0v-3a7 7 0 0 1 14 0v3M10 6v5m4-5v5"/>',
  contact: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c0-3 6-3 6 0m3-6h3m-3 4h3"/>',
  truck: '<path d="M3 6h12v12H3V6Zm12 4h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  alert: '<path d="M10.3 4.6 2.5 18a1.5 1.5 0 0 0 1.3 2h16.4a1.5 1.5 0 0 0 1.3-2L13.7 4.6a2 2 0 0 0-3.4 0ZM12 9v4m0 3h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>', diagonal: '<path d="M7 17 17 7M7 7h10v10"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1"/><circle cx="15" cy="12" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  refresh: '<path d="M20 7a8 8 0 1 0 0 9M20 3v5h-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>', file: '<path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6"/>',
  edit: '<path d="m4 16-1 5 5-1L20 8l-4-4L4 16Zm9-9 4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  history: '<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7m2-4v5l4 2"/>',
  compare: '<path d="m6 7 4-4 4 4M10 3v17m8-3-4 4-4-4m4 4V4"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7Zm0 0L11 13"/>',
  scale: '<path d="M12 3v18M4 6h16M6 6l-4 8h8L6 6Zm12 0-4 8h8l-4-8ZM8 21h8"/>',
  print: '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6v-7Zm11-3h1"/>',
}
export function icon(name: string, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.file}</svg>`
}
export function h(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
export const fmt = (value: number | null | undefined, digits = 0) => value == null ? '—' : value.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits })
export const date = (value: string) => new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export const button = (label: string, action: string, symbol = '', style = '') => `<button type="button" class="btn ${style}" data-action="${h(action)}">${symbol ? icon(symbol, 16) : ''}${h(label)}</button>`
export const iconButton = (label: string, action: string, symbol: string) => `<button type="button" class="icon-btn" title="${h(label)}" aria-label="${h(label)}" data-action="${h(action)}">${icon(symbol, 17)}</button>`
export const badge = (label: string, tone = 'gray', dot = false) => `<span class="badge ${tone}">${dot ? '<i></i>' : ''}${h(label)}</span>`
export const heading = (title: string, detail: string, actions = '') => `<div class="page-heading"><div><h1>${h(title)}</h1>${detail ? `<p>${h(detail)}</p>` : ''}</div><div class="heading-actions">${actions}</div></div>`
export const panel = (title: string, body: string, extra = '') => `<section class="panel"><header class="panel-head"><h2>${h(title)}</h2>${extra}</header>${body}</section>`
export const metric = (label: string, value: string, detail = '') => `<div class="metric"><span>${h(label)}</span><strong>${h(value)}</strong>${detail ? `<small>${h(detail)}</small>` : ''}</div>`
export const option = (value: string, label: string, selected = false) => `<option value="${h(value)}"${selected ? ' selected' : ''}>${h(label)}</option>`
export const empty = (text: string) => `<p class="empty">${h(text)}</p>`
export const table = (head: string[], body: string) => `<div class="table-scroll"><table><thead><tr>${head.map(label => `<th>${h(label)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`
