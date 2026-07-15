import "./App.css"
import { RelativityScene } from "./components/scene/RelativityScene"
import { RelativityHud } from "./components/ui/RelativityHud"
import { useCompactMode } from "./hooks/useCompactMode"

function App() {
  const compact = useCompactMode()

  return (
    <main className={compact ? "cosmos-app compact" : "cosmos-app"}>
      <div className={compact ? "cosmos-shell compact" : "cosmos-shell"}>
        <div className="cosmos-aura aura-one" />
        <div className="cosmos-aura aura-two" />
        <div className="cosmos-grain" />

        <RelativityScene compact={compact} />
        <RelativityHud compact={compact} />
      </div>
    </main>
  )
}

export default App
