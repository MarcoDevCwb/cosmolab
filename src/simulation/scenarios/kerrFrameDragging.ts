/**
 * Cenário 5 — Arrasto de referenciais (Lense–Thirring) em Kerr.
 *
 * Física: partícula massiva largada do REPOUSO (u^r = u^θ = u^φ = 0, logo
 * momento angular L = g_φμu^μ = g_φt u^t ≠ 0? Não: em Kerr, repouso em
 * Boyer–Lindquist tem L = g_φt u^t ≠ 0. Para exibir o arrasto puro usamos a
 * condição fisicamente limpa de MOMENTO ANGULAR NULO (ZAMO em queda): u^φ
 * inicial tal que L = g_φt u^t + g_φφ u^φ = 0. Essa partícula "sem rotação"
 * mesmo assim adquire dφ/dt = −g_tφ/g_φφ > 0: o espaço-tempo gira com o
 * buraco negro e a carrega junto (Bardeen, Press & Teukolsky 1972; MTW §33.4).
 *
 * L permanece EXATAMENTE zero durante toda a queda (constante de Killing) —
 * verificável ao vivo no painel de validação numérica.
 *
 * Esta é também a estreia do motor "plugin": Kerr não fornece Christoffels
 * analíticos; a integração usa diferenças finitas genéricas (christoffel.ts).
 */

import { GRAVITATIONAL_CONSTANT, SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createKerrMetric } from "../../physics/relativity/metrics/kerr"
import { createFrameDraggingTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Duração-alvo da queda na tela [s de tempo real]. */
const FALL_WALL_TIME_S = 30
const STOP_MARGIN_OVER_HORIZON = 1.06

export function createKerrFrameDraggingScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createKerrMetric(massKg, params.spinFraction)
  const rs = metric.schwarzschildRadiusM
  const r0 = params.startRadiusRs * rs

  // Condição inicial com momento angular NULO no plano equatorial:
  // L = g_φt u^t + g_φφ u^φ = 0 ⇒ u^φ = −(g_φt/g_φφ)·u^t. Como u^t depende
  // da normalização, resolvemos iterando uma vez a razão exata ω = −g_tφ/g_φφ
  // (dφ/dt do ZAMO) e deixando buildInitialState impor g·u·u = −1.
  const startPosition: [number, number, number, number] = [0, r0, Math.PI / 2, 0]
  const g = metric.metric(startPosition)
  const zamoOmegaPerMeter = -g[0][3] / g[3][3] // dφ/d(ct) [1/m]

  // u^φ = ω·u^t com u^t ainda desconhecido: como a norma fixa a escala global,
  // basta fornecer a razão espacial correta; resolvemos u^t analiticamente:
  // g_tt u^t² + 2 g_tφ ω u^t² + g_φφ ω² u^t² = −1.
  const quadraticCoefficient =
    g[0][0] + 2 * g[0][3] * zamoOmegaPerMeter + g[3][3] * zamoOmegaPerMeter * zamoOmegaPerMeter
  const uTime = 1 / Math.sqrt(-quadraticCoefficient)
  const uPhi = zamoOmegaPerMeter * uTime

  // Escala de λ: aproximação newtoniana da queda (documentada como estimativa
  // apenas de RITMO de reprodução; a física vem da integração exata).
  const properFallTimeS =
    (Math.PI / 2) * Math.sqrt(r0 ** 3 / (2 * GRAVITATIONAL_CONSTANT * massKg))
  const lambdaTotalM = SPEED_OF_LIGHT * properFallTimeS

  return {
    id: "kerr-frame-dragging",
    label: "Kerr — arrasto de referenciais",
    description:
      "Partícula com momento angular ZERO largada perto de um buraco negro em rotação: o espaço-tempo a arrasta em φ (Lense–Thirring). Ajuste o spin a/M.",
    expectation:
      "L = g_φμu^μ permanece 0 enquanto φ cresce — quem gira é o espaço-tempo (integração via Christoffels numéricos: Kerr roda como plugin).",

    metric,
    kind: "timelike",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    initialState: buildInitialState(
      metric,
      startPosition,
      [0, 0, uPhi],
      "timelike",
    ),

    // Passo pequeno: perto de r₊ (Δ → 0) o sistema é rígido para RK4 de
    // passo fixo, e os Christoffels aqui são numéricos (plugin).
    stepLambdaM: lambdaTotalM / 9000,
    lambdaRateMPerSecond: lambdaTotalM / FALL_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaTotalM / 400,
    maxSamples: 600,
    renderScaleM: r0 / 5.9,

    // Boyer–Lindquist degenera no horizonte externo r₊ (Δ → 0).
    surface: "flat",
    horizonRadiusM: metric.horizonRadiusM,
    ergosphereEquatorRadiusM: metric.ergosphereEquatorRadiusM,
    stopCondition: (state) => state[1] <= STOP_MARGIN_OVER_HORIZON * metric.horizonRadiusM,

    createObservables: () => createFrameDraggingTracker(),
  }
}
