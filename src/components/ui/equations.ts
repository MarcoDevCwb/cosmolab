/** Elementos de linha exibidos na aba EQUAÇÕES e no relatório (por métrica). */
export const LINE_ELEMENTS: Record<string, string> = {
  Minkowski: "ds² = −(c dt)² + dx² + dy² + dz²",
  Schwarzschild:
    "ds² = −f·(c dt)² + f⁻¹·dr² + r²·dθ² + r²sin²θ·dφ²,  f = 1 − r_s/r",
  "Painlevé–Gullstrand":
    "ds² = −f·(c dT)² + 2√(r_s/r)·(c dT)·dr + dr² + r²·dΩ²,  f = 1 − r_s/r",
  FLRW: "ds² = −(c dt)² + a(t)²·(dx² + dy² + dz²),  a(t) = (Ω_m/Ω_Λ)^⅓·sinh^⅔((3/2)√Ω_Λ·H₀t)",
  Gödel:
    "ds² = −(c dt)² + dr² + dz² + 4a·sinh²(χ)·(c dt)·dφ + 2a²·sinh²χ(1 − sinh²χ)·dφ²,  χ = r/(√2 a) — CTCs onde g_φφ < 0",
  Kerr: "ds² = −(1 − 2Mr/Σ)(c dt)² − (4Mar sin²θ/Σ)·c dt·dφ + (Σ/Δ)dr² + Σdθ² + (r² + a² + 2Ma²r sin²θ/Σ)sin²θ·dφ²",
  Alcubierre:
    "ds² = −(c dt)² + (dx − v_s·f(r)·dt)² + dy² + dz²,  f = [tanh σ(r+R) − tanh σ(r−R)]/(2 tanh σR),  r = |x⃗ − x⃗_bolha(t)|",
}

export function lineElementFor(metricName: string): string | null {
  const key = Object.keys(LINE_ELEMENTS).find((k) => metricName.startsWith(k))
  return key ? LINE_ELEMENTS[key] : null
}
