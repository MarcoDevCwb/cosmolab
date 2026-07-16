/**
 * Validação do sistema de métricas plugáveis: a métrica definida por texto
 * deve reproduzir Schwarzschild quando as expressões são as de Schwarzschild,
 * o resolvedor genérico de órbita circular deve bater com as fórmulas
 * conhecidas, e definições inválidas devem ser rejeitadas com mensagem.
 */

import { afterAll, describe, expect, it } from "vitest"
import { SOLAR_MASS_KG, geometrizedMass } from "../../constants"
import { equatorialCircularOrbit } from "../circularOrbit"
import { createSchwarzschildMetric } from "./schwarzschild"
import {
  DEFAULT_CUSTOM_METRIC,
  createCustomMetric,
  validateCustomMetric,
} from "./customMetric"
import { GeodesicSimulationRunner } from "../../../simulation/simulationRunner"
import { createScenario } from "../../../simulation/scenarios"
import { setCustomMetricDefinition } from "../../../simulation/scenarios/customGeodesic"
import type { Vector4 } from "../tensor"

const massKg = 10 * SOLAR_MASS_KG
const M = geometrizedMass(massKg)

afterAll(() => {
  // Restaura o preset para não vazar estado entre suítes.
  setCustomMetricDefinition(DEFAULT_CUSTOM_METRIC)
})

describe("métrica personalizada (plugável)", () => {
  it("preset Schwarzschild editável ≡ Schwarzschild analítica", () => {
    const custom = createCustomMetric(DEFAULT_CUSTOM_METRIC, massKg)
    const reference = createSchwarzschildMetric(massKg)
    const position: Vector4 = [0, 7.3 * M, 1.2, 0.4]

    const gCustom = custom.metric(position)
    const gReference = reference.metric(position)
    for (let mu = 0; mu < 4; mu += 1) {
      for (let nu = 0; nu < 4; nu += 1) {
        const scale = Math.max(Math.abs(gReference[mu][nu]), 1e-12)
        expect(Math.abs(gCustom[mu][nu] - gReference[mu][nu]) / scale).toBeLessThan(1e-12)
      }
    }

    // Simetrias autodetectadas (expressões não referenciam ct nem phi).
    expect(custom.symmetries?.stationary).toBe(true)
    expect(custom.symmetries?.axisymmetric).toBe(true)
  })

  it("órbita circular genérica reproduz ω̃ = √(r_s/2r³) em Schwarzschild", () => {
    const custom = createCustomMetric(DEFAULT_CUSTOM_METRIC, massKg)
    const r0 = 16 * M // = 8 r_s
    const circular = equatorialCircularOrbit(custom, r0)
    const expected = Math.sqrt((2 * M) / (2 * r0 ** 3))

    expect(circular).not.toBeNull()
    expect(Math.abs(circular!.omegaPerMeter - expected) / expected).toBeLessThan(1e-5)
  })

  it("Reissner–Nordström (Q = 0,6 M): ω̃² = M/r³ − Q²/r⁴ pelo resolvedor genérico", () => {
    const rn = createCustomMetric(
      {
        name: "Reissner–Nordström",
        gtt: "-(1 - 2*M/r + 0.36*M*M/(r*r))",
        gtphi: "0",
        grr: "1/(1 - 2*M/r + 0.36*M*M/(r*r))",
        gthth: "r*r",
        gphph: "r*r*sin(theta)*sin(theta)",
      },
      massKg,
    )

    const r0 = 12 * M
    const circular = equatorialCircularOrbit(rn, r0)
    const expectedOmegaSq = M / r0 ** 3 - (0.36 * M * M) / r0 ** 4

    expect(circular).not.toBeNull()
    expect(
      Math.abs(circular!.omegaPerMeter ** 2 - expectedOmegaSq) / expectedOmegaSq,
    ).toBeLessThan(1e-4)
  })

  it("rejeita definições inválidas com mensagem clara", () => {
    expect(
      validateCustomMetric({ ...DEFAULT_CUSTOM_METRIC, grr: "1/(1 -" }).ok,
    ).toBe(false)
    // Assinatura errada: g_tt positiva longe da massa.
    const wrongSignature = validateCustomMetric({ ...DEFAULT_CUSTOM_METRIC, gtt: "(1 - 2*M/r)" })
    expect(wrongSignature.ok).toBe(false)
    if (!wrongSignature.ok) {
      expect(wrongSignature.error).toContain("g_tt")
    }
  })

  it("cenário integra a métrica do usuário com norma e E conservadas", () => {
    const applied = setCustomMetricDefinition({
      name: "Reissner–Nordström (Q = 0,6 M)",
      gtt: "-(1 - 2*M/r + 0.36*M*M/(r*r))",
      gtphi: "0",
      grr: "1/(1 - 2*M/r + 0.36*M*M/(r*r))",
      gthth: "r*r",
      gphph: "r*r*sin(theta)*sin(theta)",
    })
    expect(applied.ok).toBe(true)

    const runner = new GeodesicSimulationRunner(createScenario("custom-metric"))
    // ~2 órbitas na métrica do usuário.
    runner.advanceLambda(runner.scenario.stepLambdaM * 8000)
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(false)
    expect(snapshot.validation.normError).toBeLessThan(1e-8)
    expect(snapshot.energyDriftRelative).toBeLessThan(1e-8)
    expect(snapshot.position[2]).toBeCloseTo(Math.PI / 2, 8)
  })
})
