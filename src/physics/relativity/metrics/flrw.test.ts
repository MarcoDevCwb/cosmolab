/**
 * FLRW: a solução exata deve satisfazer Friedmann, os Christoffels
 * analíticos devem bater com as diferenças finitas, e o diagnóstico de
 * matéria deve REDESCOBRIR a equação de Friedmann a partir de G_μν.
 */

import { describe, expect, it } from "vitest"
import {
  GRAVITATIONAL_CONSTANT,
  SPEED_OF_LIGHT,
} from "../../constants"
import { christoffelFromMetric } from "../christoffel"
import { matterDiagnostic } from "../curvature"
import { createFlrwMetric } from "./flrw"
import type { Vector4 } from "../tensor"

const H0 = 2.268e-18 // 70 km/s/Mpc [1/s]
const metric = createFlrwMetric(H0, 0.3)

describe("métrica FLRW", () => {
  it("a(t) satisfaz a equação de Friedmann (ȧ/a)² = H₀²(Ω_m a⁻³ + Ω_Λ)", () => {
    for (const fraction of [0.3, 0.6, 1.0, 1.5]) {
      const ct = fraction * metric.nowCtM
      const h = ct * 1e-7
      const aPlus = metric.scaleFactorAt(ct + h)
      const aMinus = metric.scaleFactorAt(ct - h)
      const a = metric.scaleFactorAt(ct)
      const hubbleNumeric = (aPlus - aMinus) / (2 * h) / a // [1/m]

      const expected =
        (H0 / SPEED_OF_LIGHT) * Math.sqrt(0.3 * a ** -3 + 0.7)
      expect(Math.abs(hubbleNumeric - expected) / expected).toBeLessThan(1e-6)
    }
  })

  it("a(t₀) = 1 hoje e idade compatível (~13,5 Ga para Ω_m = 0,3)", () => {
    expect(metric.scaleFactorAt(metric.nowCtM)).toBeCloseTo(1, 10)
    const ageGyr = metric.nowCtM / SPEED_OF_LIGHT / 3.156e16
    expect(ageGyr).toBeGreaterThan(13)
    expect(ageGyr).toBeLessThan(14.2)
  })

  it("Christoffels analíticos ≡ diferenças finitas (métrica não-estacionária)", () => {
    const ct = 0.6 * metric.nowCtM
    const position: Vector4 = [ct, 1e25, -3e24, 5e24]
    const analytic = metric.christoffel!(position)
    const numeric = christoffelFromMetric(metric, position, [ct, 1e25, 1e25, 1e25])

    for (let mu = 0; mu < 4; mu += 1) {
      for (let alpha = 0; alpha < 4; alpha += 1) {
        for (let beta = 0; beta < 4; beta += 1) {
          const reference = analytic[mu][alpha][beta]
          const scale = Math.max(Math.abs(reference), 1e-30)
          expect(Math.abs(numeric[mu][alpha][beta] - reference) / scale).toBeLessThan(1e-4)
        }
      }
    }
  })

  it("o motor REDESCOBRE Friedmann: ρ medido = 3c²H(t)²/(8πG), NEC ok", () => {
    const ct = 0.7 * metric.nowCtM
    const a = metric.scaleFactorAt(ct)
    const hubblePerSecond =
      H0 * Math.sqrt(0.3 * a ** -3 + 0.7) // H(t) da solução exata

    const matter = matterDiagnostic(metric, [ct, 1e25, 0, 0], [ct, 1e25, 1e25, 1e25])
    const expected =
      (3 * SPEED_OF_LIGHT ** 2 * hubblePerSecond ** 2) / (8 * Math.PI * GRAVITATIONAL_CONSTANT)

    expect(matter).not.toBeNull()
    expect(matter!.vacuum).toBe(false)
    expect(Math.abs(matter!.energyDensityJm3 - expected) / expected).toBeLessThan(1e-3)
    // Matéria + Λ satisfaz a condição nula de energia (ρ_m ≥ 0).
    expect(matter!.nullEnergyConditionOk).toBe(true)
  })
})

describe("cenário 10 — expansão cósmica", () => {
  it("o fóton chega avermelhado: z numérico ≡ z analítico e a²·u^x conservado", async () => {
    const { GeodesicSimulationRunner } = await import("../../../simulation/simulationRunner")
    const { createScenario, DEFAULT_EXPERIMENT_PARAMS } = await import(
      "../../../simulation/scenarios"
    )

    const runner = new GeodesicSimulationRunner(
      createScenario("flrw-expansion", DEFAULT_EXPERIMENT_PARAMS["flrw-expansion"]),
    )
    for (let i = 0; i < 300 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(2e24)
    }
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(true)
    expect(snapshot.haltReason).toBe("stop-condition")

    const redshift = snapshot.observables.find((o) => o.id === "redshift")!
    const drift = snapshot.observables.find((o) => o.id === "comoving-momentum-drift")!

    // Medição numérica (via u⁰) ≡ referência analítica (via razão de a).
    expect(Math.abs(redshift.value - redshift.reference!) / (1 + redshift.value)).toBeLessThan(
      1e-8,
    )
    // D = 0,78 c/H₀ foi escolhido para a luz chegar ~hoje: z ≈ 1.
    expect(redshift.value).toBeGreaterThan(0.85)
    expect(redshift.value).toBeLessThan(1.15)
    // Momento comóvel conservado (o substituto de E sem Killing temporal).
    expect(drift.value).toBeLessThan(1e-8)
    // Norma nula conservada em métrica NÃO-estacionária.
    expect(snapshot.validation.normError).toBeLessThan(1e-8)
  })
})
