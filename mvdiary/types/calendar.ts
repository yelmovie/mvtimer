export type IsoDateString = `${number}-${string}-${string}`

export type MonthGridCell = {
  /** null이면 월 시작 요일 맞추기용 빈 칸 */
  date: Date | null
  iso: IsoDateString | null
  isToday: boolean
  inCurrentMonth: boolean
}

export type StudentChecklistByDate = Record<IsoDateString, boolean[]>


