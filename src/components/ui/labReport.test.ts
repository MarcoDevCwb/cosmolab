/**
 * Relatório de laboratório: o documento deve conter as seções científicas
 * essenciais — identidade, proveniência, validação, referências e a URL
 * reproduzível — gerado como função pura sobre o snapshot.
 */

import { describe, expect, it } from "vitest"
import { GeodesicSimulationRunner } from "../../simulation/simulationRunner"
import { DEFAULT_EXPERIMENT_PARAMS, createScenario } from "../../simulation/scenarios"
import { computeExperimentId } from "./exportExperiment"
import { buildLabReportHtml } from "./labReport"

describe("relatório de laboratório", () => {
  it("contém ID, observáveis com proveniência, validação, referências e URL", () => {
    const params = DEFAULT_EXPERIMENT_PARAMS["solar-light-deflection"]
    const scenario = createScenario("solar-light-deflection", params)
    const runner = new GeodesicSimulationRunner(scenario)
    for (let i = 0; i < 200 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(1e9)
    }
    const snapshot = runner.snapshot()
    const url = "https://cosmolab.example/?cenario=solar-light-deflection"

    const html = buildLabReportHtml(scenario, params, snapshot, ["eddington-1919"], url)

    expect(html).toContain(computeExperimentId(scenario.id, params))
    expect(html).toContain("Deflexão acumulada")
    expect(html).toContain("numérico")
    expect(html).toContain("campo fraco")
    expect(html).toContain("Erro de norma")
    expect(html).toContain("Kretschmann")
    expect(html).toContain("Weinberg")
    expect(html).toContain("O eclipse de Eddington") // missão cumprida deste cenário
    expect(html).toContain(url)
    expect(html).toContain("<svg") // gráficos embutidos
    // Escape de HTML: nada de injeção vinda de strings de cenário.
    expect(html).not.toContain("<script")
  })

  it("métrica personalizada inclui as componentes escritas pelo usuário", () => {
    const params = DEFAULT_EXPERIMENT_PARAMS["custom-metric"]
    const scenario = createScenario("custom-metric", params)
    const runner = new GeodesicSimulationRunner(scenario)
    runner.advanceLambda(scenario.stepLambdaM * 500)

    const html = buildLabReportHtml(scenario, params, runner.snapshot(), [], "http://x/")
    expect(html).toContain("g_tt = -(1 - 2*M/r)")
    expect(html).toContain("speculative")
  })
})
