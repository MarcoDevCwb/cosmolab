import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useEffect, useMemo, useRef, useState } from "react"
import { t } from "../../i18n"
import { createEmbeddedSurfaceMapper } from "../../rendering/scene/coordinateMapping"
import { SURFACE_RIM_UNITS } from "../../rendering/scene/flammGeometry"
import { GeodesicSimulationRunner } from "../../simulation/simulationRunner"
import type { RelativitySnapshot } from "../../simulation/simulationRunner"
import { createScenario } from "../../simulation/scenarios"
import type { SimulationScenario } from "../../simulation/scenarios"
import { useSimulationStore } from "../../store/useSimulationStore"
import { CausalMarkers } from "../scene/CausalMarkers"
import { FlammSurface } from "../scene/FlammSurface"
import { TrajectoryRenderer } from "../scene/TrajectoryRenderer"
import { formatMeters, formatSeconds } from "../ui/formatters"

/**
 * ATLAS DE COORDENADAS — funcionalidade-assinatura do CosmoLab.
 *
 * A MESMA queda física (mesma massa, mesmo r₀, mesmo relógio próprio) é
 * integrada em duas cartas: Schwarzschild (esquerda) e Painlevé–Gullstrand
 * (direita). Os dois runners avançam pelo MESMO Δλ = c·Δτ — sincronização
 * pelo tempo próprio, a única fisicamente correta.
 *
 * O que o Atlas demonstra: invariantes (τ, raio areal r, Kretschmann K,
 * energia E) coincidem entre as cartas; grandezas de coordenada (tempo t
 * vs T, destino da integração) divergem — o "congelamento" no horizonte é
 * artefato da carta de Schwarzschild, não física.
 *
 * Este componente apenas orquestra e desenha: física 100% nos runners.
 */

const PUBLISH_INTERVAL_S = 0.12
/** Tolerância de exibição p/ marcar invariantes como coincidentes. */
const MATCH_TOLERANCE = 5e-3

function AtlasPane({
  title,
  subtitle,
  scenario,
  snapshot,
  haltNote,
}: {
  title: string
  subtitle: string
  scenario: SimulationScenario
  snapshot: RelativitySnapshot | null
  haltNote: string
}) {
  const flammRsM = scenario.surface === "flat" ? 0 : (scenario.schwarzschildRadiusM ?? 0)
  const mapToSurface = useMemo(
    () =>
      createEmbeddedSurfaceMapper(
        scenario.metric.chart,
        scenario.renderScaleM,
        flammRsM,
        SURFACE_RIM_UNITS * scenario.renderScaleM,
      ),
    [scenario, flammRsM],
  )

  return (
    <div className="atlas-pane glass-panel">
      <div className="pane-head">
        <div>
          <strong>{t(title)}</strong>
          <small>{t(subtitle)}</small>
        </div>
        <div className="pane-clock">
          <span className="topbar-kicker">{t("tempo coordenado")}</span>
          <strong>{snapshot ? formatSeconds(snapshot.coordinateTimeS) : "—"}</strong>
        </div>
      </div>

      {snapshot?.halted && <div className="pane-halt">{t(haltNote)}</div>}

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 13, 21], fov: 46 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[12, 16, 8]} intensity={100} decay={2} color="#dbeafe" />
        <FlammSurface schwarzschildRadiusM={flammRsM} renderScaleM={scenario.renderScaleM} />
        <CausalMarkers scenario={scenario} />
        <TrajectoryRenderer
          scenario={scenario}
          snapshot={snapshot}
          mapToSurface={mapToSurface}
          compact={false}
        />
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={90} />
      </Canvas>
    </div>
  )
}

function CompareRow({
  label,
  left,
  right,
  invariant,
  matches,
}: {
  label: string
  left: string
  right: string
  invariant: boolean
  matches?: boolean
}) {
  return (
    <div className="compare-row">
      <span className="compare-label">{t(label)}</span>
      <strong>{left}</strong>
      <strong>{right}</strong>
      <span
        className={
          invariant
            ? matches
              ? "compare-chip match"
              : "compare-chip pending"
            : "compare-chip chart-dependent"
        }
        title={
          invariant
            ? "Grandeza invariante: independe da carta de coordenadas — a concordância é a prova de que é o MESMO espaço-tempo"
            : "Grandeza de coordenada: depende da carta escolhida — divergir aqui não é física, é o mapa"
        }
      >
        {invariant ? (matches ? t("invariante ✓") : t("invariante")) : t("depende da carta")}
      </span>
    </div>
  )
}

export function CoordinateAtlas() {
  const paused = useSimulationStore((state) => state.paused)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const relativityResetNonce = useSimulationStore((state) => state.relativityResetNonce)
  useSimulationStore((state) => state.language)

  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // Mesmos parâmetros físicos nas duas cartas (massa, r₀ em r_s).
  const runners = useMemo(() => {
    void relativityResetNonce
    const shared = {
      ...experimentParams,
      angularVelocityFraction: 0,
      impactParameterRs: 0,
      spinFraction: 0,
    }
    return {
      schwarzschild: new GeodesicSimulationRunner(
        createScenario("schwarzschild-horizon", shared),
      ),
      painleve: new GeodesicSimulationRunner(createScenario("painleve-infall", shared)),
    }
  }, [experimentParams, relativityResetNonce])

  const [snapshots, setSnapshots] = useState<{
    schwarzschild: RelativitySnapshot | null
    painleve: RelativitySnapshot | null
  }>({ schwarzschild: null, painleve: null })

  // Driver externo aos Canvas: avança AMBOS pelo mesmo Δλ = c·Δτ.
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let accumulator = 1 // publica imediatamente no primeiro quadro

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.25)
      last = now

      if (!pausedRef.current) {
        const deltaLambdaM = delta * runners.painleve.scenario.lambdaRateMPerSecond
        runners.schwarzschild.advanceLambda(deltaLambdaM)
        runners.painleve.advanceLambda(deltaLambdaM)
      }

      accumulator += delta
      if (accumulator >= PUBLISH_INTERVAL_S) {
        setSnapshots({
          schwarzschild: runners.schwarzschild.snapshot(),
          painleve: runners.painleve.snapshot(),
        })
        accumulator = 0
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [runners])

  const left = snapshots.schwarzschild
  const right = snapshots.painleve
  const rsM = runners.painleve.scenario.schwarzschildRadiusM ?? 1

  const relMatch = (a?: number | null, b?: number | null) =>
    a != null &&
    b != null &&
    Math.abs(a - b) <= MATCH_TOLERANCE * Math.max(Math.abs(a), Math.abs(b), 1e-30)

  return (
    <section className="atlas-stage" aria-label="Atlas de Coordenadas">
      <div className="atlas-panes">
        <AtlasPane
          title="Carta de Schwarzschild"
          subtitle="t do observador distante — degenera em r = r_s"
          scenario={runners.schwarzschild.scenario}
          snapshot={left}
          haltNote="Integração parada: a carta degenera no horizonte (t → ∞). A física continua — veja ao lado."
        />
        <AtlasPane
          title="Carta de Painlevé–Gullstrand"
          subtitle="T dos observadores em queda — regular no horizonte"
          scenario={runners.painleve.scenario}
          snapshot={right}
          haltNote="Parada na aproximação da singularidade de curvatura (r → 0), o único limite real."
        />
      </div>

      <div className="atlas-compare glass-panel">
        <div className="compare-head">
          <span className="hud-section-kicker">{t("mesma física, dois mapas")}</span>
          <small>
            {t("os runners avançam pelo mesmo Δτ; invariantes devem coincidir até a carta esquerda degenerar")}
          </small>
        </div>

        <CompareRow
          label="tempo próprio τ"
          left={left?.properTimeS != null ? formatSeconds(left.properTimeS) : "—"}
          right={right?.properTimeS != null ? formatSeconds(right.properTimeS) : "—"}
          invariant
          matches={!left?.halted && relMatch(left?.properTimeS, right?.properTimeS)}
        />
        <CompareRow
          label="raio areal r"
          left={left ? `${(left.position[1] / rsM).toFixed(4)} r_s` : "—"}
          right={right ? `${(right.position[1] / rsM).toFixed(4)} r_s` : "—"}
          invariant
          matches={!left?.halted && relMatch(left?.position[1], right?.position[1])}
        />
        <CompareRow
          label="Kretschmann K"
          left={left ? `${left.invariants.kretschmann.toExponential(3)} m⁻⁴` : "—"}
          right={right ? `${right.invariants.kretschmann.toExponential(3)} m⁻⁴` : "—"}
          invariant
          matches={
            !left?.halted && relMatch(left?.invariants.kretschmann, right?.invariants.kretschmann)
          }
        />
        <CompareRow
          label="energia E"
          left={left ? left.validation.energy.toFixed(8) : "—"}
          right={right ? right.validation.energy.toFixed(8) : "—"}
          invariant
          matches={relMatch(left?.validation.energy, right?.validation.energy)}
        />
        <CompareRow
          label="tempo coordenado"
          left={left ? `t = ${formatSeconds(left.coordinateTimeS)}` : "—"}
          right={right ? `T = ${formatSeconds(right.coordinateTimeS)}` : "—"}
          invariant={false}
        />
        <CompareRow
          label="destino da integração"
          left={left?.halted ? `${t("parou em")} ${formatMeters(left.position[1])} (${t("carta")})` : t("integrando")}
          right={
            right?.halted ? `${t("parou em")} ${formatMeters(right.position[1])} (r → 0)` : t("integrando")
          }
          invariant={false}
        />
      </div>
    </section>
  )
}
