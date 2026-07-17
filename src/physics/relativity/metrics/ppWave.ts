/**
 * Onda gravitacional plana EXATA (pp-wave em coordenadas de Brinkmann).
 *
 * Referências: Brinkmann, Math. Ann. 94, 119 (1925); Bondi, Pirani &
 * Robinson, Proc. R. Soc. A 251, 519 (1959) (ondas exatas transportam
 * energia — argumento da "conta pegajosa" de Feynman/Bondi); Penrose,
 * Rev. Mod. Phys. 37, 215 (1965); MTW cap. 35; Abbott et al. (LIGO/Virgo),
 * PRL 116, 061102 (2016) — GW150914.
 *
 * Elemento de linha (x⁰ = c·t em metros; u = (x⁰ − z)/√2 é a fase nula):
 *
 *   ds² = −(dx⁰)² + dx² + dy² + dz² + H(u, x, y)·du²
 *
 *   H = A₊(u)·(x² − y²) + 2·A×(u)·x·y        [A em 1/m²]
 *
 * Fatos exatos, verificados pelos testes:
 *
 * - VÁCUO EXATO para QUALQUER perfil A₊(u), A×(u): R_μν ∝ ∇⊥²H = 0 porque
 *   x²−y² e xy são harmônicos. Não é teoria linearizada — é solução plena
 *   de Einstein, com o motor conferindo G_μν ≈ 0 dentro da onda;
 * - det g = −1 em toda parte (bloco (x⁰,z) tem det −1 exato);
 * - VSI: TODOS os invariantes escalares polinomiais se anulam (R = 0,
 *   K = 0, ...) embora Riemann ≠ 0 — nenhum "detector de invariantes"
 *   enxerga a onda; só o DESVIO GEODÉSICO (o anel de massas) a sente.
 *   É por isso que LIGO mede distâncias, não curvaturas escalares;
 * - ∂_v é vetor de Killing NULO ⇒ p_v = (u³ − u⁰)/√2 é conservado
 *   exatamente ao longo de geodésicas (o "E" desta geometria);
 * - em Brinkmann as coordenadas transversais são DISTÂNCIA PRÓPRIA
 *   (g_xx = g_yy = 1): partículas livres se MOVEM em coordenadas — o
 *   oposto do calibre TT, onde coordenadas ficam paradas e a métrica
 *   oscila. Mesma física, duas cartas (tema do Atlas).
 *
 * Relação com a teoria linearizada (para |h| ≪ 1, envelope lento):
 * A₊(u) ≈ −½·d²h₊/du² — o cenário usa isso para ligar A(u) a um chirp
 * de inspiral. A geometria é exata SEJA QUAL FOR A(u).
 *
 * Christoffels ANALÍTICOS via ∂H em cadeia (∂g = ±½∂H no bloco (0,3)).
 */

import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Rank3, Vector4 } from "../tensor"
import { zeroRank3 } from "../tensor"

/** Perfil da onda na fase u [m]: amplitudes A [1/m²] e derivadas dA/du. */
export type PpWaveProfile = (u: number) => {
  aPlus: number
  aCross: number
  aPlusPrime: number
  aCrossPrime: number
}

export type PpWaveMetric = SpacetimeMetric & {
  /** Fase nula u = (x⁰ − z)/√2 [m]. */
  phaseAt(position: Vector4): number
  /** H(u, x, y) — o potencial da onda (adimensional). */
  waveFunctionAt(position: Vector4): number
  readonly profile: PpWaveProfile
}

const INV_SQRT2 = 1 / Math.SQRT2

export function createPpWaveMetric(profile: PpWaveProfile): PpWaveMetric {
  const phaseAt = (position: Vector4) => (position[0] - position[3]) * INV_SQRT2

  /** H e suas quatro derivadas parciais analíticas. */
  function wave(position: Vector4): { H: number; dH: Vector4 } {
    const u = phaseAt(position)
    const x = position[1]
    const y = position[2]
    const { aPlus, aCross, aPlusPrime, aCrossPrime } = profile(u)

    const H = aPlus * (x * x - y * y) + 2 * aCross * x * y
    const dHdu = aPlusPrime * (x * x - y * y) + 2 * aCrossPrime * x * y

    return {
      H,
      dH: [
        dHdu * INV_SQRT2,
        2 * aPlus * x + 2 * aCross * y,
        -2 * aPlus * y + 2 * aCross * x,
        -dHdu * INV_SQRT2,
      ],
    }
  }

  return {
    name: "pp-wave (Brinkmann 1925)",
    coordinates: ["ct", "x", "y", "z"],
    chart: "cartesian",
    // H depende de u = (x⁰−z)/√2 e de (x, y): nenhuma simetria dos flags.
    symmetries: { stationary: false, axisymmetric: false },
    profile,
    phaseAt,
    waveFunctionAt: (position) => wave(position).H,

    metric(position: Vector4): Matrix4 {
      const { H } = wave(position)
      const half = H / 2
      return [
        [-1 + half, 0, 0, -half],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [-half, 0, 0, 1 + half],
      ]
    },

    inverseMetric(position: Vector4): Matrix4 {
      // Bloco (x⁰,z) com det = −1 exato ⇒ inversa analítica.
      const { H } = wave(position)
      const half = H / 2
      return [
        [-1 - half, 0, 0, -half],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [-half, 0, 0, 1 - half],
      ]
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
        { min: -Infinity, max: Infinity },
      ]
    },

    christoffel(position: Vector4): Rank3 {
      // Γ^μ_αβ = ½ g^μν (∂_α g_νβ + ∂_β g_να − ∂_ν g_αβ); as únicas
      // componentes variáveis de g são o bloco {(0,0), (0,3), (3,3)},
      // todas ±H/2. O índice contraído ν varre TODAS as direções (o
      // termo −∂_ν g_αβ é não-nulo também para ν transversal).
      const { H, dH } = wave(position)
      const half = H / 2
      const dg = (mu: number, a: number, b: number): number => {
        if (a === 0 && b === 0) return 0.5 * dH[mu]
        if ((a === 0 && b === 3) || (a === 3 && b === 0)) return -0.5 * dH[mu]
        if (a === 3 && b === 3) return 0.5 * dH[mu]
        return 0
      }
      const gInv: Matrix4 = [
        [-1 - half, 0, 0, -half],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [-half, 0, 0, 1 - half],
      ]

      const gamma = zeroRank3()
      for (let mu = 0; mu < 4; mu += 1) {
        for (let alpha = 0; alpha < 4; alpha += 1) {
          for (let beta = alpha; beta < 4; beta += 1) {
            let sum = 0
            for (let nu = 0; nu < 4; nu += 1) {
              sum += gInv[mu][nu] * (dg(alpha, nu, beta) + dg(beta, nu, alpha) - dg(nu, alpha, beta))
            }
            gamma[mu][alpha][beta] = 0.5 * sum
            gamma[mu][beta][alpha] = 0.5 * sum
          }
        }
      }
      return gamma
    },
  }
}

/** Constante de Killing nula da pp-wave: p_v = ξ_μ u^μ com ξ = ∂_v.
 * Como g_0μ + g_3μ = (−1, 0, 0, 1) exato, p_v = (u³ − u⁰)/√2. */
export function killingMomentumV(state: readonly number[]): number {
  return (state[7] - state[4]) * INV_SQRT2
}
