/**
 * Métrica de Minkowski — espaço-tempo plano da relatividade restrita.
 *
 * Referência: H. Minkowski, "Raum und Zeit" (1908).
 *
 * Elemento de linha (coordenadas cartesianas, assinatura -,+,+,+):
 *   ds² = -(c·dt)² + dx² + dy² + dz²
 *
 * Significado físico: ausência de gravitação; geodésicas são linhas retas
 * percorridas com velocidade constante. Serve como caso de controle do
 * integrador — qualquer curvatura numérica aqui é erro puro.
 *
 * Unidades: todas as coordenadas em metros (x⁰ = c·t).
 */

import type { Matrix4, Rank3, Vector4 } from "../tensor"
import { zeroRank3 } from "../tensor"
import type { CoordinateBound, SpacetimeMetric } from "../metric"

const MINKOWSKI_COMPONENTS: Matrix4 = [
  [-1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]

const UNBOUNDED: CoordinateBound = { min: -Infinity, max: Infinity }

export const minkowskiMetric: SpacetimeMetric = {
  name: "Minkowski (1908)",
  coordinates: ["ct", "x", "y", "z"],
  chart: "cartesian",
  symmetries: { stationary: true, axisymmetric: true },

  metric(): Matrix4 {
    return MINKOWSKI_COMPONENTS.map((row) => [...row])
  },

  // Em assinatura (-,+,+,+) a métrica de Minkowski é sua própria inversa.
  inverseMetric(): Matrix4 {
    return MINKOWSKI_COMPONENTS.map((row) => [...row])
  },

  coordinateBounds() {
    return [UNBOUNDED, UNBOUNDED, UNBOUNDED, UNBOUNDED]
  },

  // Métrica constante ⇒ todas as derivadas ∂g = 0 ⇒ Γ^μ_{αβ} = 0.
  christoffel(_position: Vector4): Rank3 {
    return zeroRank3()
  },
}
