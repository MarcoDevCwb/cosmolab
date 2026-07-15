/**
 * Validação numérica contínua do integrador de geodésicas.
 *
 * Invariantes monitorados (Wald 1984, §3.3; MTW cap. 25):
 *
 * 1. Norma da quadrivelocidade  N = g_{μν} u^μ u^ν
 *    Deve permanecer exatamente 0 (fótons) ou -1 (massivas, com λ = c·τ).
 *    O desvio |N - N₀| é a medida primária de erro numérico do integrador.
 *
 * 2. Em espaços-tempos estacionários e axissimétricos (Schwarzschild, Kerr),
 *    os vetores de Killing ∂_t e ∂_φ geram constantes de movimento:
 *      E = -g_{0μ} u^μ   (energia específica; adimensional, = E/mc² p/ massivas)
 *      L =  g_{3μ} u^μ   (momento angular específico [m], = L/mc p/ massivas)
 *    A deriva relativa de E e L é uma verificação independente da norma.
 */

import type { SpacetimeMetric } from "./metric"
import type { GeodesicState } from "./geodesic"
import { positionOf, velocityOf } from "./geodesic"
import { contractBilinear } from "./tensor"
import type { GeodesicKind } from "./initialConditions"
import { targetNorm } from "./initialConditions"

/** Norma atual g_{μν} u^μ u^ν do estado. */
export function fourVelocityNorm(metric: SpacetimeMetric, state: GeodesicState): number {
  const position = positionOf(state)
  const velocity = velocityOf(state)
  const g = metric.metric(position)
  return contractBilinear(g, velocity, velocity)
}

/** Erro absoluto de conservação da norma: |g_{μν}u^μu^ν - ε|. */
export function normConservationError(
  metric: SpacetimeMetric,
  state: GeodesicState,
  kind: GeodesicKind,
): number {
  return Math.abs(fourVelocityNorm(metric, state) - targetNorm(kind))
}

/**
 * Energia específica conservada E = -g_{0μ} u^μ.
 * Válida como constante de movimento apenas em métricas estáticas/estacionárias
 * (∂_t Killing) — verdadeiro para Minkowski e Schwarzschild.
 */
export function specificEnergy(metric: SpacetimeMetric, state: GeodesicState): number {
  const g = metric.metric(positionOf(state))
  const u = velocityOf(state)
  return -(g[0][0] * u[0] + g[0][1] * u[1] + g[0][2] * u[2] + g[0][3] * u[3])
}

/**
 * Momento angular específico L = g_{3μ} u^μ [m], conjugado à coordenada
 * axial x³ = φ. Constante de movimento em métricas axissimétricas.
 */
export function specificAngularMomentum(metric: SpacetimeMetric, state: GeodesicState): number {
  const g = metric.metric(positionOf(state))
  const u = velocityOf(state)
  return g[3][0] * u[0] + g[3][1] * u[1] + g[3][2] * u[2] + g[3][3] * u[3]
}

export type ValidationReport = {
  /** g_{μν}u^μu^ν atual. */
  norm: number
  /** |norma - alvo|: erro numérico primário. */
  normError: number
  /** Energia específica E (adimensional). */
  energy: number
  /** Momento angular específico L [m]. */
  angularMomentum: number
}

export function buildValidationReport(
  metric: SpacetimeMetric,
  state: GeodesicState,
  kind: GeodesicKind,
): ValidationReport {
  const norm = fourVelocityNorm(metric, state)
  return {
    norm,
    normError: Math.abs(norm - targetNorm(kind)),
    energy: specificEnergy(metric, state),
    angularMomentum: specificAngularMomentum(metric, state),
  }
}
