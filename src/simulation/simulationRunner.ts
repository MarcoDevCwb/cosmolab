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
import { rungeKutta4Step } from "./integrators/rungeKutta4"
import type { ScenarioId, SimulationScenario } from "./scenarios"

export type TrajectorySamplePoint = {
  lambdaM: number
  position: Vector4
}

export type RelativitySnapshot = {
  scenarioId: ScenarioId
  metricName: string
  kind: "null" | "timelike"

  lambdaM: number
  coordinateTimeS: number
  properTimeS: number | null

  position: Vector4
  velocity: Vector4

  centralMassKg: number | null
  schwarzschildRadiusM: number | null

  validation: ValidationReport
  /** Deriva relativa das constantes de Killing desde λ = 0. */
  energyDriftRelative: number
  angularMomentumDriftRelative: number

  halted: boolean
  samples: TrajectorySamplePoint[]
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
  private derivatives: (state: readonly number[]) => GeodesicState
  private initialValidation: ValidationReport
  private halted = false

  constructor(scenario: SimulationScenario) {
    this.scenario = scenario
    this.state = [...scenario.initialState]
    this.derivatives = createGeodesicDerivatives(scenario.metric)
    this.initialValidation = buildValidationReport(scenario.metric, this.state, scenario.kind)
    this.recordSample()
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

    const step = this.scenario.stepLambdaM
    let remaining = deltaLambdaM

    while (remaining > 0 && !this.halted) {
      const h = Math.min(step, remaining)
      const next = rungeKutta4Step(this.derivatives, this.state, h)

      if (!isWithinBounds(this.scenario.metric, positionOf(next))) {
        this.halted = true
        break
      }

      this.state = next
      this.lambdaM += h
      remaining -= h

      if (this.lambdaM - this.lastSampleLambdaM >= this.scenario.sampleIntervalLambdaM) {
        this.recordSample()
      }

      if (this.scenario.stopCondition?.(this.state)) {
        this.halted = true
      }
    }
  }

  reset(): void {
    this.state = [...this.scenario.initialState]
    this.lambdaM = 0
    this.lastSampleLambdaM = 0
    this.samples = []
    this.halted = false
    this.recordSample()
  }

  get currentState(): GeodesicState {
    return [...this.state]
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

      halted: this.halted,
      samples: [...this.samples],
    }
  }

  private recordSample(): void {
    this.samples.push({ lambdaM: this.lambdaM, position: positionOf(this.state) })
    this.lastSampleLambdaM = this.lambdaM

    if (this.samples.length > this.scenario.maxSamples) {
      this.samples.splice(0, this.samples.length - this.scenario.maxSamples)
    }
  }
}
