import "./App.css"
import { RelativityScene } from "./components/scene/RelativityScene"
import { SolarSystemScene } from "./components/scene/SolarSystemScene"
import { RelativityHud } from "./components/ui/RelativityHud"
import { SimulationHud } from "./components/ui/SimulationHud"
import { useCompactMode } from "./hooks/useCompactMode"
import { useSimulationStore, type LabMode } from "./store/useSimulationStore"

const LAB_MODES: { id: LabMode; label: string }[] = [
  { id: "solar-system", label: "sistema solar" },
  { id: "relativity", label: "relatividade" },
]

function App() {
  const compact = useCompactMode()
  const labMode = useSimulationStore((state) => state.labMode)
  const setLabMode = useSimulationStore((state) => state.setLabMode)

  return (
    <main className={compact ? "cosmos-app compact" : "cosmos-app"}>
      <div className={compact ? "cosmos-shell compact" : "cosmos-shell"}>
        <div className="cosmos-aura aura-one" />
        <div className="cosmos-aura aura-two" />
        <div className="cosmos-grain" />

        <nav className="lab-switch glass-panel" aria-label="Modo do laboratório">
          {LAB_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={labMode === mode.id ? "mode-pill primary" : "mode-pill"}
              onClick={() => setLabMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </nav>

        {labMode === "solar-system" ? (
          <>
            <SolarSystemScene compact={compact} />
            <SimulationHud compact={compact} />
          </>
        ) : (
          <>
            <RelativityScene compact={compact} />
            <RelativityHud compact={compact} />
          </>
        )}
      </div>
    </main>
  )
}

export default App
