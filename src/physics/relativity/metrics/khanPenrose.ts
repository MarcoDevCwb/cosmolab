/**
 * Khan–Penrose (1971) — COLISÃO de duas ondas gravitacionais planas
 * impulsivas. A solução exata que mostra a não-linearidade da gravidade:
 * cada onda, sozinha, é inofensiva (regiões II/III são planas exceto no
 * impulso); juntas, criam uma SINGULARIDADE de curvatura em u² + v² = 1.
 *
 * Referências: Khan & Penrose, Nature 229, 185 (1971); Szekeres,
 * J. Math. Phys. 13, 286 (1972); Ferrari & Ibañez, Gen. Rel. Grav. 19,
 * 405 (1987) (região de interação ≅ interior de Schwarzschild);
 * Griffiths, "Colliding Plane Waves in General Relativity" (1991).
 *
 * Estrutura em coordenadas nulas adimensionais u = (x⁰−z)/(√2·a),
 * v = (x⁰+z)/(√2·a), com a = escala focal [m] e Heaviside ũ = max(u,0):
 *
 *   Região I   (u<0, v<0): Minkowski exato;
 *   Região II  (u>0, v<0): onda impulsiva em forma de Rosen,
 *                          ds² = 2dudv − (1−u)²dx² − (1+u)²dy²;
 *   Região III (u<0, v>0): espelho de II (x ↔ y);
 *   Região IV  (u>0, v>0): interação — vácuo EXATO que colapsa em
 *                          W ≡ 1 − ũ² − ṽ² → 0.
 *
 * Forma métrica (colinear; p = √(1−ũ²), q = √(1−ṽ²), t̃ = ũq + ṽp):
 *
 *   ds² = −F·(dx⁰)² + F·dz² + G·dx² + H·dy²
 *   G = W·(1−t̃)/(1+t̃),  H = W·(1+t̃)/(1−t̃),  G·H = W²  (e^{−U} = W)
 *   F = W^{3/2} / [p·q·(pq + ũṽ)²]
 *
 * A DERIVAÇÃO NESTA BASE: e^{−U} = f(u)+g(v) = W e o limite da região II
 * fixam G e H; o fator conforme F tem duas candidatas algébricas,
 * (pq ± ũṽ)², AMBAS com o limite correto nas regiões I–III. A decisão foi
 * feita pelo MOTOR: apenas (pq + ũṽ)² anula o tensor de Einstein numérico
 * na região IV (teste automatizado) — o laboratório arbitrando sua
 * própria implementação. Em variáveis trigonométricas (u = sin α,
 * v = sin β): pq + ũṽ = cos(α−β), W = cos(α+β)cos(α−β), t̃ = sin(α+β).
 *
 * A singularidade em W → 0 é ANISOTRÓPICA (tipo Kasner): G ~ cos³(α+β) → 0
 * (compressão em x) enquanto H ~ 4cos(α−β)/cos(α+β) → ∞ (estiramento em
 * y) — espaguetificação por pura gravidade, sem massa alguma.
 */

import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Rank3, Vector4 } from "../tensor"
import { zeroRank3 } from "../tensor"

export type KhanPenroseMetric = SpacetimeMetric & {
  /** Escala focal a [m] (define onde fica a singularidade: W = 0). */
  readonly focalScaleM: number
  /** Coordenadas nulas adimensionais (ũ, ṽ) já com Heaviside aplicado. */
  nullCoordinatesAt(position: Vector4): { u: number; v: number }
  /** Fator de área W = 1 − ũ² − ṽ² (0 na singularidade; 1 antes das ondas). */
  areaFactorAt(position: Vector4): number
  /** Fatores próprios transversais (√G, √H): compressão-x e estiramento-y. */
  transverseStretchAt(position: Vector4): { x: number; y: number }
}

/** Guarda numérica: mantém W e (1−t̃) longe de 0 para g finita na borda. */
const SINGULARITY_GUARD = 1e-9

export function createKhanPenroseMetric(
  focalScaleM: number,
  /** Sinal do termo cruzado do fator conforme — exposto SOMENTE para o
   * teste que demonstra o arbítrio numérico ("minus" falha o vácuo). */
  conformalCross: "plus" | "minus" = "plus",
): KhanPenroseMetric {
  if (!(focalScaleM > 0)) {
    throw new Error("Khan–Penrose exige escala focal a > 0.")
  }
  const a = focalScaleM
  const INV = 1 / (Math.SQRT2 * a)
  const crossSign = conformalCross === "plus" ? 1 : -1

  /** F, G, H e suas derivadas analíticas ∂/∂u, ∂/∂v (regra da cadeia sobre
   * W, p, q, t̃, cross; zeradas atrás de cada frente pelo Heaviside). */
  function components(position: Vector4): {
    F: number
    G: number
    H: number
    dF: [number, number]
    dG: [number, number]
    dH: [number, number]
  } {
    const uRaw = (position[0] - position[3]) * INV
    const vRaw = (position[0] + position[3]) * INV
    const u = Math.max(uRaw, 0)
    const v = Math.max(vRaw, 0)
    const uActive = uRaw > 0 ? 1 : 0
    const vActive = vRaw > 0 ? 1 : 0

    const W = Math.max(1 - u * u - v * v, SINGULARITY_GUARD)
    const p = Math.sqrt(Math.max(1 - u * u, SINGULARITY_GUARD))
    const q = Math.sqrt(Math.max(1 - v * v, SINGULARITY_GUARD))
    const t = Math.min(u * q + v * p, 1 - SINGULARITY_GUARD)
    const cross = p * q + crossSign * u * v

    const F = W ** 1.5 / (p * q * cross * cross)
    const G = (W * (1 - t)) / (1 + t)
    const H = (W * (1 + t)) / (1 - t)

    // Derivadas dos escalares (u-lado; o v-lado é o espelho u↔v, p↔q).
    const W_u = -2 * u * uActive
    const W_v = -2 * v * vActive
    const p_u = (-u / p) * uActive
    const q_v = (-v / q) * vActive
    const t_u = (q + v * p_u) * uActive
    const t_v = (p + u * q_v) * vActive
    const cross_u = (q * p_u + crossSign * v) * uActive
    const cross_v = (p * q_v + crossSign * u) * vActive

    // Log-derivadas: F = W^{3/2}/(pq·cross²), G = W(1−t)/(1+t), H espelho.
    const F_u = F * ((1.5 * W_u) / W - p_u / p - (2 * cross_u) / cross)
    const F_v = F * ((1.5 * W_v) / W - q_v / q - (2 * cross_v) / cross)
    const oneMinusT2 = Math.max(1 - t * t, SINGULARITY_GUARD)
    const G_u = G * (W_u / W - (2 * t_u) / oneMinusT2)
    const G_v = G * (W_v / W - (2 * t_v) / oneMinusT2)
    const H_u = H * (W_u / W + (2 * t_u) / oneMinusT2)
    const H_v = H * (W_v / W + (2 * t_v) / oneMinusT2)

    return { F, G, H, dF: [F_u, F_v], dG: [G_u, G_v], dH: [H_u, H_v] }
  }

  return {
    name: "Khan–Penrose (1971)",
    coordinates: ["ct", "x", "y", "z"],
    chart: "cartesian",
    // Depende de x⁰ e z; ∂_x e ∂_y SÃO Killing (simetria plana) mas os
    // flags do motor cobrem apenas ∂_t e a direção 3 (= z aqui): ambos não.
    symmetries: { stationary: false, axisymmetric: false },
    focalScaleM: a,

    nullCoordinatesAt(position: Vector4) {
      return {
        u: Math.max((position[0] - position[3]) * INV, 0),
        v: Math.max((position[0] + position[3]) * INV, 0),
      }
    },

    areaFactorAt(position: Vector4): number {
      const { u, v } = this.nullCoordinatesAt(position)
      return Math.max(1 - u * u - v * v, 0)
    },

    transverseStretchAt(position: Vector4) {
      const { G, H } = components(position)
      return { x: Math.sqrt(G), y: Math.sqrt(H) }
    },

    metric(position: Vector4): Matrix4 {
      const { F, G, H } = components(position)
      return [
        [-F, 0, 0, 0],
        [0, G, 0, 0],
        [0, 0, H, 0],
        [0, 0, 0, F],
      ]
    },

    inverseMetric(position: Vector4): Matrix4 {
      const { F, G, H } = components(position)
      return [
        [-1 / F, 0, 0, 0],
        [0, 1 / G, 0, 0],
        [0, 0, 1 / H, 0],
        [0, 0, 0, 1 / F],
      ]
    },

    christoffel(position: Vector4): Rank3 {
      // Métrica DIAGONAL g = diag(−F, G, H, F) dependente só de (x⁰, z):
      // Γ^m_ab = ½ g^{mm} [δ_{mb}·∂_a g_mm + δ_{ma}·∂_b g_mm − δ_{ab}·∂_m g_aa].
      const { F, G, H, dF, dG, dH } = components(position)
      // ∂/∂x⁰ = (∂_u + ∂_v)·INV;  ∂/∂z = (−∂_u + ∂_v)·INV.
      const toCt = (d: [number, number]) => (d[0] + d[1]) * INV
      const toZ = (d: [number, number]) => (-d[0] + d[1]) * INV

      const diag = [-F, G, H, F]
      // d[i][k] = ∂_k g_ii (k só 0 e 3; direções transversais são Killing).
      const d: number[][] = [
        [-toCt(dF), 0, 0, -toZ(dF)],
        [toCt(dG), 0, 0, toZ(dG)],
        [toCt(dH), 0, 0, toZ(dH)],
        [toCt(dF), 0, 0, toZ(dF)],
      ]

      const gamma = zeroRank3()
      for (let m = 0; m < 4; m += 1) {
        const invDiag = 1 / diag[m]
        for (let alpha = 0; alpha < 4; alpha += 1) {
          for (let beta = alpha; beta < 4; beta += 1) {
            let sum = 0
            if (beta === m) sum += d[m][alpha]
            if (alpha === m) sum += d[m][beta]
            if (alpha === beta) sum -= d[alpha][m]
            const value = 0.5 * invDiag * sum
            gamma[m][alpha][beta] = value
            gamma[m][beta][alpha] = value
          }
        }
      }
      return gamma
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      // A fronteira física real (W = 0) depende de x⁰ E z ao mesmo tempo;
      // caixas por coordenada não a expressam — o cenário usa stopCondition.
      return [
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
      ]
    },
  }
}
