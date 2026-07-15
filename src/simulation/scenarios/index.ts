/**
 * Registro de cenários do laboratório relativístico.
 *
 * Cada cenário é criado por uma fábrica (estado inicial novo a cada reset).
 * Para adicionar um cenário: criar o arquivo, implementar a fábrica e
 * registrá-la aqui — nenhuma outra parte do sistema muda.
 */

import { createFlatSpacePhotonScenario } from "./flatSpacePhoton"
import { createRelativisticOrbitScenario } from "./relativisticOrbit"
import { createSchwarzschildHorizonScenario } from "./schwarzschildHorizon"
import { createSolarLightDeflectionScenario } from "./solarLightDeflection"
import type { ScenarioId, SimulationScenario } from "./types"

export type { ScenarioId, SimulationScenario } from "./types"

export const SCENARIO_FACTORIES: Record<ScenarioId, () => SimulationScenario> = {
  "flat-space-photon": createFlatSpacePhotonScenario,
  "solar-light-deflection": createSolarLightDeflectionScenario,
  "relativistic-orbit": createRelativisticOrbitScenario,
  "schwarzschild-horizon": createSchwarzschildHorizonScenario,
}

export const SCENARIO_IDS = Object.keys(SCENARIO_FACTORIES) as ScenarioId[]

export function createScenario(id: ScenarioId): SimulationScenario {
  return SCENARIO_FACTORIES[id]()
}

/** Metadados leves para menus de UI (sem instanciar estados iniciais). */
export const SCENARIO_SUMMARIES: { id: ScenarioId; label: string }[] = [
  { id: "flat-space-photon", label: "Espaço plano — fóton" },
  { id: "solar-light-deflection", label: "Deflexão da luz pelo Sol" },
  { id: "relativistic-orbit", label: "Órbita relativística (10 M☉)" },
  { id: "schwarzschild-horizon", label: "Horizonte de Schwarzschild" },
]
