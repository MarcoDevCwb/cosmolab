import type { CelestialBodyId, CelestialBodyKind } from "../../types/celestial"
import { J2000_JULIAN_DATE } from "../time/astronomicalTime"
import { SCIENTIFIC_SOURCES, type ScientificSource } from "./scientificSources"

type ElementRates = {
  base: number
  ratePerCentury: number
}

export type PlanetaryMeanOrbit = {
  type: "planetary-mean-orbit"
  epochJulianDate: number
  semiMajorAxisAu: ElementRates
  eccentricity: ElementRates
  inclinationDeg: ElementRates
  meanLongitudeDeg: ElementRates
  longitudeOfPerihelionDeg: ElementRates
  longitudeOfAscendingNodeDeg: ElementRates
  source: ScientificSource
}

export type SatelliteMeanOrbit = {
  type: "satellite-mean-orbit"
  epochJulianDate: number
  semiMajorAxisKm: number
  eccentricity: number
  argumentOfPeriapsisDeg: number
  meanAnomalyDeg: number
  inclinationDeg: number
  longitudeOfAscendingNodeDeg: number
  orbitalPeriodDays: number
  source: ScientificSource
}

export type ScientificBodyDefinition = {
  id: CelestialBodyId
  kind: CelestialBodyKind
  name: string
  gmKm3PerSecond2: number
  meanRadiusKm: number
  rotationPeriodDays: number
  axialTiltDegrees: number
  source: ScientificSource
  orbit?: PlanetaryMeanOrbit | SatelliteMeanOrbit
}

const EARTH_MOON_BARYCENTER_ORBIT: PlanetaryMeanOrbit = {
  type: "planetary-mean-orbit",
  epochJulianDate: J2000_JULIAN_DATE,
  semiMajorAxisAu: { base: 1.00000018, ratePerCentury: -0.00000003 },
  eccentricity: { base: 0.01673163, ratePerCentury: -0.00003661 },
  inclinationDeg: { base: -0.00054346, ratePerCentury: -0.01337178 },
  meanLongitudeDeg: { base: 100.46691572, ratePerCentury: 35999.37306329 },
  longitudeOfPerihelionDeg: { base: 102.93005885, ratePerCentury: 0.31795260 },
  longitudeOfAscendingNodeDeg: { base: -5.11260389, ratePerCentury: -0.24123856 },
  source: SCIENTIFIC_SOURCES.orbitalElements,
}

const MARS_ORBIT: PlanetaryMeanOrbit = {
  type: "planetary-mean-orbit",
  epochJulianDate: J2000_JULIAN_DATE,
  semiMajorAxisAu: { base: 1.52371243, ratePerCentury: 0.00000097 },
  eccentricity: { base: 0.09336511, ratePerCentury: 0.00009149 },
  inclinationDeg: { base: 1.85181869, ratePerCentury: -0.00724757 },
  meanLongitudeDeg: { base: -4.56813164, ratePerCentury: 19140.29934243 },
  longitudeOfPerihelionDeg: { base: -23.91744784, ratePerCentury: 0.45223625 },
  longitudeOfAscendingNodeDeg: { base: 49.71320984, ratePerCentury: -0.26852431 },
  source: SCIENTIFIC_SOURCES.orbitalElements,
}

const MOON_ORBIT: SatelliteMeanOrbit = {
  type: "satellite-mean-orbit",
  epochJulianDate: J2000_JULIAN_DATE,
  semiMajorAxisKm: 384_400,
  eccentricity: 0.0554,
  argumentOfPeriapsisDeg: 318.15,
  meanAnomalyDeg: 135.27,
  inclinationDeg: 5.16,
  longitudeOfAscendingNodeDeg: 125.08,
  orbitalPeriodDays: 27.322,
  source: SCIENTIFIC_SOURCES.lunarElements,
}

export const SCIENTIFIC_BODY_CATALOG: Record<CelestialBodyId, ScientificBodyDefinition> = {
  sun: {
    id: "sun",
    kind: "star",
    name: "Sol",
    gmKm3PerSecond2: 132_712_440_041.27942,
    meanRadiusKm: 695_700,
    rotationPeriodDays: 25.05,
    axialTiltDegrees: 7.25,
    source: SCIENTIFIC_SOURCES.astrodynamics,
  },
  earth: {
    id: "earth",
    kind: "planet",
    name: "Terra",
    gmKm3PerSecond2: 398_600.435507,
    meanRadiusKm: 6_371.01,
    rotationPeriodDays: 0.99726968,
    axialTiltDegrees: 23.44,
    source: SCIENTIFIC_SOURCES.planetaryPhysics,
    orbit: EARTH_MOON_BARYCENTER_ORBIT,
  },
  moon: {
    id: "moon",
    kind: "moon",
    name: "Lua",
    gmKm3PerSecond2: 4_902.800118,
    meanRadiusKm: 1_737.4,
    rotationPeriodDays: 27.321661,
    axialTiltDegrees: 6.68,
    source: SCIENTIFIC_SOURCES.lunarPhysics,
    orbit: MOON_ORBIT,
  },
  mars: {
    id: "mars",
    kind: "planet",
    name: "Marte",
    gmKm3PerSecond2: 42_828.375816,
    meanRadiusKm: 3_389.92,
    rotationPeriodDays: 1.02595675,
    axialTiltDegrees: 25.19,
    source: SCIENTIFIC_SOURCES.planetaryPhysics,
    orbit: MARS_ORBIT,
  },
}
