import { vec3, type Vec3 } from "../math/vector3"
import { julianCenturiesSinceJ2000 } from "../time/astronomicalTime"
import { DAY_IN_SECONDS, auToKm } from "../units/constants"
import type { PlanetaryMeanOrbit, SatelliteMeanOrbit } from "../catalog/solarSystemCatalog"

export type OrbitalState = {
  positionKm: Vec3
  velocityKmPerSecond: Vec3
}

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180
}

function normalizeRadians(angle: number) {
  const turn = Math.PI * 2
  return ((angle % turn) + turn) % turn
}

function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomalyRad : Math.PI

  for (let index = 0; index < 8; index += 1) {
    const delta =
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomalyRad) /
      (1 - eccentricity * Math.cos(eccentricAnomaly))
    eccentricAnomaly -= delta

    if (Math.abs(delta) < 1e-9) {
      break
    }
  }

  return eccentricAnomaly
}

function rotateOrbitalPlane(
  xPrime: number,
  yPrime: number,
  argumentOfPeriapsisRad: number,
  inclinationRad: number,
  longitudeOfAscendingNodeRad: number,
) {
  const cosOmega = Math.cos(longitudeOfAscendingNodeRad)
  const sinOmega = Math.sin(longitudeOfAscendingNodeRad)
  const cosInclination = Math.cos(inclinationRad)
  const sinInclination = Math.sin(inclinationRad)
  const cosArgument = Math.cos(argumentOfPeriapsisRad)
  const sinArgument = Math.sin(argumentOfPeriapsisRad)

  return vec3.create(
    (cosArgument * cosOmega - sinArgument * sinOmega * cosInclination) * xPrime +
      (-sinArgument * cosOmega - cosArgument * sinOmega * cosInclination) * yPrime,
    (cosArgument * sinOmega + sinArgument * cosOmega * cosInclination) * xPrime +
      (-sinArgument * sinOmega + cosArgument * cosOmega * cosInclination) * yPrime,
    sinArgument * sinInclination * xPrime + cosArgument * sinInclination * yPrime,
  )
}

export function propagatePlanetaryMeanOrbit(orbit: PlanetaryMeanOrbit, julianDate: number): OrbitalState {
  const centuries = julianCenturiesSinceJ2000(julianDate)

  const semiMajorAxisKm = auToKm(orbit.semiMajorAxisAu.base + orbit.semiMajorAxisAu.ratePerCentury * centuries)
  const eccentricity = orbit.eccentricity.base + orbit.eccentricity.ratePerCentury * centuries
  const inclinationRad = degToRad(
    orbit.inclinationDeg.base + orbit.inclinationDeg.ratePerCentury * centuries,
  )
  const meanLongitudeDeg =
    orbit.meanLongitudeDeg.base + orbit.meanLongitudeDeg.ratePerCentury * centuries
  const longitudeOfPerihelionDeg =
    orbit.longitudeOfPerihelionDeg.base + orbit.longitudeOfPerihelionDeg.ratePerCentury * centuries
  const longitudeOfAscendingNodeDeg =
    orbit.longitudeOfAscendingNodeDeg.base +
    orbit.longitudeOfAscendingNodeDeg.ratePerCentury * centuries

  const meanAnomalyRad = normalizeRadians(degToRad(meanLongitudeDeg - longitudeOfPerihelionDeg))
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomalyRad, eccentricity)
  const semiMinorAxisKm = semiMajorAxisKm * Math.sqrt(1 - eccentricity ** 2)
  const meanMotionRadPerSecond =
    degToRad(
      orbit.meanLongitudeDeg.ratePerCentury - orbit.longitudeOfPerihelionDeg.ratePerCentury,
    ) /
    (36_525 * DAY_IN_SECONDS)
  const dEccentricAnomalyPerSecond =
    meanMotionRadPerSecond / (1 - eccentricity * Math.cos(eccentricAnomaly))

  const xPrime = semiMajorAxisKm * (Math.cos(eccentricAnomaly) - eccentricity)
  const yPrime = semiMinorAxisKm * Math.sin(eccentricAnomaly)

  const vxPrime = -semiMajorAxisKm * Math.sin(eccentricAnomaly) * dEccentricAnomalyPerSecond
  const vyPrime = semiMinorAxisKm * Math.cos(eccentricAnomaly) * dEccentricAnomalyPerSecond

  const argumentOfPeriapsisRad = degToRad(
    longitudeOfPerihelionDeg - longitudeOfAscendingNodeDeg,
  )
  const longitudeOfAscendingNodeRad = degToRad(longitudeOfAscendingNodeDeg)

  return {
    positionKm: rotateOrbitalPlane(
      xPrime,
      yPrime,
      argumentOfPeriapsisRad,
      inclinationRad,
      longitudeOfAscendingNodeRad,
    ),
    velocityKmPerSecond: rotateOrbitalPlane(
      vxPrime,
      vyPrime,
      argumentOfPeriapsisRad,
      inclinationRad,
      longitudeOfAscendingNodeRad,
    ),
  }
}

export function propagateSatelliteMeanOrbit(orbit: SatelliteMeanOrbit, julianDate: number): OrbitalState {
  const elapsedDays = julianDate - orbit.epochJulianDate
  const meanMotionRadPerSecond = (Math.PI * 2) / (orbit.orbitalPeriodDays * DAY_IN_SECONDS)
  const meanAnomalyRad = normalizeRadians(
    degToRad(orbit.meanAnomalyDeg) + elapsedDays * DAY_IN_SECONDS * meanMotionRadPerSecond,
  )
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomalyRad, orbit.eccentricity)
  const semiMinorAxisKm = orbit.semiMajorAxisKm * Math.sqrt(1 - orbit.eccentricity ** 2)
  const dEccentricAnomalyPerSecond =
    meanMotionRadPerSecond / (1 - orbit.eccentricity * Math.cos(eccentricAnomaly))

  const xPrime = orbit.semiMajorAxisKm * (Math.cos(eccentricAnomaly) - orbit.eccentricity)
  const yPrime = semiMinorAxisKm * Math.sin(eccentricAnomaly)
  const vxPrime = -orbit.semiMajorAxisKm * Math.sin(eccentricAnomaly) * dEccentricAnomalyPerSecond
  const vyPrime = semiMinorAxisKm * Math.cos(eccentricAnomaly) * dEccentricAnomalyPerSecond

  return {
    positionKm: rotateOrbitalPlane(
      xPrime,
      yPrime,
      degToRad(orbit.argumentOfPeriapsisDeg),
      degToRad(orbit.inclinationDeg),
      degToRad(orbit.longitudeOfAscendingNodeDeg),
    ),
    velocityKmPerSecond: rotateOrbitalPlane(
      vxPrime,
      vyPrime,
      degToRad(orbit.argumentOfPeriapsisDeg),
      degToRad(orbit.inclinationDeg),
      degToRad(orbit.longitudeOfAscendingNodeDeg),
    ),
  }
}
