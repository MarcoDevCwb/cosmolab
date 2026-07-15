/**
 * Órbita kepleriana newtoniana — solução analítica exata do problema de dois
 * corpos clássico, usada como CONTRASTE com a geodésica relativística.
 *
 * Referência: Goldstein, "Classical Mechanics" (3ª ed.), cap. 3;
 * Murray & Dermott, "Solar System Dynamics" (1999), §2.3.
 *
 * Na gravitação de Newton a órbita ligada é uma elipse FECHADA:
 *
 *   r(θ) = p / (1 + e·cos(θ - θ₀))
 *
 * com semilatus rectum p = h²/GM (h = r·v_φ, momento angular específico) e
 * excentricidade e = √(1 + 2εh²/(GM)²) (ε = v²/2 − GM/r, energia específica).
 *
 * A diferença visível entre esta elipse e a geodésica de Schwarzschild —
 * a precessão do periastro — é exatamente o efeito que consagrou a
 * relatividade geral (43″/século de Mercúrio).
 *
 * Unidades SI: metros, segundos; GM em m³/s².
 */

export type KeplerOrbitPoint = {
  /** Raio [m]. */
  r: number
  /** Ângulo polar no plano orbital [rad]. */
  phi: number
}

/**
 * Elipse newtoniana para partícula partindo de r₀ com velocidade puramente
 * tangencial v_φ (apside inicial em φ = 0). Retorna null se a órbita não é
 * ligada (ε ≥ 0) — nesse caso não há elipse a desenhar.
 */
export function keplerEllipse(
  gravitationalParameterM3PerS2: number,
  startRadiusM: number,
  tangentialVelocityMPerS: number,
  samples = 180,
): KeplerOrbitPoint[] | null {
  const gm = gravitationalParameterM3PerS2
  const specificEnergy =
    (tangentialVelocityMPerS * tangentialVelocityMPerS) / 2 - gm / startRadiusM
  if (specificEnergy >= 0) {
    return null
  }

  const angularMomentum = startRadiusM * tangentialVelocityMPerS
  const semiLatusRectum = (angularMomentum * angularMomentum) / gm
  const eccentricity = Math.sqrt(
    Math.max(1 + (2 * specificEnergy * angularMomentum * angularMomentum) / (gm * gm), 0),
  )

  // Com v_r = 0 o ponto de partida é uma apside: periastro se r₀ < p/(1-e²)·(1-e)
  // (v_φ acima da circular), apoastro caso contrário. Em ambos os casos
  // r(φ=0) = r₀ exige cos(-θ₀) = ±1.
  const startsAtPeriapsis = startRadiusM <= semiLatusRectum / (1 + eccentricity) * (1 + 1e-12)
  const apsisPhase = startsAtPeriapsis ? 0 : Math.PI

  return Array.from({ length: samples + 1 }, (_, index) => {
    const phi = (index / samples) * 2 * Math.PI
    const r = semiLatusRectum / (1 + eccentricity * Math.cos(phi + apsisPhase))
    return { r, phi }
  })
}
