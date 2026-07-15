/**
 * Cenário 2 — Deflexão gravitacional da luz pelo Sol.
 *
 * Física: um fóton que tangencia o limbo solar (parâmetro de impacto
 * b = R☉) é defletido pelo campo do Sol. Previsão da relatividade geral em
 * campo fraco (Einstein 1915; confirmada por Eddington, eclipse de 1919):
 *
 *   α = 4GM☉ / (c² b) = 2 r_s / b ≈ 1,75 segundos de arco para b = R☉
 *
 * — o dobro do valor newtoniano. Referência: Weinberg, "Gravitation and
 * Cosmology" (1972), §8.5.
 *
 * O fóton parte de x = -60 R☉ rumo a +x com y = b; o motor integra a
 * geodésica nula exata de Schwarzschild (sem aproximação de campo fraco).
 */

import { SOLAR_MASS_KG, SOLAR_RADIUS_M } from "../../physics/constants"
import { equatorialStateFromCartesian } from "../../physics/relativity/equatorial"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import type { SimulationScenario } from "./types"

const IMPACT_PARAMETER_M = SOLAR_RADIUS_M
const START_X_M = -60 * SOLAR_RADIUS_M

export function createSolarLightDeflectionScenario(): SimulationScenario {
  const metric = createSchwarzschildMetric(SOLAR_MASS_KG)

  return {
    id: "solar-light-deflection",
    label: "Deflexão da luz pelo Sol",
    description:
      "Geodésica nula exata de Schwarzschild para um fóton tangenciando o limbo solar (b = R☉).",
    expectation: "α = 4GM☉/(c²b) ≈ 1,75″ de deflexão total (Eddington, 1919).",

    metric,
    kind: "null",
    centralMassKg: SOLAR_MASS_KG,
    schwarzschildRadiusM: metric.schwarzschildRadiusM,

    initialState: equatorialStateFromCartesian(
      metric,
      START_X_M,
      IMPACT_PARAMETER_M,
      1,
      0,
      "null",
    ),

    stepLambdaM: SOLAR_RADIUS_M / 200,
    lambdaRateMPerSecond: 2.8e9,
    sampleIntervalLambdaM: SOLAR_RADIUS_M / 4,
    maxSamples: 600,
    renderScaleM: 5e9,
    centralBodyRadiusM: SOLAR_RADIUS_M,

    // Para após a passagem: r crescente além da janela de partida.
    stopCondition: (state) => state[1] > Math.abs(START_X_M) * 1.05 && state[5] > 0,
  }
}
