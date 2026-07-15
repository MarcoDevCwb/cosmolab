import { SOLAR_MASS_KG } from "../../physics/constants"
import {
  ISCO_RADIUS_RS,
  PHOTON_CRITICAL_IMPACT_RS,
} from "../../physics/relativity/metrics/schwarzschild"
import { SCENARIO_SUMMARIES, createScenario } from "../../simulation/scenarios"
import type { ExperimentParams, ScenarioId } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"
import {
  formatMeters,
  formatObservable,
  formatRs,
  formatSeconds,
  formatSolarMasses,
} from "./formatters"

/**
 * HUD do laboratório relativístico.
 *
 * Exibe dados publicados pelo runner e controla os PARÂMETROS do
 * experimento. Nenhuma equação física é avaliada aqui — apenas formatação;
 * os limiares físicos exibidos (b crítico, ISCO) vêm de physics/.
 */

type RelativityHudProps = {
  compact: boolean
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
    return `b < b_crítico ≈ ${PHOTON_CRITICAL_IMPACT_RS.toFixed(2)} r_s: o fóton será CAPTURADO pelo buraco negro.`
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

  const heroObservables = snapshot?.observables.filter((observable) => observable.hero) ?? []
  const secondaryObservables = snapshot?.observables.filter((observable) => !observable.hero) ?? []

  const status = snapshot?.halted ? "parado" : paused ? "pausado" : "integrando"

  return (
    <div className={compact ? "hud-layer compact" : "hud-layer"}>
      <section className="hud-header glass-panel">
        <div className="eyebrow-row">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            relativity lab v0.3
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

        <div className="context-chips">
          <span className="context-chip">{scenario.metric.name.replace(/\s*\(\d+\)/, "")}</span>
          <span className="context-chip">
            {scenario.kind === "null" ? "geodésica nula · fóton" : "geodésica timelike · massiva"}
          </span>
        </div>

        {!compact && (
          <p className="hud-copy">
            Ajuste os parâmetros — o motor integra a equação da geodésica (RK4) na métrica exata e
            a malha mostra a geometria espacial real (paraboloide de Flamm), colorida pela
            dilatação temporal.
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

        <div className="clock-grid">
          <div className="clock-card">
            <span className="hud-stat-label">Tempo coordenado</span>
            <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
            <small>observador no infinito</small>
          </div>
          <div className="clock-card">
            <span className="hud-stat-label">Tempo próprio</span>
            <strong>
              {snapshot
                ? snapshot.properTimeS === null
                  ? "0 (fóton)"
                  : formatSeconds(snapshot.properTimeS)
                : "—"}
            </strong>
            <small>relógio da partícula</small>
          </div>
        </div>
      </section>

      <aside className="hud-side glass-panel">
        <div className="focus-heading">
          <div className="hud-section-kicker">cenário ativo</div>
          <span className={snapshot?.halted ? "focus-chip halted" : "focus-chip"}>{status}</span>
        </div>

        <div className="hud-section-title">
          <span>{scenario.label}</span>
        </div>

        <p className={compact ? "body-summary compact" : "body-summary"}>{scenario.description}</p>

        {heroObservables.map((observable) => (
          <div className="hero-card" key={observable.id}>
            <span className="hud-stat-label">{observable.label}</span>
            <strong className="hero-value">
              {formatObservable(observable.value, observable.unit)}
            </strong>
            {observable.reference !== undefined && Number.isFinite(observable.reference) && (
              <small>
                referência: {formatObservable(observable.reference, observable.unit)}
                {observable.referenceLabel ? ` — ${observable.referenceLabel}` : ""}
              </small>
            )}
          </div>
        ))}

        {snapshot?.halted && (
          <p className="hud-note">
            Integração interrompida: limite físico ou de coordenadas do cenário atingido (a carta
            de Schwarzschild degenera em r = r_s).
          </p>
        )}

        <div className="telemetry-grid telemetry-grid-advanced">
          <div className="telemetry-card">
            <span>Massa central</span>
            <strong>
              {scenario.centralMassKg
                ? formatSolarMasses(scenario.centralMassKg / SOLAR_MASS_KG)
                : "—"}
            </strong>
          </div>
          <div className="telemetry-card">
            <span>Raio de Schwarzschild</span>
            <strong>
              {scenario.schwarzschildRadiusM ? formatMeters(scenario.schwarzschildRadiusM) : "—"}
            </strong>
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
          {secondaryObservables.map((observable) => (
            <div className="telemetry-card" key={observable.id}>
              <span>{observable.label}</span>
              <strong>{formatObservable(observable.value, observable.unit)}</strong>
            </div>
          ))}
        </div>

        <details className="validation-details">
          <summary>validação numérica</summary>
          <div className="telemetry-grid">
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
              <span>Erro de norma</span>
              <strong>{snapshot ? snapshot.validation.normError.toExponential(2) : "—"}</strong>
            </div>
            <div className="telemetry-card">
              <span>Deriva de E</span>
              <strong>{snapshot ? snapshot.energyDriftRelative.toExponential(2) : "—"}</strong>
            </div>
            <div className="telemetry-card">
              <span>Parâmetro afim λ</span>
              <strong>{snapshot ? formatMeters(snapshot.lambdaM) : "—"}</strong>
            </div>
          </div>
          {!compact && (
            <p className="hud-note">
              E = −g₀μu^μ e L = g₃μu^μ são constantes de Killing; a deriva relativa e o erro de
              norma |g·u·u − ε| medem a qualidade da integração RK4.
            </p>
          )}
        </details>
      </aside>
    </div>
  )
}
