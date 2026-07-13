import { Line } from "@react-three/drei"
import { useMemo } from "react"
import type { CelestialBodyDefinition } from "../../types/celestial"
import { getOrbitalState } from "../../physics/orbits"

type OrbitPathProps = {
  body: CelestialBodyDefinition
  compact: boolean
}

export function OrbitPath({ body, compact }: OrbitPathProps) {
  const points = useMemo(() => {
    const samples = compact ? 132 : 220
    return Array.from({ length: samples + 1 }, (_, index) => {
      const angleDays = (index / samples) * body.orbitPeriodDays
      return getOrbitalState(body, angleDays).localPosition
    })
  }, [body, compact])

  return (
    <Line
      points={points}
      color={body.trailColor}
      lineWidth={compact ? 0.9 : 1.2}
      transparent
      opacity={compact ? 0.32 : 0.44}
    />
  )
}
