import { Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import {
  AdditiveBlending,
  ArrowHelper,
  BackSide,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three"
import { getOrbitalState } from "../../physics/orbits"
import type {
  CelestialBodyDefinition,
  CelestialBodyId,
  CelestialBodySnapshot,
} from "../../types/celestial"
import { createBodyTextures } from "./proceduralTextures"

type CelestialBodyProps = {
  body: CelestialBodyDefinition
  compact: boolean
  getSimulationDays: () => number
  getParentPosition: (bodyId: CelestialBodyId) => Vector3
  onPositionChange: (bodyId: CelestialBodyId, position: Vector3) => void
  onSnapshotChange: (bodyId: CelestialBodyId, snapshot: CelestialBodySnapshot) => void
  onSelect: (bodyId: CelestialBodyId) => void
  selected: boolean
  showVector: boolean
}

const ORIGIN = new Vector3()

export function CelestialBody({
  body,
  compact,
  getSimulationDays,
  getParentPosition,
  onPositionChange,
  onSnapshotChange,
  onSelect,
  selected,
  showVector,
}: CelestialBodyProps) {
  const groupRef = useRef<Group | null>(null)
  const spinRef = useRef<Group | null>(null)
  const glowRef = useRef<Mesh | null>(null)
  const cloudRef = useRef<Mesh | null>(null)
  const arrowRef = useRef<ArrowHelper | null>(null)
  const materialRef = useRef<MeshStandardMaterial | null>(null)

  const arrowLength = useMemo(
    () => Math.max(body.radius * (compact ? 2.7 : 3.4), compact ? 1.1 : 1.65),
    [body.radius, compact],
  )
  const sphereSegments = compact ? 40 : 64
  const glowSegments = compact ? 28 : 48
  const textures = useMemo(() => createBodyTextures(body.id), [body.id])

  useEffect(() => {
    return () => {
      textures.surface.dispose()
      textures.clouds?.dispose()
    }
  }, [textures])

  useFrame((state) => {
    const simulationDays = getSimulationDays()
    const orbitalState = getOrbitalState(body, simulationDays)
    const parentPosition = body.parentId ? getParentPosition(body.parentId) : ORIGIN
    const worldPosition = orbitalState.localPosition.clone().add(parentPosition)

    if (groupRef.current) {
      groupRef.current.position.copy(worldPosition)
    }

    if (spinRef.current) {
      spinRef.current.rotation.z = MathUtils.degToRad(body.axialTiltDegrees)
      spinRef.current.rotation.y = (simulationDays / body.rotationPeriodDays) * Math.PI * 2
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y = (simulationDays / Math.max(body.rotationPeriodDays * 1.18, 0.4)) * Math.PI * 2
    }

    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4 + body.radius) * 0.06
      glowRef.current.scale.setScalar(selected ? pulse * 1.14 : pulse)
    }

    if (materialRef.current && body.kind !== "star") {
      const sunDirection = worldPosition.clone().normalize().multiplyScalar(-1)
      const dayFacing = Math.max(sunDirection.z, 0)
      materialRef.current.emissiveIntensity = selected ? 0.08 + dayFacing * 0.08 : 0.04 + dayFacing * 0.04
    }

    if (arrowRef.current) {
      if (orbitalState.localVelocity.lengthSq() > 0.0001) {
        arrowRef.current.visible = showVector
        arrowRef.current.setDirection(orbitalState.localVelocity.clone().normalize())
        arrowRef.current.setLength(arrowLength, body.radius * 0.55, body.radius * 0.34)
      } else {
        arrowRef.current.visible = false
      }
    }

    onPositionChange(body.id, worldPosition)
    onSnapshotChange(body.id, {
      distanceKm: orbitalState.distanceKm,
      orbitalSpeedKmPerSecond: orbitalState.orbitalSpeedKmPerSecond,
    })
  })

  return (
    <group ref={groupRef} onClick={() => onSelect(body.id)}>
      {selected && (
        <Text
          position={[0, body.radius + 1, 0]}
          color="#f8fafc"
          fontSize={compact ? 0.3 : 0.48}
          anchorX="center"
          anchorY="middle"
        >
          {body.name}
        </Text>
      )}

      <group ref={spinRef}>
        {body.kind === "star" ? (
          <>
            <mesh>
              <sphereGeometry args={[body.radius, sphereSegments, sphereSegments]} />
              <meshStandardMaterial
                map={textures.surface}
                color={body.baseColor}
                emissive={body.glowColor}
                emissiveIntensity={4.2}
                roughness={0.68}
                metalness={0}
                toneMapped={false}
              />
            </mesh>

            <mesh ref={glowRef}>
              <sphereGeometry args={[body.radius * 1.22, glowSegments, glowSegments]} />
              <meshBasicMaterial
                color={body.glowColor}
                transparent
                opacity={0.24}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>

            <mesh>
              <sphereGeometry args={[body.radius * 1.5, glowSegments, glowSegments]} />
              <meshBasicMaterial
                color="#fb923c"
                transparent
                opacity={compact ? 0.05 : 0.07}
                side={BackSide}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </>
        ) : (
          <>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[body.radius, sphereSegments, sphereSegments]} />
              <meshStandardMaterial
                ref={materialRef}
                map={textures.surface}
                color={body.baseColor}
                emissive={body.atmosphereColor ?? body.baseColor}
                emissiveIntensity={0.05}
                roughness={body.id === "moon" ? 0.98 : 0.9}
                metalness={0.02}
              />
            </mesh>

            {textures.clouds && (
              <mesh ref={cloudRef}>
                <sphereGeometry args={[body.radius * 1.024, glowSegments, glowSegments]} />
                <meshStandardMaterial
                  map={textures.clouds}
                  transparent
                  opacity={compact ? 0.54 : 0.66}
                  depthWrite={false}
                  roughness={0.94}
                  metalness={0}
                />
              </mesh>
            )}

            {body.atmosphereColor && (
              <mesh ref={glowRef}>
                <sphereGeometry args={[body.radius * 1.12, glowSegments, glowSegments]} />
                <meshBasicMaterial
                  color={body.atmosphereColor}
                  transparent
                  opacity={selected ? (compact ? 0.16 : 0.2) : compact ? 0.08 : 0.12}
                  side={BackSide}
                  blending={AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>
            )}
          </>
        )}
      </group>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -body.radius - 0.18, 0]}>
          <ringGeometry args={[body.radius * 1.34, body.radius * 1.48, compact ? 32 : 48]} />
          <meshBasicMaterial
            color={body.vectorColor}
            transparent
            opacity={compact ? 0.48 : 0.7}
            toneMapped={false}
          />
        </mesh>
      )}

      <arrowHelper
        ref={arrowRef}
        args={[new Vector3(1, 0, 0), new Vector3(0, 0, 0), arrowLength, body.vectorColor]}
      />
    </group>
  )
}
