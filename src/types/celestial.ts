export type CelestialBodyId = "sun" | "earth" | "moon" | "mars"

export type CelestialBodyKind = "star" | "planet" | "moon"

export type CelestialFact = {
  label: string
  value: string
  sourceLabel?: string
}

export type CelestialBodyDefinition = {
  id: CelestialBodyId
  kind: CelestialBodyKind
  name: string
  summary: string
  radius: number
  baseColor: string
  glowColor: string
  trailColor: string
  vectorColor: string
  atmosphereColor?: string
  facts: CelestialFact[]
}
