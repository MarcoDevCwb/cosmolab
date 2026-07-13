import { MathUtils, Vector3 } from "three"
import type { CelestialBodyDefinition } from "../types/celestial"

export type OrbitalState = {
  localPosition: Vector3
  localVelocity: Vector3
  distanceKm: number
  orbitalSpeedKmPerSecond: number
}

const X_AXIS = new Vector3(1, 0, 0)
const Y_AXIS = new Vector3(0, 1, 0)

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number) {
  let anomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI

  for (let index = 0; index < 7; index += 1) {
    const delta =
      (anomaly - eccentricity * Math.sin(anomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(anomaly))
    anomaly -= delta

    if (Math.abs(delta) < 1e-7) {
      break
    }
  }

  return anomaly
}

function rotateIntoOrbitPlane(vector: Vector3, body: CelestialBodyDefinition) {
  return vector
    .applyAxisAngle(Y_AXIS, MathUtils.degToRad(body.orbitRotationDegrees))
    .applyAxisAngle(X_AXIS, MathUtils.degToRad(body.orbitInclinationDegrees))
}

export function getOrbitalState(body: CelestialBodyDefinition, simulationDays: number): OrbitalState {
  if (body.orbitPeriodDays === 0 || body.orbitRadius === 0 || body.semiMajorAxisKm === 0) {
    return {
      localPosition: new Vector3(),
      localVelocity: new Vector3(),
      distanceKm: 0,
      orbitalSpeedKmPerSecond: 0,
    }
  }

  const meanMotion = (Math.PI * 2) / body.orbitPeriodDays
  const meanAnomaly =
    MathUtils.euclideanModulo(
      MathUtils.degToRad(body.orbitalPhaseDegrees) + simulationDays * meanMotion,
      Math.PI * 2,
    )
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, body.orbitEccentricity)

  const visualSemiMinor = body.orbitRadius * Math.sqrt(1 - body.orbitEccentricity ** 2)
  const physicalSemiMinor = body.semiMajorAxisKm * Math.sqrt(1 - body.orbitEccentricity ** 2)
  const dEccentricAnomalyPerDay = meanMotion / (1 - body.orbitEccentricity * Math.cos(eccentricAnomaly))

  const localPosition = rotateIntoOrbitPlane(
    new Vector3(
      body.orbitRadius * (Math.cos(eccentricAnomaly) - body.orbitEccentricity),
      0,
      visualSemiMinor * Math.sin(eccentricAnomaly),
    ),
    body,
  )

  const localVelocity = rotateIntoOrbitPlane(
    new Vector3(
      -body.orbitRadius * Math.sin(eccentricAnomaly) * dEccentricAnomalyPerDay,
      0,
      visualSemiMinor * Math.cos(eccentricAnomaly) * dEccentricAnomalyPerDay,
    ),
    body,
  )

  const distanceKm = body.semiMajorAxisKm * (1 - body.orbitEccentricity * Math.cos(eccentricAnomaly))
  const physicalVelocityKmPerDay = new Vector3(
    -body.semiMajorAxisKm * Math.sin(eccentricAnomaly) * dEccentricAnomalyPerDay,
    0,
    physicalSemiMinor * Math.cos(eccentricAnomaly) * dEccentricAnomalyPerDay,
  )
  const orbitalSpeedKmPerSecond = physicalVelocityKmPerDay.length() / 86_400

  return {
    localPosition,
    localVelocity,
    distanceKm,
    orbitalSpeedKmPerSecond,
  }
}
