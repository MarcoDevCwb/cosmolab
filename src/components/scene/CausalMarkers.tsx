import { Line } from "@react-three/drei"
import { useMemo } from "react"
import { flammEmbeddingHeight } from "../../physics/relativity/embedding"
import {
  ISCO_RADIUS_RS,
  PHOTON_SPHERE_RADIUS_RS,
} from "../../physics/relativity/metrics/schwarzschild"
import {
  SURFACE_RIM_UNITS,
  buildSurfaceRingPoints,
} from "../../rendering/scene/flammGeometry"
import type { SimulationScenario } from "../../simulation/scenarios"

/**
 * Marcadores causais da geometria ativa: horizonte, esfera de fótons,
 * ISCO e ergosfera. Os raios característicos vêm de physics/ — este
 * componente apenas posiciona anéis e esferas.
 */
export function CausalMarkers({ scenario }: { scenario: SimulationScenario }) {
  const scale = scenario.renderScaleM
  const rsM = scenario.schwarzschildRadiusM ?? 0
  const flammRsM = scenario.surface === "flat" ? 0 : rsM
  const horizonM = scenario.horizonRadiusM ?? rsM

  const horizonRadiusUnits = horizonM > 0 ? horizonM / scale : null
  const funnelDepthUnits =
    (0 - flammEmbeddingHeight(flammRsM, SURFACE_RIM_UNITS * scale)) / scale
  const ergosphereRadiusUnits = scenario.ergosphereEquatorRadiusM
    ? scenario.ergosphereEquatorRadiusM / scale
    : null
  const ringsVisible = flammRsM > 0 && flammRsM / scale > 0.02

  const photonSpherePoints = useMemo(
    () =>
      ringsVisible
        ? buildSurfaceRingPoints(flammRsM, scale, flammRsM * PHOTON_SPHERE_RADIUS_RS)
        : null,
    [ringsVisible, flammRsM, scale],
  )
  const iscoPoints = useMemo(
    () =>
      ringsVisible && scenario.kind === "timelike"
        ? buildSurfaceRingPoints(flammRsM, scale, flammRsM * ISCO_RADIUS_RS)
        : null,
    [ringsVisible, flammRsM, scale, scenario.kind],
  )
  const ergospherePoints = useMemo(
    () =>
      ergosphereRadiusUnits !== null
        ? buildSurfaceRingPoints(0, scale, ergosphereRadiusUnits * scale)
        : null,
    [ergosphereRadiusUnits, scale],
  )

  return (
    <>
      {/* Horizonte de eventos (r_s em Schwarzschild, r₊ em Kerr). */}
      {horizonRadiusUnits !== null && (
        <>
          <mesh position={[0, funnelDepthUnits, 0]}>
            <sphereGeometry args={[Math.max(horizonRadiusUnits, 0.04), 48, 48]} />
            <meshBasicMaterial
              color="#000000"
              transparent={(scenario.horizonOpacity ?? 1) < 1}
              opacity={scenario.horizonOpacity ?? 1}
            />
          </mesh>
          {(scenario.horizonOpacity ?? 1) < 1 && (
            <mesh position={[0, funnelDepthUnits, 0]}>
              <sphereGeometry args={[Math.max(horizonRadiusUnits, 0.04) * 1.001, 32, 32]} />
              <meshBasicMaterial color="#7c3aed" transparent opacity={0.3} wireframe />
            </mesh>
          )}
        </>
      )}

      {/* Ergosfera de Kerr (equador): entre r₊ e r_E ninguém fica parado. */}
      {ergosphereRadiusUnits !== null && horizonRadiusUnits !== null && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[horizonRadiusUnits, ergosphereRadiusUnits, 96]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.13} side={2} />
          </mesh>
          {ergospherePoints && (
            <Line
              points={ergospherePoints.map(([x, , z]) => [x, 0.006, z] as const)}
              color="#fbbf24"
              lineWidth={1.6}
              transparent
              opacity={0.75}
              dashed
              dashSize={0.2}
              gapSize={0.12}
            />
          )}
        </>
      )}

      {/* Esfera de fótons r = 1,5 r_s: última órbita circular da luz. */}
      {photonSpherePoints && (
        <Line points={photonSpherePoints} color="#fdba74" lineWidth={1.8} transparent opacity={0.8} />
      )}

      {/* ISCO r = 3 r_s: última órbita circular estável de partículas massivas. */}
      {iscoPoints && (
        <Line
          points={iscoPoints}
          color="#22d3ee"
          lineWidth={1.5}
          transparent
          opacity={0.55}
          dashed
          dashSize={0.18}
          gapSize={0.12}
        />
      )}
    </>
  )
}
