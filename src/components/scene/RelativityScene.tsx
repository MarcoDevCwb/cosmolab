import { Canvas, useFrame } from "@react-three/fiber"
import { Line, OrbitControls, Stars } from "@react-three/drei"
import { useMemo, useRef } from "react"
import { GeodesicSimulationRunner } from "../../simulation/simulationRunner"
import { createScenario } from "../../simulation/scenarios"
import { mapCoordinatesToRenderSpace } from "../../rendering/scene/coordinateMapping"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * Cena do laboratório relativístico.
 *
 * Este componente APENAS desenha: toda a física vem do
 * GeodesicSimulationRunner (simulation/), que integra as geodésicas e publica
 * snapshots. Aqui convertemos coordenadas físicas em posições de cena via
 * rendering/scene/coordinateMapping e renderizamos horizonte, esfera de
 * fótons, corpo central e trajetória.
 */

type RelativitySceneProps = {
  compact: boolean
}

const HUD_PUBLISH_INTERVAL_S = 0.12

function RelativityRig({ compact }: RelativitySceneProps) {
  const paused = useSimulationStore((state) => state.paused)
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const relativityResetNonce = useSimulationStore((state) => state.relativityResetNonce)
  const relativitySnapshot = useSimulationStore((state) => state.relativitySnapshot)
  const setRelativitySnapshot = useSimulationStore((state) => state.setRelativitySnapshot)

  const hudTickRef = useRef(0)

  // Runner recriado ao trocar de cenário ou a cada pedido de reinício.
  const runner = useMemo(() => {
    void relativityResetNonce
    return new GeodesicSimulationRunner(createScenario(activeScenarioId))
  }, [activeScenarioId, relativityResetNonce])

  const scenario = runner.scenario
  const scale = scenario.renderScaleM

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

  const trajectoryPoints = useMemo(() => {
    if (!snapshot || snapshot.samples.length < 2) {
      return null
    }

    return snapshot.samples.map((sample) => {
      const mapped = mapCoordinatesToRenderSpace(sample.position, scenario.metric.chart, scale)
      return [mapped.x, mapped.y, mapped.z] as const
    })
  }, [snapshot, scenario, scale])

  const currentPosition = snapshot
    ? mapCoordinatesToRenderSpace(snapshot.position, scenario.metric.chart, scale)
    : null

  const horizonRadius = scenario.schwarzschildRadiusM
    ? scenario.schwarzschildRadiusM / scale
    : null
  const centralBodyRadius = scenario.centralBodyRadiusM ? scenario.centralBodyRadiusM / scale : null

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[14, 18, 10]} intensity={120} decay={2} color="#dbeafe" />

      {/* Corpo central com raio físico (ex.: Sol na deflexão da luz). */}
      {centralBodyRadius !== null && (
        <mesh>
          <sphereGeometry args={[centralBodyRadius, 48, 48]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Horizonte de eventos r = r_s (apenas geometrias de buraco negro). */}
      {horizonRadius !== null && centralBodyRadius === null && (
        <>
          <mesh>
            <sphereGeometry args={[horizonRadius, 48, 48]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh>
            <sphereGeometry args={[horizonRadius * 1.02, 48, 48]} />
            <meshBasicMaterial color="#7c3aed" transparent opacity={0.22} wireframe />
          </mesh>
          {/* Esfera de fótons r = 1,5 r_s: última órbita circular da luz. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[horizonRadius * 1.5 * 0.998, horizonRadius * 1.5 * 1.002, 128]} />
            <meshBasicMaterial color="#fb923c" transparent opacity={0.55} />
          </mesh>
        </>
      )}

      {/* Trajetória integrada (janela deslizante de amostras do runner). */}
      {trajectoryPoints && (
        <Line
          points={trajectoryPoints}
          color={scenario.kind === "null" ? "#7dd3fc" : "#f0abfc"}
          lineWidth={compact ? 1.4 : 2}
          transparent
          opacity={0.9}
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

      <gridHelper args={[80, 40, "#0f2740", "#0b1d33"]} position={[0, -0.01, 0]} />

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
