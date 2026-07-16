/**
 * Cenário 8 — Universo de Gödel: geodésicas num espaço-tempo com CTCs.
 *
 * Física: solução exata de Einstein (1949) com rotação global. Além de
 * r_CTC = √2·a·arcsinh(1), os círculos de φ constante-em-r são CURVAS
 * TEMPORAIS FECHADAS (g_φφ < 0) — a condição matemática exata está
 * documentada em physics/relativity/causality.ts e é monitorada ao vivo.
 *
 * Duas honestidades centrais:
 * 1. As GEODÉSICAS de Gödel são limitadas (r < r_CTC para as que partem
 *    de perto do eixo) e NUNCA formam CTCs — a partícula em queda livre
 *    não viaja ao passado. A CTC desenhada na cena é uma curva
 *    NÃO-geodésica: segui-la exigiria propulsão contínua.
 * 2. Status TEÓRICO: é RG exata, mas incompatível com o universo
 *    observado (não expande; rotação global não detectada).
 *
 * A escala a é livre (a física é invariante por reescala de a); o
 * laboratório fixa a = 10⁷ m para visualização.
 */

import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createGodelMetric } from "../../physics/relativity/metrics/godel"
import { createCausalityTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Escala de rotação fixa do laboratório [m] (física invariante em a). */
const ROTATION_SCALE_M = 1e7
/** Uma volta característica do universo (2π/ω) em ~9 s de tela. */
const ROTATION_WALL_TIME_S = 9

export function createGodelUniverseScenario(params: ExperimentParams): SimulationScenario {
  const metric = createGodelMetric(ROTATION_SCALE_M)
  const rCtc = metric.ctcRadiusM
  // Slider de raio em unidades de r_CTC.
  const r0 = Math.max(params.startRadiusRs, 0.05) * rCtc

  // Velocidade angular inicial como fração de ω_Gödel (co ou contrarrotante):
  // u^φ = fração · ω · u^t; a normalização resolve u^t com o termo cruzado.
  const g = metric.metric([0, r0, 0, 0])
  const omega = metric.omegaPerMeter
  const targetOmega = params.angularVelocityFraction * omega
  const quadratic =
    g[0][0] + 2 * g[0][3] * targetOmega + g[3][3] * targetOmega * targetOmega
  // Se a combinação não for timelike (fração alta demais), cai para repouso.
  const uPhi =
    quadratic < 0 ? (targetOmega * 1) / Math.sqrt(-quadratic) : 0

  const lambdaPerTurnM = (2 * Math.PI) / omega // c·(período de rotação) [m]

  return {
    id: "godel-universe",
    label: "Universo de Gödel — CTCs",
    scientificStatus: "theoretical",
    references: [
      "Gödel, K. — Rev. Mod. Phys. 21, 447 (1949)",
      "Hawking & Ellis — The Large Scale Structure of Space-Time (1973), §5.7",
      "Malament, D. — J. Math. Phys. 26, 774 (1985) (custo de acelerar em CTCs)",
    ],
    description:
      "Solução exata com rotação global: além do anel vermelho (r_CTC), círculos de φ são curvas temporais FECHADAS. Geodésicas (rosa) permanecem causais — a CTC tracejada exige propulsão.",
    expectation:
      "Condição de CTC: g_φφ < 0 ⇔ r > √2·a·arcsinh(1). Geodésicas de Gödel são limitadas e jamais formam CTCs.",

    metric,
    kind: "timelike",
    centralMassKg: null,
    schwarzschildRadiusM: null,

    initialState: buildInitialState(metric, [0, r0, 0, 0], [0, 0, uPhi], "timelike"),

    integrator: { method: "dp54", relTol: 1e-10 },
    stepLambdaM: lambdaPerTurnM / 4000,
    lambdaRateMPerSecond: lambdaPerTurnM / ROTATION_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaPerTurnM / 300,
    maxSamples: 1500,
    renderScaleM: rCtc / 3.2,

    surface: "flat",
    ctcRadiusM: rCtc,

    // As geodésicas de Gödel são limitadas; guarda de segurança apenas.
    stopCondition: (state) => state[1] > 12 * rCtc,

    createObservables: () => createCausalityTracker(metric, rCtc),
  }
}
