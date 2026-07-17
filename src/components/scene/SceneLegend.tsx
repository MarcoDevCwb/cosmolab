import { t } from "../../i18n"
import { createScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * Legenda dos marcadores desenhados na cena — toda cor tem semântica
 * declarada (princípio: nenhuma cor arbitrária sem legenda).
 */
export function SceneLegend() {
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  useSimulationStore((state) => state.language)
  const scenario = createScenario(activeScenarioId, experimentParams)

  const rsM = scenario.schwarzschildRadiusM ?? 0
  const isKerr = scenario.ergosphereEquatorRadiusM !== undefined
  const hasCtc = scenario.ctcRadiusM !== undefined
  const flammVisible =
    scenario.surface !== "flat" && rsM > 0 && rsM / scenario.renderScaleM > 0.02
  const isPhoton = scenario.kind === "null"

  const isWarp = scenario.bubbleRadiusM !== undefined
  const hasRing = scenario.companions !== undefined
  const hasGalaxies = scenario.comovingMarkers !== undefined && !isWarp

  if (
    !flammVisible &&
    !isKerr &&
    !hasCtc &&
    !hasGalaxies &&
    !isWarp &&
    !hasRing &&
    !scenario.comparisonPath
  ) {
    return null
  }

  return (
    <div className="scene-legend" aria-hidden>
      {hasCtc && (
        <span style={{ color: "#fb7185" }}>
          <i className="legend-dash" />
          {t("fronteira de CTCs (g_φφ = 0)")}
        </span>
      )}
      {hasCtc && (
        <span style={{ color: "#fb7185" }}>
          <i className="legend-dot" style={{ background: "#fb7185" }} />
          {t("CTC demonstrativa — NÃO-geodésica (exige propulsão)")}
        </span>
      )}
      {(flammVisible || isKerr) && (
        <span>
          <i
            className="legend-dot"
            style={{ background: "#0b0b0f", boxShadow: "0 0 0 1.5px #7c3aed" }}
          />
          {isKerr ? t("horizonte r₊") : t("horizonte r_s")}
        </span>
      )}
      {isKerr && (
        <span>
          <i className="legend-dot" style={{ background: "#fbbf24" }} />
          {t("ergosfera (equador)")}
        </span>
      )}
      {isKerr && (
        <span style={{ color: "#fbbf24" }}>
          <i className="legend-dash" />
          {t("campo ZAMO (comprimento ∝ ω)")}
        </span>
      )}
      {flammVisible && (
        <span>
          <i className="legend-dot" style={{ background: "#fdba74" }} />
          {t("esfera de fótons 1,5 r_s")}
        </span>
      )}
      {flammVisible && !isPhoton && (
        <span>
          <i className="legend-dot" style={{ background: "#22d3ee" }} />
          {t("ISCO 3 r_s")}
        </span>
      )}
      {scenario.comparisonPath && (
        <span style={{ color: "#94a3b8" }}>
          <i className="legend-dash" />
          {t(scenario.comparisonPath.label)}
        </span>
      )}
      {hasRing && (
        <span style={{ color: "#67e8f9" }}>
          <i className="legend-dot" style={{ background: "#67e8f9" }} />
          {t("anel de massas de teste (16 geodésicas reais)")}
        </span>
      )}
      {hasRing && (
        <span>
          <i className="legend-dot" style={{ background: "#f0abfc" }} />
          {t("massa central (referência do interferômetro)")}
        </span>
      )}
      {isWarp && (
        <span style={{ color: "#f87171" }}>
          <i className="legend-dot" style={{ background: "transparent", boxShadow: "0 0 0 1.5px #f87171" }} />
          {t("parede da bolha (energia NEGATIVA)")}
        </span>
      )}
      {isWarp && (
        <span>
          <i className="legend-dot" style={{ background: "#f8fafc" }} />
          {t("fóton de referência (corrida)")}
        </span>
      )}
      {isWarp && (
        <span>
          <i className="legend-dot" style={{ background: "#fde68a" }} />
          {t("partida e chegada")}
        </span>
      )}
      {hasGalaxies && (
        <span>
          <i className="legend-dot" style={{ background: "#7dd3fc" }} />
          {t("nós (Via Láctea)")}
        </span>
      )}
      {hasGalaxies && (
        <span>
          <i className="legend-dot" style={{ background: "#fde68a" }} />
          {t("galáxias comóveis (recuando em distância própria)")}
        </span>
      )}
      <span>
        <i className="legend-dot" style={{ background: isPhoton ? "#7dd3fc" : "#f0abfc" }} />
        {isPhoton ? t("geodésica nula (Einstein)") : t("geodésica (Einstein)")}
      </span>
    </div>
  )
}
