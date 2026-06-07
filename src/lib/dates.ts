import { DayOfWeek } from './types'

export const DAYS: Record<string, DayOfWeek> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
}

export const DAY_LABELS_FULL: Record<DayOfWeek, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
}

export const ORDERED_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function getDayLabel(day: string): string {
  return DAY_LABELS_FULL[day as DayOfWeek] ?? day
}

export function getTodayDayOfWeek(): DayOfWeek | null {
  const day = new Date().getDay()
  const map: Record<number, DayOfWeek> = {
    1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday',
  }
  return map[day] ?? null
}

export function isRestrictedDay(day: DayOfWeek): boolean {
  return day === 'tuesday' || day === 'thursday'
}
