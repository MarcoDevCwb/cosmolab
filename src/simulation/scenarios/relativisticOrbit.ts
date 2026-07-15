/**
 * Cenário 3 — Órbita relativística em torno de um buraco negro de 10 M☉.
 *
 * Física: perto de r ~ poucas dezenas de r_s, órbitas ligadas deixam de ser
 * elipses fechadas: o periastro precessa a cada volta (mesmo efeito que os
 * 43″/século de Mercúrio, aqui enormemente amplificado). Precessão por
 * órbita em campo quase-elíptico (Weinberg 1972, §8.6):
 *
 *   Δφ ≈ 6πGM / [c² a (1 - e²)]
 *
 * Montagem: partícula massiva em r₀ = 8 r_s com velocidade angular igual a
 * 95% da circular — órbita excêntrica cuja roseta de precessão fica visível
 * em poucas voltas. Para órbita circular em Schwarzschild vale a relação
 * kepleriana exata em tempo coordenado: Ω² = GM/r³ (MTW, ex. 25.19).
 */

import { SOLAR_MASS_KG } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import type { SimulationScenario } from "./types"

const CENTRAL_MASS_KG = 10 * SOLAR_MASS_KG
const ORBIT_RADIUS_IN_RS = 8
const ANGULAR_VELOCITY_FRACTION = 0.95

/**
 * dφ/d(ct) da órbita circular: ω̃ = Ω/c = √(r_s / (2 r³)) [1/m],
 * pois GM/c² = r_s/2.
 */
function circularAngularVelocityPerMeter(schwarzschildRadiusM: number, radiusM: number): number {
  return Math.sqrt(schwarzschildRadiusM / (2 * radiusM ** 3))
}

export function createRelativisticOrbitScenario(): SimulationScenario {
  const metric = createSchwarzschildMetric(CENTRAL_MASS_KG)
  const rs = metric.schwarzschildRadiusM
  const r0 = ORBIT_RADIUS_IN_RS * rs

  // u^φ da órbita circular: com u^φ = ω̃ u^t e norma -1,
  // u^t = 1/√(f - r²ω̃²)  (f = 1 - r_s/r).
  const omega = circularAngularVelocityPerMeter(rs, r0)
  const lapse = 1 - rs / r0
  const uTimeCircular = 1 / Math.sqrt(lapse - r0 * r0 * omega * omega)
  const uPhi = ANGULAR_VELOCITY_FRACTION * omega * uTimeCircular

  return {
    id: "relativistic-orbit",
    label: "Órbita relativística (10 M☉)",
    description:
      "Partícula massiva em órbita excêntrica a ~8 r_s de um buraco negro de 10 M☉: o periastro precessa a cada volta.",
    expectation: "Roseta de precessão: Δφ ≈ 6πGM/[c²a(1-e²)] por órbita.",

    metric,
    kind: "timelike",
    centralMassKg: CENTRAL_MASS_KG,
    schwarzschildRadiusM: rs,

    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, uPhi], "timelike"),

    stepLambdaM: 2e3,
    lambdaRateMPerSecond: 1.2e6,
    sampleIntervalLambdaM: 2e4,
    maxSamples: 1400,
    renderScaleM: 5e4,
  }
}
