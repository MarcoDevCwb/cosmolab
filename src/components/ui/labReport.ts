/**
 * RELATÓRIO DE LABORATÓRIO — o documento entregável do experimento.
 *
 * Gera um HTML imprimível de alta qualidade (o navegador salva como PDF
 * nativamente) com a estrutura de um relatório científico: configuração,
 * resultados com proveniência, validação numérica, gráficos, missões
 * verificadas, referências e a URL que reproduz o experimento.
 *
 * Sem dependências: SVGs desenhados a partir do histórico do runner,
 * estilos embutidos, tema claro para papel. Camada de UI — só formatação.
 */

import type { ExperimentParams, SimulationScenario } from "../../simulation/scenarios"
import { getCustomMetricDefinition } from "../../simulation/scenarios/customGeodesic"
import { MISSIONS } from "../../simulation/missions"
import type { MissionId } from "../../simulation/missions"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import { COSMOLAB_VERSION } from "../../version"
import { getLanguage, t } from "../../i18n"
import { lineElementFor } from "./equations"
import { computeExperimentId } from "./exportExperiment"
import { formatObservable, formatSeconds, formatSolarMasses } from "./formatters"

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

/** Polilinha SVG normalizada a partir de uma série. */
function sparkline(values: number[], width = 460, height = 110): string {
  if (values.length < 2) {
    return ""
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-30)
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / span) * (height - 10) - 5
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="#1d4ed8" stroke-width="2"/></svg>`
}

export function buildLabReportHtml(
  scenario: SimulationScenario,
  params: ExperimentParams,
  snapshot: RelativitySnapshot,
  completedMissions: MissionId[],
  reproducibleUrl: string,
): string {
  const experimentId = computeExperimentId(scenario.id, params)
  const generatedAt = new Date().toLocaleString(getLanguage() === "en" ? "en-US" : "pt-BR")
  const lineElement = lineElementFor(scenario.metric.name)
  const custom = scenario.id === "custom-metric" ? getCustomMetricDefinition() : null

  const observableRows = snapshot.observables
    .map(
      (o) => `<tr>
        <td>${escapeHtml(t(o.label))}</td>
        <td class="num">${escapeHtml(formatObservable(o.value, o.unit))}</td>
        <td>${o.provenance === "numeric" ? t("numérico") : o.provenance === "analytic" ? t("analítico") : t("campo fraco")}</td>
        <td>${
          o.reference !== undefined && Number.isFinite(o.reference)
            ? `${escapeHtml(formatObservable(o.reference, o.unit))} — ${escapeHtml(t(o.referenceLabel ?? ""))}`
            : "—"
        }</td>
      </tr>`,
    )
    .join("")

  const missionRows = MISSIONS.filter(
    (m) => completedMissions.includes(m.id) && m.scenarioId === scenario.id,
  )
    .map((m) => `<li><strong>🏅 ${escapeHtml(t(m.title))}</strong> — ${escapeHtml(t(m.briefing))}</li>`)
    .join("")

  const referenceRows = scenario.references
    .map((reference) => `<li>${escapeHtml(reference)}</li>`)
    .join("")

  const history = snapshot.history
  const radiusSeries = history.map((p) => p.radiusM)
  const errorSeries = history.map((p) => Math.log10(Math.max(p.normError, 1e-18)))
  const clockSeries = history.map((p) => p.coordinateTimeS)

  return `<!DOCTYPE html>
<html lang="${getLanguage() === "en" ? "en" : "pt-BR"}">
<head>
<meta charset="utf-8">
<title>${t("Relatório de laboratório")} CosmoLab — ${escapeHtml(t(scenario.label))} · ${experimentId}</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font: 13px/1.55 "Segoe UI", system-ui, sans-serif; color: #111827; padding: 34px 42px; max-width: 860px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #111827; padding-bottom: 10px; }
  header h1 { font-size: 21px; letter-spacing: -0.02em; }
  header .meta { text-align: right; font-size: 11px; color: #4b5563; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #1d4ed8; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 600; }
  code { font-family: "Cascadia Code", monospace; font-size: 11.5px; background: #f3f4f6; padding: 2px 5px; border-radius: 4px; }
  .charts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .chart { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
  .chart small { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; }
  .chart svg { width: 100%; height: 72px; }
  ul { padding-left: 18px; }
  li { margin: 3px 0; }
  .verdict { padding: 8px 12px; border-radius: 8px; font-weight: 600; display: inline-block; }
  .verdict.ok { background: #ecfdf5; color: #047857; }
  .verdict.exotic { background: #fef2f2; color: #b91c1c; }
  footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10.5px; color: #6b7280; word-break: break-all; }
  .print-button { position: fixed; top: 14px; right: 14px; padding: 10px 18px; border: 0; border-radius: 10px; background: #1d4ed8; color: white; font-weight: 700; cursor: pointer; }
  @media print { .print-button { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<button class="print-button" onclick="window.print()">${t("Imprimir / salvar PDF")}</button>

<header>
  <div>
    <h1>${t("Relatório de laboratório")} — ${escapeHtml(t(scenario.label))}</h1>
    <div>CosmoLab · ${t("laboratório de relatividade geral")}</div>
  </div>
  <div class="meta">
    ${t("ID do experimento")}: <strong>${experimentId}</strong><br>
    v${COSMOLAB_VERSION} · ${generatedAt}
  </div>
</header>

<h2>1. ${t("Configuração")}</h2>
<table>
  <tr><th>${t("Métrica")}</th><td>${escapeHtml(scenario.metric.name)} <em>(status: ${escapeHtml(scenario.scientificStatus)})</em></td></tr>
  ${lineElement ? `<tr><th>${t("Elemento de linha")}</th><td><code>${escapeHtml(lineElement)}</code></td></tr>` : ""}
  ${
    custom
      ? `<tr><th>${t("Componentes definidas pelo usuário")}</th><td><code>g_tt = ${escapeHtml(custom.gtt)}<br>g_tφ = ${escapeHtml(custom.gtphi)}<br>g_rr = ${escapeHtml(custom.grr)}<br>g_θθ = ${escapeHtml(custom.gthth)}<br>g_φφ = ${escapeHtml(custom.gphph)}</code></td></tr>`
      : ""
  }
  <tr><th>${t("Geodésica")}</th><td>${scenario.kind === "null" ? t("nula (fóton)") : t("timelike (partícula massiva)")}</td></tr>
  <tr><th>${t("Massa central")}</th><td class="num">${scenario.centralMassKg ? formatSolarMasses(params.massSolar) : "—"}</td></tr>
  <tr><th>${t("Parâmetros")}</th><td class="num">b = ${params.impactParameterRs.toPrecision(4)} r_s · r₀ = ${params.startRadiusRs.toPrecision(4)} · ω/ω_circ = ${params.angularVelocityFraction.toPrecision(3)} · a/M = ${params.spinFraction.toPrecision(3)}</td></tr>
  <tr><th>${t("Integrador")}</th><td>${escapeHtml(t(snapshot.integrator.method))} · ${snapshot.integrator.stepsTaken.toLocaleString("pt-BR")} passos aceitos, ${snapshot.integrator.stepsRejected.toLocaleString("pt-BR")} rejeitados${snapshot.integrator.relTol ? ` · tol ${snapshot.integrator.relTol.toExponential(0)}/${snapshot.integrator.absTol?.toExponential(0)}` : ""}</td></tr>
</table>

<h2>2. ${t("Resultados")}</h2>
<table>
  <tr><th>${t("Observável")}</th><th>${t("Valor")}</th><th>${t("Origem")}</th><th>${t("Referência analítica")}</th></tr>
  ${observableRows}
  <tr><td>${t("Tempo coordenado")} t</td><td class="num">${formatSeconds(snapshot.coordinateTimeS)}</td><td>numérico</td><td>—</td></tr>
  <tr><td>${scenario.kind === "null" ? `${t("Intervalo próprio")} (${t("geodésica nula")})` : `${t("Tempo próprio")} τ`}</td><td class="num">${snapshot.properTimeS === null ? t("0 (exato)") : formatSeconds(snapshot.properTimeS)}</td><td>${t("numérico")}</td><td>—</td></tr>
  ${snapshot.futureTravelS !== null ? `<tr><td>${t("Salto ao futuro Δ = t − τ")}</td><td class="num">${formatSeconds(snapshot.futureTravelS)}</td><td>${t("numérico")}</td><td>Hafele–Keating (1972)</td></tr>` : ""}
</table>

<h2>3. ${t("Validação numérica")}</h2>
<table>
  <tr><th>${t("Grandeza")}</th><th>${t("Valor")}</th><th>${t("Interpretação")}</th></tr>
  <tr><td>${t("Erro de norma")} |g·u·u − ε|</td><td class="num">${snapshot.validation.normError.toExponential(2)}</td><td>${t("qualidade da integração")}</td></tr>
  <tr><td>${t("Deriva de E")} / L</td><td class="num">${snapshot.energyDriftRelative.toExponential(2)} / ${snapshot.angularMomentumDriftRelative.toExponential(2)}</td><td>${t("constantes de Killing conservadas")}</td></tr>
  <tr><td>${t("Escalar de Ricci R")}</td><td class="num">${snapshot.invariants.ricciScalar.toExponential(2)} m⁻²</td><td>${t("≈ 0 em vácuo")}</td></tr>
  <tr><td>${t("Kretschmann K")}</td><td class="num">${snapshot.invariants.kretschmann.toExponential(2)} m⁻⁴</td><td>${t("invariante de curvatura (independe da carta)")}</td></tr>
  <tr><td>${t("Causalidade (g_φφ)")}</td><td class="num">${snapshot.causality.closedTimelikeCircle ? "CTC!" : "normal"}</td><td>g_φφ &lt; 0 ⇒ curva temporal fechada</td></tr>
  ${
    snapshot.matter
      ? `<tr><td>${t("Matéria exigida (ρ, NEC)")}</td><td class="num">${snapshot.matter.vacuum ? t("≈ 0 (vácuo)") : `${snapshot.matter.energyDensityJm3.toExponential(2)} J/m³`}</td><td><span class="verdict ${snapshot.matter.nullEnergyConditionOk ? "ok" : "exotic"}">${snapshot.matter.nullEnergyConditionOk ? t("NEC satisfeita") : t("NEC violada — matéria exótica")}</span></td></tr>`
      : ""
  }
</table>

<h2>4. ${t("Séries do experimento")}</h2>
<div class="charts">
  <div class="chart"><small>${t("raio r(λ)")}</small>${sparkline(radiusSeries)}</div>
  <div class="chart"><small>${t("Erro de norma")} (log₁₀)</small>${sparkline(errorSeries)}</div>
  <div class="chart"><small>${t("tempo coordenado")} t(λ)</small>${sparkline(clockSeries)}</div>
</div>

${missionRows ? `<h2>5. ${t("Missões verificadas pelo motor")}</h2><ul>${missionRows}</ul>` : ""}

<h2>${missionRows ? "6" : "5"}. ${t("Referências")}</h2>
<ul>${referenceRows}</ul>

<footer>
  Gerado por CosmoLab v${COSMOLAB_VERSION} · motor validado contra einsteinpy (2 ppm; docs/VALIDATION.md) e ${""}59+ testes analíticos.<br>
  <strong>${t("Reprodutível:")}</strong> ${escapeHtml(reproducibleUrl)}
</footer>
</body>
</html>`
}

/** Abre o relatório numa aba (o usuário imprime/salva como PDF de lá). */
export function openLabReport(
  scenario: SimulationScenario,
  params: ExperimentParams,
  snapshot: RelativitySnapshot,
  completedMissions: MissionId[],
): void {
  const html = buildLabReportHtml(
    scenario,
    params,
    snapshot,
    completedMissions,
    window.location.href,
  )
  const reportWindow = window.open("", "_blank")
  if (reportWindow) {
    reportWindow.document.write(html)
    reportWindow.document.close()
  }
}
