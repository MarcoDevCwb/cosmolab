import { useEffect, useMemo } from "react"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { zamoAngularVelocityPerMeter } from "../../physics/relativity/zamo"
import type { SimulationScenario } from "../../simulation/scenarios"

/**
 * Campo de arrasto de referenciais (ZAMO) — linguagem visual principal de
 * Kerr: segmentos tangenciais no plano equatorial cujo COMPRIMENTO e brilho
 * são proporcionais a ω(r) = −g_tφ/g_φφ (calculado em physics/zamo.ts).
 * Perto do horizonte o arrasto domina; longe, desaparece — exatamente a
 * estrutura de Lense–Thirring.
 */
export function FrameDraggingField({ scenario }: { scenario: SimulationScenario }) {
  const geometry = useMemo(() => {
    if (!scenario.ergosphereEquatorRadiusM || !scenario.horizonRadiusM) {
      return null
    }

    const scale = scenario.renderScaleM
    const horizonM = scenario.horizonRadiusM
    const radiiM = [1.12, 1.35, 1.7, 2.2, 3.0, 4.2, 6.0].map((k) => k * horizonM)
    const omegaMax = Math.abs(
      zamoAngularVelocityPerMeter(scenario.metric, [0, radiiM[0], Math.PI / 2, 0]),
    )
    if (omegaMax === 0) {
      return null
    }

    const SPOKES = 16
    const positions: number[] = []
    const colors: number[] = []

    for (const radiusM of radiiM) {
      const omega = Math.abs(
        zamoAngularVelocityPerMeter(scenario.metric, [0, radiusM, Math.PI / 2, 0]),
      )
      const strength = omega / omegaMax // ∈ (0, 1]
      const lengthUnits = 0.12 + 0.85 * strength
      const radiusUnits = radiusM / scale

      for (let spoke = 0; spoke < SPOKES; spoke += 1) {
        const phi = (spoke / SPOKES) * Math.PI * 2
        const x = radiusUnits * Math.cos(phi)
        const z = radiusUnits * Math.sin(phi)
        // Tangente na direção +φ (sentido do spin).
        const tx = -Math.sin(phi)
        const tz = Math.cos(phi)

        positions.push(x, 0.012, z, x + tx * lengthUnits, 0.012, z + tz * lengthUnits)
        const brightness = 0.25 + 0.95 * strength
        // Dourado→branco conforme o arrasto cresce.
        colors.push(
          brightness,
          brightness * (0.62 + 0.3 * strength),
          brightness * (0.25 + 0.6 * strength),
          brightness,
          brightness * (0.62 + 0.3 * strength),
          brightness * (0.25 + 0.6 * strength),
        )
      }
    }

    const built = new BufferGeometry()
    built.setAttribute("position", new Float32BufferAttribute(positions, 3))
    built.setAttribute("color", new Float32BufferAttribute(colors, 3))
    return built
  }, [scenario])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) {
    return null
  }

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.85} toneMapped={false} />
    </lineSegments>
  )
}
