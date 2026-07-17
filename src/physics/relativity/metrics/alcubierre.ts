/**
 * Métrica de Alcubierre (1994) — a "bolha warp": solução EXATA das equações
 * de Einstein lidas ao contrário (escolhe-se a geometria; as equações de
 * campo ditam a matéria necessária).
 *
 * Referências: Alcubierre, Class. Quantum Grav. 11, L73 (1994);
 * Ford & Roman, Phys. Rev. D 53, 5496 (1996) (desigualdades quânticas);
 * van den Broeck, Class. Quantum Grav. 16, 3973 (1999);
 * Everett, Phys. Rev. D 53, 7365 (1996) (duas bolhas ⇒ CTCs).
 *
 * Elemento de linha (x⁰ = c·t em metros; β = v_bolha/c; carta cartesiana):
 *
 *   ds² = −(dx⁰)² + (dx − β·f(r)·dx⁰)² + dy² + dz²
 *
 * com r = distância ao CENTRO da bolha x_c(x⁰) = β·x⁰ e função de forma
 *
 *   f(r) = [tanh(σ(r+R)) − tanh(σ(r−R))] / (2·tanh(σR)),  σ = 1/(espessura)
 *
 * (f(0) = 1 exato; f → 0 longe). Propriedades notáveis, todas verificadas
 * pelos testes:
 *
 * - det g = −1 em TODA PARTE (fatias t = const são euclidianas, como em
 *   Painlevé–Gullstrand): não há singularidade de coordenada, nem para β>1;
 * - o observador euleriano n^μ = (1, β·f, 0, 0) tem norma −1 EXATA em
 *   qualquer ponto ⇒ dτ = dt para o piloto no centro: viagem (até
 *   superluminal) SEM dilatação do tempo — nenhum paradoxo dos gêmeos;
 * - o centro da bolha é uma GEODÉSICA: o piloto viaja em queda livre,
 *   aceleração própria zero, mesmo "acelerando" no referencial distante;
 * - o preço: a densidade de energia vista pelos observadores eulerianos
 *   (Alcubierre 1994, eq. 19) é
 *
 *     ρ_E = −(c⁴/32πG)·β²·(df/dr)²·(y²+z²)/r²  ≤ 0
 *
 *   — NEGATIVA na parede da bolha (NEC violada; matéria exótica). A fatura
 *   total E = ∫ρ_E d³x (fatias planas ⇒ √h = 1) reduz-se à integral radial
 *   E = −(c⁴β²/12G)·∫(df/dr)²·r²dr, computada aqui por Simpson.
 *
 * Christoffels ANALÍTICOS: g depende da posição apenas via F ≡ β·f(r), com
 * ∂F obtido pela regra da cadeia — precisão de máquina, sem ruído de FD.
 */

import { GRAVITATIONAL_CONSTANT, SPEED_OF_LIGHT } from "../../constants"
import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Rank3, Vector4 } from "../tensor"
import { zeroRank3 } from "../tensor"

export type AlcubierreMetric = SpacetimeMetric & {
  /** Velocidade da bolha em frações de c (pode exceder 1). */
  readonly betaWarp: number
  /** Raio da bolha R [m]. */
  readonly bubbleRadiusM: number
  /** Espessura da parede 1/σ [m]. */
  readonly wallWidthM: number
  /** Centro da bolha x_c = β·x⁰ [m]. */
  bubbleCenterXM(ct: number): number
  /** Função de forma f(r) (1 no centro, 0 longe). */
  shapeAt(rM: number): number
  /** ρ dos observadores eulerianos na 4-posição dada [J/m³] (eq. 19). */
  eulerianDensityJm3(position: Vector4): number
  /** ρ no pior ponto da parede (r = R, equador da bolha) [J/m³]. */
  readonly wallDensityJm3: number
  /** Fatura total: E = ∫ρ_E d³x [J] (< 0) e massa equivalente [kg]. */
  readonly exoticEnergyJ: number
  readonly exoticMassKg: number
}

const DENSITY_FACTOR = SPEED_OF_LIGHT ** 4 / (32 * Math.PI * GRAVITATIONAL_CONSTANT)

export function createAlcubierreMetric(
  betaWarp: number,
  bubbleRadiusM: number,
  wallWidthM: number,
): AlcubierreMetric {
  if (!(betaWarp > 0) || !(bubbleRadiusM > 0) || !(wallWidthM > 0)) {
    throw new Error("Alcubierre exige β > 0, R > 0 e espessura de parede > 0.")
  }

  const beta = betaWarp
  const sigma = 1 / wallWidthM
  const norm = 2 * Math.tanh(sigma * bubbleRadiusM)

  const sech2 = (x: number) => {
    const c = Math.cosh(x)
    return 1 / (c * c)
  }
  const shapeAt = (r: number) =>
    (Math.tanh(sigma * (r + bubbleRadiusM)) - Math.tanh(sigma * (r - bubbleRadiusM))) / norm
  /** df/dr [1/m] (= 0 exato em r = 0: f é par). */
  const shapeRateAt = (r: number) =>
    (sigma * (sech2(sigma * (r + bubbleRadiusM)) - sech2(sigma * (r - bubbleRadiusM)))) / norm

  const bubbleCenterXM = (ct: number) => beta * ct

  /** F ≡ β·f(r) e suas derivadas parciais ∂_μF na 4-posição dada. */
  function warpFactor(position: Vector4): { F: number; dF: Vector4 } {
    const dx = position[1] - bubbleCenterXM(position[0])
    const y = position[2]
    const z = position[3]
    const r = Math.sqrt(dx * dx + y * y + z * z)
    const F = beta * shapeAt(r)
    if (r < 1e-9 * bubbleRadiusM) {
      // f'(r)/r → f''(0) finito, mas aqui Δx = y = z = 0 ⇒ ∂F = 0.
      return { F, dF: [0, 0, 0, 0] }
    }
    const common = (beta * shapeRateAt(r)) / r
    return { F, dF: [common * (-beta * dx), common * dx, common * y, common * z] }
  }

  // Integral radial da fatura: E = −(c⁴β²/12G)·∫(f′)²r²dr (Simpson).
  const integrationMin = Math.max(0, bubbleRadiusM - 12 * wallWidthM)
  const integrationMax = bubbleRadiusM + 12 * wallWidthM
  const SIMPSON_STEPS = 2000
  let radialIntegral = 0
  const h = (integrationMax - integrationMin) / SIMPSON_STEPS
  for (let i = 0; i <= SIMPSON_STEPS; i += 1) {
    const r = integrationMin + i * h
    const weight = i === 0 || i === SIMPSON_STEPS ? 1 : i % 2 === 1 ? 4 : 2
    radialIntegral += weight * shapeRateAt(r) ** 2 * r * r
  }
  radialIntegral *= h / 3
  const exoticEnergyJ =
    -((SPEED_OF_LIGHT ** 4 * beta * beta) / (12 * GRAVITATIONAL_CONSTANT)) * radialIntegral

  return {
    name: "Alcubierre (1994)",
    coordinates: ["ct", "x", "y", "z"],
    chart: "cartesian",
    // A bolha se move (∂₀g ≠ 0) e é localizada (nenhuma simetria espacial exata).
    symmetries: { stationary: false, axisymmetric: false },
    betaWarp: beta,
    bubbleRadiusM,
    wallWidthM,
    bubbleCenterXM,
    shapeAt,
    wallDensityJm3: -DENSITY_FACTOR * beta * beta * shapeRateAt(bubbleRadiusM) ** 2,
    exoticEnergyJ,
    exoticMassKg: exoticEnergyJ / SPEED_OF_LIGHT ** 2,

    metric(position: Vector4): Matrix4 {
      const { F } = warpFactor(position)
      return [
        [F * F - 1, -F, 0, 0],
        [-F, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]
    },

    inverseMetric(position: Vector4): Matrix4 {
      // det do bloco (0,1) = −1 exato ⇒ inversa analítica.
      const { F } = warpFactor(position)
      return [
        [-1, -F, 0, 0],
        [-F, 1 - F * F, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
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
      // Γ^μ_αβ = ½·g^μν·(∂_α g_νβ + ∂_β g_να − ∂_ν g_αβ), com ∂g analítico:
      // só g_00 = F²−1 e g_01 = −F variam: ∂g_00 = 2F·∂F, ∂g_01 = −∂F.
      const { F, dF } = warpFactor(position)
      const dg = (mu: number, a: number, b: number): number => {
        if (a === 0 && b === 0) return 2 * F * dF[mu]
        if ((a === 0 && b === 1) || (a === 1 && b === 0)) return -dF[mu]
        return 0
      }
      // g^μν analítica (mesma expressão de inverseMetric).
      const gInv: Matrix4 = [
        [-1, -F, 0, 0],
        [-F, 1 - F * F, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]

      const gamma = zeroRank3()
      for (let mu = 0; mu < 4; mu += 1) {
        for (let alpha = 0; alpha < 4; alpha += 1) {
          for (let betaI = alpha; betaI < 4; betaI += 1) {
            let sum = 0
            // ν varre TODAS as direções: os dois primeiros termos só são
            // não-nulos para ν ∈ {0,1} (bloco variável de g), mas o terceiro,
            // −∂_ν g_αβ, é não-nulo também para ν ∈ {y, z} (∂F transversal).
            for (let nu = 0; nu < 4; nu += 1) {
              sum +=
                gInv[mu][nu] * (dg(alpha, nu, betaI) + dg(betaI, nu, alpha) - dg(nu, alpha, betaI))
            }
            gamma[mu][alpha][betaI] = 0.5 * sum
            gamma[mu][betaI][alpha] = 0.5 * sum
          }
        }
      }
      return gamma
    },

    eulerianDensityJm3(position: Vector4): number {
      const dx = position[1] - bubbleCenterXM(position[0])
      const y = position[2]
      const z = position[3]
      const r2 = dx * dx + y * y + z * z
      if (r2 === 0) {
        return 0
      }
      const r = Math.sqrt(r2)
      return -DENSITY_FACTOR * beta * beta * shapeRateAt(r) ** 2 * ((y * y + z * z) / r2)
    },
  }
}
