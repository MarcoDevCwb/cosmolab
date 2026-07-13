import { CELESTIAL_BODY_MAP, FOCUS_ORDER } from "../../data/celestialBodies"
import { projectDistanceLabel } from "../../engine/projection/renderProjection"
import {
  REFERENCE_FRAMES,
  SIMULATION_MODES,
} from "../../engine/referenceFrames"
import {
  formatUtcDate,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "../../engine/time/astronomicalTime"
import { SPEED_PRESETS, useSimulationStore } from "../../store/useSimulationStore"
import type { TrajectorySample } from "../../types/simulation"

type SimulationHudProps = {
  compact: boolean
}

function formatTimeScale(timeScale: number) {
  if (Math.abs(timeScale - 1 / 86_400) < 1e-10) {
    return "1x real"
  }

  const signal = timeScale < 0 ? "-" : ""
  const absolute = Math.abs(timeScale)
  if (absolute < 1) {
    return `${signal}${Math.round(absolute * 24)} h/s`
  }

  return `${signal}${absolute.toLocaleString("pt-BR")} d/s`
}

function formatSpeed(speedKmPerSecond: number) {
  return `${speedKmPerSecond.toFixed(3)} km/s`
}

function formatAcceleration(accelerationKmPerSecond2: number) {
  return `${accelerationKmPerSecond2.toExponential(2)} km/s2`
}

function buildTelemetryPath(samples: TrajectorySample[]) {
  if (samples.length < 2) {
    return ""
  }

  const width = 280
  const height = 88
  const speeds = samples.map((sample) => sample.speedKmPerSecond)
  const minSpeed = Math.min(...speeds)
  const maxSpeed = Math.max(...speeds)
  const amplitude = Math.max(maxSpeed - minSpeed, 0.0001)

  return samples
    .map((sample, index) => {
      const x = (index / Math.max(samples.length - 1, 1)) * width
      const y = height - ((sample.speedKmPerSecond - minSpeed) / amplitude) * height
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

function TelemetryCurve({
  samples,
  compact,
}: {
  samples: TrajectorySample[]
  compact: boolean
}) {
  const path = buildTelemetryPath(samples)
  const splitX =
    samples.length > 1 ? ((samples.length / 2 - 1) / Math.max(samples.length - 1, 1)) * 280 : 140

  if (!path) {
    return null
  }

  return (
    <div className={compact ? "telemetry-graph compact" : "telemetry-graph"}>
      <div className="telemetry-graph-copy">
        <span>velocidade orbital</span>
        <strong>janela passado + futuro</strong>
      </div>

      <svg viewBox="0 0 280 96" aria-label="Curva de velocidade orbital">
        <defs>
          <linearGradient id="telemetryStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
        </defs>

        <path d={path} fill="none" stroke="url(#telemetryStroke)" strokeWidth="3" />
        <line
          x1={splitX}
          y1="4"
          x2={splitX}
          y2="92"
          stroke="rgba(148, 163, 184, 0.45)"
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  )
}

export function SimulationHud({ compact }: SimulationHudProps) {
  const paused = useSimulationStore((state) => state.paused)
  const timeScale = useSimulationStore((state) => state.timeScale)
  const currentUnixMs = useSimulationStore((state) => state.currentUnixMs)
  const currentJulianDate = useSimulationStore((state) => state.currentJulianDate)
  const showOrbits = useSimulationStore((state) => state.showOrbits)
  const showVectors = useSimulationStore((state) => state.showVectors)
  const selectedBodyId = useSimulationStore((state) => state.selectedBodyId)
  const referenceFrame = useSimulationStore((state) => state.referenceFrame)
  const simulationMode = useSimulationStore((state) => state.simulationMode)
  const snapshot = useSimulationStore((state) => state.snapshot)
  const togglePaused = useSimulationStore((state) => state.togglePaused)
  const setPaused = useSimulationStore((state) => state.setPaused)
  const setTimeScale = useSimulationStore((state) => state.setTimeScale)
  const setCurrentUnixMs = useSimulationStore((state) => state.setCurrentUnixMs)
  const jumpToNow = useSimulationStore((state) => state.jumpToNow)
  const toggleOrbits = useSimulationStore((state) => state.toggleOrbits)
  const toggleVectors = useSimulationStore((state) => state.toggleVectors)
  const setReferenceFrame = useSimulationStore((state) => state.setReferenceFrame)
  const setSimulationMode = useSimulationStore((state) => state.setSimulationMode)
  const setSelectedBodyId = useSimulationStore((state) => state.setSelectedBodyId)

  const selectedBody = CELESTIAL_BODY_MAP[selectedBodyId]
  const selectedState = snapshot?.bodyStates[selectedBodyId]
  const trajectorySamples = selectedState
    ? [...selectedState.trajectoryPast, ...selectedState.trajectoryFuture]
    : []
  const activeFrame =
    REFERENCE_FRAMES.find((frameOption) => frameOption.id === referenceFrame) ??
    REFERENCE_FRAMES[0]

  return (
    <div className={compact ? "hud-layer compact" : "hud-layer"}>
      <section className="hud-header glass-panel">
        <div className="eyebrow-row">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            scientific core v0.1
          </span>

          <div className="mode-pills">
            {SIMULATION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={simulationMode === mode.id ? "mode-pill primary" : "mode-pill"}
                onClick={() => setSimulationMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <h1 className="hud-title">CosmoLab</h1>

        {!compact && (
          <p className="hud-copy">
            Renderizacao desacoplada do calculo orbital: o relogio usa UTC e Julian Date, o
            frame e explicito, e o Three.js apenas desenha o que o nucleo cientifico propaga.
          </p>
        )}

        <div className={compact ? "hud-stats two-column" : "hud-stats"}>
          <div className="hud-stat">
            <span className="hud-stat-label">Ritmo</span>
            <strong>{formatTimeScale(timeScale)}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">UTC</span>
            <strong>{formatUtcDate(currentUnixMs)}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Julian Date</span>
            <strong>{currentJulianDate.toFixed(5)}</strong>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Frame</span>
            <strong>{activeFrame.label}</strong>
          </div>
        </div>

        {compact && (
          <p className="hud-compact-copy">
            UTC real, frame explicito e visual premium mobile-first sem misturar matematica no
            React.
          </p>
        )}
      </section>

      <aside className="hud-side glass-panel">
        <div className="focus-heading">
          <div className="hud-section-kicker">corpo em foco</div>
          <span className="focus-chip">{selectedBody.kind}</span>
        </div>

        <div className="hud-section-title">
          <span>{selectedBody.name}</span>
          {!compact && <span className="body-orbit-chip">{activeFrame.label}</span>}
        </div>

        <p className={compact ? "body-summary compact" : "body-summary"}>{selectedBody.summary}</p>

        {selectedState && (
          <div className="telemetry-grid telemetry-grid-advanced">
            <div className="telemetry-card">
              <span>Distancia</span>
              <strong>{projectDistanceLabel(selectedState.distance.value)}</strong>
            </div>
            <div className="telemetry-card">
              <span>Velocidade</span>
              <strong>{formatSpeed(selectedState.speed.value)}</strong>
            </div>
            <div className="telemetry-card">
              <span>Aceleracao</span>
              <strong>{formatAcceleration(selectedState.acceleration.value)}</strong>
            </div>
            <div className="telemetry-card">
              <span>Origem</span>
              <strong>{selectedState.speed.source.label}</strong>
            </div>
          </div>
        )}

        {selectedState && <TelemetryCurve samples={trajectorySamples} compact={compact} />}

        <div className="fact-grid">
          {selectedBody.facts.map((fact) => (
            <div className="fact-card" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
              {fact.sourceLabel && <small>{fact.sourceLabel}</small>}
            </div>
          ))}
        </div>

        <div className="hud-note">
          <strong>{snapshot?.providerLabel ?? "Scientific core em preparo."}</strong>
          <span>{snapshot?.referenceSummary ?? activeFrame.summary}</span>
          {selectedState && (
            <span>
              Fonte: {selectedState.speed.source.label} | Epoca J2000 {snapshot?.epochJulianDate.toFixed(1)}
            </span>
          )}
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
            <button type="button" className="hud-button subtle" onClick={jumpToNow}>
              Agora
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

          <div className={compact ? "control-section" : "date-cluster"}>
            <span className="button-label">data UTC</span>
            <div className="date-input-shell">
              <input
                className="hud-datetime"
                type="datetime-local"
                step={60}
                value={toDateTimeLocalValue(currentUnixMs)}
                onChange={(event) => {
                  setPaused(true)
                  setCurrentUnixMs(fromDateTimeLocalValue(event.target.value))
                }}
              />
            </div>
          </div>

          <div className={compact ? "control-section" : "focus-cluster"}>
            <span className="button-label">frame</span>
            {REFERENCE_FRAMES.map((frameOption) => (
              <button
                key={frameOption.id}
                type="button"
                className={referenceFrame === frameOption.id ? "hud-button active" : "hud-button"}
                onClick={() => setReferenceFrame(frameOption.id)}
              >
                {frameOption.label}
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
          O modo atual parte do UTC presente, aceita qualquer data e explicita o frame ativo.
          A camada visual continua comprimida para leitura humana, mas agora recebe dados do
          nucleo matematico em vez de decidir orbitas sozinha.
        </p>
      </footer>
    </div>
  )
}
