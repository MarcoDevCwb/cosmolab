import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Sparkles, Stars } from "@react-three/drei"
import { useEffect, useMemo, useRef } from "react"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { Color, Vector3 } from "three"
import { CELESTIAL_BODIES } from "../../data/celestialBodies"
import {
  advanceJulianDate,
  buildScientificSnapshot,
  sampleSceneState,
} from "../../engine/simulation/scientificCore"
import { useSimulationStore } from "../../store/useSimulationStore"
import type { CelestialBodyId } from "../../types/celestial"
import type { BodySceneState } from "../../types/simulation"
import { CelestialBody } from "./CelestialBody"
import { OrbitPath } from "./OrbitPath"

const TARGET_VECTOR = new Vector3()

const EMPTY_SCENE_STATE: BodySceneState = {
  id: "sun",
  positionKm: { x: 0, y: 0, z: 0 },
  velocityKmPerSecond: { x: 0, y: 0, z: 0 },
  accelerationKmPerSecond2: { x: 0, y: 0, z: 0 },
  renderPosition: { x: 0, y: 0, z: 0 },
  renderVelocityDirection: { x: 0, y: 0, z: 0 },
  siderealAngleRad: 0,
  sunDirection: { x: 0, y: 0, z: 0 },
}

type SolarSystemSceneProps = {
  compact: boolean
}

function SolarSystemRig({ compact }: SolarSystemSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const currentJulianDateRef = useRef(useSimulationStore.getState().currentJulianDate)
  const sceneStateRef = useRef(
    sampleSceneState(
      useSimulationStore.getState().currentJulianDate,
      useSimulationStore.getState().referenceFrame,
    ),
  )
  const hudTickRef = useRef(0)

  const paused = useSimulationStore((state) => state.paused)
  const selectedBodyId = useSimulationStore((state) => state.selectedBodyId)
  const showOrbits = useSimulationStore((state) => state.showOrbits)
  const showVectors = useSimulationStore((state) => state.showVectors)
  const timeScale = useSimulationStore((state) => state.timeScale)
  const currentJulianDate = useSimulationStore((state) => state.currentJulianDate)
  const referenceFrame = useSimulationStore((state) => state.referenceFrame)
  const simulationMode = useSimulationStore((state) => state.simulationMode)
  const snapshot = useSimulationStore((state) => state.snapshot)
  const setSelectedBodyId = useSimulationStore((state) => state.setSelectedBodyId)
  const setClockState = useSimulationStore((state) => state.setClockState)
  const setSnapshot = useSimulationStore((state) => state.setSnapshot)

  const orbitalBodies = useMemo(() => CELESTIAL_BODIES.filter((body) => body.id !== "sun"), [])

  useEffect(() => {
    currentJulianDateRef.current = currentJulianDate
    sceneStateRef.current = sampleSceneState(currentJulianDate, referenceFrame)
  }, [currentJulianDate, referenceFrame])

  useEffect(() => {
    const nextSnapshot = buildScientificSnapshot(
      currentJulianDateRef.current,
      referenceFrame,
      simulationMode,
    )
    setSnapshot(nextSnapshot)
  }, [referenceFrame, setSnapshot, simulationMode])

  const getBodyState = (bodyId: CelestialBodyId) => sceneStateRef.current[bodyId] ?? EMPTY_SCENE_STATE

  useFrame((_, delta) => {
    if (!paused) {
      currentJulianDateRef.current = advanceJulianDate(currentJulianDateRef.current, delta, timeScale)
    }

    sceneStateRef.current = sampleSceneState(currentJulianDateRef.current, referenceFrame)

    hudTickRef.current += delta
    if (hudTickRef.current >= 0.12) {
      const nextSnapshot = buildScientificSnapshot(
        currentJulianDateRef.current,
        referenceFrame,
        simulationMode,
      )
      setClockState(nextSnapshot.currentUnixMs, nextSnapshot.currentJulianDate)
      setSnapshot(nextSnapshot)
      hudTickRef.current = 0
    }

    const focusedPosition = getBodyState(selectedBodyId).renderPosition
    if (controlsRef.current) {
      const damping = 1 - Math.exp(-delta * 2.8)
      TARGET_VECTOR.set(focusedPosition.x, focusedPosition.y, focusedPosition.z)
      controlsRef.current.target.lerp(TARGET_VECTOR, damping)
      controlsRef.current.update()
    }
  })

  return (
    <>
      <color attach="background" args={["#020617"]} />

      <fog attach="fog" args={["#020617", 55, 150]} />

      <ambientLight intensity={0.16} />

      <hemisphereLight
        intensity={0.26}
        color={new Color("#a5f3fc")}
        groundColor={new Color("#020617")}
      />

      <directionalLight position={[18, 16, 8]} intensity={0.25} color="#dbeafe" />

      <pointLight
        position={[0, 0, 0]}
        intensity={260}
        decay={2}
        distance={180}
        color="#ffe29a"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.35, 0]}>
        <ringGeometry args={[8, 42, 120]} />
        <meshBasicMaterial color="#0f2740" transparent opacity={0.14} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.15, 0]}>
        <ringGeometry args={[3.4, 25, 120]} />
        <meshBasicMaterial color="#0b1d33" transparent opacity={0.18} />
      </mesh>

      {showOrbits &&
        orbitalBodies.map((body) => (
          <OrbitPath
            key={`${body.id}-orbit`}
            body={body}
            compact={compact}
            trajectory={snapshot?.bodyStates[body.id].trajectoryFuture ?? []}
          />
        ))}

      {CELESTIAL_BODIES.map((body) => (
        <CelestialBody
          key={body.id}
          body={body}
          compact={compact}
          getBodyState={getBodyState}
          trajectoryPast={snapshot?.bodyStates[body.id].trajectoryPast ?? []}
          trajectoryFuture={snapshot?.bodyStates[body.id].trajectoryFuture ?? []}
          onSelect={setSelectedBodyId}
          selected={selectedBodyId === body.id}
          showVector={showVectors && (!compact || selectedBodyId === body.id)}
        />
      ))}

      <Sparkles
        count={compact ? 44 : 90}
        scale={compact ? [70, 16, 70] : [96, 24, 96]}
        size={compact ? 2.1 : 2.8}
        speed={0.12}
        opacity={0.22}
        color="#7dd3fc"
      />

      <Stars
        radius={compact ? 150 : 180}
        depth={compact ? 72 : 90}
        count={compact ? 2200 : 4200}
        factor={compact ? 4.5 : 5.8}
        saturation={0}
        fade
        speed={compact ? 0.22 : 0.34}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.07}
        minDistance={compact ? 4.8 : 6}
        maxDistance={compact ? 52 : 78}
        minPolarAngle={0.14}
        maxPolarAngle={Math.PI / 1.88}
      />
    </>
  )
}

export function SolarSystemScene({ compact }: SolarSystemSceneProps) {
  return (
    <section className="cosmos-stage" aria-label="Cena 3D do sistema solar">
      <Canvas
        shadows={!compact}
        dpr={compact ? [1, 1.45] : [1, 2]}
        camera={{ position: compact ? [0, 10, 20] : [0, 12, 30], fov: compact ? 50 : 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: compact ? "default" : "high-performance" }}
      >
        <SolarSystemRig compact={compact} />
      </Canvas>
    </section>
  )
}
