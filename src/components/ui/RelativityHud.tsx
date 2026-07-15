import { ChartsStrip } from "./ChartsStrip"
import { ControlPanel } from "./ControlPanel"
import { ResultsPanel } from "./ResultsPanel"
import { TopBar } from "./TopBar"

/**
 * Orquestrador da HUD do laboratório relativístico.
 *
 * Layout premium: barra superior (identidade, tempo, integrador,
 * reprodução), painel técnico à esquerda (cenário, métrica, parâmetros),
 * painel de resultados com abas à direita e faixa inferior de gráficos.
 * Cada painel é um componente especializado; nenhum cálculo físico aqui.
 */
export function RelativityHud({ compact }: { compact: boolean }) {
  return (
    <div className={compact ? "hud-layer compact" : "hud-layer"}>
      <TopBar compact={compact} />
      <ControlPanel compact={compact} />
      <ResultsPanel compact={compact} />
      {!compact && <ChartsStrip />}
    </div>
  )
}
