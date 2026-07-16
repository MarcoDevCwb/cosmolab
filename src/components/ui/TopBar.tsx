import { ENGINE_UNIT_SYSTEM, UNIT_SYSTEM_LABELS } from "../../physics/core/units"
import { createScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"
import { formatMeters, formatSeconds } from "./formatters"

/**
 * Barra superior: identidade, cenário ativo, sistema de unidades, relógio
 * de simulação, telemetria do integrador e controles de reprodução.
 * Apenas exibição e comandos — nenhum cálculo físico.
 */
export function TopBar({ compact }: { compact: boolean }) {
  const paused = useSimulationStore((state) => state.paused)
  const togglePaused = useSimulationStore((state) => state.togglePaused)
  const requestRelativityReset = useSimulationStore((state) => state.requestRelativityReset)
  const resetExperimentParams = useSimulationStore((state) => state.resetExperimentParams)
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const snapshot = useSimulationStore((state) => state.relativitySnapshot)
  const renderFps = useSimulationStore((state) => state.renderFps)
  // Re-renderiza quando a métrica personalizada é reaplicada (nonce).
  useSimulationStore((state) => state.relativityResetNonce)

  const scenario = createScenario(activeScenarioId, experimentParams)

  return (
    <header className="lab-topbar glass-panel">
      <div className="topbar-brand">
        <span className="eyebrow-dot" />
        <div>
          <strong>CosmoLab</strong>
          <small>relativity lab · v0.6</small>
        </div>
      </div>

      <div className="topbar-scenario">
        <strong>{scenario.label}</strong>
        <small>
          {scenario.metric.name.replace(/\s*\(\d+\)/, "")} ·{" "}
          {scenario.kind === "null" ? "geodésica nula" : "geodésica timelike"}
        </small>
      </div>

      {!compact && (
        <div className="topbar-cluster" title={UNIT_SYSTEM_LABELS[ENGINE_UNIT_SYSTEM]}>
          <span className="topbar-kicker">unidades</span>
          <strong>SI · x⁰ = ct</strong>
        </div>
      )}

      <div className="topbar-cluster">
        <span className="topbar-kicker">tempo coordenado</span>
        <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
      </div>

      {!compact && (
        <div
          className="topbar-cluster"
          title="Método de integração, passo em λ, passos executados, custo de CPU acumulado e quadros por segundo da renderização"
        >
          <span className="topbar-kicker">{snapshot?.integrator.method ?? "RK4"}</span>
          <strong>
            Δλ {snapshot ? formatMeters(snapshot.integrator.stepLambdaM) : "—"} ·{" "}
            {snapshot ? snapshot.integrator.stepsTaken.toLocaleString("pt-BR") : "0"} passos ·{" "}
            {renderFps} fps
          </strong>
        </div>
      )}

      <div className="topbar-actions">
        <button type="button" className="toolbar-btn" onClick={togglePaused}>
          <span aria-hidden>{paused ? "▶" : "❚❚"}</span>
          {paused ? "retomar" : "pausar"}
        </button>
        <button type="button" className="toolbar-btn" onClick={requestRelativityReset}>
          <span aria-hidden>↺</span>
          reiniciar
        </button>
        {!compact && (
          <button type="button" className="toolbar-btn" onClick={resetExperimentParams}>
            <span aria-hidden>✦</span>
            preset
          </button>
        )}
      </div>
    </header>
  )
}
