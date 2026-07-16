import { createScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * Legenda dos marcadores desenhados na cena — toda cor tem semântica
 * declarada (princípio: nenhuma cor arbitrária sem legenda).
 */
export function SceneLegend() {
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const scenario = createScenario(activeScenarioId, experimentParams)

  const rsM = scenario.schwarzschildRadiusM ?? 0
  const isKerr = scenario.ergosphereEquatorRadiusM !== undefined
  const hasCtc = scenario.ctcRadiusM !== undefined
  const flammVisible =
    scenario.surface !== "flat" && rsM > 0 && rsM / scenario.renderScaleM > 0.02
  const isPhoton = scenario.kind === "null"

  if (!flammVisible && !isKerr && !hasCtc && !scenario.comparisonPath) {
    return null
  }

  return (
    <div className="scene-legend" aria-hidden>
      {hasCtc && (
        <span style={{ color: "#fb7185" }}>
          <i className="legend-dash" />
          fronteira de CTCs (g_φφ = 0)
        </span>
      )}
      {hasCtc && (
        <span style={{ color: "#fb7185" }}>
          <i className="legend-dot" style={{ background: "#fb7185" }} />
          CTC demonstrativa — NÃO-geodésica (exige propulsão)
        </span>
      )}
      {(flammVisible || isKerr) && (
        <span>
          <i
            className="legend-dot"
            style={{ background: "#0b0b0f", boxShadow: "0 0 0 1.5px #7c3aed" }}
          />
          {isKerr ? "horizonte r₊" : "horizonte r_s"}
        </span>
      )}
      {isKerr && (
        <span>
          <i className="legend-dot" style={{ background: "#fbbf24" }} />
          ergosfera (equador)
        </span>
      )}
      {isKerr && (
        <span style={{ color: "#fbbf24" }}>
          <i className="legend-dash" />
          campo ZAMO (comprimento ∝ ω)
        </span>
      )}
      {flammVisible && (
        <span>
          <i className="legend-dot" style={{ background: "#fdba74" }} />
          esfera de fótons 1,5 r_s
        </span>
      )}
      {flammVisible && !isPhoton && (
        <span>
          <i className="legend-dot" style={{ background: "#22d3ee" }} />
          ISCO 3 r_s
        </span>
      )}
      {scenario.comparisonPath && (
        <span style={{ color: "#94a3b8" }}>
          <i className="legend-dash" />
          {scenario.comparisonPath.label}
        </span>
      )}
      <span>
        <i className="legend-dot" style={{ background: isPhoton ? "#7dd3fc" : "#f0abfc" }} />
        {isPhoton ? "geodésica nula (Einstein)" : "geodésica (Einstein)"}
      </span>
    </div>
  )
}
