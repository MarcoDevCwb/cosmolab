/**
 * Contrato genérico de espaço-tempo do CosmoLab.
 *
 * Qualquer geometria (Minkowski, Schwarzschild e, futuramente, Kerr, FLRW,
 * Lemaître–Tolman–Bondi, Gödel, wormholes ou métricas experimentais) deve
 * apenas implementar `SpacetimeMetric`. O restante do sistema — símbolos de
 * Christoffel, geodésicas, validação, cenários e renderização — opera
 * exclusivamente sobre esta interface, sem conhecer a geometria concreta.
 *
 * Convenções:
 * - Assinatura métrica (-,+,+,+).
 * - Coordenadas x^μ com dimensão de comprimento onde aplicável:
 *   x⁰ = c·t [m]; coordenadas radiais em metros; ângulos em radianos.
 * - `metric(x)` retorna g_{μν}(x); `inverseMetric(x)` retorna g^{μν}(x).
 */

import type { Matrix4, Rank3, Vector4 } from "./tensor"

/** Carta espacial usada pelas coordenadas x¹..x³, necessária apenas para o
 * mapeamento de renderização (a física nunca depende disto). */
export type SpatialChart = "cartesian" | "spherical" | "cylindrical"

/** Intervalo fechado-aberto de validade de uma coordenada. Use ±Infinity
 * para coordenadas ilimitadas. */
export type CoordinateBound = {
  min: number
  max: number
}

export type SpacetimeMetric = {
  /** Nome científico da solução (ex.: "Schwarzschild (1916)"). */
  readonly name: string
  /** Rótulos das coordenadas, ex.: ["ct", "r", "θ", "φ"]. */
  readonly coordinates: readonly [string, string, string, string]
  /** Carta espacial das coordenadas x¹..x³ (uso exclusivo da renderização). */
  readonly chart: SpatialChart

  /**
   * Simetrias declaradas da métrica nestas coordenadas:
   * - `stationary`: ∂g/∂x⁰ = 0 (vetor de Killing temporal)
   * - `axisymmetric`: ∂g/∂x³ = 0 (vetor de Killing axial)
   * O cálculo numérico de Christoffels usa isso para pular derivadas que
   * são exatamente nulas (metade do custo em métricas tipo Kerr).
   */
  readonly symmetries?: { stationary?: boolean; axisymmetric?: boolean }

  /** Tensor métrico covariante g_{μν}(x). */
  metric(position: Vector4): Matrix4

  /** Tensor métrico contravariante g^{μν}(x). */
  inverseMetric(position: Vector4): Matrix4

  /** Domínio de validade de cada coordenada (ex.: r > r_s no exterior de
   * Schwarzschild, θ ∈ (0, π) para evitar singularidades de coordenada). */
  coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound]

  /**
   * Símbolos de Christoffel analíticos Γ^μ_{αβ}(x), quando conhecidos.
   * Se ausentes, o motor calcula-os numericamente por diferenças finitas
   * a partir de `metric()` (ver christoffel.ts) — é isto que permite
   * carregar métricas como "plugins" sem trabalho analítico prévio.
   */
  christoffel?(position: Vector4): Rank3
}

/** Verifica se a posição está dentro do domínio de validade da métrica. */
export function isWithinBounds(metric: SpacetimeMetric, position: Vector4): boolean {
  const bounds = metric.coordinateBounds()
  return bounds.every((bound, index) => position[index] > bound.min && position[index] < bound.max)
}
