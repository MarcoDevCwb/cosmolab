/**
 * Mapeamento de coordenadas físicas → espaço de cena (unidades de render).
 *
 * Única ponte entre o motor científico e o Three.js: converte as coordenadas
 * do espaço-tempo (SI, metros/radianos) em posições de cena adimensionais.
 * NENHUMA física acontece aqui — apenas mudança de carta e escala.
 *
 * Convenção de cena (Three.js): y é o eixo "para cima"; o plano equatorial
 * físico (θ = π/2, ou plano x-y cartesiano) é renderizado no plano horizontal
 * da cena (y = 0).
 */

import { flammEmbeddingHeight } from "../../physics/relativity/embedding"
import type { SpatialChart } from "../../physics/relativity/metric"
import type { Vector4 } from "../../physics/relativity/tensor"

export type RenderPosition = {
  x: number
  y: number
  z: number
}

/**
 * Converte a parte espacial de x^μ para a cena.
 *
 * Carta esférica (r, θ, φ):
 *   cena.x = (r sinθ cosφ)/s,  cena.y = (r cosθ)/s,  cena.z = (r sinθ sinφ)/s
 * Carta cartesiana (x, y, z físicos):
 *   cena.x = x/s,  cena.y = z/s,  cena.z = y/s
 *
 * `renderScaleM` é a escala s em metros por unidade de cena.
 */
export function mapCoordinatesToRenderSpace(
  position: Vector4,
  chart: SpatialChart,
  renderScaleM: number,
): RenderPosition {
  if (chart === "spherical") {
    const r = position[1]
    const theta = position[2]
    const phi = position[3]
    const sinTheta = Math.sin(theta)

    return {
      x: (r * sinTheta * Math.cos(phi)) / renderScaleM,
      y: (r * Math.cos(theta)) / renderScaleM,
      z: (r * sinTheta * Math.sin(phi)) / renderScaleM,
    }
  }

  return {
    x: position[1] / renderScaleM,
    y: position[3] / renderScaleM,
    z: position[2] / renderScaleM,
  }
}

/**
 * Mapeador para a superfície de imersão de Flamm: a posição espacial é
 * projetada no plano da cena e a altura vem de z(r) do paraboloide
 * (physics/relativity/embedding.ts), rebaixada para que a borda externa
 * (r = rimRadiusM) fique em y = 0 — o "funil" desce a partir do plano.
 *
 * Continua sendo apenas mudança de carta + escala: a forma vem da física.
 */
export function createEmbeddedSurfaceMapper(
  chart: SpatialChart,
  renderScaleM: number,
  schwarzschildRadiusM: number,
  rimRadiusM: number,
) {
  const rimHeightM = flammEmbeddingHeight(schwarzschildRadiusM, rimRadiusM)

  return function mapToEmbeddedSurface(position: Vector4): RenderPosition {
    const flat = mapCoordinatesToRenderSpace(position, chart, renderScaleM)
    const radiusM =
      chart === "spherical"
        ? position[1]
        : Math.hypot(position[1], position[2], position[3])

    return {
      x: flat.x,
      y: (flammEmbeddingHeight(schwarzschildRadiusM, radiusM) - rimHeightM) / renderScaleM,
      z: flat.z,
    }
  }
}
