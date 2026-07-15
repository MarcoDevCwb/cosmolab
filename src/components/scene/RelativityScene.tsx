import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Stars } from "@react-three/drei"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import { useMemo, useRef } from "react"
import { createEmbeddedSurfaceMapper } from "../../rendering/scene/coordinateMapping"
import { SURFACE_RIM_UNITS } from "../../rendering/scene/flammGeometry"
import { GeodesicSimulationRunner } from "../../simulation/simulationRunner"
import { createScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"
import { CausalMarkers } from "./CausalMarkers"
import { FlammSurface } from "./FlammSurface"
import { FrameDraggingField } from "./FrameDraggingField"
import { SceneLegend } from "./SceneLegend"
import { TrajectoryRenderer } from "./TrajectoryRenderer"

/**
 * Orquestrador da cena do laboratório relativístico.
 *
 * Responsabilidades: manter o runner (física), publicar snapshots/FPS na
 * store e COMPOR os renderizadores especializados. Nenhuma equação física
 * e nenhuma construção de geometria acontecem aqui.
 */

type RelativitySceneProps = {
  compact: boolean
}

const HUD_PUBLISH_INTERVAL_S = 0.12

function RelativityRig({ compact }: RelativitySceneProps) {
  const paused = useSimulationStore((state) => state.paused)
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const relativityResetNonce = useSimulationStore((state) => state.relativityResetNonce)
  const relativitySnapshot = useSimulationStore((state) => state.relativitySnapshot)
  const setRelativitySnapshot = useSimulationStore((state) => state.setRelativitySnapshot)
  const setRenderFps = useSimulationStore((state) => state.setRenderFps)

  const hudTickRef = useRef(0)
  const fpsRef = useRef(60)

  // Runner recriado ao trocar cenário, mover sliders ou pedir reinício.
  const runner = useMemo(() => {
    void relativityResetNonce
    return new GeodesicSimulationRunner(createScenario(activeScenarioId, experimentParams))
  }, [activeScenarioId, experimentParams, relativityResetNonce])

  const scenario = runner.scenario
  const flammRsM =
    scenario.surface === "flat" ? 0 : (scenario.schwarzschildRadiusM ?? 0)

  useFrame((_, delta) => {
    if (!paused) {
      // Teto no passo de tempo: se o quadro atrasar, a reprodução desacelera
      // em vez de aumentar o trabalho por quadro (evita espiral de queda de FPS
      // em métricas com Christoffels numéricos).
      runner.advanceBySeconds(Math.min(delta, 0.05))
    }

    fpsRef.current = fpsRef.current * 0.9 + (1 / Math.max(delta, 1e-4)) * 0.1
    hudTickRef.current += delta
    if (hudTickRef.current >= HUD_PUBLISH_INTERVAL_S) {
      setRelativitySnapshot(runner.snapshot())
      setRenderFps(Math.round(fpsRef.current))
      hudTickRef.current = 0
    }
  })

  const snapshot =
    relativitySnapshot?.scenarioId === scenario.id ? relativitySnapshot : null

  const mapToSurface = useMemo(
    () =>
      createEmbeddedSurfaceMapper(
        scenario.metric.chart,
        scenario.renderScaleM,
        flammRsM,
        SURFACE_RIM_UNITS * scenario.renderScaleM,
      ),
    [scenario, flammRsM],
  )

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[14, 18, 10]} intensity={120} decay={2} color="#dbeafe" />

      <FlammSurface schwarzschildRadiusM={flammRsM} renderScaleM={scenario.renderScaleM} />
      <CausalMarkers scenario={scenario} />
      <FrameDraggingField scenario={scenario} />
      <TrajectoryRenderer
        scenario={scenario}
        snapshot={snapshot}
        mapToSurface={mapToSurface}
        compact={compact}
      />

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

      <EffectComposer>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.32} luminanceSmoothing={0.55} />
      </EffectComposer>
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
      {!compact && <SceneLegend />}
    </section>
  )
}
