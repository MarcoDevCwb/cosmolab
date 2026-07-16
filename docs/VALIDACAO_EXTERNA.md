# Validação externa — roteiro para auditar o CosmoLab com outra IA

Este documento é um **script pronto para copiar e colar** em outra IA (GPT, Gemini,
outra instância do Claude, ou um físico humano). O objetivo é submeter as
afirmações centrais do CosmoLab a um auditor que **não tem acesso ao código**
e **não tem incentivo para concordar**. Toda afirmação abaixo é falsificável:
tem um número, uma fórmula ou um experimento que pode ser refeito de forma
independente.

Como usar: cole o Bloco 1 (contexto) e depois um bloco de cada vez. Compare a
resposta da IA com a coluna "resultado esperado". Se a IA discordar com
argumento matemático, **isso é informação valiosa** — traga de volta ao
desenvolvimento.

---

## Bloco 1 — contexto (cole primeiro)

```text
Você é um físico relativista cético fazendo revisão por pares. Vou apresentar
afirmações de um laboratório numérico de relatividade geral (integração de
geodésicas por RK4/DP5(4), curvatura por diferenças finitas dos Christoffels,
assinatura (−,+,+,+), x⁰ = c·t em metros). Para cada afirmação: (1) verifique
a matemática de forma independente, (2) diga se está CORRETA, ERRADA ou
CONVENÇÃO-DEPENDENTE, (3) aponte qualquer sutileza que o autor pareça não ter
percebido. Não seja gentil; seja exato.
```

## Bloco 2 — o coeficiente do atraso de Shapiro depende da linha de base

```text
Afirmação: para um fóton em Schwarzschild indo de x₁ a x₂ (ambos ≫ r_s) com
parâmetro de impacto b, o atraso medido contra a linha de base da CORDA
(distância geométrica reta entre os pontos) é
  Δt = (r_s/c)·[ln(4·x₁·x₂/b²) − 1]
enquanto o valor clássico citado nos livros, +1 em vez de −1, corresponde a
outra convenção de linha de base. A diferença entre os dois nunca é medida em
experimentos reais porque só variações do atraso são observáveis; a forma
independente de convenção é
  Δt(b₁) − Δt(b₂) = (2·r_s/c)·ln(b₂/b₁).
Pergunta: a fórmula com −1 para a linha de base da corda está correta? A
forma diferencial é de fato livre de convenção?
```

**Resultado esperado:** CORRETA (a distinção corda vs. soma de distâncias
radiais muda o termo constante; o termo diferencial 2·ln(b₂/b₁) é robusto).
Verificado numericamente no CosmoLab com concordância de 5×10⁻⁵.

## Bloco 3 — órbitas circulares são pontos fixos EXATOS do RK4

```text
Afirmação: ao integrar a equação da geodésica em Schwarzschild com RK4 de
passo fixo, uma órbita circular exata (r, u^r = 0, com E e L exatos da
circular) é um ponto fixo EXATO do integrador em raio — o erro radial é zero
em precisão de máquina para qualquer passo, porque todas as derivadas de r ao
longo dos estágios do RK4 se anulam por simetria. Consequência prática: não
se pode medir a ordem de convergência do integrador usando órbitas
circulares (o erro é 0/0); é preciso usar órbitas excêntricas.
Pergunta: isso está correto? É um fato conhecido da literatura de
integradores geométricos?
```

**Resultado esperado:** CORRETA (equilíbrios do fluxo são pontos fixos de
qualquer método de Runge–Kutta). É conhecido em termos gerais na literatura
de integradores, mas raramente enunciado no contexto de testes de
convergência de geodésicas — no CosmoLab isso redesenhou o teste de
convergência (Richardson com órbita excêntrica).

## Bloco 4 — o "poço navalha" perto da ISCO

```text
Afirmação: em Schwarzschild, para r ligeiramente acima da ISCO (r = 6M), o
poço efetivo em (E, L) que separa órbita ligada de mergulho é tão raso que
lançar uma partícula em r = 3,1·r_s com 99% da velocidade orbital circular
local resulta em mergulho até ~1,1·r_s. Em contraste, a r = 8·r_s com 85% da
velocidade circular, a partícula sobrevive com periastro ~3,4·r_s.
Pergunta: esses números são plausíveis dado o potencial efetivo
V_eff²(r) = (1 − r_s/r)·(1 + L²/(c²r²))? A sensibilidade extrema perto da
ISCO é real?
```

**Resultado esperado:** PLAUSÍVEL/CORRETA (na ISCO o máximo e o mínimo de
V_eff coalescem — poço de profundidade zero; qualquer déficit de L derruba a
barreira). Os números específicos foram medidos empiricamente no motor do
CosmoLab e usados para desenhar a missão pedagógica "sobreviva à ISCO".

## Bloco 5 — redescobrir Friedmann a partir de G_μν numérico

```text
Afirmação: dado APENAS o tensor métrico FLRW plano
  ds² = −c²dt² + a(t)²(dx²+dy²+dz²),
com a(t) = (Ω_m/Ω_Λ)^{1/3}·sinh^{2/3}((3/2)√Ω_Λ·H₀·t) (solução exata
matéria+Λ), calcular G_μν por diferenças finitas (Christoffel → Riemann →
Ricci → Einstein) e ler T_μν = (c⁴/8πG)·G_μν deve devolver
  ρ(t) = 3c²·H(t)²/(8πG)
com H(t) = H₀·√(Ω_m·a⁻³ + Ω_Λ) — ou seja, o pipeline numérico REDESCOBRE a
equação de Friedmann sem que ela tenha sido programada.
Pergunta: a equivalência é exata? Que precisão relativa é razoável esperar
de diferenças finitas de 2ª ordem aqui (o CosmoLab mede < 10⁻³)?
```

**Resultado esperado:** CORRETA (é a componente 00 da equação de Einstein);
< 10⁻³ é razoável para FD de 2ª ordem com passos bem escolhidos. No app isso
é um teste automatizado e o centro do painel "matéria" do cenário FLRW.

## Bloco 6 — invariantes que separam física de artefato de coordenadas

```text
Afirmações independentes, todas verificáveis com álgebra tensorial:
(a) Kretschmann de Schwarzschild: K = 48·M²/r⁶ (geometrizado); no horizonte
    r = 2M isso dá K = 0,75/M⁴ — FINITO (horizonte não é singularidade).
(b) Na carta de Painlevé–Gullstrand da MESMA geometria, g_tt não se anula no
    horizonte (a carta é regular ali), mas K continua 0,75/M⁴ — mesmo número,
    pois K é invariante.
(c) Gödel: círculos de φ tornam-se curvas temporais fechadas onde g_φφ < 0,
    o que ocorre para r > r_CTC = √2·a·arcsinh(1), com a o raio de Gödel.
(d) Wormhole de Morris–Thorne com b(r) = b₀²/r (forma mais simples):
    a densidade de energia vista por observador estático é
    ρ = −c⁴·b₀²/(8πG·(b₀²+l²)²) < 0 — viola a condição nula de energia (NEC)
    na garganta, como exige o teorema de Topologia de Morris–Thorne–Yurtsever.
Pergunta: confirme cada valor.
```

**Resultado esperado:** todas CORRETAS. No app: (a,b) painel de invariantes +
comparação Schwarzschild/PG no Atlas de Coordenadas; (c) marcador 3D da
região de CTCs no cenário Gödel; (d) o "passaporte de métricas" acusa
matéria exótica automaticamente para qualquer métrica digitada no editor.

## Bloco 7 — cross-check com biblioteca independente

```text
Afirmação: a precessão do periastro de uma órbita excêntrica em Schwarzschild
integrada pelo motor do CosmoLab coincide com a integrada pela biblioteca
einsteinpy (SymPy/Python, implementação independente) com diferença relativa
de ~2×10⁻⁶ (2 ppm), e ambas convergem para 6πGM/(c²·a·(1−e²)) por volta
completa no regime fraco.
Pergunta: 2 ppm entre dois integradores independentes com tolerâncias
distintas é evidência forte de correção mútua? Que outra biblioteca você
recomendaria como terceiro árbitro (ex.: GYOTO, Gravity Toolkit)?
```

**Resultado esperado:** SIM (implementações independentes concordando além
das respectivas tolerâncias é o padrão-ouro prático). Detalhes em
`docs/VALIDATION.md`.

## Bloco 8 — a tese do produto (opinião, não matemática)

```text
Contexto: o CosmoLab é um laboratório de RG no navegador onde TODA
visualização deriva da métrica (nenhuma equação na camada de UI), qualquer
métrica entra como plugin (inclusive digitada pelo usuário, com horizontes /
CTCs / matéria exótica / singularidades detectados automaticamente), cada
número exibido carrega proveniência (numérico / analítico / campo-fraco) e
todo experimento exporta URL reprodutível + relatório.
Perguntas: (1) existe ferramenta pública equivalente (compare com
einsteinpy, GRTensor, Black Hole Vision, ScienceClic interativo, Universe
Sandbox)? (2) o que descrevo como "epistemologia como interface" —
proveniência e validação contínua g_μν·u^μ·u^ν visíveis na tela — é
contribuição digna de artigo em revista de ensino de física (AJP, RBEF)?
(3) quais lacunas tornariam isso publicável mais rápido?
```

**Resultado esperado:** não há gabarito — é a pergunta aberta. Respostas
úteis aqui alimentam o roadmap.

---

## Interpretação

| Se a IA disser… | Então… |
| --- | --- |
| Blocos 2–7 corretos | O núcleo matemático do CosmoLab está são; as 4 descobertas de processo (Shapiro-convenção, ponto fixo RK4, poço-navalha ISCO, Friedmann redescoberta) se sustentam. |
| Algum bloco ERRADO com contas | Abra issue imediatamente; o motor tem teste automatizado cobrindo cada bloco — rode `npx vitest run` e compare. |
| Bloco 8 aponta equivalente exato | Estude-o; a diferenciação declarada (proveniência + passaporte + atlas) precisa ser reavaliada. |

Suíte local que cobre estes blocos: `npx vitest run` (70+ testes) — em
particular `scientificValidation.test.ts` (Shapiro, convergência),
`flrw.test.ts` (Friedmann), `metricPassport.test.ts` (estruturas), e
`docs/VALIDATION.md` (einsteinpy).
