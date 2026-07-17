/**
 * Missões pedagógicas: o motor deve reconhecer a configuração correta e
 * rejeitar as incorretas — a "correção automática" do modo descoberta.
 */

import { describe, expect, it } from "vitest"
import { MISSION_BY_ID } from "./missions"
import { GeodesicSimulationRunner } from "./simulationRunner"
import { DEFAULT_EXPERIMENT_PARAMS, createScenario } from "./scenarios"

describe("missões pedagógicas", () => {
  it("Eddington 1919: preset solar completo é aprovado; massa errada reprova", () => {
    const mission = MISSION_BY_ID.get("eddington-1919")!
    const params = DEFAULT_EXPERIMENT_PARAMS["solar-light-deflection"]
    const runner = new GeodesicSimulationRunner(createScenario("solar-light-deflection", params))

    for (let i = 0; i < 200 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(1e9)
    }
    const snapshot = runner.snapshot()

    const approved = mission.evaluate(snapshot, params)
    expect(approved.complete).toBe(true)

    const wrongMass = mission.evaluate(snapshot, { ...params, massSolar: 5 })
    expect(wrongMass.complete).toBe(false)
    expect(wrongMass.checks[0].done).toBe(false)
  })

  it("beira do abismo: periastro ~3,1 r_s sobrevivendo aprova; tímido ou engolido reprova", () => {
    const mission = MISSION_BY_ID.get("isco-edge")!

    // Ousado na medida: r₀ = 8 r_s a 85% da velocidade LOCAL circular
    // → periastro analítico ≈ 3,12 r_s, sobrevive.
    const goodParams = {
      ...DEFAULT_EXPERIMENT_PARAMS["relativistic-orbit"],
      startRadiusRs: 8,
      angularVelocityFraction: 0.85,
    }
    const good = new GeodesicSimulationRunner(createScenario("relativistic-orbit", goodParams))
    good.advanceLambda(good.scenario.stepLambdaM * 4000 * 4.5)
    const goodSnapshot = good.snapshot()
    expect(mission.evaluate(goodSnapshot, goodParams).complete).toBe(true)
    const goodPeriastronRs = Math.min(...goodSnapshot.history.map((point) => point.radiusM)) /
      good.scenario.schwarzschildRadiusM!
    expect(goodPeriastronRs).toBeGreaterThan(3.0)
    expect(goodPeriastronRs).toBeLessThan(3.25)

    // Tímido: preset padrão (periastro ~6 r_s) não cumpre o mergulho.
    const timidParams = DEFAULT_EXPERIMENT_PARAMS["relativistic-orbit"]
    const timid = new GeodesicSimulationRunner(createScenario("relativistic-orbit", timidParams))
    timid.advanceLambda(timid.scenario.stepLambdaM * 4000 * 4.5)
    const timidEval = mission.evaluate(timid.snapshot(), timidParams)
    expect(timidEval.complete).toBe(false)
    expect(timidEval.checks[1].done).toBe(false)

    // Exagerado: 99% da velocidade LOCAL circular em r₀ = 3,1 r_s deixa
    // L² < 12M², elimina os extremos do potencial e causa mergulho.
    const doomedParams = {
      ...DEFAULT_EXPERIMENT_PARAMS["relativistic-orbit"],
      startRadiusRs: 3.1,
      angularVelocityFraction: 0.99,
    }
    const doomed = new GeodesicSimulationRunner(createScenario("relativistic-orbit", doomedParams))
    doomed.advanceLambda(doomed.scenario.stepLambdaM * 4000 * 4.5)
    expect(mission.evaluate(doomed.snapshot(), doomedParams).complete).toBe(false)
  })

  it("armadilha de luz: b = 2,55 r_s captura e aprova; b = 2,7 r_s escapa e reprova", () => {
    const mission = MISSION_BY_ID.get("photon-trap")!

    const captureParams = {
      ...DEFAULT_EXPERIMENT_PARAMS["solar-light-deflection"],
      impactParameterRs: 2.55,
    }
    const capture = new GeodesicSimulationRunner(
      createScenario("solar-light-deflection", captureParams),
    )
    for (let i = 0; i < 400 && !capture.snapshot().halted; i += 1) {
      capture.advanceLambda(1e5)
    }
    const captureSnapshot = capture.snapshot()
    expect(captureSnapshot.haltReason).toBe("out-of-bounds")
    expect(mission.evaluate(captureSnapshot, captureParams).complete).toBe(true)

    const escapeParams = { ...captureParams, impactParameterRs: 2.7 }
    const escape = new GeodesicSimulationRunner(
      createScenario("solar-light-deflection", escapeParams),
    )
    for (let i = 0; i < 600 && !escape.snapshot().halted; i += 1) {
      escape.advanceLambda(1e5)
    }
    expect(mission.evaluate(escape.snapshot(), escapeParams).complete).toBe(false)
  })
})
