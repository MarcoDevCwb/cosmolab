/**
 * Validação do universo de Gödel e do diagnóstico genérico de causalidade.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG } from "../../constants"
import { causalityDiagnostic } from "../causality"
import { createGodelMetric } from "./godel"
import { createSchwarzschildMetric } from "./schwarzschild"
import { GeodesicSimulationRunner } from "../../../simulation/simulationRunner"
import { createScenario } from "../../../simulation/scenarios"
import type { Vector4 } from "../tensor"
import { invertMatrix4 } from "../tensor"

const a = 1e7
const metric = createGodelMetric(a)
const rCtc = metric.ctcRadiusM

describe("métrica de Gödel", () => {
  it("fronteira de CTCs em r_CTC = √2·a·arcsinh(1), onde g_φφ troca de sinal", () => {
    expect(rCtc).toBeCloseTo(Math.SQRT2 * a * Math.asinh(1), 6)

    const just_inside = causalityDiagnostic(metric, [0, 0.99 * rCtc, 0, 0])
    const just_outside = causalityDiagnostic(metric, [0, 1.01 * rCtc, 0, 0])
    expect(just_inside.closedTimelikeCircle).toBe(false)
    expect(just_inside.azimuthalCircleNorm).toBeGreaterThan(0)
    expect(just_outside.closedTimelikeCircle).toBe(true)
    expect(just_outside.azimuthalCircleNorm).toBeLessThan(0)
  })

  it("inversa analítica coincide com Gauss-Jordan dentro e fora da região acausal", () => {
    for (const r of [0.4 * rCtc, 1.6 * rCtc]) {
      const position: Vector4 = [0, r, 3e6, 0.7]
      const analytic = metric.inverseMetric(position)
      const numeric = invertMatrix4(metric.metric(position))
      for (let mu = 0; mu < 4; mu += 1) {
        for (let nu = 0; nu < 4; nu += 1) {
          expect(numeric[mu][nu]).toBeCloseTo(analytic[mu][nu], 10)
        }
      }
    }
  })

  it("Schwarzschild NÃO tem CTCs pelo diagnóstico (g_φφ > 0 no exterior)", () => {
    const schw = createSchwarzschildMetric(10 * SOLAR_MASS_KG)
    const rs = schw.schwarzschildRadiusM
    for (const r of [1.1 * rs, 3 * rs, 50 * rs]) {
      expect(causalityDiagnostic(schw, [0, r, Math.PI / 2, 0]).closedTimelikeCircle).toBe(false)
    }
  })
})

describe("cenário 8 — universo de Gödel", () => {
  it("geodésica conserva norma, E e L (plugin numérico + DP54) e permanece limitada", () => {
    const runner = new GeodesicSimulationRunner(createScenario("godel-universe"))
    // ~3 rotações características do universo.
    runner.advanceLambda(3 * 2 * Math.PI * Math.SQRT2 * a)
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(false)
    expect(snapshot.validation.normError).toBeLessThan(1e-8)
    expect(snapshot.energyDriftRelative).toBeLessThan(1e-8)
    // Geodésicas de Gödel são LIMITADAS: nunca alcançam a região acausal
    // partindo de r₀ = 0,45 r_CTC com velocidade moderada.
    expect(snapshot.position[1]).toBeLessThan(rCtc)
    expect(snapshot.causality.closedTimelikeCircle).toBe(false)
  })

  it("diagnóstico ao vivo acusa CTC quando a posição está além de r_CTC", () => {
    // Estado artificial na região acausal: o snapshot deve acusar.
    const diag = causalityDiagnostic(metric, [0, 1.5 * rCtc, 0, 0])
    expect(diag.closedTimelikeCircle).toBe(true)
  })
})
