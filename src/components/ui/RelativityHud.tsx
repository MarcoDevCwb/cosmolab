import { SOLAR_MASS_KG } from "../../physics/constants"
import {
  ISCO_RADIUS_RS,
  PHOTON_CRITICAL_IMPACT_RS,
} from "../../physics/relativity/metrics/schwarzschild"
import { SCENARIO_SUMMARIES, createScenario } from "../../simulation/scenarios"
import type { ExperimentParams, ScenarioId } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * HUD do laboratório relativístico.
 *
 * Exibe dados publicados pelo runner e controla os PARÂMETROS do
 * experimento (massa, parâmetro de impacto, raio, velocidade). Nenhuma
 * equação física é avaliada aqui — apenas formatação de unidades; os limiares
 * físicos exibidos (b crítico, ISCO) vêm de physics/.
 */

type RelativityHudProps = {
  compact: boolean
}

function formatSeconds(seconds: number): string {
  const absolute = Math.abs(seconds)
  if (absolute === 0) {
    return "0 s"
  }
  if (absolute < 1e-3) {
    return `${(seconds * 1e6).toFixed(2)} µs`
  }
  if (absolute < 1) {
    return `${(seconds * 1e3).toFixed(3)} ms`
  }
  if (absolute < 120) {
    return `${seconds.toFixed(3)} s`
  }
  return `${(seconds / 60).toFixed(2)} min`
}

function formatMeters(meters: number): string {
  const absolute = Math.abs(meters)
  if (absolute >= 1e9) {
    return `${(meters / 1e9).toFixed(3)} × 10⁶ km`
  }
  if (absolute >= 1e3) {
    return `${(meters / 1e3).toFixed(2)} km`
  }
  return `${meters.toFixed(1)} m`
}

function formatSolarMasses(massSolar: number): string {
  if (massSolar >= 1e6) {
    return `${(massSolar / 1e6).toFixed(1)} milhões M☉`
  }
  if (massSolar >= 1000) {
    return `${(massSolar / 1000).toFixed(1)} mil M☉`
  }
  return `${massSolar.toFixed(1)} M☉`
}

function formatRs(valueRs: number): string {
  if (valueRs >= 10_000) {
    return `${valueRs.toExponential(2)} r_s`
  }
  return `${valueRs.toFixed(1)} r_s`
}

type SliderSpec = {
  key: keyof ExperimentParams
  label: string
  min: number
  max: number
  step: number
  /** Slider opera em log₁₀ do valor (para faixas de muitas ordens de grandeza). */
  log?: boolean
  format: (value: number) => string
}

/** Quais parâmetros cada cenário expõe (os demais são ignorados pela física). */
const SLIDERS_BY_SCENARIO: Record<ScenarioId, SliderSpec[]> = {
  "flat-space-photon": [],
  "solar-light-deflection": [
    {
      key: "massSolar",
      label: "Massa central",
      min: 0,
      max: 9,
      step: 0.05,
      log: true,
      format: formatSolarMasses,
    },
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
    {
      key: "massSolar",
      label: "Massa central",
      min: 0,
      max: 9,
      step: 0.05,
      log: true,
      format: formatSolarMasses,
    },
    {
      key: "startRadiusRs",
      label: "Raio inicial r₀",
      min: 2,
      max: 40,
      step: 0.1,
      format: formatRs,
    },
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
    {
      key: "massSolar",
      label: "Massa central",
      min: 0,
      max: 9,
      step: 0.05,
      log: true,
      format: formatSolarMasses,
    },
    {
      key: "startRadiusRs",
      label: "Raio de partida r₀",
      min: 1.2,
      max: 30,
      step: 0.1,
      format: formatRs,
    },
  ],
}

/** Avisos físicos por regime de parâmetros (limiares vêm de physics/). */
function physicalWarning(scenarioId: ScenarioId, params: ExperimentParams): string | null {
  if (
    scenarioId === "solar-light-deflection" &&
    params.impactParameterRs < PHOTON_CRITICAL_IMPACT_RS
  ) {
    return `b < b_crítico = (3√3/2) r_s ≈ ${PHOTON_CRITICAL_IMPACT_RS.toFixed(2)} r_s: o fóton será CAPTURADO pelo buraco negro.`
  }

  if (scenarioId === "relativistic-orbit" && params.startRadiusRs < ISCO_RADIUS_RS) {
    return `r₀ < ISCO = ${ISCO_RADIUS_RS} r_s: não há órbita circular estável — a partícula tende a mergulhar.`
  }

  return null
}

export function RelativityHud({ compact }: RelativityHudProps) {
  const paused = useSimulationStore((state) => state.paused)
  const togglePaused = useSimulationStore((state) => state.togglePaused)
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const setActiveScenarioId = useSimulationStore((state) => state.setActiveScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const setExperimentParams = useSimulationStore((state) => state.setExperimentParams)
  const resetExperimentParams = useSimulationStore((state) => state.resetExperimentParams)
  const requestRelativityReset = useSimulationStore((state) => state.requestRelativityReset)
  const snapshot = useSimulationStore((state) => state.relativitySnapshot)

  const scenario = createScenario(activeScenarioId, experimentParams)
  const sliders = SLIDERS_BY_SCENARIO[activeScenarioId]
  const warning = physicalWarning(activeScenarioId, experimentParams)

  return (
    <div className={compact ? "hud-layer compact" : "hud-layer"}>
      <section className="hud-header glass-panel">
        <div className="eyebrow-row">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            relativity lab v0.2
          </span>

          <div className="mode-pills">
            <button type="button" className="mode-pill" onClick={togglePaused}>
              {paused ? "retomar" : "pausar"}
            </button>
            <button type="button" className="mode-pill" onClick={requestRelativityReset}>
              reiniciar
            </button>
            {sliders.length > 0 && (
              <button type="button" className="mode-pill" onClick={resetExperimentParams}>
                preset
              </button>
            )}
          </div>
        </div>

        <h1 className="hud-title">CosmoLab</h1>

        {!compact && (
          <p className="hud-copy">
            Laboratório de geodésicas: ajuste massa, trajetória e velocidade — o motor integra a
            equação da geodésica (RK4) na métrica exata e a malha mostra a geometria espacial real
            (paraboloide de Flamm). O Three.js apenas desenha.
          </p>
        )}

        <div className="mode-pills" role="tablist" aria-label="Cenários">
          {SCENARIO_SUMMARIES.map((summary) => (
            <button
              key={summary.id}
              type="button"
              className={activeScenarioId === summary.id ? "mode-pill primary" : "mode-pill"}
              onClick={() => setActiveScenarioId(summary.id)}
            >
              {summary.label}
            </button>
          ))}
        </div>

        {sliders.length > 0 && (
          <div className="param-cluster">
            <div className="hud-section-kicker">parâmetros do experimento</div>
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
                      setExperimentParams({
                        [spec.key]: spec.log ? 10 ** next : next,
                      })
                    }}
                  />
                </label>
              )
            })}
            {warning && <p className="param-warning">{warning}</p>}
          </div>
        )}

        <div className={compact ? "hud-stats two-column" : "hud-stats"}>
          <div className="hud-stat">
            <span className="hud-stat-label">Métrica</span>
            <strong>{scenario.metric.name.replace(/\s*\(\d+\)/, "")}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Geodésica</span>
            <strong>{scenario.kind === "null" ? "nula (fóton)" : "timelike (massiva)"}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Tempo coordenado</span>
            <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Tempo próprio</span>
            <strong>
              {snapshot
                ? snapshot.properTimeS === null
                  ? "0 (fóton)"
                  : formatSeconds(snapshot.properTimeS)
                : "—"}
            </strong>
          </div>
        </div>
      </section>

      <aside className="hud-side glass-panel">
        <div className="focus-heading">
          <div className="hud-section-kicker">cenário ativo</div>
          <span className="focus-chip">{snapshot?.halted ? "parado" : "integrando"}</span>
        </div>

        <div className="hud-section-title">
          <span>{scenario.label}</span>
        </div>

        <p className={compact ? "body-summary compact" : "body-summary"}>{scenario.description}</p>
        {!compact && scenario.expectation && <p className="hud-note">{scenario.expectation}</p>}

        <div className="telemetry-grid telemetry-grid-advanced">
          <div className="telemetry-card">
            <span>Massa central</span>
            <strong>
              {scenario.centralMassKg
                ? `${scenario.centralMassKg.toExponential(3)} kg (${formatSolarMasses(
                    scenario.centralMassKg / SOLAR_MASS_KG,
                  )})`
                : "—"}
            </strong>
          </div>
          <div className="telemetry-card">
            <span>Raio de Schwarzschild r_s</span>
            <strong>
              {scenario.schwarzschildRadiusM ? formatMeters(scenario.schwarzschildRadiusM) : "—"}
            </strong>
          </div>
          <div className="telemetry-card">
            <span>Energia específica E</span>
            <strong>{snapshot ? snapshot.validation.energy.toFixed(9) : "—"}</strong>
          </div>
          <div className="telemetry-card">
            <span>Momento angular L</span>
            <strong>
              {snapshot ? `${snapshot.validation.angularMomentum.toExponential(4)} m` : "—"}
            </strong>
          </div>
          <div className="telemetry-card">
            <span>Erro numérico |g·u·u − ε|</span>
            <strong>{snapshot ? snapshot.validation.normError.toExponential(2) : "—"}</strong>
          </div>
          <div className="telemetry-card">
            <span>Deriva de E</span>
            <strong>{snapshot ? snapshot.energyDriftRelative.toExponential(2) : "—"}</strong>
          </div>
          {scenario.metric.chart === "spherical" && (
            <div className="telemetry-card">
              <span>Raio atual r</span>
              <strong>
                {snapshot
                  ? scenario.schwarzschildRadiusM &&
                    snapshot.position[1] / scenario.schwarzschildRadiusM < 1e4
                    ? `${formatMeters(snapshot.position[1])} (${(
                        snapshot.position[1] / scenario.schwarzschildRadiusM
                      ).toFixed(2)} r_s)`
                    : formatMeters(snapshot.position[1])
                  : "—"}
              </strong>
            </div>
          )}
          <div className="telemetry-card">
            <span>Parâmetro afim λ</span>
            <strong>{snapshot ? formatMeters(snapshot.lambdaM) : "—"}</strong>
          </div>
        </div>

        {!compact && (
          <p className="hud-note">
            E = −g₀μu^μ (adimensional, E/mc²) e L = g₃μu^μ [m] são constantes de Killing; a deriva
            relativa e o erro de norma medem a qualidade da integração RK4.
          </p>
        )}
      </aside>
    </div>
  )
}
