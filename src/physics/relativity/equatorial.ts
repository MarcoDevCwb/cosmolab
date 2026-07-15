/**
 * Utilidades para movimento no plano equatorial (θ = π/2) de métricas
 * esféricas (Schwarzschild e, futuramente, Kerr equatorial).
 *
 * Justificativa física: em espaços-tempos esfericamente simétricos o momento
 * angular é conservado em direção, logo qualquer geodésica é planar; sem
 * perda de generalidade adota-se o plano equatorial (MTW §25.2). Com u^θ = 0
 * e θ = π/2, todos os Γ^θ_{αβ} u^α u^β se anulam e o movimento permanece no
 * plano — desvios numéricos de θ são mais um indicador de erro.
 *
 * Conversões entre a carta polar (r, φ) e coordenadas cartesianas auxiliares
 * (x = r cosφ, y = r sinφ) usadas para montar condições iniciais intuitivas
 * ("fóton vindo de -x com parâmetro de impacto b") e medir ângulos de
 * deflexão assintóticos. Unidades: metros e radianos.
 */

import type { SpacetimeMetric } from "./metric"
import type { GeodesicState } from "./geodesic"
import { positionOf, velocityOf } from "./geodesic"
import type { GeodesicKind } from "./initialConditions"
import { buildInitialState } from "./initialConditions"

/**
 * Constrói o estado inicial no plano equatorial a partir de posição e direção
 * espacial cartesianas. A direção (dx, dy) é a derivada espacial d(x,y)/dλ;
 * para fótons, use um vetor unitário (‖d‖ = 1 ⇒ u⁰ ≈ 1 longe da massa).
 *
 * Conversão para a base polar:
 *   u^r = (x·dx + y·dy) / r
 *   u^φ = (x·dy - y·dx) / r²
 */
export function equatorialStateFromCartesian(
  metric: SpacetimeMetric,
  xM: number,
  yM: number,
  dx: number,
  dy: number,
  kind: GeodesicKind,
): GeodesicState {
  const r = Math.hypot(xM, yM)
  const phi = Math.atan2(yM, xM)
  const uR = (xM * dx + yM * dy) / r
  const uPhi = (xM * dy - yM * dx) / (r * r)

  return buildInitialState(metric, [0, r, Math.PI / 2, phi], [uR, 0, uPhi], kind)
}

/**
 * Direção espacial cartesiana (não normalizada) da geodésica no plano
 * equatorial: (dx/dλ, dy/dλ) a partir de (u^r, u^φ).
 */
export function equatorialCartesianDirection(state: GeodesicState): [number, number] {
  const [, r, , phi] = positionOf(state)
  const [, uR, , uPhi] = velocityOf(state)
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  return [uR * cosPhi - r * uPhi * sinPhi, uR * sinPhi + r * uPhi * cosPhi]
}

/** Posição cartesiana (x, y) [m] no plano equatorial. */
export function equatorialCartesianPosition(state: GeodesicState): [number, number] {
  const [, r, , phi] = positionOf(state)
  return [r * Math.cos(phi), r * Math.sin(phi)]
}

/** Ângulo (rad) entre duas direções 2D — usado para medir deflexão da luz. */
export function angleBetween2D(a: [number, number], b: [number, number]): number {
  const dot = a[0] * b[0] + a[1] * b[1]
  const cross = a[0] * b[1] - a[1] * b[0]
  return Math.abs(Math.atan2(cross, dot))
}
