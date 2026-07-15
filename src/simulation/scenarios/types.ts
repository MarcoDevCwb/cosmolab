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
import type { ObservableTracker } from "../observables"

export type ScenarioId =
  | "flat-space-photon"
  | "solar-light-deflection"
  | "relativistic-orbit"
  | "schwarzschild-horizon"
  | "kerr-frame-dragging"

/**
 * Parâmetros ajustáveis do experimento (a "bancada" do laboratório).
 *
 * Distâncias são expressas em unidades de r_s (raio de Schwarzschild da massa
 * escolhida): a física de geodésicas em Schwarzschild é invariante de escala
 * nessas unidades, então mover o slider de massa muda os valores físicos
 * (km, segundos) sem mudar a forma da trajetória — e os sliders geométricos
 * (b/r_s, r₀/r_s) mudam a forma. Cada cenário usa o subconjunto que lhe
 * faz sentido; os demais campos são ignorados.
 */
export type ExperimentParams = {
  /** Massa central em massas solares M☉. */
  massSolar: number
  /** Parâmetro de impacto do fóton, em unidades de r_s. */
  impactParameterRs: number
  /** Raio inicial da partícula, em unidades de r_s. */
  startRadiusRs: number
  /** Velocidade angular inicial como fração da órbita circular (1 = circular). */
  angularVelocityFraction: number
  /** Spin de Kerr χ = a/M_geo ∈ [0, 1) (0 = Schwarzschild). */
  spinFraction: number
}

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
  /**
   * Superfície de imersão da cena: "flamm" (Schwarzschild, padrão) ou
   * "flat" quando a imersão de Flamm não se aplica (ex.: Kerr).
   */
  surface?: "flamm" | "flat"
  /** Raio do horizonte [m] quando difere de r_s (ex.: r₊ de Kerr). */
  horizonRadiusM?: number
  /** Raio equatorial da ergosfera [m] (apenas Kerr). */
  ergosphereEquatorRadiusM?: number

  /** Condição de parada física (ex.: aproximação do horizonte). */
  stopCondition?: (state: GeodesicState) => boolean

  /** Rastreador de observáveis do cenário (números-herói da HUD). */
  createObservables?: () => ObservableTracker

  /**
   * Trajetória de comparação em coordenadas polares equatoriais (ex.: a
   * elipse newtoniana fechada sob os mesmos parâmetros iniciais), para a
   * renderização sobrepor à geodésica.
   */
  comparisonPath?: {
    label: string
    points: { r: number; phi: number }[]
  }
}
