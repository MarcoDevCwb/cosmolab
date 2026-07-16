/**
 * Universo de Gödel — solução exata com CURVAS TEMPORAIS FECHADAS (CTCs).
 *
 * Referências: K. Gödel, Rev. Mod. Phys. 21, 447 (1949);
 * Hawking & Ellis, "The Large Scale Structure of Space-Time" (1973), §5.7.
 *
 * Solução exata das equações de Einstein com poeira em rotação rígida e
 * constante cosmológica negativa. Em coordenadas cilíndricas adaptadas
 * (forma de Hawking–Ellis), com escala a [m] e χ = r/(√2 a):
 *
 *   g_tt = −1        g_rr = g_zz = 1
 *   g_tφ = 2a·sinh²χ                        [m]
 *   g_φφ = 2a²·sinh²χ·(1 − sinh²χ)          [m²]
 *
 * A CONDIÇÃO MATEMÁTICA DAS CTCs: φ é periódico (φ ~ φ + 2π), então a
 * curva {t, r, z constantes; φ variando} é FECHADA por construção, e seu
 * vetor tangente é ∂_φ com norma g_φφ. Quando
 *
 *   g_φφ < 0   ⇔   sinh²χ > 1   ⇔   r > r_CTC = √2·a·arcsinh(1)
 *
 * esse círculo fechado torna-se TEMPORAL: uma curva temporal fechada.
 * Quem a percorre volta ao próprio passado — mas ela NÃO é geodésica:
 * exige aceleração própria (propulsão) enorme (Malament 1985). Geodésicas
 * de Gödel são limitadas e não formam CTCs.
 *
 * Estrutura: estacionária e axissimétrica (E e L conservados); o bloco
 * t–φ tem det = −2a²sinh²χ(1 + sinh²χ) < 0 em toda parte — a assinatura
 * permanece Lorentziana mesmo dentro da região de CTCs.
 *
 * Status científico: TEÓRICO — solução exata da RG, incompatível com a
 * cosmologia observada (não expande; rotação global não detectada).
 *
 * Unidades SI: x⁰ = c·t, r, z em metros; φ em radianos; a [m] é a escala
 * de rotação (ω_Gödel = c/(√2·a)).
 */

import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Vector4 } from "../tensor"

export type GodelMetric = SpacetimeMetric & {
  /** Escala de rotação a [m]. */
  readonly rotationScaleM: number
  /** Raio crítico das CTCs: r_CTC = √2·a·arcsinh(1) [m]. */
  readonly ctcRadiusM: number
  /** Velocidade angular do universo ω = c/(√2 a), como dφ/d(ct) [1/m]. */
  readonly omegaPerMeter: number
}

export function createGodelMetric(rotationScaleM: number): GodelMetric {
  if (!(rotationScaleM > 0)) {
    throw new Error("A métrica de Gödel exige escala de rotação positiva.")
  }

  const a = rotationScaleM
  const sqrt2a = Math.SQRT2 * a
  const chiOf = (r: number) => r / sqrt2a

  return {
    name: "Gödel (1949)",
    coordinates: ["ct", "r", "z", "φ"],
    chart: "cylindrical",
    symmetries: { stationary: true, axisymmetric: true },
    rotationScaleM: a,
    ctcRadiusM: sqrt2a * Math.asinh(1),
    omegaPerMeter: 1 / sqrt2a,

    metric(position: Vector4): Matrix4 {
      const sinhChi = Math.sinh(chiOf(position[1]))
      const sh2 = sinhChi * sinhChi
      const gtphi = 2 * a * sh2
      const gphiphi = 2 * a * a * sh2 * (1 - sh2)

      return [
        [-1, 0, 0, gtphi],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [gtphi, 0, 0, gphiphi],
      ]
    },

    // Bloco t–φ 2×2 com det = −2a²sh²(1+sh²); r e z diagonais.
    inverseMetric(position: Vector4): Matrix4 {
      const sinhChi = Math.sinh(chiOf(position[1]))
      const sh2 = sinhChi * sinhChi
      const gtphi = 2 * a * sh2
      const gphiphi = 2 * a * a * sh2 * (1 - sh2)
      const det = -gphiphi - gtphi * gtphi

      return [
        [gphiphi / det, 0, 0, -gtphi / det],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [-gtphi / det, 0, 0, -1 / det],
      ]
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        { min: -Infinity, max: Infinity },
        // r = 0 é o eixo (singularidade de coordenada, como um polo).
        { min: 0, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
      ]
    },
  }
}
