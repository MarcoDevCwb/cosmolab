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
        // Marcadores com linha-mundo (ex.: fóton de corrida) são avaliados
        // no tempo do snapshot; os demais são posições fixas.
        const [xM, yM] = marker.worldline ? marker.worldline(nowCt) : [marker.xM, marker.yM]
        const mapped = mapToSurface([nowCt, xM, yM, 0])
        const isUs = marker.label === "nós"
        const isPhoton = marker.label === "fóton"
        return (
          <mesh key={index} position={[mapped.x, 0.05, mapped.z]}>
            <sphereGeometry args={[isUs ? 0.22 : isPhoton ? 0.13 : 0.16, 20, 20]} />
            <meshBasicMaterial
              color={isUs ? "#7dd3fc" : isPhoton ? "#f8fafc" : "#fde68a"}
              toneMapped={false}
              transparent
              opacity={isUs || isPhoton ? 1 : 0.85}
            />
          </mesh>
        )
      })}
    </>
  )
}
