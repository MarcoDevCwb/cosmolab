import type { RenderPosition } from "../../rendering/scene/coordinateMapping"
import type { Vector4 } from "../../physics/relativity/tensor"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import type { SimulationScenario } from "../../simulation/scenarios"

/**
 * Galáxias comóveis do fluxo de Hubble: posições comóveis FIXAS, desenhadas
 * via o mapeador do cenário (que converte para distância própria no tempo
 * ATUAL do snapshot) — por isso elas recuam visivelmente na tela enquanto
 * a simulação avança. Nenhum cálculo aqui além de montar a 4-posição.
 */
export function GalaxyMarkers({
  scenario,
  snapshot,
  mapToSurface,
}: {
  scenario: SimulationScenario
  snapshot: RelativitySnapshot | null
  mapToSurface: (position: Vector4) => RenderPosition
}) {
  if (!scenario.comovingMarkers || !snapshot) {
    return null
  }

  const nowCt = snapshot.position[0]

  return (
    <>
      {scenario.comovingMarkers.map((marker, index) => {
        const mapped = mapToSurface([nowCt, marker.xM, marker.yM, 0])
        const isUs = marker.label === "nós"
        return (
          <mesh key={index} position={[mapped.x, 0.05, mapped.z]}>
            <sphereGeometry args={[isUs ? 0.22 : 0.16, 20, 20]} />
            <meshBasicMaterial
              color={isUs ? "#7dd3fc" : "#fde68a"}
              toneMapped={false}
              transparent
              opacity={isUs ? 1 : 0.85}
            />
          </mesh>
        )
      })}
    </>
  )
}
