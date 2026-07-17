import { Line } from "@react-three/drei"
import { useMemo } from "react"
import type { RenderPosition } from "../../rendering/scene/coordinateMapping"
import type { Vector4 } from "../../physics/relativity/tensor"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"

/**
 * Ensemble de geodésicas companheiras (ex.: o anel de massas de teste do
 * cenário de onda gravitacional). Apenas desenho: cada ponto é a posição
 * ATUAL de uma geodésica integrada pelo runner; a polilinha fechada liga
 * o anel na ordem do cenário para evidenciar a deformação +/×.
 */
export function RingMarkers({
  snapshot,
  mapToSurface,
}: {
  snapshot: RelativitySnapshot | null
  mapToSurface: (position: Vector4) => RenderPosition
}) {
  const ring = useMemo(() => {
    if (!snapshot || snapshot.companionPositions.length < 3) {
      return null
    }
    const mapped = snapshot.companionPositions.map((position) => mapToSurface(position))
    const loop: [number, number, number][] = mapped.map((p) => [p.x, p.y + 0.04, p.z])
    loop.push(loop[0])
    return { mapped, loop }
  }, [snapshot, mapToSurface])

  if (!ring) {
    return null
  }

  return (
    <>
      <Line
        points={ring.loop}
        color="#22d3ee"
        lineWidth={1.6}
        transparent
        opacity={0.65}
        toneMapped={false}
      />
      {ring.mapped.map((position, index) => (
        <mesh key={index} position={[position.x, position.y + 0.04, position.z]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}
