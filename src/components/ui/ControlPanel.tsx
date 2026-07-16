import { useState } from "react"
import {
  ISCO_RADIUS_RS,
  PHOTON_CRITICAL_IMPACT_RS,
} from "../../physics/relativity/metrics/schwarzschild"
import { SCENARIO_SUMMARIES, createScenario } from "../../simulation/scenarios"
import {
  getCustomMetricDefinition,
  setCustomMetricDefinition,
} from "../../simulation/scenarios/customGeodesic"
import type { ExperimentParams, ScenarioId } from "../../simulation/scenarios"
import type { ScientificStatus } from "../../simulation/scenarios/types"
import { useSimulationStore } from "../../store/useSimulationStore"
import { formatRs, formatSolarMasses } from "./formatters"

/**
 * Painel técnico esquerdo: seleção de cenário, contexto da métrica,
 * status científico e parâmetros do experimento. Limiares físicos exibidos
 * (b crítico, ISCO) vêm de physics/.
 */

const SCIENTIFIC_STATUS_LABELS: Record<ScientificStatus, string> = {
  validated: "validado",
  "accepted-model": "modelo aceito",
  theoretical: "teórico",
  speculative: "especulativo",
  "toy-model": "modelo didático",
}

type SliderSpec = {
  key: keyof ExperimentParams
  label: string
  min: number
  max: number
  step: number
  /** Slider opera em log₁₀ do valor (faixas de muitas ordens de grandeza). */
  log?: boolean
  format: (value: number) => string
}

const MASS_SLIDER: SliderSpec = {
  key: "massSolar",
  label: "Massa central",
  min: 0,
  max: 9,
  step: 0.05,
  log: true,
  format: formatSolarMasses,
}

const SLIDERS_BY_SCENARIO: Record<ScenarioId, SliderSpec[]> = {
  "flat-space-photon": [],
  "solar-light-deflection": [
    MASS_SLIDER,
    {
      key: "impactParameterRs",
      label: "Parâmetro de impacto b",
      min: Math.log10(1.6),
      max: 6,
      step: 0.01,
      log: true,
      format: formatRs,
    },
  ],
  "relativistic-orbit": [
    MASS_SLIDER,
    { key: "startRadiusRs", label: "Raio inicial r₀", min: 2, max: 40, step: 0.1, format: formatRs },
    {
      key: "angularVelocityFraction",
      label: "Velocidade angular (× circular)",
      min: 0.3,
      max: 1.25,
      step: 0.01,
      format: (v) => `${Math.round(v * 100)}%`,
    },
  ],
  "schwarzschild-horizon": [
    MASS_SLIDER,
    { key: "startRadiusRs", label: "Raio de partida r₀", min: 1.2, max: 30, step: 0.1, format: formatRs },
  ],
  "painleve-infall": [
    MASS_SLIDER,
    { key: "startRadiusRs", label: "Raio de partida r₀", min: 1.2, max: 30, step: 0.1, format: formatRs },
  ],
  "godel-universe": [
    { key: "startRadiusRs", label: "Raio inicial r₀ [r_CTC]", min: 0.1, max: 2.4, step: 0.05, format: (v) => `${v.toFixed(2)} r_CTC` },
    {
      key: "angularVelocityFraction",
      label: "Velocidade angular inicial (× ω_Gödel)",
      min: -1.2,
      max: 1.2,
      step: 0.05,
      format: (v) => `${(v * 100).toFixed(0)}%`,
    },
  ],
  "custom-metric": [
    MASS_SLIDER,
    { key: "startRadiusRs", label: "Raio inicial r₀ [M = GM/c²]", min: 3, max: 60, step: 0.5, format: (v) => `${v.toFixed(1)} M` },
    {
      key: "angularVelocityFraction",
      label: "Velocidade angular (× circular)",
      min: 0,
      max: 1.25,
      step: 0.01,
      format: (v) => `${Math.round(v * 100)}%`,
    },
  ],
  "kerr-frame-dragging": [
    MASS_SLIDER,
    { key: "startRadiusRs", label: "Raio de partida r₀", min: 1.5, max: 30, step: 0.1, format: formatRs },
    { key: "spinFraction", label: "Spin a/M", min: 0, max: 0.998, step: 0.002, format: (v) => v.toFixed(3) },
  ],
}

function physicalWarning(scenarioId: ScenarioId, params: ExperimentParams): string | null {
  if (
    scenarioId === "solar-light-deflection" &&
    params.impactParameterRs < PHOTON_CRITICAL_IMPACT_RS
  ) {
    return `b < b_crítico ≈ ${PHOTON_CRITICAL_IMPACT_RS.toFixed(2)} r_s: o fóton será CAPTURADO pelo buraco negro.`
  }

  if (scenarioId === "relativistic-orbit" && params.startRadiusRs < ISCO_RADIUS_RS) {
    return `r₀ < ISCO = ${ISCO_RADIUS_RS} r_s: não há órbita circular estável — a partícula tende a mergulhar.`
  }

  return null
}

/** Campos do editor de g_μν (cenário de métrica personalizada). */
const METRIC_FIELDS = [
  { key: "gtt", label: "g_tt" },
  { key: "gtphi", label: "g_tφ" },
  { key: "grr", label: "g_rr" },
  { key: "gthth", label: "g_θθ" },
  { key: "gphph", label: "g_φφ" },
] as const

function MetricEditor() {
  const requestRelativityReset = useSimulationStore((state) => state.requestRelativityReset)
  const [draft, setDraft] = useState(getCustomMetricDefinition())
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const apply = () => {
    const result = setCustomMetricDefinition(draft)
    if (result.ok) {
      setError(null)
      setApplied(true)
      requestRelativityReset()
    } else {
      setError(result.error)
      setApplied(false)
    }
  }

  return (
    <div className="metric-editor">
      <div className="hud-section-kicker spaced">editor de métrica g_μν</div>
      <p className="editor-hint">
        variáveis: <code>r</code>, <code>theta</code>, <code>phi</code>, <code>ct</code> [m/rad] e{" "}
        <code>M</code> = GM/c² [m] · funções: sqrt, sin, cos, tan, pow, abs, exp, log, PI
      </p>

      <label className="editor-row">
        <span>nome</span>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => {
            setDraft({ ...draft, name: e.target.value })
            setApplied(false)
          }}
        />
      </label>

      {METRIC_FIELDS.map((field) => (
        <label className="editor-row" key={field.key}>
          <span>{field.label}</span>
          <input
            type="text"
            spellCheck={false}
            value={draft[field.key]}
            onChange={(e) => {
              setDraft({ ...draft, [field.key]: e.target.value })
              setApplied(false)
            }}
          />
        </label>
      ))}

      <button type="button" className="toolbar-btn editor-apply" onClick={apply}>
        <span aria-hidden>⚙</span>
        {applied ? "aplicada ✓" : "aplicar métrica"}
      </button>
      {error && <p className="param-warning">{error}</p>}
      <p className="editor-hint">
        Ex.: Reissner–Nordström → troque <code>2*M/r</code> por <code>2*M/r − 0.36*M*M/(r*r)</code>{" "}
        em g_tt e g_rr (Q = 0,6 M).
      </p>
    </div>
  )
}

export function ControlPanel({ compact }: { compact: boolean }) {
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const setActiveScenarioId = useSimulationStore((state) => state.setActiveScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const setExperimentParams = useSimulationStore((state) => state.setExperimentParams)
  // Re-renderiza quando a métrica personalizada é reaplicada (nonce).
  useSimulationStore((state) => state.relativityResetNonce)

  const scenario = createScenario(activeScenarioId, experimentParams)
  const sliders = SLIDERS_BY_SCENARIO[activeScenarioId]
  const warning = physicalWarning(activeScenarioId, experimentParams)

  return (
    <aside className={`lab-left glass-panel scenario-${activeScenarioId}`}>
      <div className="hud-section-kicker">cenários</div>
      <nav className="scenario-list" role="tablist" aria-label="Cenários">
        {SCENARIO_SUMMARIES.map((summary) => (
          <button
            key={summary.id}
            type="button"
            role="tab"
            aria-selected={activeScenarioId === summary.id}
            className={activeScenarioId === summary.id ? "side-tab active" : "side-tab"}
            onClick={() => setActiveScenarioId(summary.id)}
          >
            {summary.label}
          </button>
        ))}
      </nav>

      <div className="hud-section-kicker spaced">métrica</div>
      <div className="context-line">
        <span className="context-strong">{scenario.metric.name.replace(/\s*\(\d+\)/, "")}</span>
        <i className="context-sep" />
        <span
          className={`focus-chip status-${scenario.scientificStatus}`}
          title={
            scenario.scientificStatus === "speculative"
              ? "Status científico: geometria definida pelo usuário, SEM validação analítica — confie apenas no que o painel de validação numérica confirmar"
              : "Status científico: reproduzido numericamente contra resultados analíticos nos testes do projeto"
          }
        >
          {SCIENTIFIC_STATUS_LABELS[scenario.scientificStatus]}
        </span>
      </div>

      <p className={compact ? "body-summary compact" : "body-summary"}>{scenario.description}</p>

      {sliders.length > 0 && (
        <div className="param-cluster">
          <div className="hud-section-kicker">parâmetros físicos</div>
          {sliders.map((spec) => {
            const rawValue = experimentParams[spec.key]
            const sliderValue = spec.log ? Math.log10(Math.max(rawValue, 1e-12)) : rawValue

            return (
              <label className="param-row" key={spec.key}>
                <span className="param-label">
                  {spec.label}
                  <strong>{spec.format(rawValue)}</strong>
                </span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={sliderValue}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    setExperimentParams({ [spec.key]: spec.log ? 10 ** next : next })
                  }}
                />
              </label>
            )
          })}
          {warning && <p className="param-warning">{warning}</p>}
        </div>
      )}

      {activeScenarioId === "custom-metric" && <MetricEditor />}
    </aside>
  )
}
