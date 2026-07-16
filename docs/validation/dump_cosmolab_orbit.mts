/**
 * Cross-check CosmoLab × einsteinpy — lado CosmoLab.
 *
 * Integra uma órbita excêntrica de Schwarzschild em unidades geométricas
 * (G = c = M = 1) e grava r(λ) e φ(λ) em CSV, com as MESMAS condições
 * iniciais usadas no script einsteinpy correspondente:
 *
 *   r₀ = 40 M (apoastro), θ = π/2, L = 3,9 M, E fixado pela normalização
 *   (u^r = 0 no início), passo RK4 fixo h = 0,05 M por 20.000 passos.
 *
 * Executar:  npx tsx docs/validation/dump_cosmolab_orbit.mts > /tmp/cosmolab_orbit.csv
 */

import { writeFileSync } from "node:fs"
import {
  GRAVITATIONAL_CONSTANT,
  SPEED_OF_LIGHT,
} from "../../src/physics/constants"
import { createGeodesicDerivatives } from "../../src/physics/relativity/geodesic"
import { buildInitialState } from "../../src/physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../../src/physics/relativity/metrics/schwarzschild"
import { rungeKutta4Step } from "../../src/simulation/integrators/rungeKutta4"

// Massa tal que M_geo = GM/c² = 1 m: comprimentos em metros ≡ unidades de M.
const massKg = (SPEED_OF_LIGHT * SPEED_OF_LIGHT) / GRAVITATIONAL_CONSTANT
const metric = createSchwarzschildMetric(massKg)

const R0 = 40 // [M]
const L = 3.9 // [M] momento angular específico
// u^φ = L / g_φφ no plano equatorial.
const uPhi = L / (R0 * R0)

let state = buildInitialState(metric, [0, R0, Math.PI / 2, 0], [0, 0, uPhi], "timelike")
const derivatives = createGeodesicDerivatives(metric)

const H = 0.05 // [M]
const STEPS = 60_000
const OUTPUT_EVERY = 20

const lines = ["lambda_M,r_M,phi_rad,t_M"]
for (let i = 0; i <= STEPS; i += 1) {
  if (i % OUTPUT_EVERY === 0) {
    lines.push(`${(i * H).toFixed(4)},${state[1]},${state[3]},${state[0]}`)
  }
  state = rungeKutta4Step(derivatives, state, H)
}

writeFileSync("/tmp/cosmolab_orbit.csv", lines.join("\n"))
console.log(`ok: ${lines.length - 1} pontos em /tmp/cosmolab_orbit.csv`)
