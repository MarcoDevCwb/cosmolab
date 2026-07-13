import type { CelestialBodyId } from "../../types/celestial"
import { kmToAu } from "../units/constants"
import { vec3, type Vec3 } from "../math/vector3"

const HELIOCENTRIC_UNITS_PER_AU = 11.5
const LOCAL_SATELLITE_MAGNIFICATION = 60

export function projectPositionToRenderSpace(bodyId: CelestialBodyId, positionKm: Vec3): Vec3 {
  const scaled =
    bodyId === "moon"
      ? vec3.scale(positionKm, (HELIOCENTRIC_UNITS_PER_AU / 149_597_870.7) * LOCAL_SATELLITE_MAGNIFICATION)
      : vec3.scale(positionKm, HELIOCENTRIC_UNITS_PER_AU / 149_597_870.7)

  return vec3.create(scaled.x, scaled.z, scaled.y)
}

export function projectDistanceLabel(distanceKm: number) {
  const distanceAu = kmToAu(distanceKm)
  if (distanceAu >= 0.1) {
    return `${distanceAu.toFixed(3)} au`
  }

  return `${Math.round(distanceKm).toLocaleString("pt-BR")} km`
}
