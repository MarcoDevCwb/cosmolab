/**
 * Métrica de Painlevé–Gullstrand (PG) — a geometria de Schwarzschild em
 * coordenadas REGULARES no horizonte.
 *
 * Referências: P. Painlevé, C. R. Acad. Sci. 173, 677 (1921);
 * A. Gullstrand, Ark. Mat. Astron. Fys. 16, 1 (1922);
 * Martel & Poisson, "Regular coordinate systems for Schwarzschild and
 * other spherical spacetimes", Am. J. Phys. 69, 476 (2001).
 *
 * Elemento de linha (ct → c·T, assinatura -,+,+,+, f = 1 − r_s/r):
 *
 *   ds² = −f·(c dT)² + 2√(r_s/r)·(c dT)·dr + dr² + r² dθ² + r² sin²θ dφ²
 *
 * Significado físico: T é o tempo próprio dos observadores "de chuva"
 * (em queda livre a partir do repouso no infinito). É a MESMA geometria de
 * Schwarzschild — mesma curvatura, mesmos invariantes — em outra carta:
 *
 * - Nenhuma componente diverge em r = r_s: o "congelamento" no horizonte
 *   era artefato das coordenadas de Schwarzschild, não física.
 * - As fatias T = const são EXATAMENTE euclidianas (dσ² = dr² + r²dΩ²):
 *   o espaço "plano" da renderização é a representação honesta desta carta.
 * - Domínio: 0 < r < ∞ — a integração atravessa o horizonte e só encontra
 *   problema real na singularidade de curvatura em r = 0.
 *
 * ∂_T e ∂_φ continuam sendo vetores de Killing (métrica estacionária e
 * axissimétrica): E = −g_{Tμ}u^μ e L = g_{φμ}u^μ seguem conservados.
 *
 * Implementada como PLUGIN (sem Christoffels analíticos): diferenças
 * finitas + simetrias + DP5(4) adaptativo fazem o resto.
 *
 * Unidades SI: r e c·T em metros; θ, φ em radianos.
 */

import { schwarzschildRadius } from "../../constants"
import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Vector4 } from "../tensor"

export type PainleveGullstrandMetric = SpacetimeMetric & {
  readonly massKg: number
  readonly schwarzschildRadiusM: number
}

export function createPainleveGullstrandMetric(massKg: number): PainleveGullstrandMetric {
  if (!(massKg > 0)) {
    throw new Error("A métrica de Painlevé–Gullstrand exige massa central positiva.")
  }

  const rs = schwarzschildRadius(massKg)

  return {
    name: "Painlevé–Gullstrand (1921)",
    coordinates: ["cT", "r", "θ", "φ"],
    chart: "spherical",
    symmetries: { stationary: true, axisymmetric: true },
    massKg,
    schwarzschildRadiusM: rs,

    metric(position: Vector4): Matrix4 {
      const r = position[1]
      const theta = position[2]
      const beta = Math.sqrt(rs / r) // velocidade da "chuva" em unidades de c
      const sinTheta = Math.sin(theta)

      return [
        [-(1 - rs / r), beta, 0, 0],
        [beta, 1, 0, 0],
        [0, 0, r * r, 0],
        [0, 0, 0, r * r * sinTheta * sinTheta],
      ]
    },

    // Inversa analítica: o bloco T–r tem determinante EXATAMENTE −1
    // (−f·1 − β² = −(1 − r_s/r) − r_s/r = −1), daí a forma fechada simples.
    inverseMetric(position: Vector4): Matrix4 {
      const r = position[1]
      const theta = position[2]
      const beta = Math.sqrt(rs / r)
      const sinTheta = Math.sin(theta)

      return [
        [-1, beta, 0, 0],
        [beta, 1 - rs / r, 0, 0],
        [0, 0, 1 / (r * r), 0],
        [0, 0, 0, 1 / (r * r * sinTheta * sinTheta)],
      ]
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        { min: -Infinity, max: Infinity },
        // Regular no horizonte: só a singularidade de curvatura r = 0 limita.
        { min: 0, max: Infinity },
        { min: 0, max: Math.PI },
        { min: -Infinity, max: Infinity },
      ]
    },
  }
}
