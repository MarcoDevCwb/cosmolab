/**
 * Runner de simulação geodésica.
 *
 * Orquestra: cenário (dados) + campo geodésico (physics) + RK4 (integrators).
 * Produz snapshots imutáveis consumidos pela UI/renderização — que nunca
 * calculam física. Nenhuma dependência de Three.js ou React, o que permite
 * mover este runner para um Web Worker sem alterações.
 *
 * Relógios expostos (unidades SI):
 * - λ [m]: parâmetro afim integrado.
 * - t = x⁰/c [s]: tempo coordenado (observador estático no infinito).
 * - τ = λ/c [s]: tempo próprio, apenas para geodésicas timelike (λ = c·τ);
 *   para fótons τ é identicamente nulo e o campo fica `null`.
 */

import { SPEED_OF_LIGHT } from "../physics/constants"
import type { GeodesicState } from "../physics/relativity/geodesic"
import { createGeodesicDerivatives, positionOf, velocityOf } from "../physics/relativity/geodesic"
import { isWithinBounds } from "../physics/relativity/metric"
import type { Vector4 } from "../physics/relativity/tensor"
import type { ValidationReport } from "../physics/relativity/validation"
import { buildValidationReport } from "../physics/relativity/validation"
import type { CausalityDiagnostic } from "../physics/relativity/causality"
import { causalityDiagnostic } from "../physics/relativity/causality"
import type { CurvatureInvariants, MatterDiagnostic } from "../physics/relativity/curvature"
import { curvatureInvariants, matterDiagnostic } from "../physics/relativity/curvature"
import {
  createDormandPrince54Controller,
  type DormandPrince54Controller,
} from "./integrators/dormandPrince54"
import { rungeKutta4Step } from "./integrators/rungeKutta4"
import type { ObservableTracker, ScenarioObservable } from "./observables"
import type { ScenarioId, SimulationScenario } from "./scenarios"

export type TrajectorySamplePoint = {
  lambdaM: number
  position: Vector4
}

/** Ponto de histórico para os gráficos científicos (mesma cadência das amostras). */
export type HistoryPoint = {
  lambdaM: number
  /** Raio areal r [m] (ou distância à origem na carta cartesiana). */
  radiusM: number
  /** |g_{μν}u^μu^ν − ε| no instante da amostra. */
  normError: number
  /** Deriva relativa de E desde λ = 0. */
  energyDriftRelative: number
  coordinateTimeS: number
  properTimeS: number | null
}

/** Telemetria do integrador exposta na UI (método, passo, custo). */
export type IntegratorStats = {
  method: string
  /** Passo atual em λ [m] (fixo no RK4; h corrente no adaptativo). */
  stepLambdaM: number
  stepsTaken: number
  /** Passos rejeitados pelo controlador adaptativo (0 no RK4). */
  stepsRejected: number
  cpuMs: number
  /** Tolerâncias do controlador adaptativo, quando aplicável. */
  relTol?: number
  absTol?: number
}

/** Por que a integração parou. */
export type HaltReason = "stop-condition" | "out-of-bounds" | null

export type RelativitySnapshot = {
  scenarioId: ScenarioId
  metricName: string
  kind: "null" | "timelike"

  lambdaM: number
  coordinateTimeS: number
  properTimeS: number | null
  /** Diferença Δ = x⁰/c − τ [s]. É dependente da carta: só representa uma
   * comparação entre relógios físicos após especificar observador de
   * referência, sincronização e eventos comparados. null para fótons. */
  futureTravelS: number | null

  position: Vector4
  velocity: Vector4

  centralMassKg: number | null
  schwarzschildRadiusM: number | null

  validation: ValidationReport
  /** Deriva relativa das constantes de Killing desde λ = 0. */
  energyDriftRelative: number
  angularMomentumDriftRelative: number

  halted: boolean
  haltReason: HaltReason
  samples: TrajectorySamplePoint[]
  /** Observáveis físicos do cenário (números-herói). */
  observables: ScenarioObservable[]
  /** Séries temporais para os gráficos (janela deslizante). */
  history: HistoryPoint[]
  integrator: IntegratorStats
  /** Invariantes de curvatura na posição atual (R, K) — independentes de carta. */
  invariants: CurvatureInvariants
  /** Diagnóstico local de círculos axiais, quando x³ é um φ periódico. */
  causality: CausalityDiagnostic
  /** Tensor de matéria efetiva local e amostragem da NEC no ponto. */
  matter: MatterDiagnostic | null
}

function relativeDrift(current: number, initial: number): number {
  const scale = Math.max(Math.abs(initial), 1e-30)
  return Math.abs(current - initial) / scale
}

export class GeodesicSimulationRunner {
  readonly scenario: SimulationScenario

  private state: GeodesicState
  private lambdaM = 0
  private lastSampleLambdaM = 0
  private samples: TrajectorySamplePoint[] = []
  private history: HistoryPoint[] = []
  private stepsTaken = 0
  private cpuMs = 0
  private haltReason: HaltReason = null
  private adaptive: DormandPrince54Controller | null = null
  private derivatives: (state: readonly number[]) => GeodesicState
  private initialValidation: ValidationReport
  private observables: ObservableTracker | null
  private halted = false

  constructor(scenario: SimulationScenario) {
    this.scenario = scenario
    this.state = [...scenario.initialState]
    this.derivatives = createGeodesicDerivatives(scenario.metric)
    this.initialValidation = buildValidationReport(scenario.metric, this.state, scenario.kind)
    this.observables = scenario.createObservables?.() ?? null
    this.adaptive = this.createAdaptiveController()
    this.recordSample()
  }

  private createAdaptiveController(): DormandPrince54Controller | null {
    const config = this.scenario.integrator
    if (config?.method !== "dp54") {
      return null
    }

    return createDormandPrince54Controller(this.derivatives, {
      initialStep: this.scenario.stepLambdaM,
      minStep: this.scenario.stepLambdaM / 1e4,
      // Teto no meio do intervalo de amostragem: mantém amostras densas e
      // garante que condições de parada sejam checadas com resolução.
      maxStep: this.scenario.sampleIntervalLambdaM / 2,
      absTol: config.absTol ?? 1e-10,
      relTol: config.relTol ?? 1e-9,
    })
  }

  /** Avança o tempo real de reprodução em segundos (chamado pelo frame loop). */
  advanceBySeconds(deltaSeconds: number): void {
    this.advanceLambda(deltaSeconds * this.scenario.lambdaRateMPerSecond)
  }

  /** Avança o parâmetro afim em `deltaLambdaM` metros com passos RK4 fixos. */
  advanceLambda(deltaLambdaM: number): void {
    if (this.halted || deltaLambdaM <= 0) {
      return
    }

    const cpuStart = performance.now()
    const step = this.scenario.stepLambdaM
    let remaining = deltaLambdaM

    while (remaining > 0 && !this.halted) {
      let next: GeodesicState
      let consumed: number

      if (this.adaptive) {
        const result = this.adaptive.step(this.state, remaining)
        next = result.next
        consumed = result.consumed
      } else {
        consumed = Math.min(step, remaining)
        next = rungeKutta4Step(this.derivatives, this.state, consumed)
        this.stepsTaken += 1
      }

      if (!isWithinBounds(this.scenario.metric, positionOf(next))) {
        this.halted = true
        this.haltReason = "out-of-bounds"
        break
      }

      this.state = next
      this.lambdaM += consumed
      remaining -= consumed
      this.observables?.update(this.state, this.lambdaM)

      if (this.lambdaM - this.lastSampleLambdaM >= this.scenario.sampleIntervalLambdaM) {
        this.recordSample()
      }

      if (this.scenario.stopCondition?.(this.state)) {
        this.halted = true
        this.haltReason = "stop-condition"
      }
    }

    this.cpuMs += performance.now() - cpuStart
  }

  reset(): void {
    this.state = [...this.scenario.initialState]
    this.lambdaM = 0
    this.lastSampleLambdaM = 0
    this.samples = []
    this.history = []
    this.stepsTaken = 0
    this.cpuMs = 0
    this.halted = false
    this.haltReason = null
    this.observables = this.scenario.createObservables?.() ?? null
    this.adaptive = this.createAdaptiveController()
    this.recordSample()
  }

  get currentState(): GeodesicState {
    return [...this.state]
  }

  /** Escala de FD dos diagnósticos: a do cenário quando declarada (estruturas
   * menores que a coordenada, ex.: parede da bolha warp), senão |x¹|. */
  private diagnosticScale(position: Vector4): Vector4 {
    return (
      this.scenario.diagnosticScaleM ?? [
        Math.max(Math.abs(position[1]), 1),
        Math.max(Math.abs(position[1]), 1),
        1,
        1,
      ]
    )
  }

  snapshot(): RelativitySnapshot {
    const { scenario } = this
    const validation = buildValidationReport(scenario.metric, this.state, scenario.kind)
    const position = positionOf(this.state)

    return {
      scenarioId: scenario.id,
      metricName: scenario.metric.name,
      kind: scenario.kind,

      lambdaM: this.lambdaM,
      coordinateTimeS: position[0] / SPEED_OF_LIGHT,
      properTimeS: scenario.kind === "timelike" ? this.lambdaM / SPEED_OF_LIGHT : null,
      futureTravelS:
        scenario.kind === "timelike"
          ? position[0] / SPEED_OF_LIGHT - this.lambdaM / SPEED_OF_LIGHT
          : null,

      position,
      velocity: velocityOf(this.state),

      centralMassKg: scenario.centralMassKg,
      schwarzschildRadiusM: scenario.schwarzschildRadiusM,

      validation,
      energyDriftRelative: relativeDrift(validation.energy, this.initialValidation.energy),
      angularMomentumDriftRelative: relativeDrift(
        validation.angularMomentum,
        this.initialValidation.angularMomentum,
      ),

      invariants: curvatureInvariants(scenario.metric, position, this.diagnosticScale(position)),
      causality: causalityDiagnostic(scenario.metric, position),
      matter: matterDiagnostic(scenario.metric, position, this.diagnosticScale(position)),
      halted: this.halted,
      haltReason: this.haltReason,
      samples: [...this.samples],
      observables: this.observables?.read(this.state) ?? [],
      history: [...this.history],
      integrator: this.adaptive
        ? {
            method: "Dormand–Prince 5(4) adaptativo",
            stepLambdaM: this.adaptive.stats.currentStep,
            stepsTaken: this.adaptive.stats.accepted,
            stepsRejected: this.adaptive.stats.rejected,
            cpuMs: this.cpuMs,
            relTol: scenario.integrator?.relTol ?? 1e-9,
            absTol: scenario.integrator?.absTol ?? 1e-10,
          }
        : {
            method: "RK4 (passo fixo)",
            stepLambdaM: scenario.stepLambdaM,
            stepsTaken: this.stepsTaken,
            stepsRejected: 0,
            cpuMs: this.cpuMs,
          },
    }
  }

  private recordSample(): void {
    const position = positionOf(this.state)
    this.samples.push({ lambdaM: this.lambdaM, position })
    this.lastSampleLambdaM = this.lambdaM

    const validation = buildValidationReport(this.scenario.metric, this.state, this.scenario.kind)
    this.history.push({
      lambdaM: this.lambdaM,
      radiusM:
        this.scenario.metric.chart === "cartesian"
          ? Math.hypot(position[1], position[2], position[3])
          : position[1],
      normError: validation.normError,
      energyDriftRelative: relativeDrift(validation.energy, this.initialValidation.energy),
      coordinateTimeS: position[0] / SPEED_OF_LIGHT,
      properTimeS: this.scenario.kind === "timelike" ? this.lambdaM / SPEED_OF_LIGHT : null,
    })

    if (this.samples.length > this.scenario.maxSamples) {
      this.samples.splice(0, this.samples.length - this.scenario.maxSamples)
    }
    if (this.history.length > this.scenario.maxSamples) {
      this.history.splice(0, this.history.length - this.scenario.maxSamples)
    }
  }
}
