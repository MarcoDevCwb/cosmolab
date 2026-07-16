import { useMemo } from "react"
import type { HistoryPoint } from "../../simulation/simulationRunner"
import { t } from "../../i18n"
import { createScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"

/**
 * Faixa inferior de gráficos científicos, alimentados pelo histórico do
 * runner (janela deslizante): r(λ), erro de norma (log₁₀) e t/τ(λ).
 * SVGs puros — sem bibliotecas e sem cálculo físico.
 */

const WIDTH = 340
const HEIGHT = 96

function buildPath(values: number[], min: number, max: number): string {
  if (values.length < 2) {
    return ""
  }
  const span = Math.max(max - min, 1e-30)
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * WIDTH
      const y = HEIGHT - ((value - min) / span) * (HEIGHT - 8) - 4
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

function ChartCard({
  title,
  currentLabel,
  children,
}: {
  title: string
  currentLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="chart-card glass-panel">
      <div className="chart-head">
        <span className="hud-stat-label">{title}</span>
        <strong>{currentLabel}</strong>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden>
        {children}
      </svg>
    </div>
  )
}

export function ChartsStrip() {
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const snapshotRaw = useSimulationStore((state) => state.relativitySnapshot)
  useSimulationStore((state) => state.language)

  const scenario = createScenario(activeScenarioId, experimentParams)
  const rsM = scenario.schwarzschildRadiusM ?? 0

  const charts = useMemo(() => {
    const history: HistoryPoint[] =
      snapshotRaw?.scenarioId === activeScenarioId ? snapshotRaw.history : []
    if (history.length < 2) {
      return null
    }

    // r(λ) — em r_s quando existe massa; senão em unidades de cena.
    const radiusSeries = history.map((p) =>
      rsM > 0 ? p.radiusM / rsM : p.radiusM / scenario.renderScaleM,
    )
    const rMin = Math.min(...radiusSeries)
    const rMax = Math.max(...radiusSeries)

    // Erro de norma em log₁₀ (piso em 1e-18 para o zero exato de Minkowski).
    const errorSeries = history.map((p) => Math.log10(Math.max(p.normError, 1e-18)))
    const eMin = Math.min(...errorSeries)
    const eMax = Math.max(...errorSeries)

    // Relógios t e τ [s].
    const tSeries = history.map((p) => p.coordinateTimeS)
    const tauSeries = history.map((p) => p.properTimeS ?? 0)
    const clockMax = Math.max(...tSeries, ...tauSeries)

    return {
      radius: {
        path: buildPath(radiusSeries, rMin, rMax),
        current: radiusSeries[radiusSeries.length - 1],
      },
      error: {
        path: buildPath(errorSeries, Math.min(eMin, -17), Math.max(eMax, -12)),
        current: history[history.length - 1].normError,
      },
      clocks: {
        tPath: buildPath(tSeries, 0, clockMax),
        tauPath: buildPath(tauSeries, 0, clockMax),
        t: tSeries[tSeries.length - 1],
        tau: tauSeries[tauSeries.length - 1],
        hasTau: history[history.length - 1].properTimeS !== null,
      },
    }
  }, [snapshotRaw, activeScenarioId, rsM, scenario.renderScaleM])

  if (!charts) {
    return null
  }

  return (
    <div className="lab-charts" aria-label="Gráficos científicos">
      <ChartCard
        title={rsM > 0 ? t("raio r(λ) [r_s]") : t("raio r(λ)")}
        currentLabel={charts.radius.current.toFixed(rsM > 0 ? 2 : 1)}
      >
        <path d={charts.radius.path} fill="none" stroke="#7dd3fc" strokeWidth="2" />
      </ChartCard>

      <ChartCard
        title={t("erro de norma log₁₀|g·u·u − ε|")}
        currentLabel={charts.error.current.toExponential(1)}
      >
        <path d={charts.error.path} fill="none" stroke="#4ade80" strokeWidth="2" />
      </ChartCard>

      <ChartCard
        title={charts.clocks.hasTau ? t("relógios t e τ [s]") : t("tempo coordenado t [s]")}
        currentLabel={
          charts.clocks.hasTau
            ? `t/τ = ${(charts.clocks.t / Math.max(charts.clocks.tau, 1e-12)).toFixed(3)}`
            : `${charts.clocks.t.toExponential(2)} s`
        }
      >
        <path d={charts.clocks.tPath} fill="none" stroke="#f0abfc" strokeWidth="2" />
        {charts.clocks.hasTau && (
          <path
            d={charts.clocks.tauPath}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        )}
      </ChartCard>
    </div>
  )
}
