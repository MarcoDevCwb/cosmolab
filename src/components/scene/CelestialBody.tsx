import { Line, Text } from "@react-three/drei"
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
import { SCIENTIFIC_BODY_CATALOG } from "../../engine/catalog/solarSystemCatalog"
import type { CelestialBodyDefinition, CelestialBodyId } from "../../types/celestial"
import type { BodySceneState, TrajectorySample } from "../../types/simulation"
import { createBodyTextures } from "./proceduralTextures"

type CelestialBodyProps = {
  body: CelestialBodyDefinition
  compact: boolean
  getBodyState: (bodyId: CelestialBodyId) => BodySceneState
  trajectoryPast: TrajectorySample[]
  trajectoryFuture: TrajectorySample[]
  onSelect: (bodyId: CelestialBodyId) => void
  selected: boolean
  showVector: boolean
}

const WORKING_DIRECTION = new Vector3()

export function CelestialBody({
  body,
  compact,
  getBodyState,
  trajectoryPast,
  trajectoryFuture,
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
  const trailPoints = useMemo(
    () =>
      [...trajectoryPast, ...trajectoryFuture]
        .map((sample) => [
          sample.renderPosition.x,
          sample.renderPosition.y,
          sample.renderPosition.z,
        ] as const),
    [trajectoryFuture, trajectoryPast],
  )

  useEffect(() => {
    return () => {
      textures.surface.dispose()
      textures.clouds?.dispose()
    }
  }, [textures])

  useFrame((state) => {
    const bodyState = getBodyState(body.id)
    const axialTilt = SCIENTIFIC_BODY_CATALOG[body.id].axialTiltDegrees

    if (groupRef.current) {
      groupRef.current.position.set(
        bodyState.renderPosition.x,
        bodyState.renderPosition.y,
        bodyState.renderPosition.z,
      )
    }

    if (spinRef.current) {
      spinRef.current.rotation.z = MathUtils.degToRad(axialTilt)
      spinRef.current.rotation.y = bodyState.siderealAngleRad
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y = bodyState.siderealAngleRad * 1.08
    }

    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4 + body.radius) * 0.06
      glowRef.current.scale.setScalar(selected ? pulse * 1.14 : pulse)
    }

    if (materialRef.current && body.kind !== "star") {
      const dayFacing = Math.max(bodyState.sunDirection.z, 0)
      materialRef.current.emissiveIntensity = selected ? 0.08 + dayFacing * 0.08 : 0.04 + dayFacing * 0.04
    }

    if (arrowRef.current) {
      const direction = WORKING_DIRECTION.set(
        bodyState.renderVelocityDirection.x,
        bodyState.renderVelocityDirection.y,
        bodyState.renderVelocityDirection.z,
      )

      if (direction.lengthSq() > 0.0001) {
        arrowRef.current.visible = showVector
        arrowRef.current.setDirection(direction.normalize())
        arrowRef.current.setLength(arrowLength, body.radius * 0.55, body.radius * 0.34)
      } else {
        arrowRef.current.visible = false
      }
    }
  })

  return (
    <group ref={groupRef} onClick={() => onSelect(body.id)}>
      {selected && trailPoints.length > 2 && (
        <Line
          points={trailPoints}
          color={body.vectorColor}
          lineWidth={compact ? 1.2 : 1.8}
          transparent
          opacity={compact ? 0.24 : 0.42}
        />
      )}

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
