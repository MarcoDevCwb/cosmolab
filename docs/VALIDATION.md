# Validação do CosmoLab

Este documento registra as validações do motor de geodésicas do CosmoLab
(v0.7.0) em duas camadas: **testes automatizados contra resultados
analíticos** (rodam em `npm test`) e **cross-check contra um código
independente** (einsteinpy).

## 1. Cross-check contra einsteinpy 0.4.0

Dois motores sem nenhum código em comum integraram a MESMA órbita:

- **Sistema**: Schwarzschild, unidades geométricas G = c = M = 1.
- **Condições iniciais**: apoastro r₀ = 40 M, plano equatorial,
  momento angular específico L = 3,9 M, u^r = 0.
- **CosmoLab**: RK4 passo fixo h = 0,05 M (TypeScript, este repositório).
- **einsteinpy**: integrador simplético hamiltoniano próprio (Python).

Órbita fortemente relativística: periastro em ~5,34 M (≈ 2,7 r_s), regime
onde a aproximação pós-newtoniana é inútil (prevê 71°/órbita de precessão;
o valor real é ~262°).

| Grandeza (3,4 voltas) | CosmoLab | einsteinpy | desvio |
|---|---|---|---|
| forma da órbita r(φ), máx. | — | — | 2,3×10⁻⁴ relativo |
| forma da órbita r(φ), média | — | — | 8,7×10⁻⁵ relativo |
| raio do periastro | 5,343933 M | 5,343280 M | 1,2×10⁻⁴ relativo |
| posição angular do periastro | 5,429285 rad | 5,429286 rad | 1×10⁻⁶ rad |
| **precessão por órbita** | **262,1508°** | **262,1514°** | **0,0006° (2×10⁻⁶)** |

Reprodução:

```bash
npx tsx docs/validation/dump_cosmolab_orbit.mts        # → /tmp/cosmolab_orbit.csv
python -m venv venv && venv/bin/pip install einsteinpy
venv/bin/python docs/validation/dump_einsteinpy_orbit.py  # → /tmp/einsteinpy_orbit.csv
```

A comparação é feita em r(φ) — independente de parametrização (os dois
códigos usam grades de parâmetro afim diferentes) — e nos periastros
detectados por interpolação parabólica dos mínimos de r.

## 2. Testes automatizados contra resultados analíticos (40)

Rodam em `npm test` a cada mudança. Destaques:

| Propriedade validada | Referência analítica | Tolerância |
|---|---|---|
| Deflexão da luz pelo Sol (b = R☉) | α = 4GM☉/(c²b) ≈ 1,75″ (Weinberg §8.5) | 1% |
| Parâmetro de impacto do fóton | b = L/E (exato) | 10⁻⁶ |
| Órbita circular | Ω² = GM/r³ em t coordenado (MTW ex. 25.19) | 10⁻⁴ |
| Precessão em campo fraco (r₀ = 200 r_s) | Δφ = 6πGM/(c²p) (Weinberg §8.6) | [0,99; 1,04]× |
| Queda radial | E = √f(r₀); (dr/dλ)² = E² − f | 10⁻⁷ |
| Convergência do RK4 | erro(h/2) ≈ erro(h)/16 (Richardson) | razão ∈ [8, 32] |
| Kerr a→0 | reduz a Schwarzschild | 10⁻⁹ |
| Horizonte de Kerr | r₊ = M + √(M² − a²) | exato |
| Arrasto Lense–Thirring | L ≡ 0 com φ crescente (Killing ∂φ) | 2×10⁻² m |
| Painlevé–Gullstrand em r = r_s | Christoffels finitos; u^r = −E; K = 0,75/M⁴ | 10⁻³ |
| Kretschmann de Schwarzschild | K = 48M²/r⁶ (Henry 2000) | 10⁻⁶ |
| Kretschmann de Reissner–Nordström* | 48M²/r⁶ − 96MQ²/r⁷ + 56Q⁴/r⁸ | 10⁻³ |
| Escalar de Ricci em vácuo | R = 0 (Schwarzschild, Kerr) | ~0 numérico |

\* calculado através do sistema de MÉTRICAS PLUGÁVEIS (expressões de
usuário + Christoffels por diferenças finitas), validando a pipeline
completa do editor.

## 3. Validação contínua em execução

Além dos testes, o laboratório monitora AO VIVO, em todo cenário:
norma g_μν u^μ u^ν (deve ser 0/−1), deriva das constantes de Killing E e
L, escalar de Ricci (≈ 0 em vácuo) e Kretschmann — todos exibidos na aba
"validação" com origem numérica declarada.
