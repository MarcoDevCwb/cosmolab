import { useState } from "react"
import { SOLAR_MASS_KG } from "../../physics/constants"
import { createScenario } from "../../simulation/scenarios"
import type { SimulationScenario } from "../../simulation/scenarios"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import { getCustomMetricDefinition } from "../../simulation/scenarios/customGeodesic"
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

type ResultsTab = "resultados" | "validacao" | "equacoes"

/** Elementos de linha exibidos na aba EQUAÇÕES (texto, por métrica). */
const LINE_ELEMENTS: Record<string, string> = {
  Minkowski: "ds² = −(c dt)² + dx² + dy² + dz²",
  Schwarzschild:
    "ds² = −f·(c dt)² + f⁻¹·dr² + r²·dθ² + r²sin²θ·dφ²,  f = 1 − r_s/r",
  "Painlevé–Gullstrand":
    "ds² = −f·(c dT)² + 2√(r_s/r)·(c dT)·dr + dr² + r²·dΩ²,  f = 1 − r_s/r",
  Kerr: "ds² = −(1 − 2Mr/Σ)(c dt)² − (4Mar sin²θ/Σ)·c dt·dφ + (Σ/Δ)dr² + Σdθ² + (r² + a² + 2Ma²r sin²θ/Σ)sin²θ·dφ²",
}

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
            <span className="hud-stat-label">{observable.label}</span>
            <span
              className="provenance-badge"
              title="Origem do valor: integração numérica exata na métrica, sem aproximações"
            >
              {observable.provenance === "numeric" ? "numérico" : observable.provenance}
            </span>
          </div>
          <strong className="hero-value">
            {formatObservable(observable.value, observable.unit)}
          </strong>
          {observable.reference !== undefined && Number.isFinite(observable.reference) && (
            <small>
              {formatObservable(observable.reference, observable.unit)} —{" "}
              {observable.referenceLabel ?? "referência analítica"}
            </small>
          )}
          {observable.regimeWarning && <p className="param-warning">{observable.regimeWarning}</p>}
        </div>
      ))}

      <div className="clock-grid">
        <div className="clock-card">
          <span className="hud-stat-label">Tempo coordenado</span>
          <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
          <small>observador no infinito</small>
        </div>
        <div className="clock-card">
          <span className="hud-stat-label">
            {scenario.kind === "null" ? "Intervalo próprio" : "Tempo próprio"}
          </span>
          <strong>
            {snapshot
              ? snapshot.properTimeS === null
                ? "0 (exato)"
                : formatSeconds(snapshot.properTimeS)
              : "—"}
          </strong>
          <small>
            {scenario.kind === "null"
              ? "geodésica nula: não há relógio próprio"
              : "relógio da partícula"}
          </small>
        </div>
      </div>

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
  const experimentId = computeExperimentId(scenario.id, experimentParams)

  return (
    <>
      <div className="telemetry-grid">
        <div
          className="telemetry-card"
          title="E = −g₀μu^μ: constante de Killing ∂t (adimensional; E/mc² para massivas)"
        >
          <span>Energia específica E</span>
          <strong>{snapshot ? snapshot.validation.energy.toFixed(9) : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="L = g₃μu^μ: constante de Killing ∂φ, em metros (L/mc para massivas)"
        >
          <span>Momento angular L</span>
          <strong>
            {snapshot ? `${snapshot.validation.angularMomentum.toExponential(4)} m` : "—"}
          </strong>
        </div>
        <div
          className="telemetry-card"
          title="|g_{μν}u^μu^ν − ε|: desvio da normalização exata (ε = 0 fóton, −1 massiva)"
        >
          <span>Erro de norma</span>
          <strong>{snapshot ? snapshot.validation.normError.toExponential(2) : "—"}</strong>
        </div>
        <div className="telemetry-card" title="Deriva relativa de E desde λ = 0">
          <span>Deriva de E</span>
          <strong>{snapshot ? snapshot.energyDriftRelative.toExponential(2) : "—"}</strong>
        </div>
        <div className="telemetry-card" title="Deriva relativa de L desde λ = 0">
          <span>Deriva de L</span>
          <strong>
            {snapshot ? snapshot.angularMomentumDriftRelative.toExponential(2) : "—"}
          </strong>
        </div>
        <div className="telemetry-card" title="Parâmetro afim integrado (λ = c·τ para massivas)">
          <span>Parâmetro afim λ</span>
          <strong>{snapshot ? formatMeters(snapshot.lambdaM) : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="Escalar de Ricci R [1/m²] na posição atual (numérico). Zero em soluções de vácuo/eletrovácuo — desvios medem erro numérico ou matéria na métrica personalizada."
        >
          <span>Escalar de Ricci R</span>
          <strong>{snapshot ? `${snapshot.invariants.ricciScalar.toExponential(2)} m⁻²` : "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="Kretschmann K = R_abcd·R^abcd [1/m⁴] na posição atual (numérico). Independe da carta: K finito num horizonte = singularidade de coordenada; K → ∞ = singularidade física real."
        >
          <span>Kretschmann K</span>
          <strong>{snapshot ? `${snapshot.invariants.kretschmann.toExponential(2)} m⁻⁴` : "—"}</strong>
        </div>
        <div className="telemetry-card">
          <span>Integrador</span>
          <strong>{snapshot?.integrator.method ?? "—"}</strong>
        </div>
        <div
          className="telemetry-card"
          title="Passos aceitos e rejeitados pelo controlador de erro (rejeições só existem no adaptativo)"
        >
          <span>Passos (aceitos / rejeitados)</span>
          <strong>
            {snapshot
              ? `${snapshot.integrator.stepsTaken.toLocaleString("pt-BR")} / ${snapshot.integrator.stepsRejected.toLocaleString("pt-BR")}`
              : "—"}
          </strong>
        </div>
        {snapshot?.integrator.relTol !== undefined && (
          <div className="telemetry-card" title="Tolerâncias do controlador adaptativo por passo">
            <span>Tolerâncias (rel / abs)</span>
            <strong>
              {snapshot.integrator.relTol.toExponential(0)} /{" "}
              {snapshot.integrator.absTol?.toExponential(0)}
            </strong>
          </div>
        )}
        <div className="telemetry-card" title="Tempo de CPU acumulado na integração">
          <span>Custo de CPU</span>
          <strong>{snapshot ? `${snapshot.integrator.cpuMs.toFixed(1)} ms` : "—"}</strong>
        </div>
      </div>

      {snapshot?.halted && (
        <p className="hud-note">
          {snapshot.haltReason === "out-of-bounds"
            ? "Integração interrompida: a trajetória saiu do domínio de validade da carta de coordenadas."
            : "Integração interrompida: condição de parada física do cenário atingida (ex.: aproximação do horizonte, onde a carta degenera)."}
        </p>
      )}

      <p className="hud-note">
        E e L são constantes de Killing; a deriva relativa e o erro de norma medem a qualidade da
        integração. R e K são invariantes de curvatura: K finito num horizonte indica
        singularidade apenas de coordenada.
      </p>

      <div className="telemetry-card" title="Hash da configuração (cenário + parâmetros + métrica + versão): a mesma configuração gera sempre o mesmo ID">
        <span>ID do experimento</span>
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
          exportar JSON
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
          exportar CSV
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
          {custom ? "Componentes definidas pelo usuário" : "Elemento de linha"}
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
        <span className="hud-stat-label">Equação da geodésica</span>
        <code>d²x^μ/dλ² + Γ^μ_αβ · (dx^α/dλ)(dx^β/dλ) = 0</code>
      </div>
      <div className="equation-block">
        <span className="hud-stat-label">Convenções</span>
        <code>assinatura (−,+,+,+) · x⁰ = c·t [m] · λ = c·τ (massivas)</code>
      </div>

      <div className="hud-section-kicker spaced">referências</div>
      <ul className="references-list">
        {scenario.references.map((reference) => (
          <li key={reference}>{reference}</li>
        ))}
      </ul>
    </>
  )
}

export function ResultsPanel({ compact }: { compact: boolean }) {
  const [tab, setTab] = useState<ResultsTab>("resultados")
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const snapshotRaw = useSimulationStore((state) => state.relativitySnapshot)
  const paused = useSimulationStore((state) => state.paused)
  // Re-renderiza quando a métrica personalizada é reaplicada (nonce).
  useSimulationStore((state) => state.relativityResetNonce)

  const scenario = createScenario(activeScenarioId, experimentParams)
  const snapshot = snapshotRaw?.scenarioId === scenario.id ? snapshotRaw : null
  const status = snapshot?.halted ? "parado" : paused ? "pausado" : "integrando"

  return (
    <aside className={`lab-right glass-panel tab-${tab}`}>
      <div className="focus-heading">
        <div className="results-tabs" role="tablist" aria-label="Painéis de resultados">
          {(["resultados", "validacao", "equacoes"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "results-tab active" : "results-tab"}
              onClick={() => setTab(id)}
            >
              {id === "validacao" ? "validação" : id === "equacoes" ? "equações" : id}
            </button>
          ))}
        </div>
        <span className={snapshot?.halted ? "focus-chip halted" : "focus-chip"}>{status}</span>
      </div>

      <div className="results-body">
        {tab === "resultados" && <ResultsTabContent scenario={scenario} snapshot={snapshot} />}
        {tab === "validacao" && <ValidationTabContent scenario={scenario} snapshot={snapshot} />}
        {tab === "equacoes" && <EquationsTabContent scenario={scenario} />}
      </div>
      {compact && null}
    </aside>
  )
}
