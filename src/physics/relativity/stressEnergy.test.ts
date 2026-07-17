/**
 * Validação da "etiqueta de preço": tensor de Einstein → matéria necessária.
 */

import { describe, expect, it } from "vitest"
import {
  GRAVITATIONAL_CONSTANT,
  SOLAR_MASS_KG,
  SPEED_OF_LIGHT,
  geometrizedMass,
} from "../constants"
import { matterDiagnostic } from "./curvature"
import { createCustomMetric } from "./metrics/customMetric"
import { createKerrMetric } from "./metrics/kerr"
import { createSchwarzschildMetric } from "./metrics/schwarzschild"

const massKg = 10 * SOLAR_MASS_KG
const M = geometrizedMass(massKg)
const EINSTEIN_FACTOR = SPEED_OF_LIGHT ** 4 / (8 * Math.PI * GRAVITATIONAL_CONSTANT)

describe("etiqueta de preço — diagnóstico de matéria", () => {
  it("Schwarzschild é vácuo: ρ ≈ 0, p_r ≈ 0, nenhuma violação NEC amostrada", () => {
    const metric = createSchwarzschildMetric(massKg)
    const r = 8 * M
    const matter = matterDiagnostic(metric, [0, r, 1.2, 0.4], [r, r, 1, 1])

    expect(matter).not.toBeNull()
    // Escala local de curvatura convertida a J/m³ para a tolerância.
    const scale = EINSTEIN_FACTOR * Math.sqrt(48 * M * M) / r ** 3
    expect(Math.abs(matter!.energyDensityJm3)).toBeLessThan(1e-5 * scale)
    expect(Math.abs(matter!.radialPressureJm3)).toBeLessThan(1e-5 * scale)
    expect(matter!.nullEnergyConditionOk).toBe(true)
    expect(matter!.necDirectionsTested).toBe(134)
    expect(matter!.vacuum).toBe(true)
    expect(matter!.observer).toBe("static")
  })

  it("Kerr também é vácuo, e na ergosfera o observador vira ZAMO", () => {
    const metric = createKerrMetric(massKg, 0.9)
    // Dentro da ergosfera equatorial (r_+ < r < 2M): g_tt > 0.
    const r = 1.8 * M
    const matter = matterDiagnostic(metric, [0, r, Math.PI / 2, 0], [r, r, 1, 1])

    expect(matter).not.toBeNull()
    expect(matter!.observer).toBe("zamo")
    const scale = EINSTEIN_FACTOR * Math.sqrt(48) * M / r ** 3
    expect(Math.abs(matter!.energyDensityJm3)).toBeLessThan(1e-3 * scale)
    expect(matter!.nullEnergyConditionOk).toBe(true)
  })

  it("wormhole de Morris–Thorne exige matéria EXÓTICA: ρ < 0 e NEC violada", () => {
    // Métrica MT de maré zero (Morris & Thorne 1988, eq. 11 com Φ=0):
    // ds² = −dt² + dl² + (b₀²+l²)dΩ², garganta b₀. Análise exata:
    // ρ(l) = −(c⁴/8πG)·b₀²/(b₀²+l²)².
    const b0 = 1e7 // [m]
    const wormhole = createCustomMetric(
      {
        name: "Morris–Thorne (Φ=0)",
        gtt: "-1",
        gtphi: "0",
        grr: "1",
        gthth: `r*r + ${b0}*${b0}`,
        gphph: `(r*r + ${b0}*${b0})*sin(theta)*sin(theta)`,
      },
      massKg, // massa irrelevante aqui (M não aparece nas expressões)
    )

    const l = 0.7 * b0
    const matter = matterDiagnostic(wormhole, [0, l, 1.1, 0.3], [b0, b0, 1, 1])
    const expected = (-EINSTEIN_FACTOR * b0 * b0) / (b0 * b0 + l * l) ** 2

    expect(matter).not.toBeNull()
    expect(matter!.energyDensityJm3).toBeLessThan(0)
    expect(Math.abs(matter!.energyDensityJm3 - expected) / Math.abs(expected)).toBeLessThan(2e-2)
    expect(matter!.nullEnergyConditionOk).toBe(false)
    expect(matter!.necMinimumJm3).toBeLessThan(0)
    expect(matter!.necDirectionsTested).toBe(134)
    expect(matter!.vacuum).toBe(false)
  })
})
