import { Component, type ReactNode } from "react"
import { t } from "../../i18n"

/**
 * Barreira de erro: uma exceção em qualquer cena/painel vira uma mensagem
 * recuperável em vez de tela preta. O estado do experimento continua na URL,
 * então recarregar restaura o contexto.
 */
export class CrashGuard extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-guard glass-panel">
          <div className="hud-section-kicker">{t("algo quebrou")}</div>
          <p>{this.state.error.message}</p>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => window.location.reload()}
          >
            <span aria-hidden>↺</span>
            {t("recarregar o laboratório")}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
