/**
 * Validação dos invariantes de curvatura contra formas fechadas conhecidas.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG, geometrizedMass } from "../constants"
import { curvatureInvariants } from "./curvature"
import { createCustomMetric } from "./metrics/customMetric"
import { createKerrMetric } from "./metrics/kerr"
import { minkowskiMetric } from "./metrics/minkowski"
import { createPainleveGullstrandMetric } from "./metrics/painleveGullstrand"
import { createSchwarzschildMetric } from "./metrics/schwarzschild"
import type { Vector4 } from "./tensor"

const massKg = 10 * SOLAR_MASS_KG
const M = geometrizedMass(massKg)

describe("invariantes de curvatura", () => {
  it("Minkowski: R = 0 e K = 0", () => {
    const { ricciScalar, kretschmann } = curvatureInvariants(minkowskiMetric, [0, 1e8, 2e7, 0])
    expect(Math.abs(ricciScalar)).toBeLessThan(1e-20)
    expect(Math.abs(kretschmann)).toBeLessThan(1e-30)
  })

  it("Schwarzschild: K = 48 M²/r⁶ (Henry 2000) e R = 0 (vácuo)", () => {
    const metric = createSchwarzschildMetric(massKg)
    const r = 10 * M
    const position: Vector4 = [0, r, 1.2, 0.4]
    const { ricciScalar, kretschmann } = curvatureInvariants(metric, position, [r, r, 1, 1])

    const expected = (48 * M * M) / r ** 6
    expect(Math.abs(kretschmann - expected) / expected).toBeLessThan(1e-6)
    expect(Math.abs(ricciScalar)).toBeLessThan(1e-6 * Math.sqrt(expected))
  })

  it("Painlevé–Gullstrand NO horizonte: K finito e igual ao de Schwarzschild", () => {
    // A prova numérica de que r = r_s é singularidade DE COORDENADA:
    // o invariante é finito e vale 48M²/(2M)⁶ = 0,75/M⁴.
    const metric = createPainleveGullstrandMetric(massKg)
    const rs = 2 * M
    const { kretschmann } = curvatureInvariants(metric, [0, rs, 1.3, 0.2], [rs, rs, 1, 1])

    const expected = 0.75 / M ** 4
    expect(Number.isFinite(kretschmann)).toBe(true)
    expect(Math.abs(kretschmann - expected) / expected).toBeLessThan(1e-3)
  })

  it("Reissner–Nordström (métrica PLUGÁVEL): K = 48M²/r⁶ − 96MQ²/r⁷ + 56Q⁴/r⁸", () => {
    const Q = 0.6 * M
    const rn = createCustomMetric(
      {
        name: "RN",
        gtt: "-(1 - 2*M/r + 0.36*M*M/(r*r))",
        gtphi: "0",
        grr: "1/(1 - 2*M/r + 0.36*M*M/(r*r))",
        gthth: "r*r",
        gphph: "r*r*sin(theta)*sin(theta)",
      },
      massKg,
    )

    const r = 6 * M
    const { kretschmann } = curvatureInvariants(rn, [0, r, Math.PI / 2, 0], [r, r, 1, 1])
    const expected =
      (48 * M * M) / r ** 6 - (96 * M * Q * Q) / r ** 7 + (56 * Q ** 4) / r ** 8

    expect(Math.abs(kretschmann - expected) / expected).toBeLessThan(1e-3)
  })

  it("Kerr: R = 0 (vácuo) e K → valor de Schwarzschild quando a → 0", () => {
    const kerrSlow = createKerrMetric(massKg, 1e-8)
    const r = 8 * M
    const position: Vector4 = [0, r, 1.1, 0.3]
    const { ricciScalar, kretschmann } = curvatureInvariants(kerrSlow, position, [r, r, 1, 1])

    const schwarzschild = (48 * M * M) / r ** 6
    expect(Math.abs(kretschmann - schwarzschild) / schwarzschild).toBeLessThan(1e-3)
    expect(Math.abs(ricciScalar)).toBeLessThan(1e-3 * Math.sqrt(schwarzschild))
  })
})
