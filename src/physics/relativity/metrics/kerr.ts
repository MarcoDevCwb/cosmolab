/**
 * Métrica de Kerr — exterior de um buraco negro em ROTAÇÃO, em coordenadas
 * de Boyer–Lindquist (ct, r, θ, φ).
 *
 * Referências: R. P. Kerr, Phys. Rev. Lett. 11, 237 (1963);
 * Boyer & Lindquist, J. Math. Phys. 8, 265 (1967); MTW cap. 33;
 * Bardeen, Press & Teukolsky, ApJ 178, 347 (1972).
 *
 * Com M_geo = GM/c² [m], parâmetro de spin a = J/(Mc) [m] (0 ≤ a ≤ M_geo),
 * Σ = r² + a²cos²θ e Δ = r² − 2 M_geo r + a²:
 *
 *   g_tt = −(1 − 2 M_geo r/Σ)
 *   g_tφ = −(2 M_geo r a sin²θ)/Σ      ← termo cruzado: ARRASTO DE REFERENCIAIS
 *   g_rr = Σ/Δ
 *   g_θθ = Σ
 *   g_φφ = (r² + a² + 2 M_geo r a² sin²θ/Σ) sin²θ
 *
 * Estruturas causais (em unidades de M_geo):
 * - Horizonte externo r₊ = M_geo + √(M_geo² − a²) (Δ = 0).
 * - Ergosfera (limite estático) r_E(θ) = M_geo + √(M_geo² − a²cos²θ);
 *   no equador r_E = 2 M_geo = r_s. Entre r₊ e r_E, g_tt > 0: NENHUM
 *   observador pode ficar parado — todos são arrastados na direção do spin.
 *
 * Significado físico do arrasto (Lense–Thirring): uma partícula largada do
 * repouso com momento angular NULO adquire dφ/dt = −g_tφ/g_φφ ≠ 0. L = g_φμu^μ
 * é exatamente conservado na teoria (vetor de Killing ∂_φ) e deve permanecer
 * numericamente próximo de zero enquanto a partícula gira — é o espaço-tempo
 * que roda, não uma força sobre a partícula.
 *
 * IMPLEMENTAÇÃO COMO "PLUGIN": esta métrica NÃO fornece Christoffels
 * analíticos — o motor os calcula por diferenças finitas (christoffel.ts).
 * É a demonstração de que qualquer geometria entra no CosmoLab apenas
 * implementando `SpacetimeMetric`. A inversa é analítica (bloco t–φ 2×2).
 *
 * Domínio de validade: exterior r > r₊ (Boyer–Lindquist degenera em Δ = 0).
 * Unidades SI: r, ct, a em metros; θ, φ em radianos.
 */

import { geometrizedMass, schwarzschildRadius } from "../../constants"
import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Vector4 } from "../tensor"

export type KerrMetric = SpacetimeMetric & {
  readonly massKg: number
  /** Parâmetro de spin a = J/(Mc) [m]. */
  readonly spinM: number
  /** Fração adimensional χ = a/M_geo ∈ [0, 1). */
  readonly spinFraction: number
  /** Horizonte externo r₊ [m]. */
  readonly horizonRadiusM: number
  /** Ergosfera no equador r_E(π/2) = r_s [m]. */
  readonly ergosphereEquatorRadiusM: number
  /** Raio de Schwarzschild da mesma massa [m] (referência). */
  readonly schwarzschildRadiusM: number
}

export function createKerrMetric(massKg: number, spinFraction: number): KerrMetric {
  if (!(massKg > 0)) {
    throw new Error("A métrica de Kerr exige massa central positiva.")
  }
  if (!(spinFraction >= 0 && spinFraction < 1)) {
    throw new Error("O spin de Kerr exige 0 ≤ a/M < 1 (sem singularidade nua).")
  }

  const geoMass = geometrizedMass(massKg)
  const spin = spinFraction * geoMass
  const horizonRadiusM = geoMass + Math.sqrt(geoMass * geoMass - spin * spin)

  const auxiliaries = (r: number, theta: number) => {
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const sigma = r * r + spin * spin * cosTheta * cosTheta
    const delta = r * r - 2 * geoMass * r + spin * spin
    return { sinTheta, sigma, delta }
  }

  const metricAt = (position: Vector4): Matrix4 => {
    const r = position[1]
    const { sinTheta, sigma, delta } = auxiliaries(r, position[2])
    const sin2 = sinTheta * sinTheta
    const twoMr = 2 * geoMass * r

    const gtt = -(1 - twoMr / sigma)
    const gtphi = -(twoMr * spin * sin2) / sigma
    const gphiphi = (r * r + spin * spin + (twoMr * spin * spin * sin2) / sigma) * sin2

    return [
      [gtt, 0, 0, gtphi],
      [0, sigma / delta, 0, 0],
      [0, 0, sigma, 0],
      [gtphi, 0, 0, gphiphi],
    ]
  }

  return {
    name: "Kerr (1963)",
    coordinates: ["ct", "r", "θ", "φ"],
    chart: "spherical",
    symmetries: { stationary: true, axisymmetric: true },
    massKg,
    spinM: spin,
    spinFraction,
    horizonRadiusM,
    ergosphereEquatorRadiusM: 2 * geoMass,
    schwarzschildRadiusM: schwarzschildRadius(massKg),

    metric: metricAt,

    // Inversa analítica: blocos r e θ diagonais; bloco t–φ invertido por
    // determinante D = g_tt·g_φφ − g_tφ² (= −Δ sin²θ, identidade de BL).
    inverseMetric(position: Vector4): Matrix4 {
      const g = metricAt(position)
      const { sigma, delta } = auxiliaries(position[1], position[2])
      const determinantTP = g[0][0] * g[3][3] - g[0][3] * g[0][3]

      return [
        [g[3][3] / determinantTP, 0, 0, -g[0][3] / determinantTP],
        [0, delta / sigma, 0, 0],
        [0, 0, 1 / sigma, 0],
        [-g[0][3] / determinantTP, 0, 0, g[0][0] / determinantTP],
      ]
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        { min: -Infinity, max: Infinity },
        // Exterior apenas: Boyer–Lindquist degenera no horizonte (Δ = 0).
        { min: horizonRadiusM, max: Infinity },
        { min: 0, max: Math.PI },
        { min: -Infinity, max: Infinity },
      ]
    },

    // SEM christoffel() analítico, de propósito: o motor usa diferenças
    // finitas — Kerr roda como plugin puro de SpacetimeMetric.
  }
}
