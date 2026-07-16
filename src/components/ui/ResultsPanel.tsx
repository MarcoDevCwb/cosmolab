import { useMemo, useState } from "react"
import { SOLAR_MASS_KG } from "../../physics/constants"
import { createScenario } from "../../simulation/scenarios"
import type { SimulationScenario } from "../../simulation/scenarios"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import { t } from "../../i18n"
import { LINE_ELEMENTS } from "./equations"
import { openLabReport } from "./labReport"
import { getCustomMetricDefinition } from "../../simulation/scenarios/customGeodesic"
import { generateMetricPassport } from "../../simulation/metricPassport"
import type { MetricPassport } from "../../simulation/metricPassport"
import {
  buildExperimentCsv,
  buildExperimentJson,
  computeExperimentId,
  downloadTextFile,
} from "./exportExperiment"
import { COSMOLAB_VERSION } from "../../version"
import { useSimulationStore } from "../../store/useSimulationStore"
import { formatMeters, formatObservable, formatSeconds, formatSolarMasses } from "./formatters"

/**
 * Painel direito com abas: RESULTADOS (observáveis e relógios),
 * VALIDAÇÃO (constantes de Killing, erros, integrador) e EQUAÇÕES
 * (elemento de linha, equação da geodésica, referências).
 * Somente exibição — todo valor vem do snapshot do runner.
 */

type ResultsTab = "resultados" | "validacao" | "equacoes" | "passaporte"


function ResultsTabContent({
  scenario,
  snapshot,
}: {
  scenario: SimulationScenario
  snapshot: RelativitySnapshot | null
}) {
  const heroObservables = snapshot?.observables.filter((o) => o.hero) ?? []
  const secondaryObservables = snapshot?.observables.filter((o) => !o.hero) ?? []

  return (
    <>
      {heroObservables.map((observable) => (
        <div className="hero-card" key={observable.id}>
          <div className="hero-head">
            <span className="hud-stat-label">{t(observable.label)}</span>
            <span
              className="provenance-badge"
              title="Origem do valor: integração numérica exata na métrica, sem aproximações"
            >
              {observable.provenance === "numeric" ? t("numérico") : observable.provenance === "analytic" ? t("analítico") : t("campo fraco")}
            </span>
          </div>
          <strong className="hero-value">
            {formatObservable(observable.value, observable.unit)}
          </strong>
          {observable.reference !== undefined && Number.isFinite(observable.reference) && (
            <small>
              {formatObservable(observable.reference, observable.unit)} —{" "}
              {t(observable.referenceLabel ?? "referência analítica")}
            </small>
          )}
          {observable.regimeWarning && <p className="param-warning">{t(observable.regimeWarning)}</p>}
        </div>
      ))}

      <div className="clock-grid">
        <div className="clock-card">
          <span className="hud-stat-label">{t("Tempo coordenado")}</span>
          <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
          <small>{t("observador no infinito")}</small>
        </div>
        <div className="clock-card">
          <span className="hud-stat-label">
            {scenario.kind === "null" ? t("Intervalo próprio") : t("Tempo próprio")}
          </span>
          <strong>
            {snapshot
              ? snapshot.properTimeS === null
                ? t("0 (exato)")
                : formatSeconds(snapshot.properTimeS)
              : "—"}
          </strong>
          <small>
            {scenario.kind === "null"
              ? t("geodésica nula: não há relógio próprio")
              : t("relógio da partícula")}
          </small>
        </div>
      </div>

      {snapshot?.futureTravelS !== null && snapshot?.futureTravelS !== undefined && (
        <div
          className="future-card"
          title="Δ = t − τ: dilatação temporal acumulada. É viagem ao futuro em sentido literal — o mesmo efeito medido com relógios atômicos em aviões (Hafele–Keating, 1972)."
        >
          <span className="hud-stat-label">{t("Salto ao futuro Δ = t − τ")}</span>
          <strong>{formatSeconds(snapshot.futureTravelS)}</strong>
          <small>
            {t("quanto o observador distante envelheceu a mais que a partícula — viagem ao futuro literal (paradoxo dos gêmeos)")}
          </small>
        </div>
      )}

      <div className="telemetry-grid telemetry-grid-advanced">
        <div className="telemetry-card">
          <span>{t("Massa central")}</span>
          <strong>
            {scenario.centralMassKg
              ? formatSolarMasses(scenario.centralMassKg / SOLAR_MASS_KG)
              : "—"}
          </strong>
        </div>
        <div className="telemetry-card">
          <span>{t("Raio de Schwarzschild")}</span>
          <strong>
            {scenario.schwarzschildRadiusM ? formatMeters(scenario.schwarzschildRadiusM) : "—"}
          </strong>
        </div>
        {scenario.metric.chart !== "cartesian" && (
          <div className="telemetry-card">
            <span>{t("Raio atual r")}</span>
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
            <span>{t(observable.label)}</span>
            <strong>{formatObservable(observable.value, observable.unit)}</strong>
          </div>
        ))}
      </div>
    </>
  )
}

function ValidationTabContent({
  scenario,
  snapshot,
}: {
  scenario: SimulationScenario
  snapshot: RelativitySnapshot | null
}) {
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const completedMissions = useSimulationStore((state) => state.completedMissions)
  const experimentId = computeExperimentId(scenario.id, experimentParams)

  return (
    <>
      <div className="telemetry-grid">
        <div
          className="telemetry-card"
          title="E = −g₀μu^μ: constante de Killing ∂t (adimensional; E/mc² para massivas)"
        >
          <span>{t("Energia específica E")}</span>
          <strong>{snapshot ? snapshot.validation.energy.toFixed(9) : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="L = g₃μu^μ: constante de Killing ∂φ, em metros (L/mc para massivas)"
        >
          <span>{t("Momento angular L")}</span>
          <strong>
            {snapshot ? `${snapshot.validation.angularMomentum.toExponential(4)} m` : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title="|g_{μν}u^μu^ν − ε|: desvio da normalização exata (ε = 0 fóton, −1 massiva)"
        >
          <span>{t("Erro de norma")}</span>
          <strong>{snapshot ? snapshot.validation.normError.toExponential(2) : "—"}</strong>
        </div>
        <div className="telemetry-card" title="Deriva relativa de E desde λ = 0">
          <span>{t("Deriva de E")}</span>
          <strong>{snapshot ? snapshot.energyDriftRelative.toExponential(2) : "—"}</strong>
        </div>
        <div className="telemetry-card" title="Deriva relativa de L desde λ = 0">
          <span>{t("Deriva de L")}</span>
          <strong>
            {snapshot ? snapshot.angularMomentumDriftRelative.toExponential(2) : "—"}
          </strong>
        </div>
        <div className="telemetry-card" title="Parâmetro afim integrado (λ = c·τ para massivas)">
          <span>{t("Parâmetro afim λ")}</span>
          <strong>{snapshot ? formatMeters(snapshot.lambdaM) : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="g_φφ: norma do círculo axial fechado no ponto. Negativa ⇒ uma curva temporal FECHADA passa por aqui (condição de CTC de Gödel/Kerr interior); positiva ⇒ causalidade normal."
        >
          <span>{t("Causalidade (g_φφ)")}</span>
          <strong>
            {snapshot
              ? snapshot.causality.closedTimelikeCircle
                ? t("CTC! (g_φφ < 0)")
                : t("normal (g_φφ > 0)")
              : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title="Densidade de energia local T(û,û) que as equações de campo exigem para sustentar esta métrica, medida pelo observador estático/ZAMO [J/m³]. ≈ 0 em vácuo (Schwarzschild, Kerr); NEGATIVA em wormholes."
        >
          <span>{t("Densidade de energia ρ")}</span>
          <strong>
            {snapshot?.matter
              ? snapshot.matter.vacuum
                ? t("≈ 0 (vácuo)")
                : `${snapshot.matter.energyDensityJm3.toExponential(2)} J/m³`
              : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title="Condição Nula de Energia (Hawking & Ellis §4.3): T(k,k) ≥ 0 para todo vetor nulo k. VIOLADA ⇒ matéria exótica (wormholes atravessáveis, warp drives)."
        >
          <span>{t("Condição de energia (NEC)")}</span>
          <strong>
            {snapshot?.matter
              ? snapshot.matter.nullEnergyConditionOk
                ? t("satisfeita ✓")
                : t("VIOLADA — matéria exótica")
              : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title="Escalar de Ricci R [1/m²] na posição atual (numérico). Zero em soluções de vácuo/eletrovácuo — desvios medem erro numérico ou matéria na métrica personalizada."
        >
          <span>{t("Escalar de Ricci R")}</span>
          <strong>{snapshot ? `${snapshot.invariants.ricciScalar.toExponential(2)} m⁻²` : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="Kretschmann K = R_abcd·R^abcd [1/m⁴] na posição atual (numérico). Independe da carta: K finito num horizonte = singularidade de coordenada; K → ∞ = singularidade física real."
        >
          <span>{t("Kretschmann K")}</span>
          <strong>{snapshot ? `${snapshot.invariants.kretschmann.toExponential(2)} m⁻⁴` : "—"}</strong>
        </div>
        <div className="telemetry-card">
          <span>{t("Integrador")}</span>
          <strong>{snapshot ? t(snapshot.integrator.method) : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="Passos aceitos e rejeitados pelo controlador de erro (rejeições só existem no adaptativo)"
        >
          <span>{t("Passos (aceitos / rejeitados)")}</span>
          <strong>
            {snapshot
              ? `${snapshot.integrator.stepsTaken.toLocaleString("pt-BR")} / ${snapshot.integrator.stepsRejected.toLocaleString("pt-BR")}`
              : "—"}
          </strong>
        </div>
        {snapshot?.integrator.relTol !== undefined && (
          <div className="telemetry-card" title="Tolerâncias do controlador adaptativo por passo">
            <span>{t("Tolerâncias (rel / abs)")}</span>
            <strong>
              {snapshot.integrator.relTol.toExponential(0)} /{" "}
              {snapshot.integrator.absTol?.toExponential(0)}
            </strong>
          </div>
        )}
        <div className="telemetry-card" title="Tempo de CPU acumulado na integração">
          <span>{t("Custo de CPU")}</span>
          <strong>{snapshot ? `${snapshot.integrator.cpuMs.toFixed(1)} ms` : "—"}</strong>
        </div>
      </div>

      {snapshot?.halted && (
        <p className="hud-note">
          {snapshot.haltReason === "out-of-bounds"
            ? t("Integração interrompida: a trajetória saiu do domínio de validade da carta de coordenadas.")
            : t("Integração interrompida: condição de parada física do cenário atingida (ex.: aproximação do horizonte, onde a carta degenera).")}
        </p>
      )}

      <p className="hud-note">
        {t("E e L são constantes de Killing; a deriva relativa e o erro de norma medem a qualidade da integração. R e K são invariantes de curvatura: K finito num horizonte indica singularidade apenas de coordenada.")}
      </p>

      <div className="telemetry-card" title="Hash da configuração (cenário + parâmetros + métrica + versão): a mesma configuração gera sempre o mesmo ID">
        <span>{t("ID do experimento")}</span>
        <strong>
          {experimentId} · v{COSMOLAB_VERSION}
        </strong>
      </div>

      <div className="export-row">
        <button
          type="button"
          className="toolbar-btn"
          disabled={!snapshot}
          onClick={() =>
            snapshot &&
            downloadTextFile(
              `cosmolab-${scenario.id}-${experimentId}.json`,
              buildExperimentJson(scenario, experimentParams, snapshot),
              "application/json",
            )
          }
        >
          <span aria-hidden>⭳</span>
          {t("exportar JSON")}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={!snapshot}
          onClick={() =>
            snapshot &&
            downloadTextFile(
              `cosmolab-${scenario.id}-${experimentId}.csv`,
              buildExperimentCsv(snapshot),
              "text/csv",
            )
          }
        >
          <span aria-hidden>⭳</span>
          {t("exportar CSV")}
        </button>
        <button
          type="button"
          className="toolbar-btn report-button"
          disabled={!snapshot}
          title="Abre o relatório de laboratório imprimível (salve como PDF pelo navegador): configuração, resultados com proveniência, validação, gráficos, missões verificadas e URL reproduzível"
          onClick={() =>
            snapshot && openLabReport(scenario, experimentParams, snapshot, completedMissions)
          }
        >
          <span aria-hidden>🖨</span>
          {t("relatório de laboratório")}
        </button>
      </div>
    </>
  )
}

function EquationsTabContent({ scenario }: { scenario: SimulationScenario }) {
  const metricKey = Object.keys(LINE_ELEMENTS).find((key) =>
    scenario.metric.name.startsWith(key),
  )
  const custom = scenario.id === "custom-metric" ? getCustomMetricDefinition() : null

  return (
    <>
      <div className="equation-block">
        <span className="hud-stat-label">
          {custom ? t("Componentes definidas pelo usuário") : t("Elemento de linha")}
        </span>
        {custom ? (
          <code>
            g_tt = {custom.gtt}
            {"\n"}g_tφ = {custom.gtphi}
            {"\n"}g_rr = {custom.grr}
            {"\n"}g_θθ = {custom.gthth}
            {"\n"}g_φφ = {custom.gphph}
          </code>
        ) : (
          <code>{metricKey ? LINE_ELEMENTS[metricKey] : "—"}</code>
        )}
      </div>
      <div className="equation-block">
        <span className="hud-stat-label">{t("Equação da geodésica")}</span>
        <code>d²x^μ/dλ² + Γ^μ_αβ · (dx^α/dλ)(dx^β/dλ) = 0</code>
      </div>
      <div className="equation-block">
        <span className="hud-stat-label">{t("Convenções")}</span>
        <code>{t("assinatura (−,+,+,+) · x⁰ = c·t [m] · λ = c·τ (massivas)")}</code>
      </div>

      <div className="hud-section-kicker spaced">{t("referências")}</div>
      <ul className="references-list">
        {scenario.references.map((reference) => (
          <li key={reference}>{reference}</li>
        ))}
      </ul>
    </>
  )
}


const PASSPORT_ICONS: Record<string, string> = {
  horizon: "⚫",
  "static-limit": "🌀",
  "ctc-region": "⏳",
  "exotic-matter": "⚠️",
  "curvature-singularity": "💥",
  "asymptotically-flat": "✅",
}

/**
 * PASSAPORTE DA MÉTRICA: dossiê automático da geometria ativa — horizontes,
 * limite estático, regiões de CTC, matéria exótica, indício de singularidade
 * e planicidade assintótica, com as condições matemáticas de cada achado.
 * O scan (simulation/metricPassport.ts) roda sob demanda.
 */
function PassportTabContent({ scenario }: { scenario: SimulationScenario }) {
  const [passport, setPassport] = useState<MetricPassport | null>(null)

  // Escala característica e alcance do scan, por geometria.
  const range = useMemo(() => {
    const characteristic =
      scenario.schwarzschildRadiusM ?? scenario.ctcRadiusM ?? scenario.renderScaleM * 4.7
    const boundMin = scenario.metric.coordinateBounds()[1].min
    const rMin = Math.max(boundMin > 0 ? boundMin * 1.03 : characteristic * 0.05, 1e-3)
    const rMax = scenario.ctcRadiusM ? characteristic * 6 : characteristic * 200
    return { rMin, rMax, characteristic }
  }, [scenario])

  const scan = () => {
    setPassport(
      generateMetricPassport(scenario.metric, range.rMin, range.rMax, 96, scenario.initialState[0]),
    )
  }

  const formatRadius = (radiusM: number) => {
    if (!Number.isFinite(radiusM)) {
      return "∞"
    }
    const rs = scenario.schwarzschildRadiusM
    return rs
      ? `${formatMeters(radiusM)} (${(radiusM / rs).toFixed(2)} r_s)`
      : formatMeters(radiusM)
  }

  return (
    <>
      <p className="hud-note">
        Varredura radial equatorial da métrica <strong>{scenario.metric.name}</strong> em r ∈ [
        {formatMeters(range.rMin)}, {formatMeters(range.rMax)}]: horizontes (g^rr = 0), limite
        estático (g_tt = 0), CTCs (g_φφ &lt; 0), matéria exótica (NEC) e curvatura.
      </p>

      <button type="button" className="toolbar-btn editor-apply" onClick={scan}>
        <span aria-hidden>🛂</span>
        {passport ? t("escanear novamente") : t("gerar passaporte")}
      </button>

      {passport && passport.findings.length === 0 && (
        <p className="hud-note">{t("Nenhuma estrutura especial no alcance escaneado.")}</p>
      )}

      {passport?.findings.map((finding, index) => (
        <div className="passport-finding" key={`${finding.kind}-${index}`}>
          <div className="passport-head">
            <span aria-hidden>{PASSPORT_ICONS[finding.kind] ?? "•"}</span>
            <strong>{t(finding.label)}</strong>
            <span className="passport-radius">
              {finding.radiusM !== undefined
                ? formatRadius(finding.radiusM)
                : finding.rangeM
                  ? `${formatRadius(finding.rangeM[0])} → ${formatRadius(finding.rangeM[1])}`
                  : ""}
            </span>
          </div>
          <small>{t(finding.detail)}</small>
        </div>
      ))}
    </>
  )
}

export function ResultsPanel({ compact }: { compact: boolean }) {
  const [tab, setTab] = useState<ResultsTab>("resultados")
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const snapshotRaw = useSimulationStore((state) => state.relativitySnapshot)
  const paused = useSimulationStore((state) => state.paused)
  useSimulationStore((state) => state.language)
  // Re-renderiza quando a métrica personalizada é reaplicada (nonce).
  useSimulationStore((state) => state.relativityResetNonce)

  const scenario = createScenario(activeScenarioId, experimentParams)
  const snapshot = snapshotRaw?.scenarioId === scenario.id ? snapshotRaw : null
  const status = snapshot?.halted ? t("parado") : paused ? t("pausado") : t("integrando")

  return (
    <aside className={`lab-right glass-panel tab-${tab}`}>
      <div className="focus-heading">
        <div className="results-tabs" role="tablist" aria-label="Painéis de resultados">
          {(["resultados", "validacao", "equacoes", "passaporte"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "results-tab active" : "results-tab"}
              onClick={() => setTab(id)}
            >
              {id === "validacao" ? t("validação") : id === "equacoes" ? t("equações") : t(id)}
            </button>
          ))}
        </div>
        <span className={snapshot?.halted ? "focus-chip halted" : "focus-chip"}>{status}</span>
      </div>

      <div className="results-body">
        {tab === "resultados" && <ResultsTabContent scenario={scenario} snapshot={snapshot} />}
        {tab === "validacao" && <ValidationTabContent scenario={scenario} snapshot={snapshot} />}
        {tab === "equacoes" && <EquationsTabContent scenario={scenario} />}
        {tab === "passaporte" && <PassportTabContent scenario={scenario} />}
      </div>
      {compact && null}
    </aside>
  )
}
