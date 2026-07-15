import { useEffect, useMemo } from "react"
import { buildFlammWireframe } from "../../rendering/scene/flammGeometry"

/**
 * Superfície de imersão de Flamm (ou plano, se r_s = 0).
 * Apenas desenha a geometria construída em rendering/ — sem física aqui.
 */
export function FlammSurface({
  schwarzschildRadiusM,
  renderScaleM,
}: {
  schwarzschildRadiusM: number
  renderScaleM: number
}) {
  const geometry = useMemo(
    () => buildFlammWireframe(schwarzschildRadiusM, renderScaleM),
    [schwarzschildRadiusM, renderScaleM],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.5} toneMapped={false} />
    </lineSegments>
  )
}
