/**
 * Cenário 1 — Fóton em espaço plano (Minkowski).
 *
 * Física: sem curvatura, a geodésica nula é uma linha reta exata. Este é o
 * cenário de controle do laboratório: qualquer desvio de retilineidade ou de
 * norma (g_{μν}u^μu^ν ≠ 0) mede diretamente o erro do integrador.
 */

import { buildInitialState } from "../../physics/relativity/initialConditions"
import { minkowskiMetric } from "../../physics/relativity/metrics/minkowski"
import type { SimulationScenario } from "./types"

// Percurso de -400.000 km a +400.000 km em x, com desvio lateral y fixo.
const START_X_M = -4e8
const OFFSET_Y_M = 1e8

export function createFlatSpacePhotonScenario(): SimulationScenario {
  return {
    id: "flat-space-photon",
    label: "Espaço plano — fóton",
    description:
      "Geodésica nula na métrica de Minkowski: linha reta percorrida à velocidade da luz. Cenário de controle do integrador.",
    expectation: "Trajetória exatamente retilínea; erro de norma ≈ erro de máquina.",

    metric: minkowskiMetric,
    kind: "null",
    centralMassKg: null,
    schwarzschildRadiusM: null,

    // Direção espacial unitária +x ⇒ u⁰ = 1 (fóton), resolvido pela norma nula.
    initialState: buildInitialState(minkowskiMetric, [0, START_X_M, OFFSET_Y_M, 0], [1, 0, 0], "null"),

    stepLambdaM: 1e6,
    lambdaRateMPerSecond: 5e7,
    sampleIntervalLambdaM: 4e6,
    maxSamples: 400,
    renderScaleM: 5e7,

    // Encerra ao completar a travessia da janela visível.
    stopCondition: (state) => state[1] > -START_X_M,
  }
}
