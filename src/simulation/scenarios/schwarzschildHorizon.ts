/**
 * Cenário 4 — Queda radial rumo ao horizonte de Schwarzschild.
 *
 * Física: partícula massiva solta do repouso em r₀ = 6 r_s de um buraco
 * negro de 10 M☉. Dois relógios divergem dramaticamente (MTW §25.5;
 * Wald §6.3):
 *
 * - Tempo próprio τ: a queda até o horizonte é FINITA
 *   (τ ~ (r₀³/(2GM))^{1/2}, milissegundos nesta escala).
 * - Tempo coordenado t (observador distante): t → ∞ quando r → r_s;
 *   a partícula parece "congelar" no horizonte.
 *
 * O horizonte em r = r_s é singularidade apenas de coordenada; a integração
 * é interrompida em r = 1,02 r_s, onde a carta de Schwarzschild degenera
 * (g_rr → ∞). Cruzar o horizonte exigirá coordenadas regulares
 * (Eddington–Finkelstein), previsto para versão futura.
 *
 * Energia conservada da queda a partir do repouso: E = √f(r₀), e
 * dr/dτ = -c√(E² - f(r)) — usado como verificação analítica nos testes.
 */

import { SOLAR_MASS_KG } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import type { SimulationScenario } from "./types"

const CENTRAL_MASS_KG = 10 * SOLAR_MASS_KG
const DROP_RADIUS_IN_RS = 6
const STOP_RADIUS_IN_RS = 1.02

export function createSchwarzschildHorizonScenario(): SimulationScenario {
  const metric = createSchwarzschildMetric(CENTRAL_MASS_KG)
  const rs = metric.schwarzschildRadiusM
  const r0 = DROP_RADIUS_IN_RS * rs

  return {
    id: "schwarzschild-horizon",
    label: "Horizonte de Schwarzschild",
    description:
      "Queda radial livre do repouso em 6 r_s: tempo próprio finito, tempo coordenado divergente ao se aproximar do horizonte.",
    expectation: "τ permanece finito; t (observador distante) cresce sem limite quando r → r_s.",

    metric,
    kind: "timelike",
    centralMassKg: CENTRAL_MASS_KG,
    schwarzschildRadiusM: rs,

    // Repouso: u^i = 0 ⇒ u⁰ = 1/√f(r₀) resolvido pela normalização.
    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, 0], "timelike"),

    // Passo pequeno: perto do horizonte f → 0 torna o sistema rígido e o
    // RK4 de passo fixo perde precisão (passo adaptativo é evolução prevista).
    stepLambdaM: 100,
    lambdaRateMPerSecond: 3e4,
    sampleIntervalLambdaM: 2e3,
    maxSamples: 500,
    renderScaleM: 3e4,

    // Interrompe antes da degeneração de coordenada em r = r_s.
    stopCondition: (state) => state[1] <= STOP_RADIUS_IN_RS * rs,
  }
}
