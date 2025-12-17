import type { MonthGridCell } from '@/types/calendar'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toIsoDateLocal(d: Date) {
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}-${m}-${day}` as const
}

function isSameLocalDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * 월간 달력 그리드 생성 (일요일 시작 기준)
 * @param year 예: 2025
 * @param monthIndex0 0=Jan
 * @returns 6주 * 7일 = 42칸
 */
export function buildMonthGrid(year: number, monthIndex0: number): MonthGridCell[] {
  const firstOfMonth = new Date(year, monthIndex0, 1)
  const firstDayOfWeek = firstOfMonth.getDay() // 0=Sun
  const today = new Date()

  const cells: MonthGridCell[] = []
  for (let i = 0; i < 42; i++) {
    const offsetFromFirstCell = i - firstDayOfWeek
    const d = new Date(year, monthIndex0, 1 + offsetFromFirstCell)
    const inCurrentMonth = d.getMonth() === monthIndex0 && d.getFullYear() === year

    if (!inCurrentMonth) {
      cells.push({
        date: null,
        iso: null,
        isToday: false,
        inCurrentMonth: false,
      })
      continue
    }

    cells.push({
      date: d,
      iso: toIsoDateLocal(d),
      isToday: isSameLocalDate(d, today),
      inCurrentMonth: true,
    })
  }

  return cells
}


