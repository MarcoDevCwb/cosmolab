import { SOLAR_MASS_KG } from "../../physics/constants"
import { SCENARIO_SUMMARIES, createScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * HUD do laboratório relativístico.
 *
 * Exibe exclusivamente dados publicados pelo runner (RelativitySnapshot):
 * nenhuma equação física é avaliada aqui — apenas formatação de unidades.
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

function formatMass(massKg: number): string {
  const solarMasses = massKg / SOLAR_MASS_KG
  return `${massKg.toExponential(3)} kg (${solarMasses.toFixed(1)} M☉)`
}

export function RelativityHud({ compact }: RelativityHudProps) {
  const paused = useSimulationStore((state) => state.paused)
  const togglePaused = useSimulationStore((state) => state.togglePaused)
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const setActiveScenarioId = useSimulationStore((state) => state.setActiveScenarioId)
  const requestRelativityReset = useSimulationStore((state) => state.requestRelativityReset)
  const snapshot = useSimulationStore((state) => state.relativitySnapshot)

  const scenario = createScenario(activeScenarioId)

  return (
    <div className={compact ? "hud-layer compact" : "hud-layer"}>
      <section className="hud-header glass-panel">
        <div className="eyebrow-row">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            relativity lab v0.1
          </span>

          <div className="mode-pills">
            <button type="button" className="mode-pill" onClick={togglePaused}>
              {paused ? "retomar" : "pausar"}
            </button>
            <button type="button" className="mode-pill" onClick={requestRelativityReset}>
              reiniciar
            </button>
          </div>
        </div>

        <h1 className="hud-title">CosmoLab — Geodésicas</h1>

        {!compact && (
          <p className="hud-copy">
            Integração numérica (RK4) da equação da geodésica sobre a métrica selecionada. O
            Three.js apenas desenha o que o motor científico produz; a validação numérica
            (conservação de g<sub>μν</sub>u<sup>μ</sup>u<sup>ν</sup>, E e L) roda continuamente.
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
            <span className="hud-stat-label">Tempo coordenado t</span>
            <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Tempo próprio τ</span>
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
        {!compact && scenario.expectation && (
          <p className="hud-note">{scenario.expectation}</p>
        )}

        <div className="telemetry-grid telemetry-grid-advanced">
          <div className="telemetry-card">
            <span>Massa central</span>
            <strong>{scenario.centralMassKg ? formatMass(scenario.centralMassKg) : "—"}</strong>
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
            E = −g₀μu^μ (adimensional, E/mc²) e L = g₃μu^μ [m] são constantes de Killing;
            a deriva relativa e o erro de norma medem a qualidade da integração RK4.
          </p>
        )}
      </aside>
    </div>
  )
}
