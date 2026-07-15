/**
 * Métrica de Schwarzschild — exterior de um corpo esférico, estático e sem
 * carga.
 *
 * Referência: K. Schwarzschild, "Über das Gravitationsfeld eines
 * Massenpunktes nach der Einsteinschen Theorie" (1916); ver também
 * Misner, Thorne & Wheeler, "Gravitation" (1973), cap. 23 e 25.
 *
 * Elemento de linha em coordenadas de Schwarzschild (ct, r, θ, φ),
 * assinatura (-,+,+,+), com f(r) = 1 - r_s/r e r_s = 2GM/c²:
 *
 *   ds² = -f(r)(c·dt)² + f(r)⁻¹ dr² + r² dθ² + r² sin²θ dφ²
 *
 * Significado físico: descreve a geometria fora do Sol, de estrelas e de
 * buracos negros sem rotação. r = r_s é o horizonte de eventos (singularidade
 * apenas de coordenada); r = 1.5·r_s é a esfera de fótons; r = 3·r_s é a
 * última órbita circular estável (ISCO) de partículas massivas.
 *
 * Unidades SI: r e c·t em metros; θ, φ em radianos; massa M em kg convertida
 * para r_s em metros via `schwarzschildRadius` (physics/constants.ts).
 *
 * Domínio de validade desta implementação: exterior r > r_s. Em r = r_s as
 * coordenadas de Schwarzschild degeneram (g_rr → ∞); cruzar o horizonte
 * exigirá futuramente cartas regulares (Eddington–Finkelstein, Kruskal).
 */

import { schwarzschildRadius } from "../../constants"
import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Rank3, Vector4 } from "../tensor"
import { zeroRank3 } from "../tensor"

/**
 * Raios característicos do exterior de Schwarzschild, em unidades de r_s
 * (MTW cap. 25; Wald §6.3):
 * - Esfera de fótons r = 1,5 r_s: última órbita circular (instável) da luz.
 * - ISCO r = 3 r_s (= 6GM/c²): última órbita circular ESTÁVEL de partículas
 *   massivas; abaixo dela qualquer perturbação leva ao mergulho.
 * - Parâmetro de impacto crítico b_c = (3√3/2) r_s ≈ 2,598 r_s: fótons com
 *   b < b_c são capturados pelo buraco negro; b > b_c são defletidos.
 */
export const PHOTON_SPHERE_RADIUS_RS = 1.5
export const ISCO_RADIUS_RS = 3
export const PHOTON_CRITICAL_IMPACT_RS = (3 * Math.sqrt(3)) / 2

export type SchwarzschildMetric = SpacetimeMetric & {
  /** Massa central M [kg]. */
  readonly massKg: number
  /** Raio de Schwarzschild r_s = 2GM/c² [m]. */
  readonly schwarzschildRadiusM: number
}

export function createSchwarzschildMetric(massKg: number): SchwarzschildMetric {
  if (!(massKg > 0)) {
    throw new Error("A métrica de Schwarzschild exige massa central positiva.")
  }

  const rs = schwarzschildRadius(massKg)

  // f(r) = 1 - r_s/r, o "fator de lapso" que codifica dilatação temporal
  // gravitacional e o horizonte (f → 0 quando r → r_s).
  const lapse = (r: number) => 1 - rs / r

  return {
    name: "Schwarzschild (1916)",
    coordinates: ["ct", "r", "θ", "φ"],
    chart: "spherical",
    massKg,
    schwarzschildRadiusM: rs,

    metric(position: Vector4): Matrix4 {
      const r = position[1]
      const theta = position[2]
      const f = lapse(r)
      const sinTheta = Math.sin(theta)

      return [
        [-f, 0, 0, 0],
        [0, 1 / f, 0, 0],
        [0, 0, r * r, 0],
        [0, 0, 0, r * r * sinTheta * sinTheta],
      ]
    },

    // Métrica diagonal ⇒ inversa analítica componente a componente.
    inverseMetric(position: Vector4): Matrix4 {
      const r = position[1]
      const theta = position[2]
      const f = lapse(r)
      const sinTheta = Math.sin(theta)

      return [
        [-1 / f, 0, 0, 0],
        [0, f, 0, 0],
        [0, 0, 1 / (r * r), 0],
        [0, 0, 0, 1 / (r * r * sinTheta * sinTheta)],
      ]
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        { min: -Infinity, max: Infinity },
        // Exterior apenas: as coordenadas de Schwarzschild degeneram em r = r_s.
        { min: rs, max: Infinity },
        // θ ∈ (0, π): os polos são singularidades de coordenada (g_φφ = 0).
        { min: 0, max: Math.PI },
        { min: -Infinity, max: Infinity },
      ]
    },

    /**
     * Símbolos de Christoffel analíticos do exterior de Schwarzschild.
     * Referência: MTW (1973), eq. 25.22; convenção Γ^μ_{αβ} simétrico em α,β.
     * Componentes não nulas (com f = 1 - r_s/r):
     *   Γ^t_{tr} = r_s / (2 r² f)
     *   Γ^r_{tt} = f r_s / (2 r²)
     *   Γ^r_{rr} = -r_s / (2 r² f)
     *   Γ^r_{θθ} = -r f
     *   Γ^r_{φφ} = -r f sin²θ
     *   Γ^θ_{rθ} = 1/r
     *   Γ^θ_{φφ} = -sinθ cosθ
     *   Γ^φ_{rφ} = 1/r
     *   Γ^φ_{θφ} = cotθ
     */
    christoffel(position: Vector4): Rank3 {
      const r = position[1]
      const theta = position[2]
      const f = lapse(r)
      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)

      const gamma = zeroRank3()
      const T = 0
      const R = 1
      const THETA = 2
      const PHI = 3

      gamma[T][T][R] = rs / (2 * r * r * f)
      gamma[T][R][T] = gamma[T][T][R]

      gamma[R][T][T] = (f * rs) / (2 * r * r)
      gamma[R][R][R] = -rs / (2 * r * r * f)
      gamma[R][THETA][THETA] = -r * f
      gamma[R][PHI][PHI] = -r * f * sinTheta * sinTheta

      gamma[THETA][R][THETA] = 1 / r
      gamma[THETA][THETA][R] = 1 / r
      gamma[THETA][PHI][PHI] = -sinTheta * cosTheta

      gamma[PHI][R][PHI] = 1 / r
      gamma[PHI][PHI][R] = 1 / r
      gamma[PHI][THETA][PHI] = cosTheta / sinTheta
      gamma[PHI][PHI][THETA] = cosTheta / sinTheta

      return gamma
    },
  }
}
