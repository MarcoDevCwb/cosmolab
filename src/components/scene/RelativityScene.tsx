import { Canvas, useFrame } from "@react-three/fiber"
import { Line, OrbitControls, Stars } from "@react-three/drei"
import { useEffect, useMemo, useRef } from "react"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { GeodesicSimulationRunner } from "../../simulation/simulationRunner"
import { createScenario } from "../../simulation/scenarios"
import { createEmbeddedSurfaceMapper } from "../../rendering/scene/coordinateMapping"
import { flammEmbeddingHeight } from "../../physics/relativity/embedding"
import { PHOTON_SPHERE_RADIUS_RS } from "../../physics/relativity/metrics/schwarzschild"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * Cena do laboratório relativístico.
 *
 * Este componente APENAS desenha: toda a física vem do
 * GeodesicSimulationRunner (simulation/) e a forma da malha vem do
 * paraboloide de Flamm (physics/relativity/embedding.ts) — a geometria
 * espacial exata de Schwarzschild, não uma metáfora visual. Alterar a massa
 * ou o raio nos sliders muda a curvatura da malha em tempo real.
 */

type RelativitySceneProps = {
  compact: boolean
}

const HUD_PUBLISH_INTERVAL_S = 0.12
/** Raio da malha de imersão, em unidades de cena. */
const SURFACE_RIM_UNITS = 11
const SURFACE_RINGS = 44
const SURFACE_SPOKES = 72

/**
 * Malha de arame do paraboloide de Flamm: anéis (r constante) + raios
 * (φ constante), com amostragem radial quadrática (mais densa perto do
 * horizonte, onde a curvatura se concentra).
 */
function buildFlammWireframe(schwarzschildRadiusM: number, renderScaleM: number): BufferGeometry {
  const rimRadiusM = SURFACE_RIM_UNITS * renderScaleM
  const rimHeightM = flammEmbeddingHeight(schwarzschildRadiusM, rimRadiusM)
  const innerRadiusM = Math.max(schwarzschildRadiusM, rimRadiusM * 1e-4)

  const radiusAt = (ringIndex: number) => {
    const t = ringIndex / SURFACE_RINGS
    return innerRadiusM + (rimRadiusM - innerRadiusM) * t * t
  }
  const heightAt = (radiusM: number) =>
    (flammEmbeddingHeight(schwarzschildRadiusM, radiusM) - rimHeightM) / renderScaleM

  const positions: number[] = []
  const pushSegment = (
    r1: number,
    phi1: number,
    r2: number,
    phi2: number,
  ) => {
    positions.push(
      (r1 / renderScaleM) * Math.cos(phi1),
      heightAt(r1),
      (r1 / renderScaleM) * Math.sin(phi1),
      (r2 / renderScaleM) * Math.cos(phi2),
      heightAt(r2),
      (r2 / renderScaleM) * Math.sin(phi2),
    )
  }

  for (let ring = 0; ring <= SURFACE_RINGS; ring += 1) {
    const r = radiusAt(ring)
    for (let spoke = 0; spoke < SURFACE_SPOKES; spoke += 1) {
      const phi1 = (spoke / SURFACE_SPOKES) * Math.PI * 2
      const phi2 = ((spoke + 1) / SURFACE_SPOKES) * Math.PI * 2
      pushSegment(r, phi1, r, phi2)
    }
  }

  for (let spoke = 0; spoke < SURFACE_SPOKES; spoke += 2) {
    const phi = (spoke / SURFACE_SPOKES) * Math.PI * 2
    for (let ring = 0; ring < SURFACE_RINGS; ring += 1) {
      pushSegment(radiusAt(ring), phi, radiusAt(ring + 1), phi)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  return geometry
}

function RelativityRig({ compact }: RelativitySceneProps) {
  const paused = useSimulationStore((state) => state.paused)
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const relativityResetNonce = useSimulationStore((state) => state.relativityResetNonce)
  const relativitySnapshot = useSimulationStore((state) => state.relativitySnapshot)
  const setRelativitySnapshot = useSimulationStore((state) => state.setRelativitySnapshot)

  const hudTickRef = useRef(0)

  // Runner recriado ao trocar cenário, mover sliders ou pedir reinício.
  const runner = useMemo(() => {
    void relativityResetNonce
    return new GeodesicSimulationRunner(createScenario(activeScenarioId, experimentParams))
  }, [activeScenarioId, experimentParams, relativityResetNonce])

  const scenario = runner.scenario
  const scale = scenario.renderScaleM
  const rsM = scenario.schwarzschildRadiusM ?? 0

  useFrame((_, delta) => {
    if (!paused) {
      runner.advanceBySeconds(delta)
    }

    hudTickRef.current += delta
    if (hudTickRef.current >= HUD_PUBLISH_INTERVAL_S) {
      setRelativitySnapshot(runner.snapshot())
      hudTickRef.current = 0
    }
  })

  const snapshot = relativitySnapshot?.scenarioId === scenario.id ? relativitySnapshot : null

  // Superfície de Flamm e mapeador de trajetória compartilham a mesma borda.
  const surfaceGeometry = useMemo(() => buildFlammWireframe(rsM, scale), [rsM, scale])
  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry])
  const mapToSurface = useMemo(
    () =>
      createEmbeddedSurfaceMapper(
        scenario.metric.chart,
        scale,
        rsM,
        SURFACE_RIM_UNITS * scale,
      ),
    [scenario, scale, rsM],
  )

  const trajectoryPoints = useMemo(() => {
    if (!snapshot || snapshot.samples.length < 2) {
      return null
    }

    return snapshot.samples.map((sample) => {
      const mapped = mapToSurface(sample.position)
      return [mapped.x, mapped.y, mapped.z] as const
    })
  }, [snapshot, mapToSurface])

  const currentPosition = snapshot ? mapToSurface(snapshot.position) : null

  const horizonRadiusUnits = rsM > 0 ? rsM / scale : null
  const funnelDepthUnits =
    (0 - flammEmbeddingHeight(rsM, SURFACE_RIM_UNITS * scale)) / scale

  // Esfera de fótons desenhada sobre a superfície (r = 1,5 r_s).
  const photonSphereRadiusM = rsM * PHOTON_SPHERE_RADIUS_RS
  const photonSpherePoints = useMemo(() => {
    if (rsM <= 0) {
      return null
    }

    const rimHeightM = flammEmbeddingHeight(rsM, SURFACE_RIM_UNITS * scale)
    const y = (flammEmbeddingHeight(rsM, photonSphereRadiusM) - rimHeightM) / scale
    const radiusUnits = photonSphereRadiusM / scale
    return Array.from({ length: 97 }, (_, i) => {
      const phi = (i / 96) * Math.PI * 2
      return [radiusUnits * Math.cos(phi), y, radiusUnits * Math.sin(phi)] as const
    })
  }, [rsM, scale, photonSphereRadiusM])

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[14, 18, 10]} intensity={120} decay={2} color="#dbeafe" />

      {/* Geometria espacial real: paraboloide de Flamm (plano se r_s = 0). */}
      <lineSegments geometry={surfaceGeometry}>
        <lineBasicMaterial color="#1d4ed8" transparent opacity={0.34} />
      </lineSegments>

      {/* Horizonte de eventos r = r_s no fundo do funil. */}
      {horizonRadiusUnits !== null && (
        <mesh position={[0, funnelDepthUnits, 0]}>
          <sphereGeometry args={[Math.max(horizonRadiusUnits, 0.04), 48, 48]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}

      {/* Esfera de fótons r = 1,5 r_s: última órbita circular da luz. */}
      {photonSpherePoints && horizonRadiusUnits !== null && horizonRadiusUnits > 0.02 && (
        <Line points={photonSpherePoints} color="#fb923c" lineWidth={1.4} transparent opacity={0.6} />
      )}

      {/* Trajetória integrada, desenhada sobre a superfície de imersão. */}
      {trajectoryPoints && (
        <Line
          points={trajectoryPoints}
          color={scenario.kind === "null" ? "#7dd3fc" : "#f0abfc"}
          lineWidth={compact ? 1.6 : 2.2}
          transparent
          opacity={0.95}
        />
      )}

      {/* Posição atual da partícula/fóton. */}
      {currentPosition && (
        <mesh position={[currentPosition.x, currentPosition.y, currentPosition.z]}>
          <sphereGeometry args={[compact ? 0.16 : 0.12, 24, 24]} />
          <meshBasicMaterial
            color={scenario.kind === "null" ? "#e0f2fe" : "#fdf4ff"}
            toneMapped={false}
          />
        </mesh>
      )}

      <Stars
        radius={compact ? 140 : 170}
        depth={compact ? 60 : 80}
        count={compact ? 1800 : 3600}
        factor={compact ? 4 : 5.2}
        saturation={0}
        fade
        speed={0.2}
      />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.07}
        minDistance={1.5}
        maxDistance={140}
      />
    </>
  )
}

export function RelativityScene({ compact }: RelativitySceneProps) {
  return (
    <section className="cosmos-stage" aria-label="Cena 3D do laboratório relativístico">
      <Canvas
        dpr={compact ? [1, 1.45] : [1, 2]}
        camera={{ position: compact ? [0, 14, 22] : [0, 16, 28], fov: compact ? 50 : 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: compact ? "default" : "high-performance" }}
      >
        <RelativityRig compact={compact} />
      </Canvas>
    </section>
  )
}
