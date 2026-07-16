/**
 * Validação do integrador adaptativo Dormand–Prince 5(4) e da otimização
 * por simetrias no cálculo numérico de Christoffels.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG } from "../../physics/constants"
import { christoffelFromMetric } from "../../physics/relativity/christoffel"
import { createKerrMetric } from "../../physics/relativity/metrics/kerr"
import type { Vector4 } from "../../physics/relativity/tensor"
import { GeodesicSimulationRunner } from "../simulationRunner"
import { createScenario } from "../scenarios"
import { createDormandPrince54Controller } from "./dormandPrince54"

describe("Dormand–Prince 5(4) adaptativo", () => {
  it("no oscilador harmônico, mantém o erro dentro das tolerâncias", () => {
    // y'' = -y: solução exata cos(λ). Estado [y, v] (o controlador é genérico).
    const controller = createDormandPrince54Controller(
      (state) => [state[1], -state[0]],
      { initialStep: 0.1, minStep: 1e-8, maxStep: 0.5, absTol: 1e-10, relTol: 1e-10 },
    )

    let state: number[] = [1, 0]
    let lambda = 0
    const target = 20 * Math.PI // 10 períodos completos
    while (lambda < target) {
      const { next, consumed } = controller.step(state, target - lambda)
      state = next
      lambda += consumed
    }

    expect(Math.abs(state[0] - Math.cos(target))).toBeLessThan(1e-7)
    expect(controller.stats.rejected).toBeGreaterThanOrEqual(0)
    expect(controller.stats.accepted).toBeGreaterThan(50)
  })

  it("na queda ao horizonte, supera o RK4 fixo em conservação (norma < 1e-7)", () => {
    // O cenário do horizonte usa DP54 por padrão; o RK4 fixo atingia ~4e-5
    // de erro de norma na região rígida (ver tolerâncias do teste antigo).
    const runner = new GeodesicSimulationRunner(createScenario("schwarzschild-horizon"))
    for (let i = 0; i < 200 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(1e5)
    }
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(true)
    expect(snapshot.haltReason).toBe("stop-condition")
    expect(snapshot.integrator.method).toContain("Dormand")
    expect(snapshot.validation.normError).toBeLessThan(1e-7)
    expect(Math.abs(snapshot.validation.energy - Math.sqrt(1 - 1 / 6))).toBeLessThan(1e-7)
  })

  it("adapta o passo: h encolhe perto do horizonte em relação à região suave", () => {
    const runner = new GeodesicSimulationRunner(createScenario("schwarzschild-horizon"))
    runner.advanceLambda(1e4) // início da queda (região suave)
    const earlyStep = runner.snapshot().integrator.stepLambdaM

    for (let i = 0; i < 200 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(1e5)
    }
    const finalStep = runner.snapshot().integrator.stepLambdaM

    expect(finalStep).toBeLessThan(earlyStep)
  })
})

describe("otimização por simetrias nos Christoffels numéricos", () => {
  it("Kerr com simetrias declaradas ≡ diferenças finitas completas", () => {
    const metric = createKerrMetric(10 * SOLAR_MASS_KG, 0.9)
    // Mesma métrica SEM as simetrias declaradas: força as 4 derivadas por FD.
    const bruteForce = { ...metric, symmetries: undefined }

    const rs = metric.schwarzschildRadiusM
    const position: Vector4 = [1e7, 5 * rs, 1.1, 0.7]
    const scaleFloor: Vector4 = [rs, rs, 1, 1]

    const optimized = christoffelFromMetric(metric, position, scaleFloor)
    const reference = christoffelFromMetric(bruteForce, position, scaleFloor)

    for (let mu = 0; mu < 4; mu += 1) {
      for (let alpha = 0; alpha < 4; alpha += 1) {
        for (let beta = 0; beta < 4; beta += 1) {
          const scale = Math.max(Math.abs(reference[mu][alpha][beta]), 1e-10)
          expect(
            Math.abs(optimized[mu][alpha][beta] - reference[mu][alpha][beta]) / scale,
          ).toBeLessThan(1e-6)
        }
      }
    }
  })
})
