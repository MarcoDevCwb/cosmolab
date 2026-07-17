/**
 * Validação da métrica de Kerr e do arrasto de referenciais.
 *
 * Kerr roda como "plugin" (sem Christoffels analíticos): estes testes verificam
 * que o caminho numérico completo — inversa analítica, diferenças finitas,
 * RK4 — reproduz limites e invariantes conhecidos.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG, geometrizedMass } from "../../constants"
import { GeodesicSimulationRunner } from "../../../simulation/simulationRunner"
import { createScenario } from "../../../simulation/scenarios"
import { invertMatrix4 } from "../tensor"
import type { Vector4 } from "../tensor"
import { createKerrMetric } from "./kerr"
import { createSchwarzschildMetric } from "./schwarzschild"

const MASS = 10 * SOLAR_MASS_KG

describe("métrica de Kerr (Boyer–Lindquist)", () => {
  it("reduz-se exatamente a Schwarzschild quando a = 0", () => {
    const kerr = createKerrMetric(MASS, 0)
    const schwarzschild = createSchwarzschildMetric(MASS)
    const position: Vector4 = [0, 7.3 * schwarzschild.schwarzschildRadiusM, 1.1, 0.4]

    const gKerr = kerr.metric(position)
    const gSch = schwarzschild.metric(position)
    for (let mu = 0; mu < 4; mu += 1) {
      for (let nu = 0; nu < 4; nu += 1) {
        expect(gKerr[mu][nu]).toBeCloseTo(gSch[mu][nu], 8)
      }
    }
  })

  it("inversa analítica do bloco t–φ coincide com Gauss-Jordan", () => {
    const kerr = createKerrMetric(MASS, 0.9)
    const position: Vector4 = [0, 4.2 * kerr.schwarzschildRadiusM, 0.9, 1.7]

    const analytic = kerr.inverseMetric(position)
    const numeric = invertMatrix4(kerr.metric(position))
    for (let mu = 0; mu < 4; mu += 1) {
      for (let nu = 0; nu < 4; nu += 1) {
        const scale = Math.max(Math.abs(numeric[mu][nu]), 1e-12)
        expect(Math.abs(analytic[mu][nu] - numeric[mu][nu]) / scale).toBeLessThan(1e-9)
      }
    }
  })

  it("horizonte externo r₊ = M_geo + √(M_geo² − a²)", () => {
    const spin = 0.9
    const kerr = createKerrMetric(MASS, spin)
    const geoMass = geometrizedMass(MASS)
    expect(kerr.horizonRadiusM).toBeCloseTo(
      geoMass * (1 + Math.sqrt(1 - spin * spin)),
      6,
    )
    // Ergosfera equatorial em r_s = 2 M_geo, sempre fora do horizonte.
    expect(kerr.ergosphereEquatorRadiusM).toBeCloseTo(2 * geoMass, 6)
    expect(kerr.ergosphereEquatorRadiusM).toBeGreaterThan(kerr.horizonRadiusM)
  })
})

describe("cenário 5 — arrasto de referenciais", () => {
  it("partícula com L = 0 é arrastada em φ; L e norma conservados (plugin numérico)", () => {
    const runner = new GeodesicSimulationRunner(createScenario("kerr-frame-dragging"))
    const scenario = runner.scenario

    // Momento angular inicial nulo por construção (tolerância de arredondamento).
    expect(Math.abs(runner.snapshot().validation.angularMomentum)).toBeLessThan(1e-6)

    // Avança boa parte da queda.
    for (let i = 0; i < 50 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(2e4)
    }
    const snapshot = runner.snapshot()

    // ARRASTO: girou na direção do spin sem nenhum torque (Lense–Thirring).
    expect(snapshot.position[3]).toBeGreaterThan(0.05)
    // Caiu (não é órbita): r diminuiu.
    expect(snapshot.position[1]).toBeLessThan(scenario.initialState[1])

    // Constantes de Killing e norma com Christoffels NUMÉRICOS e queda até
    // 1,06 r₊ (região rígida, Δ → 0): tolerâncias refletem o RK4 de passo
    // fixo nessa região — longe do horizonte a conservação é ~1e-9.
    // |L| comparado à escala dos termos que se cancelam (g_tφu^t ~ 2,5e3 m):
    // 0,02 m ≈ 8e-6 relativo.
    expect(Math.abs(snapshot.validation.angularMomentum)).toBeLessThan(2e-2)
    expect(snapshot.validation.normError).toBeLessThan(1e-4)
    expect(snapshot.energyDriftRelative).toBeLessThan(1e-4)

    // Plano equatorial preservado (simetria de reflexão de Kerr).
    expect(snapshot.position[2]).toBeCloseTo(Math.PI / 2, 8)
  })

  it("sem spin (a = 0) não há arrasto: φ permanece zero", () => {
    const runner = new GeodesicSimulationRunner(
      createScenario("kerr-frame-dragging", {
        massSolar: 10,
        impactParameterRs: 0,
        startRadiusRs: 6,
        angularVelocityFraction: 0,
        spinFraction: 0,
      }),
    )

    for (let i = 0; i < 20; i += 1) {
      runner.advanceLambda(2e4)
    }
    expect(Math.abs(runner.snapshot().position[3])).toBeLessThan(1e-8)
  })
})
