/**
 * Cenário 7 — Métrica personalizada (laboratório de geometrias).
 *
 * O usuário define g_μν como expressões e o motor integra geodésicas nela:
 * inversa numérica, Christoffels por diferenças finitas, DP5(4) adaptativo
 * e validação contínua. As condições iniciais usam o resolvedor GENÉRICO
 * de órbita circular (physics/relativity/circularOrbit.ts) — sem nenhuma
 * suposição sobre a forma da métrica além de estacionariedade axial.
 *
 * Status científico: SPECULATIVE — a UI exibe o selo e o painel de
 * validação é o termômetro de confiabilidade (norma, deriva de E/L).
 * A referência de precessão exibida é a fórmula de campo fraco de
 * Schwarzschild para a MESMA massa: uma linha de base honesta para o
 * usuário medir o quanto sua geometria se desvia da RG padrão.
 */

import { GRAVITATIONAL_CONSTANT, SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { geometrizedMass, schwarzschildRadius } from "../../physics/constants"
import { equatorialCircularOrbit } from "../../physics/relativity/circularOrbit"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import {
  DEFAULT_CUSTOM_METRIC,
  createCustomMetric,
  validateCustomMetric,
  type CustomMetricDefinition,
  type CustomMetricValidation,
} from "../../physics/relativity/metrics/customMetric"
import { createPrecessionTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Duração-alvo de uma órbita na tela [s de tempo real]. */
const ORBIT_WALL_TIME_S = 6

/* Definição ATIVA do laboratório (estado de sessão; a fábrica lê daqui). */
let activeDefinition: CustomMetricDefinition = DEFAULT_CUSTOM_METRIC

export function getCustomMetricDefinition(): CustomMetricDefinition {
  return activeDefinition
}

/** Valida e, se ok, torna a definição ativa (o chamador reinicia o runner). */
export function setCustomMetricDefinition(
  definition: CustomMetricDefinition,
): CustomMetricValidation {
  const validation = validateCustomMetric(definition)
  if (validation.ok) {
    activeDefinition = definition
  }
  return validation
}

export function createCustomGeodesicScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createCustomMetric(activeDefinition, massKg)
  const geoMass = geometrizedMass(massKg)
  // Para a métrica personalizada, o slider de raio é em unidades de M = GM/c².
  const r0 = params.startRadiusRs * geoMass

  // Órbita circular genérica no raio pedido; sem solução → queda radial.
  const circular = equatorialCircularOrbit(metric, r0)
  const uPhi = circular ? params.angularVelocityFraction * circular.uPhi : 0

  const gm = GRAVITATIONAL_CONSTANT * massKg
  const coordinatePeriodS = 2 * Math.PI * Math.sqrt(r0 ** 3 / gm)
  const lambdaPerOrbitM = SPEED_OF_LIGHT * coordinatePeriodS

  return {
    id: "custom-metric",
    label: "Métrica personalizada",
    scientificStatus: "speculative",
    references: [
      "Definida pelo usuário — sem validação analítica",
      "Wald, R. — General Relativity (1984), cap. 3 (geodésicas)",
      "Hairer et al. — Solving ODEs I (1993), §II.5 (DP5(4))",
    ],
    description: `Geodésicas na métrica "${activeDefinition.name}" definida no editor abaixo. A validação numérica (norma, E, L) é o termômetro de confiabilidade.`,
    expectation:
      "Compare a precessão medida com a linha de base de campo fraco de Schwarzschild para a mesma massa.",

    metric,
    kind: "timelike",
    centralMassKg: massKg,
    schwarzschildRadiusM: null,

    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, uPhi], "timelike"),

    // Adaptativo: obrigatório para geometria desconhecida (rigidez imprevisível).
    integrator: { method: "dp54", relTol: 1e-10 },
    stepLambdaM: lambdaPerOrbitM / 4000,
    lambdaRateMPerSecond: lambdaPerOrbitM / ORBIT_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaPerOrbitM / 280,
    maxSamples: 1400,
    renderScaleM: r0 / 4.7,

    // Sem imersão de Flamm (geometria desconhecida): plano coordenado honesto.
    surface: "flat",

    // Escape da região de interesse.
    stopCondition: (state) => state[1] > 40 * r0,

    // Linha de base: campo fraco de Schwarzschild para a MESMA massa.
    createObservables: () => createPrecessionTracker(metric, schwarzschildRadius(massKg)),
  }
}
