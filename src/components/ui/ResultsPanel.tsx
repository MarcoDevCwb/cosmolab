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
              title="Origem do valor: integração numérica da equação geodésica completa; erro monitorado pela norma e pelas constantes disponíveis"
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
          <small>{t("x⁰/c da carta; a interpretação depende das coordenadas")}</small>
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
          title="Δ = t − τ compara o tempo coordenado da carta com o tempo próprio da partícula. A interpretação como diferença entre relógios físicos exige especificar um observador de referência e uma convenção de simultaneidade."
        >
          <span className="hud-stat-label">{t("Diferença coordenada Δ = t − τ")}</span>
          <strong>{formatSeconds(snapshot.futureTravelS)}</strong>
          <small>
            {t("grandeza dependente da carta; compare relógios físicos apenas após definir o observador de referência")}
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
        <div
          className="telemetry-card"
          title={
            scenario.metric.symmetries?.stationary
              ? "Deriva relativa da constante de Killing E desde λ = 0"
              : "Não há Killing temporal declarado nesta métrica; E não precisa se conservar"
          }
        >
          <span>{t("Deriva de E")}</span>
          <strong>
            {snapshot
              ? scenario.metric.symmetries?.stationary
                ? snapshot.energyDriftRelative.toExponential(2)
                : t("n/a — sem Killing temporal")
              : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title={
            scenario.metric.symmetries?.axisymmetric
              ? "Deriva relativa da constante de Killing L desde λ = 0"
              : "Não há Killing axial declarado nesta métrica; L não precisa se conservar"
          }
        >
          <span>{t("Deriva de L")}</span>
          <strong>
            {snapshot
              ? scenario.metric.symmetries?.axisymmetric
                ? snapshot.angularMomentumDriftRelative.toExponential(2)
                : t("n/a — sem Killing axial")
              : "—"}
          </strong>
        </div>
        <div className="telemetry-card" title="Parâmetro afim integrado (λ = c·τ para massivas)">
          <span>{t("Parâmetro afim λ")}</span>
          <strong>{snapshot ? formatMeters(snapshot.lambdaM) : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="Se x³=φ é periódico, g_φφ<0 prova que o círculo axial é uma CTC. g_φφ≥0 exclui apenas essa família de círculos, não todas as possíveis CTCs."
        >
          <span>{t("Causalidade (g_φφ)")}</span>
          <strong>
            {snapshot
              ? !snapshot.causality.applicable
                ? t("n/a — x³ não é φ periódico")
                : snapshot.causality.closedTimelikeCircle
                ? t("CTC! (g_φφ < 0)")
                : t("nenhum círculo φ temporal detectado")
              : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title="Densidade de energia efetiva local T(û,û), medida pelo observador estático/ZAMO [J/m³]. ≈ 0 em vácuo; é negativa no exemplo Morris–Thorne implementado. Violação da NEC e ρ<0 não são equivalentes em geral."
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
          title={`NEC: T(k,k) ≥ 0 para todo k nulo. O painel amostra ${snapshot?.matter?.necDirectionsTested ?? 134} direções: T(k,k)<0 além da tolerância fornece uma direção-testemunha, sujeita à convergência do tensor numérico; ausência de violação não é prova no contínuo.`}
        >
          <span>{t("Condição de energia (NEC)")}</span>
          <strong>
            {snapshot?.matter
              ? snapshot.matter.nullEnergyConditionOk
                ? t("sem violação detectada (amostragem)")
                : t("violação detectada em direção amostrada")
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
          title="Kretschmann K = R_abcd·R^abcd [1/m⁴]. K é invariante; sua divergência sinaliza curvatura singular. K finito, sozinho, não prova regularidade de todos os invariantes nem completude geodésica."
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
        {t("A norma deve conservar-se em toda geodésica. E e L só são constantes quando a métrica declara, respectivamente, simetria temporal e axial. R e K são invariantes locais; nenhum escalar isolado decide toda a estrutura global.")}
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
 * PASSAPORTE DA MÉTRICA: triagem radial local — superfícies nulas candidatas,
 * limite estático, círculos axiais temporais, violações da NEC amostradas e
 * indícios de singularidade/planicidade. Não substitui análise causal global.
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
        {formatMeters(range.rMin)}, {formatMeters(range.rMax)}]: superfícies r=const nulas
        (g^rr = 0), limite estático estacionário (g_tt = 0), círculos φ temporais
        (g_φφ &lt; 0), violações amostradas da NEC e curvatura. Os achados são locais e
        dependem da carta, das simetrias declaradas e do alcance do scan.
      </p>

      <button type="button" className="toolbar-btn editor-apply" onClick={scan}>
        <span aria-hidden>🛂</span>
        {passport ? t("escanear novamente") : t("gerar passaporte")}
      </button>

      {passport && passport.findings.length === 0 && (
        <p className="hud-note">{t("Nenhuma assinatura local foi detectada no alcance e na resolução do scan; isso não prova ausência global.")}</p>
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
