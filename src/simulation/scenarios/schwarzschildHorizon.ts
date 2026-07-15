/**
 * Cenário 4 — Queda radial rumo ao horizonte de Schwarzschild.
 *
 * Física: partícula massiva solta do REPOUSO em r₀ (ajustável). Dois
 * relógios divergem dramaticamente (MTW §25.5; Wald §6.3):
 *
 * - Tempo próprio τ: a queda até o horizonte é FINITA
 *   (τ ≈ (π/2)·√(r₀³/(2GM)) para queda até o centro).
 * - Tempo coordenado t (observador distante): t → ∞ quando r → r_s;
 *   a partícula parece "congelar" no horizonte.
 *
 * O horizonte em r = r_s é singularidade apenas de coordenada; a integração
 * é interrompida em r = 1,02 r_s, onde a carta de Schwarzschild degenera
 * (g_rr → ∞). Cruzar o horizonte exigirá coordenadas regulares
 * (Eddington–Finkelstein), previsto para versão futura.
 *
 * Energia conservada da queda a partir do repouso: E = √f(r₀), e
 * dr/dλ = -√(E² - f(r)) — usado como verificação analítica nos testes.
 */

import { GRAVITATIONAL_CONSTANT, SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import { createInfallTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

const STOP_RADIUS_IN_RS = 1.02
/** Duração-alvo da queda na tela [s de tempo real]. */
const FALL_WALL_TIME_S = 25

export function createSchwarzschildHorizonScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM
  const r0 = params.startRadiusRs * rs

  // Escala de λ da queda: c·τ_queda ≈ c·(π/2)·√(r₀³/(2GM)).
  const properFallTimeS =
    (Math.PI / 2) * Math.sqrt(r0 ** 3 / (2 * GRAVITATIONAL_CONSTANT * massKg))
  const lambdaTotalM = SPEED_OF_LIGHT * properFallTimeS

  return {
    id: "schwarzschild-horizon",
    label: "Horizonte de Schwarzschild",
    description:
      "Queda radial livre do repouso em raio ajustável: tempo próprio finito, tempo coordenado divergente ao se aproximar do horizonte.",
    expectation: "τ permanece finito; t (observador distante) cresce sem limite quando r → r_s.",

    metric,
    kind: "timelike",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    // Repouso: u^i = 0 ⇒ u⁰ = 1/√f(r₀) resolvido pela normalização.
    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, 0], "timelike"),

    // Passo pequeno: perto do horizonte f → 0 torna o sistema rígido e o
    // RK4 de passo fixo perde precisão (passo adaptativo é evolução prevista).
    stepLambdaM: lambdaTotalM / 7000,
    lambdaRateMPerSecond: lambdaTotalM / FALL_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaTotalM / 300,
    maxSamples: 500,
    renderScaleM: r0 / 5.9,

    // Interrompe antes da degeneração de coordenada em r = r_s.
    stopCondition: (state) => state[1] <= STOP_RADIUS_IN_RS * rs,

    createObservables: () => createInfallTracker(rs),
  }
}
