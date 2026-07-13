import { Line } from "@react-three/drei"
import { useMemo } from "react"
import type { CelestialBodyDefinition } from "../../types/celestial"
import type { TrajectorySample } from "../../types/simulation"

type OrbitPathProps = {
  body: CelestialBodyDefinition
  compact: boolean
  trajectory: TrajectorySample[]
}

export function OrbitPath({ body, compact, trajectory }: OrbitPathProps) {
  const points = useMemo(() => {
    const nextPoints = trajectory.map((sample) => [
      sample.renderPosition.x,
      sample.renderPosition.y,
      sample.renderPosition.z,
    ] as const)

    if (nextPoints.length > 0) {
      nextPoints.push(nextPoints[0])
    }

    return nextPoints
  }, [trajectory])

  if (points.length < 2) {
    return null
  }

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
