/**
 * Cenário 10 — Expansão cósmica (FLRW): a luz num universo que se estica.
 *
 * Um fóton é emitido por uma galáxia distante EM NOSSA DIREÇÃO quando o
 * universo tinha metade do tamanho atual (a = 0,5, z ≈ 1). Três fenômenos
 * honestos ao mesmo tempo:
 *
 * 1. REDSHIFT: a energia do fóton cai como 1/a — medido numericamente
 *    (u⁰) e comparado ao analítico (razão de fatores de escala);
 * 2. RECESSÃO SUPERLUMINAL: em distância PRÓPRIA (o que a cena mostra),
 *    o fóton primeiro se AFASTA de nós — a expansão o carrega mais rápido
 *    do que ele avança — antes de finalmente nos alcançar: o gráfico
 *    r(λ) exibe a curva "pera" clássica da cosmologia;
 * 3. SEM ENERGIA CONSERVADA: não há Killing temporal; quem se conserva é
 *    o momento comóvel p = a²·u^x, monitorado nos observáveis. A "deriva
 *    de E" no painel de validação é FÍSICA (o próprio redshift), não erro.
 *
 * A cena desenha tudo em DISTÂNCIA PRÓPRIA (grade = régua de hoje):
 * as galáxias comóveis recuam visivelmente enquanto o fóton viaja.
 */

import { SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createFlrwMetric } from "../../physics/relativity/metrics/flrw"
import { createRedshiftTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** H₀ = 70 km/s/Mpc (ordem Planck/SH0ES; fixo — os sliders controlam Ω_m e D). */
const HUBBLE_TODAY_PER_S = 2.268e-18
/** Fator de escala na emissão (z ≈ 1). */
const SCALE_AT_EMISSION = 0.5
/** Duração-alvo da viagem na tela [s]. */
const TRAVEL_WALL_TIME_S = 30

export function createFlrwExpansionScenario(params: ExperimentParams): SimulationScenario {
  // Sliders reaproveitados: angularVelocityFraction → Ω_m; startRadiusRs →
  // distância comóvel da fonte em unidades de c/H₀.
  const omegaMatter = Math.min(Math.max(params.angularVelocityFraction, 0.05), 0.95)
  const metric = createFlrwMetric(HUBBLE_TODAY_PER_S, omegaMatter)
  const hubbleLength = metric.hubbleLengthM
  const sourceComovingM = Math.max(params.startRadiusRs, 0.1) * hubbleLength

  // Emissão quando a = 0,5: ct_e da solução exata (inversa do sinh^{2/3}).
  const omegaLambda = 1 - omegaMatter
  const rate = (1.5 * Math.sqrt(omegaLambda) * HUBBLE_TODAY_PER_S) / SPEED_OF_LIGHT
  const emissionCt =
    Math.asinh(Math.sqrt(omegaLambda / omegaMatter) * SCALE_AT_EMISSION ** 1.5) / rate

  // Fóton na origem da fonte, rumo a nós (−x), com u⁰ = 1 na emissão.
  const aEmit = metric.scaleFactorAt(emissionCt)
  const initialState = buildInitialState(
    metric,
    [emissionCt, sourceComovingM, 0, 0],
    [-1 / aEmit, 0, 0],
    "null",
  )

  // Escala de λ: com p = a²u^x conservado, λ ≈ ∫a²dx/|p| ~ D·⟨a²⟩/a_e.
  const lambdaEstimateM = (sourceComovingM * 1.5) / aEmit

  return {
    id: "flrw-expansion",
    label: "Expansão cósmica — FLRW",
    scientificStatus: "accepted-model",
    references: [
      "Friedmann, A. — Z. Phys. 10, 377 (1922)",
      "Lemaître, G. — Ann. Soc. Sci. Bruxelles A47, 49 (1927)",
      "Hubble, E. — PNAS 15, 168 (1929)",
      "Weinberg, S. — Cosmology (2008), cap. 1",
    ],
    description:
      "Um fóton emitido rumo a nós quando o universo tinha metade do tamanho: em distância PRÓPRIA ele primeiro RECUA (expansão superluminal) antes de chegar, avermelhando como 1/a. Sem Killing temporal, E não se conserva — o conservado é a²·u^x.",
    expectation:
      "1+z = a(hoje)/a(emissão) = 2 para a emissão em a = 0,5; a chegada depende de Ω_m e da distância.",

    metric,
    kind: "null",
    centralMassKg: null,
    schwarzschildRadiusM: null,

    initialState,

    integrator: { method: "dp54", relTol: 1e-10 },
    stepLambdaM: lambdaEstimateM / 4000,
    lambdaRateMPerSecond: lambdaEstimateM / TRAVEL_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaEstimateM / 350,
    maxSamples: 900,
    renderScaleM: (sourceComovingM * 1.15) / 5,

    surface: "flat",

    // Distância PRÓPRIA na cena: multiplica as coordenadas comóveis por a(t).
    toRenderFrame: (position) => {
      const a = metric.scaleFactorAt(position[0])
      return [position[0], a * position[1], a * position[2], a * position[3]]
    },

    // Galáxias comóveis (nós na origem; a fonte; vizinhança do fluxo de Hubble).
    comovingMarkers: [
      { xM: 0, yM: 0, label: "nós" },
      { xM: sourceComovingM, yM: 0, label: "fonte" },
      { xM: 0.45 * sourceComovingM, yM: 0.4 * sourceComovingM },
      { xM: 0.75 * sourceComovingM, yM: -0.35 * sourceComovingM },
      { xM: 0.25 * sourceComovingM, yM: -0.5 * sourceComovingM },
      { xM: 1.05 * sourceComovingM, yM: 0.5 * sourceComovingM },
    ],

    // Chegada: o fóton alcança a nossa galáxia (x ≤ 0).
    stopCondition: (state) => state[1] <= 0,

    createObservables: () => createRedshiftTracker(metric.scaleFactorAt, [...initialState]),
  }
}
