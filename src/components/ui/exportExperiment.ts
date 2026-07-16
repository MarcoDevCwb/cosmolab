/**
 * Exportação e identidade de experimentos — reprodutibilidade científica.
 *
 * - ID do experimento: hash FNV-1a da configuração canônica (cenário +
 *   parâmetros + definição de métrica + versão do motor). A MESMA
 *   configuração produz sempre o mesmo ID; qualquer mudança o troca.
 * - JSON: configuração completa + estado + observáveis + validação +
 *   telemetria do integrador + referências — suficiente para reproduzir
 *   e para citar.
 * - CSV: séries λ, coordenadas, r, t, τ, erro de norma e deriva de E,
 *   prontas para análise externa (Python/R/planilha).
 *
 * Camada de UI: apenas serialização e download — nenhum cálculo físico.
 */

import { ENGINE_UNIT_SYSTEM } from "../../physics/core/units"
import type { ExperimentParams, ScenarioId, SimulationScenario } from "../../simulation/scenarios"
import { getCustomMetricDefinition } from "../../simulation/scenarios/customGeodesic"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import { COSMOLAB_VERSION } from "../../version"

/** Hash FNV-1a 32 bits em hexadecimal (8 caracteres). */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export function computeExperimentId(scenarioId: ScenarioId, params: ExperimentParams): string {
  const metricPart =
    scenarioId === "custom-metric" ? JSON.stringify(getCustomMetricDefinition()) : ""
  return fnv1a(`${scenarioId}|${JSON.stringify(params)}|${metricPart}|${COSMOLAB_VERSION}`)
}

export function buildExperimentJson(
  scenario: SimulationScenario,
  params: ExperimentParams,
  snapshot: RelativitySnapshot,
): string {
  const payload = {
    cosmolabVersion: COSMOLAB_VERSION,
    experimentId: computeExperimentId(scenario.id, params),
    exportedAt: new Date().toISOString(),
    unitSystem: ENGINE_UNIT_SYSTEM,
    scenario: {
      id: scenario.id,
      label: scenario.label,
      scientificStatus: scenario.scientificStatus,
      metric: scenario.metric.name,
      geodesicKind: scenario.kind,
      references: scenario.references,
    },
    parameters: params,
    customMetric: scenario.id === "custom-metric" ? getCustomMetricDefinition() : undefined,
    integrator: snapshot.integrator,
    state: {
      lambdaM: snapshot.lambdaM,
      coordinateTimeS: snapshot.coordinateTimeS,
      properTimeS: snapshot.properTimeS,
      position: snapshot.position,
      velocity: snapshot.velocity,
      halted: snapshot.halted,
      haltReason: snapshot.haltReason,
    },
    validation: {
      ...snapshot.validation,
      energyDriftRelative: snapshot.energyDriftRelative,
      angularMomentumDriftRelative: snapshot.angularMomentumDriftRelative,
      invariants: snapshot.invariants,
    },
    observables: snapshot.observables,
    trajectory: snapshot.samples,
    history: snapshot.history,
  }

  return JSON.stringify(payload, null, 2)
}

export function buildExperimentCsv(snapshot: RelativitySnapshot): string {
  const header =
    "lambda_m,x0_m,x1_m,x2_rad,x3_rad,radius_m,coordinate_time_s,proper_time_s,norm_error,energy_drift_rel"
  const rows = snapshot.history.map((point, index) => {
    const sample = snapshot.samples[index]
    const position = sample ? sample.position : [NaN, NaN, NaN, NaN]
    return [
      point.lambdaM,
      position[0],
      position[1],
      position[2],
      position[3],
      point.radiusM,
      point.coordinateTimeS,
      point.properTimeS ?? "",
      point.normError,
      point.energyDriftRelative,
    ].join(",")
  })

  return [header, ...rows].join("\n")
}

export function downloadTextFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
