---
name: verify
description: Recipe to build, launch and drive CosmoLab (Vite + React Three Fiber app) for end-to-end verification.
---

# Verificando o CosmoLab

App Vite + React 19 + React Three Fiber. Superfície: GUI no navegador.

## Build / launch

```bash
npm run dev -- --port 5199 --strictPort   # dev server
npm run build                             # tsc -b + vite build
npm test                                  # vitest (validação científica do motor)
```

## Drive (headless)

Não há playwright no projeto; use `playwright-core` instalado num diretório
temporário + o Chromium já em cache:

- Executável: `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`
  (atenção: `chrome-linux64`, não `chrome-linux`).
- `page.goto` com `waitUntil: "load"` — `networkidle` NUNCA dispara
  (WebSocket de HMR/render loop) e estoura timeout.
- Esperar `.lab-switch` aparecer antes de interagir.

## Fluxos que valem dirigir

- Alternância `sistema solar` ↔ `relatividade` no `.lab-switch` (rodapé).
- Nos 4 cenários de relatividade: cartões `.telemetry-card` devem mostrar
  erro numérico ~1e-15 e deriva de E ~1e-15; `pausar` congela τ;
  `reiniciar` zera λ.
- Console do navegador limpo (sem pageerror/console.error).
