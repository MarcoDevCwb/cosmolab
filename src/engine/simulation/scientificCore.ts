import type { CelestialBodyId } from "../../types/celestial"
import type { BodySceneState, BodyTelemetryState, ScientificSnapshot, TrajectorySample } from "../../types/simulation"
import {
  SCIENTIFIC_BODY_CATALOG,
  type PlanetaryMeanOrbit,
  type SatelliteMeanOrbit,
} from "../catalog/solarSystemCatalog"
import { projectPositionToRenderSpace } from "../projection/renderProjection"
import { REFERENCE_FRAMES, type ReferenceFrameId, type SimulationMode } from "../referenceFrames"
import { julianDateToUnixMs } from "../time/astronomicalTime"
import { propagatePlanetaryMeanOrbit, propagateSatelliteMeanOrbit } from "../astronomy/kepler"
import { vec3, type Vec3 } from "../math/vector3"

type RawState = {
  id: CelestialBodyId
  positionKm: Vec3
  velocityKmPerSecond: Vec3
  accelerationKmPerSecond2: Vec3
}

type OriginState = {
  positionKm: Vec3
  velocityKmPerSecond: Vec3
  accelerationKmPerSecond2: Vec3
}

const BODY_IDS: CelestialBodyId[] = ["sun", "earth", "moon", "mars"]

function sampleHeliocentricStates(julianDate: number): Record<CelestialBodyId, RawState> {
  const sun = SCIENTIFIC_BODY_CATALOG.sun
  const earth = SCIENTIFIC_BODY_CATALOG.earth
  const moon = SCIENTIFIC_BODY_CATALOG.moon
  const mars = SCIENTIFIC_BODY_CATALOG.mars

  const embState = propagatePlanetaryMeanOrbit(earth.orbit as PlanetaryMeanOrbit, julianDate)
  const moonGeocentric = propagateSatelliteMeanOrbit(moon.orbit as SatelliteMeanOrbit, julianDate)
  const earthOffsetFactor =
    moon.gmKm3PerSecond2 / (earth.gmKm3PerSecond2 + moon.gmKm3PerSecond2)
  const earthOffset = vec3.scale(moonGeocentric.positionKm, earthOffsetFactor)
  const earthVelocityOffset = vec3.scale(moonGeocentric.velocityKmPerSecond, earthOffsetFactor)
  const earthHeliocentricPosition = vec3.subtract(embState.positionKm, earthOffset)
  const earthHeliocentricVelocity = vec3.subtract(embState.velocityKmPerSecond, earthVelocityOffset)
  const moonHeliocentricPosition = vec3.add(earthHeliocentricPosition, moonGeocentric.positionKm)
  const moonHeliocentricVelocity = vec3.add(
    earthHeliocentricVelocity,
    moonGeocentric.velocityKmPerSecond,
  )
  const marsState = propagatePlanetaryMeanOrbit(mars.orbit as PlanetaryMeanOrbit, julianDate)

  const provisionalStates: Record<CelestialBodyId, RawState> = {
    sun: {
      id: "sun",
      positionKm: vec3.create(),
      velocityKmPerSecond: vec3.create(),
      accelerationKmPerSecond2: vec3.create(),
    },
    earth: {
      id: "earth",
      positionKm: earthHeliocentricPosition,
      velocityKmPerSecond: earthHeliocentricVelocity,
      accelerationKmPerSecond2: vec3.create(),
    },
    moon: {
      id: "moon",
      positionKm: moonHeliocentricPosition,
      velocityKmPerSecond: moonHeliocentricVelocity,
      accelerationKmPerSecond2: vec3.create(),
    },
    mars: {
      id: "mars",
      positionKm: marsState.positionKm,
      velocityKmPerSecond: marsState.velocityKmPerSecond,
      accelerationKmPerSecond2: vec3.create(),
    },
  }

  provisionalStates.earth.accelerationKmPerSecond2 = centralAcceleration(
    provisionalStates.earth.positionKm,
    sun.gmKm3PerSecond2,
  )
  provisionalStates.earth.accelerationKmPerSecond2 = vec3.add(
    provisionalStates.earth.accelerationKmPerSecond2,
    centralAcceleration(
      vec3.subtract(provisionalStates.earth.positionKm, provisionalStates.moon.positionKm),
      moon.gmKm3PerSecond2,
    ),
  )
  provisionalStates.moon.accelerationKmPerSecond2 = vec3.add(
    centralAcceleration(
      vec3.subtract(provisionalStates.moon.positionKm, provisionalStates.earth.positionKm),
      earth.gmKm3PerSecond2,
    ),
    centralAcceleration(provisionalStates.moon.positionKm, sun.gmKm3PerSecond2),
  )
  provisionalStates.mars.accelerationKmPerSecond2 = centralAcceleration(
    provisionalStates.mars.positionKm,
    sun.gmKm3PerSecond2,
  )

  return provisionalStates
}

function centralAcceleration(positionKm: Vec3, gmKm3PerSecond2: number) {
  const distanceSquared = vec3.lengthSquared(positionKm)
  if (distanceSquared === 0) {
    return vec3.create()
  }

  const distance = Math.sqrt(distanceSquared)
  return vec3.scale(positionKm, -gmKm3PerSecond2 / (distanceSquared * distance))
}

function barycentricOrigin(heliocentricStates: Record<CelestialBodyId, RawState>): OriginState {
  const totalMassProxy = BODY_IDS.reduce(
    (sum, bodyId) => sum + SCIENTIFIC_BODY_CATALOG[bodyId].gmKm3PerSecond2,
    0,
  )

  return {
    positionKm: vec3.scale(
      BODY_IDS.reduce(
        (accumulator, bodyId) =>
          vec3.add(
            accumulator,
            vec3.scale(heliocentricStates[bodyId].positionKm, SCIENTIFIC_BODY_CATALOG[bodyId].gmKm3PerSecond2),
          ),
        vec3.create(),
      ),
      1 / totalMassProxy,
    ),
    velocityKmPerSecond: vec3.scale(
      BODY_IDS.reduce(
        (accumulator, bodyId) =>
          vec3.add(
            accumulator,
            vec3.scale(
              heliocentricStates[bodyId].velocityKmPerSecond,
              SCIENTIFIC_BODY_CATALOG[bodyId].gmKm3PerSecond2,
            ),
          ),
        vec3.create(),
      ),
      1 / totalMassProxy,
    ),
    accelerationKmPerSecond2: vec3.scale(
      BODY_IDS.reduce(
        (accumulator, bodyId) =>
          vec3.add(
            accumulator,
            vec3.scale(
              heliocentricStates[bodyId].accelerationKmPerSecond2,
              SCIENTIFIC_BODY_CATALOG[bodyId].gmKm3PerSecond2,
            ),
          ),
        vec3.create(),
      ),
      1 / totalMassProxy,
    ),
  }
}

function resolveOrigin(
  frame: ReferenceFrameId,
  heliocentricStates: Record<CelestialBodyId, RawState>,
): OriginState {
  if (frame === "heliocentric") {
    return {
      positionKm: heliocentricStates.sun.positionKm,
      velocityKmPerSecond: heliocentricStates.sun.velocityKmPerSecond,
      accelerationKmPerSecond2: heliocentricStates.sun.accelerationKmPerSecond2,
    }
  }

  if (frame === "geocentric") {
    return {
      positionKm: heliocentricStates.earth.positionKm,
      velocityKmPerSecond: heliocentricStates.earth.velocityKmPerSecond,
      accelerationKmPerSecond2: heliocentricStates.earth.accelerationKmPerSecond2,
    }
  }

  return barycentricOrigin(heliocentricStates)
}

function siderealAngleRadians(bodyId: CelestialBodyId, julianDate: number) {
  const rotationPeriodDays = SCIENTIFIC_BODY_CATALOG[bodyId].rotationPeriodDays
  if (rotationPeriodDays === 0) {
    return 0
  }

  return ((julianDate - 2_451_545.0) / rotationPeriodDays) * Math.PI * 2
}

function createBodySceneState(
  bodyId: CelestialBodyId,
  julianDate: number,
  frame: ReferenceFrameId,
  heliocentricStates: Record<CelestialBodyId, RawState>,
): BodySceneState {
  const origin = resolveOrigin(frame, heliocentricStates)
  const rawState = heliocentricStates[bodyId]
  const sunState = heliocentricStates.sun
  const framePosition = vec3.subtract(rawState.positionKm, origin.positionKm)
  const frameVelocity = vec3.subtract(rawState.velocityKmPerSecond, origin.velocityKmPerSecond)
  const frameAcceleration = vec3.subtract(
    rawState.accelerationKmPerSecond2,
    origin.accelerationKmPerSecond2,
  )

  return {
    id: bodyId,
    positionKm: framePosition,
    velocityKmPerSecond: frameVelocity,
    accelerationKmPerSecond2: frameAcceleration,
    renderPosition: projectPositionToRenderSpace(bodyId, framePosition),
    renderVelocityDirection: vec3.normalize(frameVelocity),
    siderealAngleRad: siderealAngleRadians(bodyId, julianDate),
    sunDirection: vec3.normalize(vec3.subtract(sunState.positionKm, rawState.positionKm)),
  }
}

function sampleTrajectory(
  bodyId: CelestialBodyId,
  julianDate: number,
  frame: ReferenceFrameId,
  direction: -1 | 1,
): TrajectorySample[] {
  const definition = SCIENTIFIC_BODY_CATALOG[bodyId]
  const orbitWindowDays =
    bodyId === "moon"
      ? 6
      : definition.orbit?.type === "planetary-mean-orbit"
        ? 90
        : 30
  const samples = 28

  return Array.from({ length: samples }, (_, index) => {
    const ratio = index / Math.max(samples - 1, 1)
    const sampleJulianDate = julianDate + direction * ratio * orbitWindowDays
    const sceneState = sampleSceneState(sampleJulianDate, frame)
    const bodyState = sceneState[bodyId]

    return {
      julianDate: sampleJulianDate,
      positionKm: bodyState.positionKm,
      renderPosition: bodyState.renderPosition,
      speedKmPerSecond: vec3.length(bodyState.velocityKmPerSecond),
    }
  })
}

export function sampleSceneState(
  julianDate: number,
  frame: ReferenceFrameId,
): Record<CelestialBodyId, BodySceneState> {
  const heliocentricStates = sampleHeliocentricStates(julianDate)

  return {
    sun: createBodySceneState("sun", julianDate, frame, heliocentricStates),
    earth: createBodySceneState("earth", julianDate, frame, heliocentricStates),
    moon: createBodySceneState("moon", julianDate, frame, heliocentricStates),
    mars: createBodySceneState("mars", julianDate, frame, heliocentricStates),
  }
}

function quantity(
  value: number,
  unit: string,
  frame: ReferenceFrameId,
  julianDate: number,
  source = SCIENTIFIC_BODY_CATALOG.sun.source,
) {
  return {
    value,
    unit,
    frame,
    epochJulianDate: julianDate,
    source,
    precisionLabel: unit === "km/s" ? "aprox. modelo local" : "aprox. modelo local",
  }
}

export function buildScientificSnapshot(
  julianDate: number,
  frame: ReferenceFrameId,
  mode: SimulationMode,
): ScientificSnapshot {
  const sceneState = sampleSceneState(julianDate, frame)
  const referenceSummary =
    REFERENCE_FRAMES.find((definition) => definition.id === frame)?.summary ??
    "Referencial cientifico ativo."

  const bodyStates = BODY_IDS.reduce<Record<CelestialBodyId, BodyTelemetryState>>(
    (accumulator, bodyId) => {
      const bodySceneState = sceneState[bodyId]
      const definition = SCIENTIFIC_BODY_CATALOG[bodyId]
      const distance = vec3.length(bodySceneState.positionKm)
      const speed = vec3.length(bodySceneState.velocityKmPerSecond)
      const acceleration = vec3.length(bodySceneState.accelerationKmPerSecond2)

      accumulator[bodyId] = {
        ...bodySceneState,
        distance: quantity(distance, "km", frame, julianDate, definition.source),
        speed: quantity(speed, "km/s", frame, julianDate, definition.source),
        acceleration: quantity(acceleration, "km/s2", frame, julianDate, definition.source),
        trajectoryPast: sampleTrajectory(bodyId, julianDate, frame, -1),
        trajectoryFuture: sampleTrajectory(bodyId, julianDate, frame, 1),
      }

      return accumulator
    },
    {} as Record<CelestialBodyId, BodyTelemetryState>,
  )

  return {
    currentUnixMs: julianDateToUnixMs(julianDate),
    currentJulianDate: julianDate,
    epochJulianDate: 2_451_545.0,
    activeFrame: frame,
    mode,
    providerLabel: "Local JPL-inspired scientific core",
    referenceSummary,
    bodyStates,
  }
}

export function advanceJulianDate(
  currentJulianDate: number,
  deltaSeconds: number,
  daysPerSecond: number,
) {
  return currentJulianDate + deltaSeconds * daysPerSecond
}
