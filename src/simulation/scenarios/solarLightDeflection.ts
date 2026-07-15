/**
 * Cenário 2 — Deflexão gravitacional da luz.
 *
 * Física: um fóton com parâmetro de impacto b é defletido pela massa central.
 * Previsão em campo fraco (Einstein 1915; confirmada por Eddington, 1919):
 *
 *   α = 4GM / (c² b) = 2 r_s / b
 *
 * Para o preset solar (M = 1 M☉, b = R☉ ≈ 235.700 r_s): α ≈ 1,75″.
 * Reduzindo b em direção a b_c = (3√3/2) r_s ≈ 2,6 r_s, a deflexão cresce
 * sem limite — abaixo de b_c o fóton é CAPTURADO (cruza a esfera de fótons
 * e cai no horizonte). Referência: Weinberg (1972), §8.5; MTW §25.6.
 *
 * O motor integra a geodésica nula exata de Schwarzschild, sem aproximação
 * de campo fraco: o regime forte emerge naturalmente dos mesmos Γ.
 */

import { SOLAR_MASS_KG, SOLAR_RADIUS_M, schwarzschildRadius } from "../../physics/constants"
import { equatorialStateFromCartesian } from "../../physics/relativity/equatorial"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import { createDeflectionTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** b = R☉ expresso em r_s do Sol — o preset histórico de Eddington. */
export const SOLAR_IMPACT_PARAMETER_RS = SOLAR_RADIUS_M / schwarzschildRadius(SOLAR_MASS_KG)

/** Distância de partida, em múltiplos de b (região assintoticamente plana). */
const START_DISTANCE_IN_B = 60
/** Duração-alvo da travessia na tela [s de tempo real]. */
const CROSSING_WALL_TIME_S = 25

export function createLightDeflectionScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM
  const b = params.impactParameterRs * rs
  const startX = -START_DISTANCE_IN_B * b
  const pathLengthM = 2 * START_DISTANCE_IN_B * b

  const deflectionArcsec = ((2 * rs) / b) * (180 / Math.PI) * 3600

  return {
    id: "solar-light-deflection",
    label: "Deflexão da luz",
    scientificStatus: "validated",
    references: [
      "Weinberg, S. — Gravitation and Cosmology (1972), §8.5",
      "Dyson, Eddington & Davidson — Phil. Trans. R. Soc. A 220 (1920)",
    ],
    description:
      "Geodésica nula exata de Schwarzschild para um fóton com parâmetro de impacto b ajustável. Aproxime b de 2,6 r_s e veja a captura.",
    expectation: `Campo fraco: α = 2·r_s/b ≈ ${
      deflectionArcsec >= 3600
        ? `${(deflectionArcsec / 3600).toFixed(2)}°`
        : `${deflectionArcsec.toFixed(2)}″`
    } de deflexão total.`,

    metric,
    kind: "null",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    initialState: equatorialStateFromCartesian(metric, startX, b, 1, 0, "null"),

    createObservables: () =>
      createDeflectionTracker(
        equatorialStateFromCartesian(metric, startX, b, 1, 0, "null"),
        (2 * rs) / b,
      ),

    stepLambdaM: b / 200,
    lambdaRateMPerSecond: pathLengthM / CROSSING_WALL_TIME_S,
    sampleIntervalLambdaM: b / 4,
    maxSamples: 600,
    renderScaleM: (START_DISTANCE_IN_B * b) / 8,

    // Para após a passagem: r crescente além da janela de partida.
    stopCondition: (state) => state[1] > Math.abs(startX) * 1.05 && state[5] > 0,
  }
}
