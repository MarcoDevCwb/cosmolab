/**
 * Métrica FLRW plana (Friedmann–Lemaître–Robertson–Walker) — o universo em
 * expansão. A PRIMEIRA métrica não-estacionária do CosmoLab.
 *
 * Referências: Friedmann, Z. Phys. 10, 377 (1922); Lemaître (1927);
 * Robertson–Walker (1935-36); Weinberg, "Cosmology" (2008), cap. 1;
 * Planck Collaboration 2018 (parâmetros ΛCDM).
 *
 * Elemento de linha (k = 0, coordenadas comóveis cartesianas, x⁰ = c·t):
 *
 *   ds² = −(c dt)² + a(t)²·(dx² + dy² + dz²)
 *
 * Universo de matéria + constante cosmológica (Ω_m + Ω_Λ = 1), com a
 * SOLUÇÃO EXATA da equação de Friedmann:
 *
 *   a(t) = (Ω_m/Ω_Λ)^{1/3} · sinh^{2/3}( (3/2)·√Ω_Λ·H₀·t )
 *
 * normalizada para a(t₀) = 1 hoje. Consequências físicas expostas no app:
 * - REDSHIFT cosmológico: fótons perdem energia como 1/a (1+z = a₀/a_e);
 * - NÃO há vetor de Killing temporal: E = −g₀μu^μ NÃO se conserva (a
 *   "deriva de E" vista no painel é FÍSICA, não erro) — o conservado é o
 *   momento comóvel p = a²·u^x, monitorado pelo cenário;
 * - Big Bang em t = 0: fronteira real do domínio (a → 0, curvatura → ∞).
 *
 * Christoffels analíticos (com a' = da/dx⁰):
 *   Γ⁰_{ij} = a·a'·δ_ij      Γ^i_{0j} = Γ^i_{j0} = (a'/a)·δ_ij
 *
 * Unidades SI: x⁰ e coordenadas comóveis em metros; a adimensional;
 * H₀ [1/s] → H₀/c [1/m] internamente.
 */

import { SPEED_OF_LIGHT } from "../../constants"
import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Rank3, Vector4 } from "../tensor"
import { zeroRank3 } from "../tensor"

export type FlrwMetric = SpacetimeMetric & {
  /** Constante de Hubble hoje [1/s]. */
  readonly hubbleTodayPerSecond: number
  /** Fração de matéria Ω_m (Ω_Λ = 1 − Ω_m). */
  readonly omegaMatter: number
  /** Fator de escala a(x⁰) (a = 1 hoje). */
  scaleFactorAt(ct: number): number
  /** Idade do universo hoje, como x⁰ = c·t₀ [m]. */
  readonly nowCtM: number
  /** Comprimento de Hubble c/H₀ [m] (escala natural das distâncias). */
  readonly hubbleLengthM: number
}

export function createFlrwMetric(
  hubbleTodayPerSecond: number,
  omegaMatter: number,
): FlrwMetric {
  if (!(omegaMatter > 0 && omegaMatter < 1)) {
    throw new Error("FLRW matéria+Λ exige 0 < Ω_m < 1 (plano, com Ω_Λ = 1 − Ω_m).")
  }

  const omegaLambda = 1 - omegaMatter
  const hubblePerMeter = hubbleTodayPerSecond / SPEED_OF_LIGHT
  const amplitude = Math.cbrt(omegaMatter / omegaLambda)
  const rate = 1.5 * Math.sqrt(omegaLambda) * hubblePerMeter // [1/m]

  const scaleFactorAt = (ct: number) => amplitude * Math.sinh(rate * ct) ** (2 / 3)
  // da/dx⁰ analítico.
  const scaleFactorRateAt = (ct: number) =>
    amplitude * (2 / 3) * Math.sinh(rate * ct) ** (-1 / 3) * Math.cosh(rate * ct) * rate

  // a(t₀) = 1 ⇒ t₀ = asinh(√(Ω_Λ/Ω_m))/rate (idade do universo).
  const nowCtM = Math.asinh(Math.sqrt(omegaLambda / omegaMatter)) / rate

  return {
    name: "FLRW (1922)",
    coordinates: ["ct", "x", "y", "z"],
    chart: "cartesian",
    // NÃO-estacionária (∂₀g ≠ 0); homogênea ⇒ ∂_z g = 0 exato.
    symmetries: { stationary: false, axisymmetric: true },
    hubbleTodayPerSecond,
    omegaMatter,
    scaleFactorAt,
    nowCtM,
    hubbleLengthM: 1 / hubblePerMeter,

    metric(position: Vector4): Matrix4 {
      const a2 = scaleFactorAt(position[0]) ** 2
      return [
        [-1, 0, 0, 0],
        [0, a2, 0, 0],
        [0, 0, a2, 0],
        [0, 0, 0, a2],
      ]
    },

    inverseMetric(position: Vector4): Matrix4 {
      const inv = 1 / scaleFactorAt(position[0]) ** 2
      return [
        [-1, 0, 0, 0],
        [0, inv, 0, 0],
        [0, 0, inv, 0],
        [0, 0, 0, inv],
      ]
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        // Big Bang em x⁰ = 0: fronteira REAL (curvatura diverge).
        { min: 0, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
      ]
    },

    christoffel(position: Vector4): Rank3 {
      const a = scaleFactorAt(position[0])
      const aPrime = scaleFactorRateAt(position[0])
      const gamma = zeroRank3()
      const hubbleTerm = aPrime / a

      for (let i = 1; i < 4; i += 1) {
        gamma[0][i][i] = a * aPrime
        gamma[i][0][i] = hubbleTerm
        gamma[i][i][0] = hubbleTerm
      }

      return gamma
    },
  }
}
