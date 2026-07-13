import { CELESTIAL_BODY_MAP, FOCUS_ORDER } from "../../data/celestialBodies"
import { SPEED_PRESETS, useSimulationStore } from "../../store/useSimulationStore"

type SimulationHudProps = {
  compact: boolean
}

function formatSimulationClock(simulationDays: number) {
  const years = simulationDays / 365.25
  const year = Math.floor(years)
  const day = Math.floor((years - year) * 365.25) + 1

  return `Ano ${year + 1} · Dia ${day}`
}

function formatTimeScale(timeScale: number) {
  if (timeScale < 1) {
    return `${Math.round(timeScale * 24)} h/s`
  }

  return `${timeScale.toLocaleString("pt-BR")} d/s`
}

function formatDistance(distanceKm: number) {
  if (distanceKm >= 1_000_000) {
    return `${(distanceKm / 1_000_000).toFixed(1)} mi km`
  }

  return `${Math.round(distanceKm).toLocaleString("pt-BR")} km`
}

function formatSpeed(speedKmPerSecond: number) {
  return `${speedKmPerSecond.toFixed(2)} km/s`
}

export function SimulationHud({ compact }: SimulationHudProps) {
  const paused = useSimulationStore((state) => state.paused)
  const timeScale = useSimulationStore((state) => state.timeScale)
  const simulationDays = useSimulationStore((state) => state.simulationDays)
  const showOrbits = useSimulationStore((state) => state.showOrbits)
  const showVectors = useSimulationStore((state) => state.showVectors)
  const selectedBodyId = useSimulationStore((state) => state.selectedBodyId)
  const bodySnapshots = useSimulationStore((state) => state.bodySnapshots)
  const togglePaused = useSimulationStore((state) => state.togglePaused)
  const setTimeScale = useSimulationStore((state) => state.setTimeScale)
  const toggleOrbits = useSimulationStore((state) => state.toggleOrbits)
  const toggleVectors = useSimulationStore((state) => state.toggleVectors)
  const setSelectedBodyId = useSimulationStore((state) => state.setSelectedBodyId)

  const selectedBody = CELESTIAL_BODY_MAP[selectedBodyId]
  const selectedSnapshot = bodySnapshots[selectedBodyId]
  const earthYears = (simulationDays / 365.25).toFixed(2)

  return (
    <div className={compact ? "hud-layer compact" : "hud-layer"}>
      <section className="hud-header glass-panel">
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          keplerian orbital sandbox
        </span>

        <h1 className="hud-title">CosmoLab</h1>

        {!compact && (
          <p className="hud-copy">
            Agora com orbita eliptica kepleriana, velocidade variavel ao longo da translacao
            e ritmo bem mais proximo do que faz sentido para leitura humana.
          </p>
        )}

        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-label">Ritmo</span>
            <strong>{formatTimeScale(timeScale)}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Relogio</span>
            <strong>{formatSimulationClock(simulationDays)}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Escala</span>
            <strong>{earthYears} anos-Terra</strong>
          </div>
        </div>

        {compact && (
          <p className="hud-compact-copy">
            Visual premium leve, com foco em leitura rapida e interacao confortavel no celular.
          </p>
        )}
      </section>

      <aside className="hud-side glass-panel">
        <div className="hud-section-kicker">corpo em foco</div>
        <div className="hud-section-title">
          <span>{selectedBody.name}</span>
          <span className="button-label">{selectedBody.kind}</span>
        </div>

        <p className={compact ? "body-summary compact" : "body-summary"}>{selectedBody.summary}</p>

        {selectedBodyId !== "sun" && (
          <div className="telemetry-grid">
            <div className="telemetry-card">
              <span>Distancia atual</span>
              <strong>{formatDistance(selectedSnapshot.distanceKm)}</strong>
            </div>
            <div className="telemetry-card">
              <span>Velocidade atual</span>
              <strong>{formatSpeed(selectedSnapshot.orbitalSpeedKmPerSecond)}</strong>
            </div>
          </div>
        )}

        <div className="fact-grid">
          {selectedBody.facts.map((fact) => (
            <div className="fact-card" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>

        <div className="hud-note">
          O painel agora mostra telemetria instantanea. Em orbitas elipticas, a velocidade
          cresce perto do periastro e cai quando o corpo se afasta do foco gravitacional.
        </div>
      </aside>

      <footer className="hud-footer glass-panel">
        <div className={compact ? "hud-footer-scroll" : "hud-footer-row"}>
          <div className={compact ? "control-section" : "button-cluster"}>
            <span className="button-label">tempo</span>
            <button
              type="button"
              className={paused ? "hud-button active" : "hud-button subtle"}
              onClick={togglePaused}
            >
              {paused ? "Retomar" : "Pausar"}
            </button>
            {SPEED_PRESETS.map((speed) => (
              <button
                key={speed.label}
                type="button"
                className={timeScale === speed.daysPerSecond ? "hud-button active" : "hud-button"}
                onClick={() => setTimeScale(speed.daysPerSecond)}
              >
                {speed.label}
              </button>
            ))}
          </div>

          <div className={compact ? "control-section" : "focus-cluster"}>
            <span className="button-label">foco</span>
            {FOCUS_ORDER.map((bodyId) => (
              <button
                key={bodyId}
                type="button"
                className={selectedBodyId === bodyId ? "hud-button active" : "hud-button"}
                onClick={() => setSelectedBodyId(bodyId)}
              >
                {CELESTIAL_BODY_MAP[bodyId].name}
              </button>
            ))}
          </div>

          <div className={compact ? "control-section" : "toggle-cluster"}>
            <span className="button-label">camadas</span>
            <button
              type="button"
              className={showOrbits ? "hud-button active" : "hud-button"}
              onClick={toggleOrbits}
            >
              Orbitas
            </button>
            <button
              type="button"
              className={showVectors ? "hud-button active" : "hud-button"}
              onClick={toggleVectors}
            >
              Vetores
            </button>
          </div>
        </div>

        <p className={compact ? "hud-footer-copy compact" : "hud-footer-copy"}>
          Escalas visuais continuam comprimidas para caber no navegador, mas o movimento agora
          respeita uma modelagem orbital mais fiel e muito menos acelerada.
        </p>
      </footer>
    </div>
  )
}
