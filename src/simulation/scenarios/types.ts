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

/**
 * Status epistemológico do modelo físico do cenário — exibido na UI para
 * separar física consolidada de hipóteses (princípio 5 do CosmoLab).
 */
export type ScientificStatus =
  | "validated" // reproduzido numericamente contra resultado analítico/experimental
  | "accepted-model" // física padrão consolidada, sem validação analítica direta aqui
  | "theoretical" // consequência formal da teoria, ainda não observada
  | "speculative" // hipótese exploratória, fora do consenso
  | "toy-model" // simplificação didática deliberada

export type ScenarioId =
  | "flat-space-photon"
  | "solar-light-deflection"
  | "shapiro-delay"
  | "relativistic-orbit"
  | "schwarzschild-horizon"
  | "painleve-infall"
  | "kerr-frame-dragging"
  | "custom-metric"
  | "godel-universe"
  | "flrw-expansion"

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
  /** Status epistemológico do modelo (exibido como selo na HUD). */
  scientificStatus: ScientificStatus
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

  /**
   * Integrador do cenário. "rk4" = passo fixo (padrão); "dp54" =
   * Dormand–Prince 5(4) adaptativo — recomendado para regiões rígidas
   * (horizonte) e métricas com Christoffels numéricos (custo por passo alto).
   */
  integrator?: { method: "rk4" | "dp54"; relTol?: number; absTol?: number }

  /** Passo em λ [m]: fixo para RK4, inicial para o adaptativo. */
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
  /** Opacidade do horizonte na cena (1 = sólido; <1 quando a trajetória
   * continua visível do lado de dentro, ex.: Painlevé–Gullstrand). */
  horizonOpacity?: number
  /** Raio equatorial da ergosfera [m] (apenas Kerr). */
  ergosphereEquatorRadiusM?: number
  /** Raio da fronteira de CTCs [m] (g_φφ = 0; apenas Gödel/afins). */
  ctcRadiusM?: number
  /**
   * Transformação de exibição aplicada ANTES do mapeamento de cena (ex.:
   * FLRW converte coordenadas comóveis em distâncias PRÓPRIAS a(t)·x).
   * Definida pela fábrica do cenário com a física da métrica — a
   * renderização apenas aplica.
   */
  toRenderFrame?: (position: GeodesicState | [number, number, number, number]) => [number, number, number, number]
  /** Marcadores comóveis (ex.: galáxias) desenhados via toRenderFrame. */
  comovingMarkers?: { xM: number; yM: number; label?: string }[]

  /** Condição de parada física (ex.: aproximação do horizonte). */
  stopCondition?: (state: GeodesicState) => boolean

  /** Referências científicas (autor — obra, ano, seção). */
  references: string[]

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
