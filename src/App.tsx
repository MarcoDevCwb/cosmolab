import "./App.css"
import { SolarSystemScene } from "./components/scene/SolarSystemScene"
import { SimulationHud } from "./components/ui/SimulationHud"
import { useCompactMode } from "./hooks/useCompactMode"

function App() {
  const compact = useCompactMode()

  return (
    <main className={compact ? "cosmos-app compact" : "cosmos-app"}>
      <div className={compact ? "cosmos-shell compact" : "cosmos-shell"}>
        <div className="cosmos-aura aura-one" />
        <div className="cosmos-aura aura-two" />
        <div className="cosmos-grain" />

        <SolarSystemScene compact={compact} />
        <SimulationHud compact={compact} />
      </div>
    </main>
  )
}

export default App
