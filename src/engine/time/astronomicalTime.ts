const JULIAN_DATE_UNIX_EPOCH = 2_440_587.5
export const J2000_JULIAN_DATE = 2_451_545.0

export function unixMsToJulianDate(unixMs: number) {
  return unixMs / 86_400_000 + JULIAN_DATE_UNIX_EPOCH
}

export function julianDateToUnixMs(julianDate: number) {
  return (julianDate - JULIAN_DATE_UNIX_EPOCH) * 86_400_000
}

export function julianCenturiesSinceJ2000(julianDate: number) {
  return (julianDate - J2000_JULIAN_DATE) / 36_525
}

export function nowUnixMs() {
  return Date.now()
}

export function nowJulianDate() {
  return unixMsToJulianDate(nowUnixMs())
}

export function formatUtcDate(unixMs: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(unixMs))
}

export function toDateTimeLocalValue(unixMs: number) {
  const date = new Date(unixMs)
  const pad = (value: number) => value.toString().padStart(2, "0")

  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  ].join("T")
}

export function fromDateTimeLocalValue(value: string) {
  const unixMs = Date.parse(`${value}:00Z`)
  return Number.isFinite(unixMs) ? unixMs : nowUnixMs()
}
