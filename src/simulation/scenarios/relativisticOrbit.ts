/**
 * Cenário 3 — Órbita relativística em torno de massa ajustável.
 *
 * Física: perto de poucas dezenas de r_s, órbitas ligadas deixam de ser
 * elipses fechadas: o periastro precessa a cada volta (mesmo efeito dos
 * 43″/século de Mercúrio, amplificado). Precessão por órbita quase-elíptica
 * (Weinberg 1972, §8.6):
 *
 *   Δφ ≈ 6πGM / [c² a (1 - e²)]
 *
 * Parâmetros do experimento: r₀ (em r_s) e a fração da velocidade angular
 * circular. 1,0 = órbita circular (Ω² = GM/r³ exata em tempo coordenado —
 * MTW ex. 25.19); < 1 = excêntrica com roseta; frações menores mergulham.
 * Abaixo da ISCO (r = 3 r_s) não há órbita circular estável.
 */

import { GRAVITATIONAL_CONSTANT, SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import { createPrecessionTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Duração-alvo de uma órbita na tela [s de tempo real]. */
const ORBIT_WALL_TIME_S = 6

/**
 * dφ/d(ct) da órbita circular: ω̃ = √(r_s / (2 r³)) [1/m], pois GM/c² = r_s/2.
 */
function circularAngularVelocityPerMeter(schwarzschildRadiusM: number, radiusM: number): number {
  return Math.sqrt(schwarzschildRadiusM / (2 * radiusM ** 3))
}

export function createRelativisticOrbitScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM
  const r0 = params.startRadiusRs * rs

  // u^φ da órbita circular: com u^φ = ω̃ u^t e norma -1,
  // u^t = 1/√(f - r²ω̃²)  (f = 1 - r_s/r). Só existe para r > 1,5 r_s.
  const omega = circularAngularVelocityPerMeter(rs, r0)
  const lapseMinusRotation = 1 - rs / r0 - r0 * r0 * omega * omega
  if (lapseMinusRotation <= 0) {
    throw new Error(
      "Não existe órbita circular (nem de referência) em r ≤ 1,5 r_s: escolha raio inicial maior.",
    )
  }
  const uTimeCircular = 1 / Math.sqrt(lapseMinusRotation)
  const uPhi = params.angularVelocityFraction * omega * uTimeCircular

  // Período kepleriano coordenado T = 2π√(r³/GM) define as escalas de λ.
  const coordinatePeriodS =
    2 * Math.PI * Math.sqrt(r0 ** 3 / (GRAVITATIONAL_CONSTANT * massKg))
  const lambdaPerOrbitM = SPEED_OF_LIGHT * coordinatePeriodS

  return {
    id: "relativistic-orbit",
    label: "Órbita relativística",
    description:
      "Partícula massiva com raio e velocidade iniciais ajustáveis: 100% = órbita circular; menos = roseta de precessão; perto da ISCO (3 r_s), mergulho.",
    expectation: "Roseta de precessão: Δφ ≈ 6πGM/[c²a(1-e²)] por órbita.",

    metric,
    kind: "timelike",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, uPhi], "timelike"),

    stepLambdaM: lambdaPerOrbitM / 4000,
    lambdaRateMPerSecond: lambdaPerOrbitM / ORBIT_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaPerOrbitM / 280,
    maxSamples: 1400,
    renderScaleM: r0 / 4.7,

    // Escape (fração > 1): encerra ao sair da região de interesse.
    stopCondition: (state) => state[1] > 40 * r0,

    createObservables: () => createPrecessionTracker(metric, rs),
  }
}
