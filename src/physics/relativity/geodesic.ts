/**
 * Equação da geodésica.
 *
 * Referência: Wald, "General Relativity" (1984), eq. 3.3.5; MTW cap. 13.
 *
 *   d²x^μ/dλ² + Γ^μ_{αβ} (dx^α/dλ)(dx^β/dλ) = 0
 *
 * Significado físico: trajetória de queda livre — partículas e fótons movem-se
 * ao longo de geodésicas do espaço-tempo; a "gravidade" é inteiramente
 * geométrica (via Γ). λ é um parâmetro afim:
 * - partículas massivas: λ = c·τ [m], com τ o tempo próprio [s];
 * - fótons: parâmetro afim arbitrário [m] (tempo próprio nulo).
 *
 * Este módulo converte a EDO de 2ª ordem no sistema de 1ª ordem
 *   dx^μ/dλ = u^μ,   du^μ/dλ = -Γ^μ_{αβ} u^α u^β
 * consumido por qualquer integrador (ver simulation/integrators/).
 *
 * Nenhuma dependência de Three.js ou React.
 */

import { resolveChristoffel } from "./christoffel"
import type { SpacetimeMetric } from "./metric"
import type { Vector4 } from "./tensor"
import { contractRank3WithVector } from "./tensor"

/**
 * Estado de fase da geodésica: 8 números
 * [x⁰, x¹, x², x³, u⁰, u¹, u², u³] com u^μ = dx^μ/dλ.
 */
export type GeodesicState = number[]

export function positionOf(state: GeodesicState): Vector4 {
  return [state[0], state[1], state[2], state[3]]
}

export function velocityOf(state: GeodesicState): Vector4 {
  return [state[4], state[5], state[6], state[7]]
}

export function makeGeodesicState(position: Vector4, velocity: Vector4): GeodesicState {
  return [...position, ...velocity]
}

/**
 * Campo de derivadas dy/dλ da geodésica para a métrica dada.
 * `scaleFloor` só é usado quando os Christoffels precisam ser calculados
 * numericamente (métricas plugin sem forma analítica).
 */
export function createGeodesicDerivatives(metric: SpacetimeMetric, scaleFloor?: Vector4) {
  return function geodesicDerivatives(state: GeodesicState): GeodesicState {
    const position = positionOf(state)
    const velocity = velocityOf(state)
    const gamma = resolveChristoffel(metric, position, scaleFloor)

    // du^μ/dλ = -Γ^μ_{αβ} u^α u^β
    const acceleration = contractRank3WithVector(gamma, velocity)

    return [
      velocity[0],
      velocity[1],
      velocity[2],
      velocity[3],
      -acceleration[0],
      -acceleration[1],
      -acceleration[2],
      -acceleration[3],
    ]
  }
}
