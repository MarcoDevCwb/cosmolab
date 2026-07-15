/**
 * Contrato de cenário do laboratório relativístico.
 *
 * Um cenário é dados puros + condições iniciais fisicamente normalizadas:
 * escolhe uma métrica, um tipo de geodésica e parâmetros numéricos.
 * Nem física nova nem renderização acontecem aqui.
 */

import type { SpacetimeMetric } from "../../physics/relativity/metric"
import type { GeodesicState } from "../../physics/relativity/geodesic"
import type { GeodesicKind } from "../../physics/relativity/initialConditions"

export type ScenarioId =
  | "flat-space-photon"
  | "solar-light-deflection"
  | "relativistic-orbit"
  | "schwarzschild-horizon"

export type SimulationScenario = {
  id: ScenarioId
  label: string
  /** Descrição física curta exibida na HUD. */
  description: string
  /** Resultado teórico de referência (quando existir) para conferência visual. */
  expectation?: string

  metric: SpacetimeMetric
  kind: GeodesicKind
  /** Massa central [kg] para telemetria; null em espaço plano. */
  centralMassKg: number | null
  /** Raio de Schwarzschild da massa central [m]; null em espaço plano. */
  schwarzschildRadiusM: number | null

  /** Estado inicial [x^μ, u^μ] já satisfazendo a norma exigida. */
  initialState: GeodesicState

  /** Passo do RK4 em λ [m]. */
  stepLambdaM: number
  /** Velocidade de reprodução: quanto de λ [m] avança por segundo real. */
  lambdaRateMPerSecond: number
  /** Intervalo de amostragem da trajetória para renderização [m de λ]. */
  sampleIntervalLambdaM: number
  /** Máximo de amostras retidas (janela deslizante). */
  maxSamples: number
  /** Metros por unidade de cena na renderização. */
  renderScaleM: number

  /** Condição de parada física (ex.: aproximação do horizonte). */
  stopCondition?: (state: GeodesicState) => boolean
}
