/**
 * MISSÕES PEDAGÓGICAS — o modo descoberta do CosmoLab.
 *
 * Princípio: o aluno não assiste a uma animação, ele RECONSTRÓI resultados
 * históricos ajustando parâmetros e lendo instrumentos. Cada missão define
 * critérios verificáveis pelo MOTOR (nunca "resposta digitada"): a
 * avaliação lê apenas o snapshot do runner e os parâmetros — física zero
 * nesta camada, exatamente como a UI.
 *
 * As três missões de estreia cobrem três descobertas de natureza diferente:
 * reproduzir uma MEDIÇÃO histórica (Eddington), encontrar uma FRONTEIRA de
 * estabilidade (ISCO) e acertar uma JANELA crítica (captura de fótons).
 */

import { SOLAR_IMPACT_PARAMETER_RS } from "./scenarios"
import type { ExperimentParams, ScenarioId } from "./scenarios"
import type { RelativitySnapshot } from "./simulationRunner"

export type MissionId = "eddington-1919" | "isco-edge" | "photon-trap"

export type MissionCheck = {
  label: string
  done: boolean
}

export type MissionEvaluation = {
  complete: boolean
  checks: MissionCheck[]
}

export type Mission = {
  id: MissionId
  title: string
  /** O que o aluno deve fazer (sem entregar a resposta). */
  briefing: string
  /** Dica revelável. */
  hint: string
  /** Cenário onde a missão acontece. */
  scenarioId: ScenarioId
  /** Contexto histórico/científico com referência. */
  context: string
  evaluate(snapshot: RelativitySnapshot | null, params: ExperimentParams): MissionEvaluation
}

const within = (value: number, target: number, tolerance: number) =>
  Math.abs(value - target) <= tolerance * Math.abs(target)

export const MISSIONS: Mission[] = [
  {
    id: "eddington-1919",
    title: "O eclipse de Eddington",
    scenarioId: "solar-light-deflection",
    briefing:
      "Reproduza a medição que consagrou Einstein: com a massa do Sol e um fóton tangenciando o limbo solar (b = R☉), meça a deflexão total da luz.",
    hint: "O preset do cenário já é o Sol; deixe o fóton completar a travessia e leia a deflexão acumulada. O valor histórico é ≈ 1,75″.",
    context:
      "Em 29/05/1919, Eddington fotografou estrelas junto ao Sol eclipsado e confirmou a previsão da relatividade geral — o dobro do valor newtoniano (Dyson, Eddington & Davidson, 1920).",
    evaluate(snapshot, params) {
      const deflection = snapshot?.observables.find((o) => o.id === "deflection")
      const crossed = snapshot?.halted === true && snapshot.haltReason === "stop-condition"
      const measured = crossed && deflection !== undefined ? deflection.value : null

      const checks: MissionCheck[] = [
        { label: "massa central = 1 M☉ (±5%)", done: within(params.massSolar, 1, 0.05) },
        {
          label: "parâmetro de impacto b = R☉ (±5%)",
          done: within(params.impactParameterRs, SOLAR_IMPACT_PARAMETER_RS, 0.05),
        },
        { label: "fóton completou a travessia", done: crossed },
        {
          label: "deflexão medida entre 1,60″ e 1,90″",
          done: measured !== null && measured >= 1.6 && measured <= 1.9,
        },
      ]

      return { complete: checks.every((c) => c.done), checks }
    },
  },
  {
    id: "isco-edge",
    title: "A beira do abismo",
    scenarioId: "relativistic-orbit",
    briefing:
      "Perto da ISCO o poço de estabilidade é uma lâmina: monte uma órbita que MERGULHE até um periastro ≤ 4 r_s e, ainda assim, complete 3 voltas sem ser engolida.",
    hint: "Reduza a velocidade tangencial local para afundar o periastro. Cuidado: reduza demais e a partícula perde a barreira do potencial efetivo e mergulha.",
    context:
      "A ISCO (r = 3 r_s = 6GM/c²) delimita os discos de acreção reais — dela vem a borda interna brilhante das imagens do EHT. Logo abaixo vivem as órbitas zoom-whirl, que espiralam rente à esfera de fótons antes de escapar ou cair (Bardeen, Press & Teukolsky, 1972).",
    evaluate(snapshot, _params) {
      const orbits = snapshot?.observables.find((o) => o.id === "orbits")?.value ?? 0
      const history = snapshot?.history ?? []
      const rs = snapshot?.schwarzschildRadiusM ?? 1
      const periastronRs =
        history.length > 0
          ? history.reduce((min, point) => Math.min(min, point.radiusM), Infinity) / rs
          : Infinity

      const checks: MissionCheck[] = [
        { label: "3 voltas completadas", done: orbits >= 3 },
        {
          label: "periastro alcançou r ≤ 4 r_s",
          done: history.length > 10 && periastronRs <= 4,
        },
        {
          label: "sobreviveu (não caiu nem escapou)",
          done: history.length > 10 && snapshot?.halted === false,
        },
      ]

      return { complete: checks.every((c) => c.done), checks }
    },
  },
  {
    id: "photon-trap",
    title: "A armadilha de luz",
    scenarioId: "solar-light-deflection",
    briefing:
      "Capture um fóton SEM exagerar: faça-o cair no buraco negro com parâmetro de impacto entre 2,50 e 2,60 r_s — a janela logo abaixo do valor crítico.",
    hint: "Existe um b crítico: acima dele todo fóton escapa (por mais que entorte); abaixo, é capturado. A janela pedida força você a encostar nesse limiar.",
    context:
      "b_crítico = (3√3/2)·r_s ≈ 2,598 r_s corresponde à esfera de fótons (r = 1,5 r_s) — a última órbita circular da luz, responsável pelo anel fino nas imagens do M87* e Sgr A* (MTW §25.6).",
    evaluate(snapshot, params) {
      const captured = snapshot?.halted === true && snapshot.haltReason === "out-of-bounds"

      const checks: MissionCheck[] = [
        {
          label: "b entre 2,50 e 2,60 r_s",
          done: params.impactParameterRs >= 2.5 && params.impactParameterRs <= 2.6,
        },
        { label: "fóton capturado (cruzou rumo ao horizonte)", done: captured },
      ]

      return { complete: checks.every((c) => c.done), checks }
    },
  },
]

export const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]))
