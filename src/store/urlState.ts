/**
 * Experimentos compartilháveis por URL.
 *
 * Serializa cenário + parâmetros na query string (?cenario=...&m=...&b=...)
 * para que qualquer configuração do laboratório vire um link. Somente
 * apresentação/estado — nenhuma física.
 */

import { DEFAULT_EXPERIMENT_PARAMS, SCENARIO_IDS } from "../simulation/scenarios"
import {
  getCustomMetricDefinition,
  setCustomMetricDefinition,
} from "../simulation/scenarios/customGeodesic"
import type { CustomMetricDefinition } from "../physics/relativity/metrics/customMetric"
import type { ExperimentParams, ScenarioId } from "../simulation/scenarios"

const SCENARIO_KEY = "cenario"
const METRIC_KEY = "md"

/** Base64url (UTF-8) para embutir a definição de métrica na URL. */
function encodeDefinition(definition: CustomMetricDefinition): string {
  const bytes = new TextEncoder().encode(JSON.stringify(definition))
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}

function decodeDefinition(encoded: string): CustomMetricDefinition | null {
  try {
    const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as CustomMetricDefinition
    if (
      typeof parsed?.name === "string" &&
      typeof parsed?.gtt === "string" &&
      typeof parsed?.grr === "string"
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

const PARAM_KEYS: Record<keyof ExperimentParams, string> = {
  massSolar: "m",
  impactParameterRs: "b",
  startRadiusRs: "r0",
  angularVelocityFraction: "w",
  spinFraction: "a",
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

  // Métrica personalizada embutida na URL: aplica (com validação) antes
  // de o runner nascer — links de experimento reconstroem a geometria.
  const encodedMetric = query.get(METRIC_KEY)
  if (scenarioId === "custom-metric" && encodedMetric) {
    const definition = decodeDefinition(encodedMetric)
    if (definition) {
      setCustomMetricDefinition(definition)
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

  if (scenarioId === "custom-metric") {
    query.set(METRIC_KEY, encodeDefinition(getCustomMetricDefinition()))
  }

  const next = `${window.location.pathname}?${query.toString()}`
  window.history.replaceState(null, "", next)
}
