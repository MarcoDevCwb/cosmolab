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
    expect(t("violação detectada em direção amostrada")).toBe(
      "violation detected along a sampled direction",
    )
    expect(t("validado")).toBe("validated")
  })

  it("traduz strings dinâmicas por padrão (números preservados)", () => {
    setLanguage("en")
    expect(t("b < b_crítico ≈ 2.60 r_s: o fóton será CAPTURADO pelo buraco negro.")).toBe(
      "b < b_critical ≈ 2.60 r_s: the photon will be CAPTURED by the black hole.",
    )
    expect(t("K cresce ≈ r^−6.0 na borda interna do scan. É indício de divergência; confirmar singularidade exige estudar o limite e a extensão geodésica.")).toBe(
      "K grows ≈ r^−6.0 at the scan's inner boundary. This suggests divergence; confirming a singularity requires studying the limit and geodesic extension.",
    )
  })

  it("chave desconhecida cai no PT (nunca chave crua)", () => {
    setLanguage("en")
    expect(t("uma frase inédita qualquer")).toBe("uma frase inédita qualquer")
  })
})
