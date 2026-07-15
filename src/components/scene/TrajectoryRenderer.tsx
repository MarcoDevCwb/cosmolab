import { Line } from "@react-three/drei"
import { useMemo } from "react"
import type { RenderPosition } from "../../rendering/scene/coordinateMapping"
import type { Vector4 } from "../../physics/relativity/tensor"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import type { SimulationScenario } from "../../simulation/scenarios"

/**
 * Trajetória integrada (cauda esmaece, cabeça brilha), posição atual e
 * trajetória de comparação (ex.: elipse newtoniana). Apenas desenho:
 * todos os pontos vêm do runner e do mapeador de coordenadas.
 */
export function TrajectoryRenderer({
  scenario,
  snapshot,
  mapToSurface,
  compact,
}: {
  scenario: SimulationScenario
  snapshot: RelativitySnapshot | null
  mapToSurface: (position: Vector4) => RenderPosition
  compact: boolean
}) {
  const trajectory = useMemo(() => {
    if (!snapshot || snapshot.samples.length < 2) {
      return null
    }

    const count = snapshot.samples.length
    const head: readonly [number, number, number] =
      scenario.kind === "null" ? [0.55, 0.95, 1.35] : [1.25, 0.75, 1.35]
    const tail: readonly [number, number, number] = [0.05, 0.09, 0.2]

    const points: [number, number, number][] = []
    const colors: [number, number, number][] = []
    snapshot.samples.forEach((sample, index) => {
      const mapped = mapToSurface(sample.position)
      points.push([mapped.x, mapped.y, mapped.z])
      const t = (index / Math.max(count - 1, 1)) ** 1.6
      colors.push([
        tail[0] + (head[0] - tail[0]) * t,
        tail[1] + (head[1] - tail[1]) * t,
        tail[2] + (head[2] - tail[2]) * t,
      ])
    })

    return { points, colors }
  }, [snapshot, mapToSurface, scenario])

  const comparisonPoints = useMemo(() => {
    if (!scenario.comparisonPath) {
      return null
    }
    return scenario.comparisonPath.points.map((point) => {
      const mapped = mapToSurface([0, point.r, Math.PI / 2, point.phi])
      return [mapped.x, mapped.y, mapped.z] as const
    })
  }, [scenario, mapToSurface])

  const currentPosition = snapshot ? mapToSurface(snapshot.position) : null

  return (
    <>
      {comparisonPoints && (
        <Line
          points={comparisonPoints}
          color="#94a3b8"
          lineWidth={1.4}
          transparent
          opacity={0.5}
          dashed
          dashSize={0.22}
          gapSize={0.14}
        />
      )}

      {trajectory && (
        <Line
          points={trajectory.points}
          vertexColors={trajectory.colors}
          color="#ffffff"
          lineWidth={compact ? 1.8 : 2.4}
          transparent
          opacity={0.98}
          toneMapped={false}
        />
      )}

      {currentPosition && (
        <mesh position={[currentPosition.x, currentPosition.y, currentPosition.z]}>
          <sphereGeometry args={[compact ? 0.15 : 0.11, 24, 24]} />
          <meshBasicMaterial
            color={scenario.kind === "null" ? "#bfe9ff" : "#fce7ff"}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  )
}
