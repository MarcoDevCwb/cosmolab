/**
 * i18n: dicionário PT→EN com fallback gracioso e regras de padrão para
 * strings dinâmicas montadas pelo motor.
 */

import { afterEach, describe, expect, it } from "vitest"
import { setLanguage, t } from "./index"

afterEach(() => setLanguage("pt"))

describe("i18n", () => {
  it("em PT devolve a própria string", () => {
    setLanguage("pt")
    expect(t("Deflexão acumulada")).toBe("Deflexão acumulada")
  })

  it("em EN traduz chaves exatas (UI, cenários, missões, validação)", () => {
    setLanguage("en")
    expect(t("Deflexão acumulada")).toBe("Accumulated deflection")
    expect(t("Através do horizonte")).toBe("Through the horizon")
    expect(t("A armadilha de luz")).toBe("The light trap")
    expect(t("VIOLADA — matéria exótica")).toBe("VIOLATED — exotic matter")
    expect(t("validado")).toBe("validated")
  })

  it("traduz strings dinâmicas por padrão (números preservados)", () => {
    setLanguage("en")
    expect(t("b < b_crítico ≈ 2.60 r_s: o fóton será CAPTURADO pelo buraco negro.")).toBe(
      "b < b_critical ≈ 2.60 r_s: the photon will be CAPTURED by the black hole.",
    )
    expect(t("K cresce ≈ r^−6.0 rumo ao centro (K invariante ⇒ não é artefato de carta).")).toBe(
      "K grows ≈ r^−6.0 toward the center (K is chart-invariant ⇒ not a coordinate artifact).",
    )
  })

  it("chave desconhecida cai no PT (nunca chave crua)", () => {
    setLanguage("en")
    expect(t("uma frase inédita qualquer")).toBe("uma frase inédita qualquer")
  })
})
