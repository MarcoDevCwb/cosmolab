/**
 * Passaporte de métricas: assinaturas locais conhecidas devem aparecer nas
 * posições analíticas quando o alcance, a carta e as hipóteses permitem.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG, geometrizedMass } from "../physics/constants"
import { createCustomMetric } from "../physics/relativity/metrics/customMetric"
import { createGodelMetric } from "../physics/relativity/metrics/godel"
import { createKerrMetric } from "../physics/relativity/metrics/kerr"
import { createSchwarzschildMetric } from "../physics/relativity/metrics/schwarzschild"
import { generateMetricPassport } from "./metricPassport"

const massKg = 10 * SOLAR_MASS_KG
const M = geometrizedMass(massKg)

const byKind = (passport: ReturnType<typeof generateMetricPassport>, kind: string) =>
  passport.findings.filter((f) => f.kind === kind)

describe("passaporte de métricas", () => {
  it("Schwarzschild: candidatos coincidem em r_s e os indícios esperados aparecem", () => {
    const metric = createSchwarzschildMetric(massKg)
    const passport = generateMetricPassport(metric, 0.2 * M, 200 * M)

    const horizons = byKind(passport, "horizon")
    expect(horizons).toHaveLength(1)
    expect(horizons[0].radiusM! / (2 * M)).toBeCloseTo(1, 2)

    const staticLimits = byKind(passport, "static-limit")
    expect(staticLimits).toHaveLength(1)
    expect(staticLimits[0].radiusM! / (2 * M)).toBeCloseTo(1, 2)

    expect(byKind(passport, "ctc-region")).toHaveLength(0)
    expect(byKind(passport, "curvature-singularity")).toHaveLength(1)
    expect(byKind(passport, "asymptotically-flat")).toHaveLength(1)
  })

  it("Kerr (a = 0,9 M): horizonte r₊ SEPARADO do limite estático 2M — a ergorregião", () => {
    const metric = createKerrMetric(massKg, 0.9)
    const passport = generateMetricPassport(metric, 1.05 * metric.horizonRadiusM, 200 * M)

    const horizons = byKind(passport, "horizon")
    const staticLimits = byKind(passport, "static-limit")
    expect(staticLimits).toHaveLength(1)
    expect(staticLimits[0].radiusM! / (2 * M)).toBeCloseTo(1, 2)
    // Começando o scan FORA de r₊ não deve haver zero de g^rr no domínio.
    expect(horizons).toHaveLength(0)
    expect(byKind(passport, "asymptotically-flat")).toHaveLength(1)
  })

  it("Gödel: região de CTCs a partir de r_CTC, sem horizonte", () => {
    const metric = createGodelMetric(1e7)
    const passport = generateMetricPassport(metric, 0.05 * metric.ctcRadiusM, 4 * metric.ctcRadiusM)

    const ctc = byKind(passport, "ctc-region")
    expect(ctc).toHaveLength(1)
    expect(ctc[0].rangeM![0] / metric.ctcRadiusM).toBeGreaterThan(0.9)
    expect(ctc[0].rangeM![0] / metric.ctcRadiusM).toBeLessThan(1.1)
    expect(ctc[0].rangeM![1]).toBeCloseTo(4 * metric.ctcRadiusM, 6)
    expect(byKind(passport, "horizon")).toHaveLength(0)
    // g_tt e g_rr sozinhos imitam Minkowski, mas os termos tφ/φφ não:
    // a comparação de toda a matriz não pode chamar Gödel de assintoticamente plano.
    expect(byKind(passport, "asymptotically-flat")).toHaveLength(0)
  })

  it("FLRW: o scan usa a ÉPOCA dada — em x⁰ = hoje a métrica é regular (bug de auditoria)", async () => {
    const { createFlrwMetric } = await import("../physics/relativity/metrics/flrw")
    const metric = createFlrwMetric(2.268e-18, 0.3)
    const D = metric.hubbleLengthM

    // Época correta (hoje): a = 1, métrica regular. NÃO pode acusar
    // horizonte, CTC, matéria exótica ou planicidade assintótica. Embora as
    // componentes espaciais coincidam instantaneamente com Minkowski em
    // a(t₀)=1, ∂ₜg≠0 e a geometria FLRW não é assintoticamente estacionária.
    const passport = generateMetricPassport(metric, 0.01 * D, 2 * D, 96, metric.nowCtM)
    expect(byKind(passport, "horizon")).toHaveLength(0)
    expect(byKind(passport, "ctc-region")).toHaveLength(0)
    expect(byKind(passport, "exotic-matter")).toHaveLength(0)
    expect(byKind(passport, "curvature-singularity")).toHaveLength(0)
    expect(byKind(passport, "asymptotically-flat")).toHaveLength(0)
    for (const f of passport.findings) {
      expect(Number.isFinite(f.radiusM ?? 0)).toBe(true)
    }

    // Regressão do bug: em x⁰ = 0 (Big Bang) a métrica é degenerada
    // (a = 0) — o scan antigo avaliava SEMPRE aí e retornava lixo/vazio.
    expect(metric.scaleFactorAt(0)).toBe(0)
  })

  it("wormhole de Morris–Thorne: matéria exótica na garganta, sem horizonte, plano longe", () => {
    const b0 = 1e7
    const wormhole = createCustomMetric(
      {
        name: "MT",
        gtt: "-1",
        gtphi: "0",
        grr: "1",
        gthth: `r*r + ${b0}*${b0}`,
        gphph: `(r*r + ${b0}*${b0})*sin(theta)*sin(theta)`,
      },
      massKg,
    )
    const passport = generateMetricPassport(wormhole, 0.1 * b0, 100 * b0)

    const exotic = byKind(passport, "exotic-matter")
    expect(exotic.length).toBeGreaterThanOrEqual(1)
    // A violação da NEC concentra-se perto da garganta (|l| ≲ poucos b₀).
    expect(exotic[0].rangeM![0]).toBeLessThan(2 * b0)
    expect(byKind(passport, "horizon")).toHaveLength(0)
    expect(byKind(passport, "asymptotically-flat")).toHaveLength(1)
  })
})
