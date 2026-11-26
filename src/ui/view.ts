import type { NodeId } from '../engine/dependencies/index.ts'

export type Page = 'program' | 'map' | 'planning' | 'materials' | 'technology' | 'approvals' | 'references' | 'analytics' | 'settings' | 'orders' | 'quality' | 'versions' | 'passport'
export type View = {
  page: Page; drawer: string; tab: string; product: number; techTab: string; mode: 'excel' | 'production';
  materialTab: string; planningScale: string; scenario: string; demo: number;
  assistantQuestion: string; compareFrom: number; compareTo: number; filter: string;
  graphMode: 'services' | 'calcs'; critical: boolean; zoom: number; panX: number; panY: number;
  collapsed: boolean; flow: NodeId[]; activation: number; selected: string; settingsTab: string;
}

export function initialView(): View {
  return { page: 'map', drawer: '', tab: 'Обзор', product: 2, techTab: 'Маршрут', mode: 'excel',
    materialTab: 'Сводная потребность', planningScale: 'Дни', scenario: 'Сбалансированный', demo: -1,
    assistantQuestion: '', compareFrom: 0, compareTo: 0, filter: 'all', graphMode: 'services',
    critical: false, zoom: 1, panX: 0, panY: 0, collapsed: false, flow: [], activation: 0,
    selected: '', settingsTab: 'Нормативы' }
}
