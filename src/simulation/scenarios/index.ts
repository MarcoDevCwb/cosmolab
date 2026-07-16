/**
 * Registro de cenários do laboratório relativístico.
 *
 * Cada cenário é uma fábrica parametrizada: os presets abaixo são apenas
 * pontos de partida (o preset de deflexão reproduz Eddington 1919), e a UI
 * pode variar massa, parâmetro de impacto, raio e velocidade iniciais.
 * Para adicionar um cenário: criar o arquivo, implementar a fábrica e
 * registrá-la aqui — nenhuma outra parte do sistema muda.
 */

import { createCustomGeodesicScenario } from "./customGeodesic"
import { createFlatSpacePhotonScenario } from "./flatSpacePhoton"
import { createGodelUniverseScenario } from "./godelUniverse"
import { createKerrFrameDraggingScenario } from "./kerrFrameDragging"
import { createPainleveInfallScenario } from "./painleveInfall"
import { createRelativisticOrbitScenario } from "./relativisticOrbit"
import { createSchwarzschildHorizonScenario } from "./schwarzschildHorizon"
import {
  SOLAR_IMPACT_PARAMETER_RS,
  createLightDeflectionScenario,
} from "./solarLightDeflection"
import type { ExperimentParams, ScenarioId, SimulationScenario } from "./types"

export type { ExperimentParams, ScenarioId, SimulationScenario } from "./types"
export { SOLAR_IMPACT_PARAMETER_RS }

/** Presets iniciais de cada cenário (valores históricos/didáticos). */
export const DEFAULT_EXPERIMENT_PARAMS: Record<ScenarioId, ExperimentParams> = {
  "flat-space-photon": {
    massSolar: 0,
    impactParameterRs: 0,
    startRadiusRs: 0,
    angularVelocityFraction: 0,
    spinFraction: 0,
  },
  // Eddington 1919: Sol (1 M☉) com fóton tangenciando o limbo (b = R☉).
  "solar-light-deflection": {
    massSolar: 1,
    impactParameterRs: SOLAR_IMPACT_PARAMETER_RS,
    startRadiusRs: 0,
    angularVelocityFraction: 0,
    spinFraction: 0,
  },
  "relativistic-orbit": {
    massSolar: 10,
    impactParameterRs: 0,
    startRadiusRs: 8,
    angularVelocityFraction: 0.95,
    spinFraction: 0,
  },
  "schwarzschild-horizon": {
    massSolar: 10,
    impactParameterRs: 0,
    startRadiusRs: 6,
    angularVelocityFraction: 0,
    spinFraction: 0,
  },
  "painleve-infall": {
    massSolar: 10,
    impactParameterRs: 0,
    startRadiusRs: 6,
    angularVelocityFraction: 0,
    spinFraction: 0,
  },
  "kerr-frame-dragging": {
    massSolar: 10,
    impactParameterRs: 0,
    startRadiusRs: 6,
    angularVelocityFraction: 0,
    spinFraction: 0.9,
  },
  // Gödel: r₀ em unidades de r_CTC; velocidade em frações de ω_Gödel.
  "godel-universe": {
    massSolar: 0,
    impactParameterRs: 0,
    startRadiusRs: 0.45,
    angularVelocityFraction: 0.35,
    spinFraction: 0,
  },
  // Métrica do usuário: r₀ em unidades de M = GM/c² (não de r_s).
  "custom-metric": {
    massSolar: 10,
    impactParameterRs: 0,
    startRadiusRs: 12,
    angularVelocityFraction: 0.95,
    spinFraction: 0,
  },
}

const SCENARIO_FACTORIES: Record<
  ScenarioId,
  (params: ExperimentParams) => SimulationScenario
> = {
  "flat-space-photon": () => createFlatSpacePhotonScenario(),
  "solar-light-deflection": createLightDeflectionScenario,
  "relativistic-orbit": createRelativisticOrbitScenario,
  "schwarzschild-horizon": createSchwarzschildHorizonScenario,
  "painleve-infall": createPainleveInfallScenario,
  "kerr-frame-dragging": createKerrFrameDraggingScenario,
  "custom-metric": createCustomGeodesicScenario,
  "godel-universe": createGodelUniverseScenario,
}

export const SCENARIO_IDS = Object.keys(SCENARIO_FACTORIES) as ScenarioId[]

export function createScenario(id: ScenarioId, params?: ExperimentParams): SimulationScenario {
  return SCENARIO_FACTORIES[id](params ?? DEFAULT_EXPERIMENT_PARAMS[id])
}

/** Metadados leves para menus de UI (sem instanciar estados iniciais). */
export const SCENARIO_SUMMARIES: { id: ScenarioId; label: string }[] = [
  { id: "flat-space-photon", label: "Espaço plano" },
  { id: "solar-light-deflection", label: "Deflexão da luz" },
  { id: "relativistic-orbit", label: "Órbita relativística" },
  { id: "schwarzschild-horizon", label: "Horizonte" },
  { id: "painleve-infall", label: "Através do horizonte" },
  { id: "kerr-frame-dragging", label: "Kerr — arrasto" },
  { id: "godel-universe", label: "Gödel — CTCs" },
  { id: "custom-metric", label: "Métrica personalizada" },
]
