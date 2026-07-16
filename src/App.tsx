import { useEffect } from "react"
import "./App.css"
import { CoordinateAtlas } from "./components/atlas/CoordinateAtlas"
import { RelativityScene } from "./components/scene/RelativityScene"
import { RelativityHud } from "./components/ui/RelativityHud"
import { useCompactMode } from "./hooks/useCompactMode"
import { readExperimentFromUrl, writeExperimentToUrl } from "./store/urlState"
import { useSimulationStore } from "./store/useSimulationStore"

// Lido UMA vez na carga do módulo: o efeito de sincronização reescreve a
// query string, então a URL compartilhada precisa ser capturada antes.
const sharedExperiment = readExperimentFromUrl()

function App() {
  const compact = useCompactMode()
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId)
  const experimentParams = useSimulationStore((state) => state.experimentParams)
  const relativityResetNonce = useSimulationStore((state) => state.relativityResetNonce)
  const atlasMode = useSimulationStore((state) => state.atlasMode)
  const setAtlasMode = useSimulationStore((state) => state.setAtlasMode)
  const hydrateExperiment = useSimulationStore((state) => state.hydrateExperiment)

  // URL compartilhável: hidrata o experimento na carga...
  useEffect(() => {
    if (sharedExperiment) {
      hydrateExperiment(sharedExperiment.scenarioId, sharedExperiment.params)
      if (sharedExperiment.atlasMode) {
        setAtlasMode(true)
      }
    }
  }, [hydrateExperiment, setAtlasMode])

  // ...e mantém a query string sincronizada com o experimento atual
  // (o nonce cobre reaplicações da métrica personalizada).
  useEffect(() => {
    writeExperimentToUrl(activeScenarioId, experimentParams, atlasMode)
  }, [activeScenarioId, experimentParams, relativityResetNonce, atlasMode])

  return (
    <main className={compact ? "cosmos-app compact" : "cosmos-app"}>
      <div className={compact ? "cosmos-shell compact" : "cosmos-shell"}>
        <div className="cosmos-aura aura-one" />
        <div className="cosmos-aura aura-two" />
        <div className="cosmos-grain" />

        {atlasMode ? <CoordinateAtlas /> : <RelativityScene compact={compact} />}
        <RelativityHud compact={compact} />
      </div>
    </main>
  )
}

export default App
