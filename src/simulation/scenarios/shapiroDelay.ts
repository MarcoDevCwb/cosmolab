/**
 * Cenário 9 — Atraso de Shapiro (o 4º teste clássico).
 *
 * Física: um sinal de luz que passa rente à massa demora MAIS, em tempo
 * coordenado, do que o trajeto equivalente no espaço plano — mesmo com a
 * trajetória quase reta. Previsão de campo fraco (Shapiro, PRL 13, 789
 * (1964); Weinberg 1972, §8.7):
 *
 *   Δt_corda = (2GM/c³)·[ln(4·x₁·x₂/b²) − 1]
 *
 * para extremos assintóticos e comparação com a CORDA coordenada entre os
 * extremos. O termo constante muda quando se muda a baseline; a dependência
 * logarítmica em b é o conteúdo de primeira ordem mais robusto.
 *
 * Confirmado com radar em Vênus/Mercúrio (Shapiro et al. 1968) e até hoje
 * o teste de maior precisão via Cassini (Bertotti et al. 2003).
 * Com deflexão, precessão e dilatação temporal, fecha OS QUATRO TESTES
 * CLÁSSICOS — todos verificáveis pelo aluno neste laboratório.
 */

import { SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { equatorialStateFromCartesian } from "../../physics/relativity/equatorial"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import { createShapiroTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

const START_DISTANCE_IN_B = 60
const CROSSING_WALL_TIME_S = 25

export function createShapiroDelayScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM
  const b = params.impactParameterRs * rs
  const startX = -START_DISTANCE_IN_B * b
  const pathLengthM = 2 * START_DISTANCE_IN_B * b

  // Referência de campo fraco com x₁ = x₂ = 60·b, na convenção de baseline
  // por CORDA coordenada: Δt = (2GM/c³)[ln(4x₁x₂/b²) − 1]. A repartição do
  // atraso depende da baseline escolhida; esta é a referência 1PN para o
  // observável numérico t − d_corda/c. Correções de distância finita e de
  // ordens superiores permanecem na integração e limitam a concordância.
  const weakFieldDelayS =
    (rs / SPEED_OF_LIGHT) *
    (Math.log(4 * START_DISTANCE_IN_B * START_DISTANCE_IN_B) - 1)

  const initialState = equatorialStateFromCartesian(metric, startX, b, 1, 0, "null")

  return {
    id: "shapiro-delay",
    label: "Atraso de Shapiro",
    scientificStatus: "validated",
    references: [
      "Shapiro, I. — Phys. Rev. Lett. 13, 789 (1964)",
      "Bertotti, Iess & Tortora — Nature 425, 374 (2003) (Cassini)",
      "Weinberg, S. — Gravitation and Cosmology (1972), §8.7",
    ],
    description:
      "O 4º teste clássico: a luz que tangencia a massa chega ATRASADA em relação ao espaço plano, mesmo quase sem entortar. Compare o atraso medido com a fórmula de Shapiro.",
    expectation: `Campo fraco: Δt ≈ ${(weakFieldDelayS * 1e6).toFixed(1)} µs para esta configuração.`,

    metric,
    kind: "null",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    initialState,

    stepLambdaM: b / 200,
    lambdaRateMPerSecond: pathLengthM / CROSSING_WALL_TIME_S,
    sampleIntervalLambdaM: b / 4,
    maxSamples: 600,
    renderScaleM: (START_DISTANCE_IN_B * b) / 8,

    stopCondition: (state) => state[1] > Math.abs(startX) * 1.05 && state[5] > 0,

    createObservables: () =>
      createShapiroTracker(
        equatorialStateFromCartesian(metric, startX, b, 1, 0, "null"),
        weakFieldDelayS,
      ),
  }
}
