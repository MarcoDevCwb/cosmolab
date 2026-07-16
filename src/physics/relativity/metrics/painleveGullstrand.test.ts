/**
 * Validação de Painlevé–Gullstrand: regularidade no horizonte, equivalência
 * geométrica com Schwarzschild e a travessia do horizonte de fato.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG } from "../../constants"
import { christoffelFromMetric } from "../christoffel"
import { GeodesicSimulationRunner } from "../../../simulation/simulationRunner"
import { createScenario } from "../../../simulation/scenarios"
import type { Vector4 } from "../tensor"
import { invertMatrix4 } from "../tensor"
import { createPainleveGullstrandMetric } from "./painleveGullstrand"

const massKg = 10 * SOLAR_MASS_KG

describe("métrica de Painlevé–Gullstrand", () => {
  const metric = createPainleveGullstrandMetric(massKg)
  const rs = metric.schwarzschildRadiusM

  it("inversa analítica coincide com Gauss-Jordan (dentro E fora do horizonte)", () => {
    for (const r of [0.4 * rs, 1 * rs, 3.7 * rs]) {
      const position: Vector4 = [0, r, 1.2, 0.5]
      const analytic = metric.inverseMetric(position)
      const numeric = invertMatrix4(metric.metric(position))
      for (let mu = 0; mu < 4; mu += 1) {
        for (let nu = 0; nu < 4; nu += 1) {
          expect(numeric[mu][nu]).toBeCloseTo(analytic[mu][nu], 9)
        }
      }
    }
  })

  it("determinante da métrica = −r⁴sin²θ (mesma geometria de Schwarzschild)", () => {
    // det(g) é invariante de carta a menos do jacobiano; para PG e
    // Schwarzschild nas mesmas coordenadas angulares o valor coincide.
    const r = 2.3 * rs
    const theta = 1.1
    const g = metric.metric([0, r, theta, 0])
    // Bloco T–r tem det = −1; logo det(g) = −1 · r² · r²sin²θ.
    const blockDet = g[0][0] * g[1][1] - g[0][1] * g[0][1]
    expect(blockDet).toBeCloseTo(-1, 12)
    const determinant = blockDet * g[2][2] * g[3][3]
    const reference = -(r ** 4) * Math.sin(theta) ** 2
    expect(determinant / reference).toBeCloseTo(1, 12)
  })

  it("Christoffels numéricos são FINITOS exatamente em r = r_s", () => {
    const gamma = christoffelFromMetric(metric, [0, rs, Math.PI / 2, 0], [rs, rs, 1, 1])
    for (let mu = 0; mu < 4; mu += 1) {
      for (let alpha = 0; alpha < 4; alpha += 1) {
        for (let beta = 0; beta < 4; beta += 1) {
          expect(Number.isFinite(gamma[mu][alpha][beta])).toBe(true)
        }
      }
    }
  })
})

describe("cenário 6 — através do horizonte", () => {
  it("a partícula CRUZA r_s e para só perto da singularidade, com E conservada", () => {
    const runner = new GeodesicSimulationRunner(createScenario("painleve-infall"))
    const scenario = runner.scenario
    const rs = scenario.schwarzschildRadiusM!
    const expectedEnergy = Math.sqrt(1 - rs / (6 * rs))

    for (let i = 0; i < 300 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(1e5)
    }
    const snapshot = runner.snapshot()

    // Atravessou: parou na condição física (r ≈ 0,05 r_s), não no domínio.
    expect(snapshot.halted).toBe(true)
    expect(snapshot.haltReason).toBe("stop-condition")
    expect(snapshot.position[1] / rs).toBeLessThan(0.06)

    // E é constante de Killing também em PG — conservada através do horizonte.
    expect(Math.abs(snapshot.validation.energy - expectedEnergy)).toBeLessThan(1e-6)

    // τ do cruzamento foi registrado e é finito.
    const crossing = snapshot.observables.find((o) => o.id === "crossing-tau")
    expect(crossing).toBeDefined()
    expect(crossing!.value).toBeGreaterThan(0)
    expect(crossing!.value).toBeLessThan(0.1)
  })

  it("no horizonte vale a identidade exata u^r = −E (regularidade física)", () => {
    const runner = new GeodesicSimulationRunner(createScenario("painleve-infall"))
    const scenario = runner.scenario
    const rs = scenario.schwarzschildRadiusM!

    // Avança até imediatamente após o cruzamento.
    let previous = runner.currentState
    while (runner.currentState[1] > rs && !runner.snapshot().halted) {
      previous = runner.currentState
      runner.advanceLambda(scenario.stepLambdaM * 20)
    }
    const state = runner.currentState

    // Interpola u^r em r = r_s entre os dois estados vizinhos.
    const fraction = (previous[1] - rs) / (previous[1] - state[1])
    const radialVelocityAtHorizon = previous[5] + fraction * (state[5] - previous[5])
    const energy = Math.sqrt(1 - 1 / 6)

    expect(Math.abs(-radialVelocityAtHorizon - energy)).toBeLessThan(1e-3)
  })
})
