# Validação científica do CosmoLab

Este documento descreve o que foi efetivamente validado no CosmoLab
(estado de jul/2026; inventário canônico — testes, cenários, métricas —
em docs/RELATORIO_ESTADO.md §1), com quais hipóteses e com que precisão. O motor resolve numericamente as
equações geodésicas completas; “completas” significa que a dinâmica não é
substituída por fórmulas de campo fraco. Não significa solução analítica,
aritmética exata ou ausência de erro de truncamento e arredondamento.

A validação tem três camadas:

1. **95 testes automatizados no total**; o núcleo científico confronta
   identidades, soluções analíticas, limites conhecidos e propriedades
   numéricas, e o restante protege relatório e internacionalização;
2. **cross-check independente com einsteinpy 0.4.0** para uma órbita de
   Schwarzschild em campo forte;
3. **diagnósticos durante a execução**, com o domínio de validade de cada
   grandeza declarado na interface.

## 1. Convenções e significado das grandezas

- assinatura da métrica: `(−,+,+,+)`;
- coordenada temporal: `x⁰ = c·t`, em metros;
- partículas massivas: parâmetro afim `λ = c·τ` e `g(u,u) = −1`;
- fótons: parâmetro afim arbitrário e `g(u,u) = 0`;
- massa geometrizada: `M = GM_físico/c²`; em Schwarzschild, `r_s = 2M`;
- energia e momento angular específicos, quando existem os Killing
  correspondentes: `E = −g_{0μ}u^μ` e `L = g_{3μ}u^μ`;
- a densidade exibida pelo diagnóstico de matéria é densidade de **energia**
  `ε = T(û,û)` em J/m³, não densidade de massa em kg/m³;
- a convenção cosmológica implementada é `G_μν = (8πG/c⁴)T^efetivo_μν`.
  Portanto, um `Λ` já embutido na métrica aparece no lado direito como parte
  do tensor energia-momento efetivo.

## 2. Cross-check CosmoLab × einsteinpy 0.4.0

Dois motores sem código em comum integram a mesma órbita:

- Schwarzschild em unidades `G = c = M = 1`;
- apoastro inicial `r₀ = 40M`, plano equatorial, `u^r = 0`;
- momento angular específico `L = 3,9M`; `E` é determinado pela normalização;
- CosmoLab: RK4 de passo fixo `h = 0,05M`, TypeScript;
- einsteinpy 0.4.0: formulação Hamiltoniana e integrador de splitting de
  ordem 2 padrão, `delta = 0,05`, Python.

A órbita tem periastro próximo de `5,34M ≈ 2,67r_s`. Nesse regime a expressão
de primeira ordem `6πM/p` não é uma referência quantitativa adequada: ela
prevê cerca de 71° por órbita, enquanto os dois integradores dão cerca de
262°. A concordância entre os motores, e não a fórmula 1PN fora de regime, é
o teste relevante.

| Grandeza | CosmoLab | einsteinpy | diferença registrada |
| --- | ---: | ---: | ---: |
| forma orbital `r(φ)`, máximo | — | — | `2,3×10⁻⁴` relativo |
| forma orbital `r(φ)`, média | — | — | `8,7×10⁻⁵` relativo |
| primeiro raio de periastro | `5,343933M` | `5,343280M` | `1,2×10⁻⁴` relativo |
| fase do periastro | `5,429285 rad` | `5,429286 rad` | `≈10⁻⁶ rad` absoluto |
| **precessão média** | **`262,1508°/órbita`** | **`262,1514°/órbita`** | **`0,0006°`, ou `≈2×10⁻⁶` relativo** |

O número “2 ppm” refere-se **somente ao observável de precessão**. Não deve
ser anunciado como erro ponto a ponto da trajetória, que nesta execução é da
ordem de `10⁻⁴`. A concordância é evidência forte contra erros comuns de
sinal, normalização e implementação, mas não constitui prova de correção:
dois códigos podem compartilhar uma convenção equivocada ou ter erros abaixo
da resolução deste caso.

### Reprodução

Recomenda-se Python 3.11 e um ambiente limpo:

```bash
npx tsx docs/validation/dump_cosmolab_orbit.mts
python3.11 -m venv /tmp/cosmolab-einsteinpy
/tmp/cosmolab-einsteinpy/bin/pip install -r docs/validation/requirements.txt
/tmp/cosmolab-einsteinpy/bin/python docs/validation/dump_einsteinpy_orbit.py
/tmp/cosmolab-einsteinpy/bin/python docs/validation/compare_orbits.py
```

Os dumps escrevem `/tmp/cosmolab_orbit.csv` e
`/tmp/einsteinpy_orbit.csv`. O comparador versionado:

- confronta `r(φ)`, eliminando a diferença de parametrização afim;
- interpola uma trajetória sobre a grade angular da outra;
- refina cada mínimo de `r` por ajuste quadrático local de três pontos;
- calcula `Δφ_peri − 2π` e informa separadamente erros de forma, raio, fase e
  precessão.

## 3. Testes automatizados

Todos rodam com `npm test`. As tolerâncias abaixo são critérios de regressão,
não algarismos significativos universais do motor: dependem do cenário,
escala, passo, carta e condicionamento das diferenças finitas.

| Propriedade | Referência ou invariante | Critério automatizado |
| --- | --- | ---: |
| raio de Schwarzschild | `r_s = 2GM/c²` | precisão de ponto flutuante |
| norma inicial | `g(u,u)=0` ou `−1` | até `10⁻¹⁴` no teste orbital local |
| fóton em Minkowski | reta e norma nula | erro de máquina |
| parâmetro de impacto | `b=L/E` para fóton assintótico em Schwarzschild | `10⁻⁶` |
| deflexão solar | `α=4GM/(c²b)≈1,75″` | intervalo `1,73″–1,77″` |
| velocidade orbital local | `v/c=u^(φ̂)/u^(t̂)` na tétrade estática | 12 casas no estado inicial |
| órbita circular | `(dφ/dt)²=GM/r³` | erro relativo `<10⁻⁴` |
| precessão fraca | `Δφ=6πM/p+O((M/p)²)` | razão numérico/1PN em `[0,99;1,04]` |
| convergência RK4 | erro global `O(h⁴)` | `erro(h)/erro(h/2)` em `[8;32]` |
| queda radial | `E=√f(r₀)` e `(u^r)²=E²−f(r)` | `E` a `10⁻⁷`; velocidade a `10⁻⁴` |
| Shapiro, corda coordenada | `(r_s/c)[ln(4x₁x₂/b²)−1]` em 1PN | concordância numérica de 1% |
| Painlevé–Gullstrand | bloco `T–r` com det. `−1`, `g_TT=0`, `g^TT=−1` em `r_s` | identidades algébricas + Γ finitos |
| Kretschmann Schwarzschild | `K=48M²/r⁶`; `K(2M)=0,75/M⁴` | erro relativo `10⁻⁶` / horizonte `10⁻³` |
| Reissner–Nordström pelo editor | `48M²/r⁶−96MQ²/r⁷+56Q⁴/r⁸` | erro relativo `10⁻³` |
| Kerr | limite `a→0`, `r₊=M+√(M²−a²)`, `R≈0` | testes algébricos e numéricos dedicados |
| Gödel | troca de sinal de `g_φφ` em `√2a asinh(1)` | dentro/fora da fronteira + conservação |
| Morris–Thorne | `ε=−(c⁴/8πG)b₀²/(b₀²+l²)²` | erro relativo `<2%` e NEC violada |
| FLRW | `ε_total=3c²H²/(8πG)` | erro relativo `<10⁻³` |
| redshift FLRW | `1+z=a_obs/a_em`; `a²u^x` conservado | erro/deriva `<10⁻⁸` |
| Atlas de Coordenadas | mesmo `τ`, raio areal, `K` e `E` | `r<10⁻⁶`, `K<10⁻³`, `E<10⁻⁷` relativos/absolutos conforme teste |
| Alcubierre | `det g=−1`; piloto com `u=(1,β,0,0)` e `dτ=dt`; eq. 19 (densidade euleriana) e NEC | norma `−1` exata; eq. 19 `<10⁻³`; fatura `∝β²` e parede fina a 5% |
| pp-wave (Brinkmann) | vácuo exato p/ qualquer `A(u)`; VSI (`R=K=0` com Riemann `≠0`); `p_v` Killing nulo | `T≈0` na tolerância de maré; `p_v` a `10⁻¹⁰` |
| anel × onda exata | teoria linearizada emerge: antifase e `(h/2)L` por braço | `3%` (`h=2×10⁻³`, 2 ciclos) |
| focalização ponderomotriz | deriva secular `⟨Δx̄⟩≈−K²h²Lt²/32`, atrativa | sinal e escala `∝h²` confirmados; magnitude a `10–20%` |
| Khan–Penrose | Christoffels analíticos ≡ FD; arbitragem do fator conforme; Kasner `√g_xx·√g_yy=W`; `p_x` | `6×10⁻¹¹`; razão errado/ruído `≥100` (medida `10⁷–10⁹`); `10⁻¹⁰`; `10⁻⁸` no interior |
| DP54 adaptativo | tolerância no oscilador; conservação na queda ao horizonte; `h` encolhe no horizonte | norma `<10⁻⁷`; adaptação verificada |

### Por que a órbita circular não mede bem a ordem do RK4

Em Schwarzschild estacionário e axissimétrico, uma órbita circular equatorial
com `u^r=u^θ=0` e valores consistentes de `E,L` é uma **solução relativa**:
`r,θ,u^μ` permanecem constantes e apenas `t,φ` avançam. Em aritmética exata,
todos os estágios de um método de Runge–Kutta explícito permanecem nesse
subespaço invariante, de modo que o erro radial de truncamento pode se anular.

Isso não torna o estado completo um “ponto fixo” — `t` e `φ` mudam — nem
garante zero bit a bit em ponto flutuante, pois cancelamentos podem produzir
arredondamento. O teste de ordem usa uma órbita **excêntrica** e uma referência
em `h/8`, evitando estimar Richardson a partir de `0/0` ou do piso de
arredondamento.

### Shapiro e a escolha da baseline

Para extremos distantes, em coordenadas areais de Schwarzschild, o tempo da
geodésica nula comparado à corda euclidiana coordenada entre os extremos tem,
na ordem 1PN,

```text
Δt_corda = (r_s/c)[ln(4x₁x₂/b²) − 1] + termos de distância finita + O(r_s²).
```

Outras decomposições do “atraso” usam soma de distâncias radiais, trajetória
não perturbada ou um protocolo de radar completo e podem alterar o termo
constante. Mantidos os mesmos extremos e uma mudança de baseline que acrescente
apenas uma constante independente de `b`, essa constante cancela:

```text
Δt(b₁) − Δt(b₂) = (2r_s/c) ln(b₂/b₁) + O(r_s²).
```

Essa forma não é “livre de convenção” sem qualificações: uma baseline que
dependa de `b`, extremos diferentes, outra escolha de coordenadas ou termos de
ordem superior podem mudar a diferença. Um observável operacional deve fixar
linhas de mundo de emissor/receptor e ser expresso em tempo próprio medido.

### Velocidade local e o “poço navalha” da ISCO

O controle orbital usa a velocidade tangencial medida pelo observador estático
de Schwarzschild. Para `f=1−r_s/r`:

```text
v_circ²/c² = M/(r−2M) = r_s/[2(r−r_s)]
u^t = γ/√f
u^φ = γ(v/c)/r
γ = 1/√(1−v²/c²).
```

Com `r₀=8r_s` e `v=0,85v_circ`, a integração e a equação de turning points do
potencial `V_eff²=f(1+L²/r²)` dão periastro próximo de `3,12r_s`. Com
`r₀=3,1r_s` e `v=0,99v_circ`, resulta `L²<12M²`; o máximo e o mínimo do
potencial deixam de existir e a partícula mergulha. Isso ilustra a perda da
barreira perto da ISCO, mas não autoriza a frase “qualquer trajetória abaixo
de 6M cai”: órbitas excêntricas podem atravessar `6M` e retornar se `E,L`
admitirem uma barreira.

## 4. Reconstrução de Friedmann pelo tensor de Einstein

Para FLRW plano com poeira mais constante cosmológica,

```text
a(t)=(Ω_m/Ω_Λ)^(1/3) sinh^(2/3)[(3/2)√Ω_Λ H₀t],
H²=H₀²(Ω_m a⁻³+Ω_Λ),
```

o pipeline `g → Γ → Riemann → Ricci → G → T_efetivo` recupera

```text
ε_total = T(û,û) = 3c²H²/(8πG).
```

Esse é um teste end-to-end valioso: a fórmula de Friedmann não está codificada
no módulo de curvatura. Ainda assim, “redescoberta” deve ser usada em sentido
pedagógico, não como derivação independente da cosmologia: a própria função
`a(t)` fornecida é uma solução de Friedmann. Se `Λ` for movido para o lado
geométrico da equação, a matéria ordinária separada é
`ε_m=3c²H₀²Ω_m a⁻³/(8πG)` e a parcela de vácuo é
`ε_Λ=3c²H₀²Ω_Λ/(8πG)`.

O erro `<10⁻³` é compatível com diferenças finitas centrais de segunda ordem
compostas (`∂Γ` e, para plugins sem Γ analítico, derivadas aninhadas). Ele não
é uma garantia uniforme: passos pequenos demais amplificam cancelamento; passos
grandes demais aumentam truncamento, e cartas próximas de degenerescência são
mal condicionadas.

## 5. Diagnósticos ao vivo: o que concluem e o que não concluem

| Diagnóstico | Conclusão válida | Limite explícito |
| --- | --- | --- |
| norma `g(u,u)` | mede consistência local da integração | norma pequena não valida a trajetória inteira |
| deriva de `E` | erro numérico se há Killing temporal | não se aplica a FLRW; ali a variação pode ser física |
| deriva de `L` | erro numérico se há Killing axial | não se aplica sem essa simetria |
| `R` e `K` | escalares locais independentes da carta | um escalar finito não prova regularidade/completude |
| `g^rr=0` | superfície `r=const` nula na carta | só um **horizonte candidato**; horizonte de eventos é global |
| `g_tt=0` | limite estático em carta estacionária adaptada | não é, em geral, o horizonte; em Kerr delimita a ergorregião |
| `g_φφ<0` com `φ` periódico | existe uma CTC axial naquele evento | condição suficiente, não necessária; não vale em carta cartesiana |
| `T(k,k)<0` além da tolerância | direção-testemunha numérica de violação | requer convergência de `T`; ausência em 134 direções não prova NEC para todo `k` |
| crescimento de `K` no scan | indício de divergência na borda | singularidade exige limite e análise de extensão geodésica |
| matriz `g_μν` normalizada ≈ Minkowski longe | compatibilidade local, na carta, em métrica estacionária | planicidade assintótica exige limite completo e falloff |

Em Painlevé–Gullstrand, no horizonte `r=2M`, **`g_TT=0` também**. A
regularidade vem do termo cruzado `g_Tr=1`, do determinante do bloco `T–r`
igual a `−1`, de `g^TT=−1` e da finitude das componentes/curvatura — não de
`g_TT` permanecer diferente de zero.

## 6. Limites atuais e próximos árbitros independentes

- O cross-check independente cobre uma família de órbitas de Schwarzschild;
  ainda faltam bater Kerr, trajetórias nulas, FLRW e invariantes contra outro
  motor.
- O diagnóstico NEC é uma amostragem angular. Para métricas de pesquisa, deve
  ser complementado por autovalores/formas canônicas de `T_ab` ou minimização
  contínua sobre a esfera nula.
- O passaporte é triagem radial equatorial local, não classificador global de
  horizontes, causalidade, singularidades ou assíntotas.
- Um terceiro árbitro natural é o [GYOTO](https://gyoto.obspm.fr/), voltado a
  geodésicas e ray tracing relativístico; comparação simbólica pode ser feita
  com xAct/GRTensor para tensores, sem reutilizar a implementação numérica do
  CosmoLab.

Referências principais: Wald, *General Relativity* (1984); Misner, Thorne &
Wheeler, *Gravitation* (1973); Weinberg, *Gravitation and Cosmology* (1972);
Morris & Thorne, *Am. J. Phys.* **56**, 395 (1988); Martel & Poisson,
*Am. J. Phys.* **69**, 476 (2001); documentação do
[einsteinpy](https://docs.einsteinpy.org/en/stable/api/geodesic/geodesic.html).
