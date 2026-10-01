const TZ = 'Asia/Ho_Chi_Minh'

export const DEFAULT_SLOTS = [
  { label: '08:00 - 10:00', start: 8 },
  { label: '10:00 - 12:00', start: 10 },
  { label: '13:00 - 15:00', start: 13 },
  { label: '15:00 - 17:00', start: 15 },
  { label: '17:00 - 19:00', start: 17 },
  { label: '19:00 - 21:00', start: 19 },
]

/** Ngày giờ hiện tại theo giờ Việt Nam: { date: 'yyyy-mm-dd', hour: số giờ thập phân } */
export function nowInVN(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  )
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) + Number(p.minute) / 60 }
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Khung giờ còn đặt được cho một ngày (hôm nay: ẩn khung bắt đầu trước now + prepHours). */
export function availableSlots(date, slots = DEFAULT_SLOTS, prepHours = 2) {
  const now = nowInVN()
  if (!date || date < now.date) return []
  if (date > now.date) return slots
  return slots.filter((s) => s.start >= now.hour + prepHours)
}

/** Ngày giao sớm nhất: hôm nay nếu còn khung giờ, ngược lại ngày mai. */
export function earliestDate(slots = DEFAULT_SLOTS, prepHours = 2) {
  const today = nowInVN().date
  return availableSlots(today, slots, prepHours).length ? today : addDays(today, 1)
}
