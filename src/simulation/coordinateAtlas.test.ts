/**
 * Atlas de Coordenadas — prova numérica de que Schwarzschild e
 * Painlevé–Gullstrand descrevem o MESMO espaço-tempo: a mesma queda,
 * sincronizada pelo tempo próprio (mesmo Δλ = c·Δτ), deve concordar em
 * todos os INVARIANTES enquanto as duas cartas forem válidas.
 */

import { describe, expect, it } from "vitest"
import { GeodesicSimulationRunner } from "./simulationRunner"
import { DEFAULT_EXPERIMENT_PARAMS, createScenario } from "./scenarios"

describe("atlas de coordenadas — Schwarzschild × Painlevé–Gullstrand", () => {
  const params = {
    ...DEFAULT_EXPERIMENT_PARAMS["schwarzschild-horizon"],
    massSolar: 10,
    startRadiusRs: 6,
  }

  it("mesmo Δτ ⇒ mesmo raio areal, mesmo K, mesma E (invariantes coincidem)", () => {
    const schwarzschild = new GeodesicSimulationRunner(
      createScenario("schwarzschild-horizon", params),
    )
    const painleve = new GeodesicSimulationRunner(createScenario("painleve-infall", params))

    // Avança ambos pelo MESMO parâmetro afim, em etapas, até meio da queda.
    for (let i = 0; i < 30; i += 1) {
      schwarzschild.advanceLambda(1e4)
      painleve.advanceLambda(1e4)

      const a = schwarzschild.snapshot()
      const b = painleve.snapshot()
      if (a.halted || b.halted) {
        break
      }

      // τ idêntico por construção (mesmo λ), r areal é invariante físico.
      expect(a.properTimeS).toBeCloseTo(b.properTimeS!, 12)
      expect(Math.abs(a.position[1] - b.position[1]) / a.position[1]).toBeLessThan(1e-6)
      // Kretschmann no mesmo evento: invariante de curvatura.
      expect(
        Math.abs(a.invariants.kretschmann - b.invariants.kretschmann) /
          a.invariants.kretschmann,
      ).toBeLessThan(1e-3)
      // Energia conservada e igual nas duas cartas (mesma condição física).
      expect(Math.abs(a.validation.energy - b.validation.energy)).toBeLessThan(1e-7)
    }
  })

  it("os destinos divergem APENAS por carta: Schwarzschild para em ~r_s, PG cruza", () => {
    const schwarzschild = new GeodesicSimulationRunner(
      createScenario("schwarzschild-horizon", params),
    )
    const painleve = new GeodesicSimulationRunner(createScenario("painleve-infall", params))
    const rs = painleve.scenario.schwarzschildRadiusM!

    for (let i = 0; i < 300; i += 1) {
      schwarzschild.advanceLambda(1e5)
      painleve.advanceLambda(1e5)
      if (schwarzschild.snapshot().halted && painleve.snapshot().halted) {
        break
      }
    }

    const a = schwarzschild.snapshot()
    const b = painleve.snapshot()

    expect(a.halted).toBe(true)
    expect(a.position[1] / rs).toBeGreaterThan(1) // preso fora do horizonte
    expect(b.halted).toBe(true)
    expect(b.position[1] / rs).toBeLessThan(0.06) // atravessou até perto de r = 0
  })
})
