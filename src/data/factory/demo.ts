export const defaults = {
  energyFormula: 'M*K', laborFormula: 'M*K',
  energyRate: 720, energyLimit: 82000, energyBase: 'liquid' as 'liquid' | 'good', recipeBase: 'liquid' as 'liquid' | 'good',
  laborRate: 2.7, shiftHours: 8, staff: 22, coreStock: 30000,
  coreArrival: 0, coreArrivalDate: '', metalStock: 115, changeover: .25, shifts: 40,
}
export type Norms = typeof defaults
export const normFields = {
  energyRate: ['Энергоёмкость, кВт·ч/т', .01],
  energyLimit: ['Лимит электроэнергии, кВт·ч', 1],
  laborRate: ['Трудоёмкость, чел·ч/т', .01],
  shiftHours: ['Продолжительность смены, ч', .01],
  staff: ['Доступный персонал, чел.', 1],
  coreStock: ['Остаток стержней изделия №3, шт.', 1],
  coreArrival: ['Ожидаемая поставка стержней, шт.', 1],
  metalStock: ['Обеспечение жидким металлом, т', .01],
  changeover: ['Переналадка, смены', .01],
  shifts: ['Доступные смены на каждой линии', 1],
} as const
