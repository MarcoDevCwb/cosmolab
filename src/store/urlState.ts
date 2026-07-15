/**
 * Experimentos compartilháveis por URL.
 *
 * Serializa cenário + parâmetros na query string (?cenario=...&m=...&b=...)
 * para que qualquer configuração do laboratório vire um link. Somente
 * apresentação/estado — nenhuma física.
 */

import { DEFAULT_EXPERIMENT_PARAMS, SCENARIO_IDS } from "../simulation/scenarios"
import type { ExperimentParams, ScenarioId } from "../simulation/scenarios"

const SCENARIO_KEY = "cenario"

const PARAM_KEYS: Record<keyof ExperimentParams, string> = {
  massSolar: "m",
  impactParameterRs: "b",
  startRadiusRs: "r0",
  angularVelocityFraction: "w",
}

export function readExperimentFromUrl(): {
  scenarioId: ScenarioId
  params: ExperimentParams
} | null {
  const query = new URLSearchParams(window.location.search)
  const scenarioId = query.get(SCENARIO_KEY) as ScenarioId | null
  if (!scenarioId || !SCENARIO_IDS.includes(scenarioId)) {
    return null
  }

  const params: ExperimentParams = { ...DEFAULT_EXPERIMENT_PARAMS[scenarioId] }
  for (const [paramKey, queryKey] of Object.entries(PARAM_KEYS)) {
    const raw = query.get(queryKey)
    if (raw !== null) {
      const value = Number(raw)
      if (Number.isFinite(value) && value >= 0) {
        params[paramKey as keyof ExperimentParams] = value
      }
    }
  }

  return { scenarioId, params }
}

export function writeExperimentToUrl(scenarioId: ScenarioId, params: ExperimentParams): void {
  const query = new URLSearchParams()
  query.set(SCENARIO_KEY, scenarioId)

  const defaults = DEFAULT_EXPERIMENT_PARAMS[scenarioId]
  for (const [paramKey, queryKey] of Object.entries(PARAM_KEYS)) {
    const key = paramKey as keyof ExperimentParams
    if (params[key] !== defaults[key]) {
      query.set(queryKey, params[key].toPrecision(6))
    }
  }

  const next = `${window.location.pathname}?${query.toString()}`
  window.history.replaceState(null, "", next)
}
