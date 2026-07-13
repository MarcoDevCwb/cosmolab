import type { CelestialBodyId } from "./celestial"
import type { Vec3 } from "../engine/math/vector3"
import type { ReferenceFrameId, SimulationMode } from "../engine/referenceFrames"
import type { ScientificSource } from "../engine/catalog/scientificSources"

export type ScientificQuantity = {
  value: number
  unit: string
  frame: ReferenceFrameId
  epochJulianDate: number
  source: ScientificSource
  precisionLabel: string
}

export type TrajectorySample = {
  julianDate: number
  positionKm: Vec3
  renderPosition: Vec3
  speedKmPerSecond: number
}

export type BodySceneState = {
  id: CelestialBodyId
  positionKm: Vec3
  velocityKmPerSecond: Vec3
  accelerationKmPerSecond2: Vec3
  renderPosition: Vec3
  renderVelocityDirection: Vec3
  siderealAngleRad: number
  sunDirection: Vec3
}

export type BodyTelemetryState = BodySceneState & {
  distance: ScientificQuantity
  speed: ScientificQuantity
  acceleration: ScientificQuantity
  trajectoryPast: TrajectorySample[]
  trajectoryFuture: TrajectorySample[]
}

export type ScientificSnapshot = {
  currentUnixMs: number
  currentJulianDate: number
  epochJulianDate: number
  activeFrame: ReferenceFrameId
  mode: SimulationMode
  providerLabel: string
  referenceSummary: string
  bodyStates: Record<CelestialBodyId, BodyTelemetryState>
}
