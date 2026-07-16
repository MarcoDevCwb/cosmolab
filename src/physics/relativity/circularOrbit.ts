/**
 * Órbita circular equatorial GENÉRICA — funciona para qualquer
 * SpacetimeMetric estacionária e axissimétrica, via Christoffels
 * (analíticos ou numéricos).
 *
 * Condição de órbita circular (u^r = 0 e du^r/dλ = 0) no plano equatorial:
 *
 *   Γ^r_tt + 2 Γ^r_tφ ω̃ + Γ^r_φφ ω̃² = 0,   ω̃ = u^φ/u^t = dφ/d(ct) [1/m]
 *
 * (MTW ex. 25.19 para Schwarzschild; Bardeen, Press & Teukolsky 1972 para
 * Kerr, onde as duas raízes são as órbitas prógrada e retrógrada.)
 *
 * A normalização timelike exige A = g_tt + 2 g_tφ ω̃ + g_φφ ω̃² < 0;
 * se nenhuma raiz real satisfaz isso, não existe órbita circular timelike
 * no raio pedido (ex.: dentro da esfera de fótons) e retornamos null.
 */

import { resolveChristoffel } from "./christoffel"
import type { SpacetimeMetric } from "./metric"
import type { Vector4 } from "./tensor"

export type CircularOrbitState = {
  /** ω̃ = dφ/d(ct) [1/m]. */
  omegaPerMeter: number
  /** u^t da órbita normalizada (g·u·u = −1). */
  uTime: number
  /** u^φ correspondente. */
  uPhi: number
}

export function equatorialCircularOrbit(
  metric: SpacetimeMetric,
  radiusM: number,
): CircularOrbitState | null {
  const position: Vector4 = [0, radiusM, Math.PI / 2, 0]
  const gamma = resolveChristoffel(metric, position, [radiusM, radiusM, 1, 1])

  // Quadrática a·ω² + b·ω + c = 0 com a = Γ^r_φφ, b = 2Γ^r_tφ, c = Γ^r_tt.
  const a = gamma[1][3][3]
  const b = 2 * gamma[1][0][3]
  const c = gamma[1][0][0]

  let roots: number[]
  if (Math.abs(a) < 1e-30) {
    roots = Math.abs(b) > 1e-30 ? [-c / b] : []
  } else {
    const discriminant = b * b - 4 * a * c
    if (discriminant < 0) {
      return null
    }
    const sqrtD = Math.sqrt(discriminant)
    roots = [(-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a)]
  }

  const g = metric.metric(position)
  // Preferência pela órbita prógrada (ω > 0); senão qualquer raiz timelike.
  const ordered = roots.sort((x, y) => (y > 0 ? 1 : 0) - (x > 0 ? 1 : 0))

  for (const omega of ordered) {
    const normFactor = g[0][0] + 2 * g[0][3] * omega + g[3][3] * omega * omega
    if (normFactor < 0) {
      const uTime = 1 / Math.sqrt(-normFactor)
      return { omegaPerMeter: omega, uTime, uPhi: omega * uTime }
    }
  }

  return null
}
