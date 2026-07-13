export type CelestialBodyId = "sun" | "earth" | "moon" | "mars"

export type CelestialBodyKind = "star" | "planet" | "moon"

export type CelestialFact = {
  label: string
  value: string
}

export type CelestialBodySnapshot = {
  distanceKm: number
  orbitalSpeedKmPerSecond: number
}

export type CelestialBodyDefinition = {
  id: CelestialBodyId
  kind: CelestialBodyKind
  name: string
  summary: string
  radius: number
  orbitRadius: number
  semiMajorAxisKm: number
  orbitPeriodDays: number
  rotationPeriodDays: number
  axialTiltDegrees: number
  orbitInclinationDegrees: number
  orbitEccentricity: number
  orbitRotationDegrees: number
  orbitalPhaseDegrees: number
  baseColor: string
  glowColor: string
  trailColor: string
  vectorColor: string
  atmosphereColor?: string
  parentId?: CelestialBodyId
  facts: CelestialFact[]
}
