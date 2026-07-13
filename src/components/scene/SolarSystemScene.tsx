import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Sparkles, Stars } from "@react-three/drei"
import { useMemo, useRef } from "react"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { Color, Vector3 } from "three"
import { CELESTIAL_BODIES } from "../../data/celestialBodies"
import { useSimulationStore } from "../../store/useSimulationStore"
import type { CelestialBodyId, CelestialBodySnapshot } from "../../types/celestial"
import { CelestialBody } from "./CelestialBody"
import { OrbitPath } from "./OrbitPath"

const ORIGIN = new Vector3(0, 0, 0)

type SolarSystemSceneProps = {
  compact: boolean
}

function SolarSystemRig({ compact }: SolarSystemSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const bodyPositionsRef = useRef<Record<CelestialBodyId, Vector3>>({
    sun: new Vector3(),
    earth: new Vector3(),
    moon: new Vector3(),
    mars: new Vector3(),
  })
  const bodySnapshotsRef = useRef<Record<CelestialBodyId, CelestialBodySnapshot>>({
    sun: { distanceKm: 0, orbitalSpeedKmPerSecond: 0 },
    earth: { distanceKm: 0, orbitalSpeedKmPerSecond: 0 },
    moon: { distanceKm: 0, orbitalSpeedKmPerSecond: 0 },
    mars: { distanceKm: 0, orbitalSpeedKmPerSecond: 0 },
  })
  const simulationDaysRef = useRef(0)
  const hudTickRef = useRef(0)

  const paused = useSimulationStore((state) => state.paused)
  const selectedBodyId = useSimulationStore((state) => state.selectedBodyId)
  const showOrbits = useSimulationStore((state) => state.showOrbits)
  const showVectors = useSimulationStore((state) => state.showVectors)
  const timeScale = useSimulationStore((state) => state.timeScale)
  const setSelectedBodyId = useSimulationStore((state) => state.setSelectedBodyId)
  const setSimulationDays = useSimulationStore((state) => state.setSimulationDays)
  const setBodySnapshots = useSimulationStore((state) => state.setBodySnapshots)

  const orbitalBodies = useMemo(
    () => CELESTIAL_BODIES.filter((body) => body.orbitRadius > 0 && !body.parentId),
    [],
  )

  const getSimulationDays = () => simulationDaysRef.current

  const getBodyPosition = (bodyId: CelestialBodyId) => bodyPositionsRef.current[bodyId] ?? ORIGIN

  const handlePositionChange = (bodyId: CelestialBodyId, position: Vector3) => {
    bodyPositionsRef.current[bodyId] = position.clone()
  }

  const handleSnapshotChange = (bodyId: CelestialBodyId, snapshot: CelestialBodySnapshot) => {
    bodySnapshotsRef.current[bodyId] = snapshot
  }

  useFrame((_, delta) => {
    if (!paused) {
      simulationDaysRef.current += delta * timeScale
    }

    hudTickRef.current += delta
    if (hudTickRef.current >= 0.08) {
      setSimulationDays(simulationDaysRef.current)
      setBodySnapshots({ ...bodySnapshotsRef.current })
      hudTickRef.current = 0
    }

    const focusedPosition = bodyPositionsRef.current[selectedBodyId] ?? ORIGIN
    if (controlsRef.current) {
      const damping = 1 - Math.exp(-delta * 2.8)
      controlsRef.current.target.lerp(focusedPosition, damping)
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
          <OrbitPath key={`${body.id}-orbit`} body={body} compact={compact} />
        ))}

      {CELESTIAL_BODIES.map((body) => (
        <CelestialBody
          key={body.id}
          body={body}
          compact={compact}
          getSimulationDays={getSimulationDays}
          getParentPosition={getBodyPosition}
          onPositionChange={handlePositionChange}
          onSnapshotChange={handleSnapshotChange}
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
