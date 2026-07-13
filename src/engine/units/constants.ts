export const AU_IN_KM = 149_597_870.7
export const DAY_IN_SECONDS = 86_400
export const DAY_IN_MILLISECONDS = DAY_IN_SECONDS * 1_000
export const JULIAN_YEAR_IN_DAYS = 365.25

export function auToKm(astronomicalUnits: number) {
  return astronomicalUnits * AU_IN_KM
}

export function kmToAu(km: number) {
  return km / AU_IN_KM
}
