import { Canvas, useFrame } from "@react-three/fiber"
import { Line, OrbitControls, Stars } from "@react-three/drei"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import { useEffect, useMemo, useRef } from "react"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { GeodesicSimulationRunner } from "../../simulation/simulationRunner"
import { createScenario } from "../../simulation/scenarios"
import { createEmbeddedSurfaceMapper } from "../../rendering/scene/coordinateMapping"
import { flammEmbeddingHeight } from "../../physics/relativity/embedding"
import {
  ISCO_RADIUS_RS,
  PHOTON_SPHERE_RADIUS_RS,
} from "../../physics/relativity/metrics/schwarzschild"
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

/** Cor base da malha longe da massa (azul profundo). */
const SURFACE_BASE_RGB = [0.08, 0.23, 0.72] as const
/** Cor da malha onde a dilatação temporal é extrema (violeta quente). */
const SURFACE_HOT_RGB = [0.86, 0.5, 1.0] as const

/**
 * Malha de arame do paraboloide de Flamm: anéis (r constante) + raios
 * (φ constante), com amostragem radial quadrática (mais densa perto do
 * horizonte, onde a curvatura se concentra).
 *
 * A COR de cada vértice codifica a dilatação temporal gravitacional
 * 1 − √f(r) (f = 1 − r_s/r): azul onde relógios correm normais, violeta
 * brilhante onde o tempo quase congela — um mapa de calor físico, não
 * decorativo.
 */
function buildFlammWireframe(schwarzschildRadiusM: number, renderScaleM: number): BufferGeometry {
  const rimRadiusM = SURFACE_RIM_UNITS * renderScaleM
  const rimHeightM = flammEmbeddingHeight(schwarzschildRadiusM, rimRadiusM)
  const innerRadiusM = Math.max(schwarzschildRadiusM * 1.0005, rimRadiusM * 1e-4)

  const radiusAt = (ringIndex: number) => {
    const t = ringIndex / SURFACE_RINGS
    return innerRadiusM + (rimRadiusM - innerRadiusM) * t * t
  }
  const heightAt = (radiusM: number) =>
    (flammEmbeddingHeight(schwarzschildRadiusM, radiusM) - rimHeightM) / renderScaleM

  // Dilatação temporal 1 − √f, realçada para leitura visual (γ 0,55).
  const dilationAt = (radiusM: number) => {
    if (schwarzschildRadiusM <= 0) {
      return 0
    }
    const lapse = Math.max(1 - schwarzschildRadiusM / radiusM, 0)
    return Math.min((1 - Math.sqrt(lapse)) ** 0.55 * 1.15, 1)
  }

  const positions: number[] = []
  const colors: number[] = []
  const pushVertex = (radiusM: number, phi: number) => {
    positions.push(
      (radiusM / renderScaleM) * Math.cos(phi),
      heightAt(radiusM),
      (radiusM / renderScaleM) * Math.sin(phi),
    )
    const mix = dilationAt(radiusM)
    const glow = 1 + mix * 1.6
    colors.push(
      (SURFACE_BASE_RGB[0] + (SURFACE_HOT_RGB[0] - SURFACE_BASE_RGB[0]) * mix) * glow,
      (SURFACE_BASE_RGB[1] + (SURFACE_HOT_RGB[1] - SURFACE_BASE_RGB[1]) * mix) * glow,
      (SURFACE_BASE_RGB[2] + (SURFACE_HOT_RGB[2] - SURFACE_BASE_RGB[2]) * mix) * glow,
    )
  }
  const pushSegment = (r1: number, phi1: number, r2: number, phi2: number) => {
    pushVertex(r1, phi1)
    pushVertex(r2, phi2)
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
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
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
  // A imersão de Flamm vale para Schwarzschild; em cartas onde não se aplica
  // (ex.: Kerr) a superfície honesta é o plano.
  const flammRsM = scenario.surface === "flat" ? 0 : rsM
  const horizonM = scenario.horizonRadiusM ?? rsM

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
  const surfaceGeometry = useMemo(() => buildFlammWireframe(flammRsM, scale), [flammRsM, scale])
  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry])
  const mapToSurface = useMemo(
    () =>
      createEmbeddedSurfaceMapper(
        scenario.metric.chart,
        scale,
        flammRsM,
        SURFACE_RIM_UNITS * scale,
      ),
    [scenario, scale, flammRsM],
  )

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
      // Cauda esmaece para o fundo; cabeça brilha (realçada pelo bloom).
      const t = (index / Math.max(count - 1, 1)) ** 1.6
      colors.push([
        tail[0] + (head[0] - tail[0]) * t,
        tail[1] + (head[1] - tail[1]) * t,
        tail[2] + (head[2] - tail[2]) * t,
      ])
    })

    return { points, colors }
  }, [snapshot, mapToSurface, scenario])

  const currentPosition = snapshot ? mapToSurface(snapshot.position) : null

  const horizonRadiusUnits = horizonM > 0 ? horizonM / scale : null
  const funnelDepthUnits =
    (0 - flammEmbeddingHeight(flammRsM, SURFACE_RIM_UNITS * scale)) / scale
  const ergosphereRadiusUnits = scenario.ergosphereEquatorRadiusM
    ? scenario.ergosphereEquatorRadiusM / scale
    : null

  // Anéis causais sobre a superfície: esfera de fótons (1,5 r_s) e ISCO (3 r_s).
  const buildSurfaceRing = (radiusM: number) => {
    const rimHeightM = flammEmbeddingHeight(flammRsM, SURFACE_RIM_UNITS * scale)
    const y = (flammEmbeddingHeight(flammRsM, radiusM) - rimHeightM) / scale
    const radiusUnits = radiusM / scale
    return Array.from({ length: 97 }, (_, i) => {
      const phi = (i / 96) * Math.PI * 2
      return [radiusUnits * Math.cos(phi), y, radiusUnits * Math.sin(phi)] as const
    })
  }

  const photonSpherePoints = useMemo(
    () => (flammRsM > 0 ? buildSurfaceRing(flammRsM * PHOTON_SPHERE_RADIUS_RS) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flammRsM, scale],
  )
  const iscoPoints = useMemo(
    () =>
      flammRsM > 0 && scenario.kind === "timelike"
        ? buildSurfaceRing(flammRsM * ISCO_RADIUS_RS)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flammRsM, scale, scenario.kind],
  )

  // Contraste newtoniano (elipse fechada) mapeado na mesma superfície.
  const comparisonPoints = useMemo(() => {
    if (!scenario.comparisonPath) {
      return null
    }
    return scenario.comparisonPath.points.map((point) => {
      const mapped = mapToSurface([0, point.r, Math.PI / 2, point.phi])
      return [mapped.x, mapped.y, mapped.z] as const
    })
  }, [scenario, mapToSurface])

  const ringsVisible = flammRsM > 0 && flammRsM / scale > 0.02

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[14, 18, 10]} intensity={120} decay={2} color="#dbeafe" />

      {/* Geometria espacial real: paraboloide de Flamm (plano se r_s = 0),
          colorido pela dilatação temporal gravitacional 1 − √f(r). */}
      <lineSegments geometry={surfaceGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} toneMapped={false} />
      </lineSegments>

      {/* Horizonte de eventos (r_s em Schwarzschild, r₊ em Kerr). */}
      {horizonRadiusUnits !== null && (
        <mesh position={[0, funnelDepthUnits, 0]}>
          <sphereGeometry args={[Math.max(horizonRadiusUnits, 0.04), 48, 48]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}

      {/* Ergosfera de Kerr (equador): entre r₊ e r_E ninguém fica parado. */}
      {ergosphereRadiusUnits !== null && horizonRadiusUnits !== null && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[horizonRadiusUnits, ergosphereRadiusUnits, 96]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.13} side={2} />
          </mesh>
          <Line
            points={Array.from({ length: 97 }, (_, i) => {
              const phi = (i / 96) * Math.PI * 2
              return [
                ergosphereRadiusUnits * Math.cos(phi),
                0.006,
                ergosphereRadiusUnits * Math.sin(phi),
              ] as const
            })}
            color="#fbbf24"
            lineWidth={1.6}
            transparent
            opacity={0.75}
            dashed
            dashSize={0.2}
            gapSize={0.12}
          />
        </>
      )}

      {/* Esfera de fótons r = 1,5 r_s: última órbita circular da luz. */}
      {photonSpherePoints && ringsVisible && (
        <Line points={photonSpherePoints} color="#fdba74" lineWidth={1.8} transparent opacity={0.8} />
      )}

      {/* ISCO r = 3 r_s: última órbita circular estável de partículas massivas. */}
      {iscoPoints && ringsVisible && (
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

      {/* Contraste newtoniano: a elipse FECHADA de Kepler sob os mesmos
          parâmetros — a diferença para a geodésica é a precessão da RG. */}
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

      {/* Trajetória integrada sobre a superfície: cauda esmaece, cabeça brilha. */}
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

      {/* Posição atual da partícula/fóton (o brilho vem do bloom). */}
      {currentPosition && (
        <mesh position={[currentPosition.x, currentPosition.y, currentPosition.z]}>
          <sphereGeometry args={[compact ? 0.15 : 0.11, 24, 24]} />
          <meshBasicMaterial
            color={scenario.kind === "null" ? "#bfe9ff" : "#fce7ff"}
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

      {/* Pós-processamento: bloom suave dá o brilho "premium" a fóton,
          trilha, esfera de fótons e à garganta violeta do funil. */}
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.32} luminanceSmoothing={0.55} />
      </EffectComposer>
    </>
  )
}

/** Legenda dos marcadores causais desenhados na cena. */
function SceneLegend() {
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const scenario = createScenario(activeScenarioId, experimentParams)

  const rsM = scenario.schwarzschildRadiusM ?? 0
  const isKerr = scenario.ergosphereEquatorRadiusM !== undefined
  const flammVisible =
    scenario.surface !== "flat" && rsM > 0 && rsM / scenario.renderScaleM > 0.02
  const isPhoton = scenario.kind === "null"

  if (!flammVisible && !isKerr && !scenario.comparisonPath) {
    return null
  }

  return (
    <div className="scene-legend" aria-hidden>
      {(flammVisible || isKerr) && (
        <span>
          <i className="legend-dot" style={{ background: "#0b0b0f", boxShadow: "0 0 0 1.5px #7c3aed" }} />
          {isKerr ? "horizonte r₊" : "horizonte r_s"}
        </span>
      )}
      {isKerr && (
        <span>
          <i className="legend-dot" style={{ background: "#fbbf24" }} />
          ergosfera (equador)
        </span>
      )}
      {flammVisible && (
        <span>
          <i className="legend-dot" style={{ background: "#fdba74" }} />
          esfera de fótons 1,5 r_s
        </span>
      )}
      {flammVisible && !isPhoton && (
        <span>
          <i className="legend-dot" style={{ background: "#22d3ee" }} />
          ISCO 3 r_s
        </span>
      )}
      {scenario.comparisonPath && (
        <span style={{ color: "#94a3b8" }}>
          <i className="legend-dash" />
          {scenario.comparisonPath.label}
        </span>
      )}
      <span>
        <i
          className="legend-dot"
          style={{ background: isPhoton ? "#7dd3fc" : "#f0abfc" }}
        />
        {isPhoton ? "geodésica nula (Einstein)" : "geodésica (Einstein)"}
      </span>
    </div>
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
      {!compact && <SceneLegend />}
    </section>
  )
}
