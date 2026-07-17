# Validação externa — roteiro técnico para auditar o CosmoLab

Este documento é um roteiro para submeter as afirmações científicas do
CosmoLab a outra IA, a um pesquisador ou a um docente que não dependa do
código do projeto. Ele foi escrito para evitar três formas comuns de falsa
confirmação:

1. chamar integração numérica das equações completas de “solução exata”;
2. transformar um diagnóstico local e dependente de hipóteses em afirmação
   global sobre horizontes, causalidade ou singularidades;
3. apresentar concordância de um observável como se fosse a precisão de toda
   a trajetória.

As caixas **Critério interno de avaliação** ficam neste documento para quem
coordena a auditoria; não precisam ser copiadas para o auditor. Se quiser uma
revisão realmente cega, copie apenas os blocos `text`.

## Como usar

1. Cole o Bloco 1 uma única vez.
2. Cole um bloco científico por conversa ou por mensagem, para reduzir
   ancoragem entre respostas.
3. Peça contas intermediárias e análise dimensional, não apenas um veredito.
4. Guarde separadamente: `confirmado por derivação`, `plausível`, `depende de
   convenção`, `não verificável sem dados` e `errado`.
5. Para números obtidos por integração, entregue ao auditor os CSVs exportados
   ou peça que ele implemente a integração. Sem isso, ele só pode testar
   plausibilidade/consistência, não confirmar a medição.

---

## Bloco 1 — contrato da auditoria

```text
Você é um físico relativista cético fazendo revisão por pares. Analise cada
afirmação de forma independente. Convenções do laboratório: assinatura
(−,+,+,+), x⁰=c·t em metros, M=GM_físico/c², r_s=2M, λ=c·τ para geodésicas
massivas e g(u,u)=−1 (massivas) ou 0 (nulas).

Para cada item:
(1) rederive a matemática e confira dimensões e sinais;
(2) declare todas as hipóteses: carta, observador, baseline, ordem
    perturbativa, domínio e simetrias;
(3) classifique como CORRETO, CORRETO COM QUALIFICAÇÕES, ERRADO,
    CONVENÇÃO-DEPENDENTE ou NÃO VERIFICÁVEL SEM DADOS;
(4) separe conclusões locais de propriedades globais do espaço-tempo;
(5) diga o que seria necessário para falsificar ou confirmar numericamente;
(6) não trate o “resultado esperado” do autor como evidência.

Use no máximo 25 palavras de citação literal de qualquer fonte e forneça
referências verificáveis. Não seja gentil; seja preciso.
```

---

## Bloco 2 — atraso de Shapiro e baseline

```text
Considere uma geodésica nula equatorial em Schwarzschild, com extremos
assintóticos em lados opostos, distâncias longitudinais x₁,x₂ ≫ b ≫ r_s e
parâmetro de impacto b. O CosmoLab mede o tempo coordenado de Schwarzschild
menos d_corda/c, onde d_corda é a distância euclidiana coordenada entre os
mesmos extremos.

Afirmação limitada à primeira ordem em r_s (1PN) e aos extremos distantes:

  Δt_corda = (r_s/c)[ln(4x₁x₂/b²) − 1]
             + correções de distância finita + O(r_s²).

Se os extremos forem mantidos e a mudança de baseline acrescentar somente
uma constante independente de b, então

  Δt(b₁) − Δt(b₂) = (2r_s/c) ln(b₂/b₁) + O(r_s²).

Perguntas:
(a) derive o termo −1 ao comparar com a corda;
(b) mostre em qual baseline aparece outro termo constante;
(c) a diferença em b é realmente “livre de convenção”, ou apenas robusta
    sob a classe de mudanças aditivas independentes de b?
(d) explique como formular o observável operacional em tempo próprio de
    emissor/receptor, sem depender de uma distância euclidiana coordenada.
```

**Critério interno de avaliação:** o termo `−1` é aceitável na configuração
1PN declarada. A forma diferencial cancela uma constante aditiva independente
de `b`, mas não é universal sob baseline dependente de `b`, mudança de
extremos/coordenadas ou ordens superiores. O teste do CosmoLab exige 1% para a
configuração finita `x₁=x₂=60b`; não se deve anunciar `5×10⁻⁵`.

---

## Bloco 3 — órbita circular e Runge–Kutta

```text
Em Schwarzschild, escreva a geodésica como sistema de primeira ordem para
y=(x^μ,u^μ). Uma órbita circular equatorial tem r=r₀, θ=π/2, u^r=u^θ=0 e
E,L consistentes com a órbita; t e φ continuam avançando.

Afirmação: em aritmética exata, um Runge–Kutta explícito preserva o
subespaço dessa solução relativa: os estágios permanecem com r,θ,u^μ
constantes (salvo t,φ), porque a métrica é independente de t,φ e a aceleração
radial se cancela. Assim o erro radial de truncamento pode ser exatamente
nulo para qualquer passo que mantenha o cálculo no domínio.

Isso NÃO significa que o estado completo seja um ponto fixo e NÃO garante
zero bit a bit em ponto flutuante. Logo, uma órbita circular é um teste ruim
para medir a ordem global do RK4; uma órbita excêntrica permite Richardson.

Perguntas:
(a) confirme a invariância estágio a estágio;
(b) diferencie equilíbrio, equilíbrio relativo e ponto fixo do mapa RK;
(c) enumere as condições que quebram a preservação: arredondamento,
    E/L inconsistentes, Christoffels por diferenças finitas, falta de
    simetria, projeções e controle adaptativo;
(d) o fato geral “equilíbrios de uma ODE são preservados por RK” basta para
    esta órbita, ou é preciso usar também as simetrias cíclicas?
```

**Critério interno de avaliação:** “ponto fixo exato do estado” e “zero em
precisão de máquina” são formulações erradas. A conclusão correta é um
subespaço invariante/solução relativa em aritmética exata. O CosmoLab mede a
ordem com órbita excêntrica e aceita razão de Richardson entre 8 e 32 em
torno do valor assintótico 16.

---

## Bloco 4 — velocidade local, ISCO e perda da barreira

```text
Considere Schwarzschild no equador, c=1, f=1−2M/r. O controle do CosmoLab
não multiplica u^φ diretamente: ele escolhe a velocidade tangencial medida
pela tétrade de um observador estático:

  v/c = u^(φ-hat)/u^(t-hat) = r u^φ/(√f u^t),
  v_circ²/c² = M/(r−2M),
  u^t=γ/√f,  u^φ=γ(v/c)/r.

Com E=f u^t e L=r²u^φ, a equação radial é

  (u^r)² + V_eff²(r;L) = E²,
  V_eff²=(1−2M/r)(1+L²/r²).

Afirmações numéricas:
(1) r₀=8r_s=16M e v=0,85v_circ, lançado em turning point, tem o outro
    turning point em aproximadamente 3,12r_s e permanece ligado;
(2) r₀=3,1r_s=6,2M e v=0,99v_circ produz L²<12M², portanto o potencial não
    possui o par máximo/mínimo e a trajetória mergulha até a borda da carta
    exterior de Schwarzschild;
(3) a ISCO em 6M é a órbita circular estável mais interna, mas não é uma
    parede: órbitas excêntricas podem penetrar abaixo de 6M e retornar.

Calcule E,L e as raízes de E²−V_eff² para os dois casos. Diga se os números
e as três afirmações são corretos. Diferencie “déficit de velocidade local”,
“déficit de L” e “qualquer perturbação abaixo da ISCO”.
```

**Critério interno de avaliação:** o periastro esperado do primeiro caso é
aproximadamente `3,12r_s`, não `3,4r_s` quando “85%” significa velocidade
local. `~3,4r_s` correspondia à implementação antiga que escalava `u^φ`.
No segundo caso a integração deve parar em `r→r_s` por degenerescência da
carta, não alegar evolução física dentro do horizonte em Schwarzschild.

---

## Bloco 5 — Friedmann reconstruída a partir de G_μν

```text
Considere FLRW espacialmente plano,

  ds²=−c²dt²+a(t)²(dx²+dy²+dz²),
  a(t)=(Ω_m/Ω_Λ)^(1/3)
       sinh^(2/3)[(3/2)√Ω_Λ H₀t],
  Ω_m+Ω_Λ=1.

Um pipeline calcula Γ, Riemann, Ricci e Einstein por derivadas numéricas e
define, por convenção,

  T^efetivo_μν=(c⁴/8πG)G_μν.

Afirmação: a densidade de energia local do observador comóvel deve ser

  ε_total=T(û,û)=3c²H(t)²/(8πG),
  H(t)=H₀√(Ω_m a⁻³+Ω_Λ).

Perguntas:
(a) confira fatores de c e unidades; explique por que ε é J/m³ e a densidade
    de massa correspondente é ε/c²;
(b) se a equação for escrita G_μν+Λg_μν=(8πG/c⁴)T^mat_μν, separe ε_m e ε_Λ;
(c) isso é uma descoberta independente de Friedmann ou um teste end-to-end
    que reconstrói a componente 00 a partir de uma a(t) já escolhida como
    solução?
(d) erro relativo <10⁻³ é plausível para diferenças centrais de 2ª ordem,
    inclusive com derivadas aninhadas? Discuta truncamento, cancelamento e
    condicionamento.
```

**Critério interno de avaliação:** a igualdade é correta para a densidade de
energia **total efetiva** na convenção declarada. Se `Λ` fica à esquerda,
`ε_m=3c²H₀²Ω_m a⁻³/(8πG)` e
`ε_Λ=3c²H₀²Ω_Λ/(8πG)`. “Redescobre” só é defensável como linguagem
pedagógica de reconstrução/teste end-to-end.

---

## Bloco 6 — invariantes, cartas e estruturas causais

```text
Verifique separadamente, usando exatamente as convenções abaixo.

(a) Schwarzschild:
    K=R_abcd R^abcd=48M²/r⁶. Em r=2M, K=3/(4M⁴), finito.
    Isso é compatível com horizonte regular; a prova completa usa uma carta
    extensível, não apenas a finitude de um escalar.

(b) Painlevé–Gullstrand ingoing:
    ds²=−(1−2M/r)dT²+2√(2M/r)dTdr+dr²+r²dΩ².
    Em r=2M: g_TT=0, g_Tr=1, det(g|_{T,r})=−1 e g^TT=−1. A carta é regular
    apesar de g_TT zerar, e K continua 3/(4M⁴).

(c) Gödel, nesta normalização específica, com χ=r/(√2a):
    g_tt=−1,
    g_tφ=2a sinh²χ,
    g_φφ=2a² sinh²χ(1−sinh²χ),
    g_rr=g_zz=1 e φ~φ+2π.
    Os círculos de φ são temporais quando
    r>r_CTC=√2a asinh(1). Explique por que outro símbolo/normalização de
    “raio de Gödel” pode mudar o fator numérico sem mudar a geometria.

(d) Morris–Thorne de maré zero em coordenada própria l:
    ds²=−c²dt²+dl²+(b₀²+l²)dΩ².
    A densidade de energia do observador estático é
    ε(l)=−[c⁴/(8πG)] b₀²/(b₀²+l²)².
    Mostre também uma direção nula radial com T(k,k)<0 na garganta.

Para cada item, diga o que o escalar/componente prova e o que não prova.
Corrija explicitamente estas duas frases antigas se forem falsas:
“g_TT não zera no horizonte PG” e “K finito sozinho prova regularidade”.
```

**Critério interno de avaliação:** `(a)` e os valores de `(c,d)` estão
corretos nas convenções dadas. Em `(b)`, `g_TT` **zera** no horizonte; a carta
é regular pelo bloco não degenerado e pela extensão. A NEC do wormhole decorre
das equações de Einstein e da condição de flare-out de Morris–Thorne. Não
atribuir isso a um inexistente “teorema de Topologia de
Morris–Thorne–Yurtsever”; topological censorship é uma família distinta de
resultados, com hipóteses globais próprias.

---

## Bloco 7 — cross-check independente e significado de “2 ppm”

```text
Uma execução versionada compara a mesma órbita de Schwarzschild em G=c=M=1:
r₀=40M no apoastro, L=3,9M, u^r=0. CosmoLab usa RK4 h=0,05M; einsteinpy
0.4.0 usa sua formulação Hamiltoniana independente com delta=0,05.

Resultados registrados:
- forma r(φ): erro relativo máximo 2,3×10⁻⁴ e médio 8,7×10⁻⁵;
- raio do periastro: 5,343933M vs 5,343280M, diferença 1,2×10⁻⁴;
- fase do periastro: diferença ~10⁻⁶ rad;
- precessão: 262,1508° vs 262,1514° por órbita, diferença ~2×10⁻⁶ relativa.

Perguntas:
(a) é legítimo resumir isso como “2 ppm de concordância” sem dizer que se
    refere somente à precessão?
(b) que classes de erro essa comparação torna improváveis e quais ainda
    podem ser compartilhadas pelos dois códigos?
(c) que convergências em h/tolerância e que casos adicionais deveriam ser
    exigidos antes de falar em validação ampla do motor?
(d) como terceiro árbitro, compare GYOTO, xAct/GRTensor e outras opções para
    geodésicas, ray tracing e tensores.
```

**Critério interno de avaliação:** `2 ppm` é forte evidência para o observável
de precessão desta órbita, não “precisão do motor”. A forma ponto a ponto está
em `~10⁻⁴`. O repositório agora contém dumps, versões fixadas e um comparador
de `r(φ)`/periastros em `docs/validation/`.

---

## Bloco 8 — até onde um “passaporte de métricas” pode ir

```text
O CosmoLab faz uma varredura radial equatorial finita e produz achados locais:

1. g^rr=0 → superfície r=const nula, rotulada “horizonte candidato”;
2. g_tt=0 em métrica estacionária → limite estático;
3. g_φφ<0 quando x³=φ periódico → círculo axial temporal fechado;
4. T(k,k)<0 além da tolerância em uma de 134 direções nulas amostradas →
   direção-testemunha numérica de violação NEC, a confirmar por convergência;
5. K crescendo na borda interna → indício de divergência;
6. todas as componentes de g_μν, normalizadas pelas escalas da carta,
   aproximam Minkowski na borda de uma métrica estacionária → compatibilidade
   local com planicidade assintótica.

Perguntas:
(a) quais achados positivos são conclusivos sob as hipóteses declaradas?
(b) por que resultados negativos não provam ausência de horizonte de eventos,
    CTCs, violação NEC, singularidade ou falta de planicidade assintótica?
(c) por que horizonte de eventos e completude geodésica são propriedades
    globais?
(d) que algoritmos adicionais seriam necessários para promover cada
    heurística a um classificador científico mais forte?
```

**Critério interno de avaliação:** `g_φφ<0` com periodicidade é um certificado
positivo local; `T(k,k)<0` além da tolerância é uma direção-testemunha, desde
que o tensor numérico tenha convergido. Os demais são
candidatos/indícios. `g^rr=0` não identifica sozinho um horizonte de eventos;
134 amostras sem violação não provam a NEC no contínuo; `K` finito ou crescente
num intervalo não decide extensão/completude; planicidade assintótica requer
falloff de todas as componentes/derivadas na estrutura assintótica adequada.

---

## Bloco 9 — tese do produto e publicabilidade

```text
Contexto: o CosmoLab é um laboratório de relatividade geral no navegador.
Trajetórias vêm da métrica; há métricas plugáveis/editáveis, proveniência
numérico/analítico/campo-fraco, status epistemológico, monitores de erro,
Atlas de Coordenadas, triagem local de estruturas, URLs reproduzíveis e
relatórios de laboratório.

Faça pesquisa atual, com data e links, e responda:
(1) existe ferramenta pública equivalente no conjunto completo? Compare por
    uma matriz de recursos, não por impressão, incluindo EinsteinPy,
    GYOTO, GRTensor/xAct, Black Hole Vision, General Relativity Explorer,
    ScienceClic e Universe Sandbox;
(2) “epistemologia como interface” — proveniência, hipóteses e validação
    contínua visíveis — é uma contribuição defensável para ensino de física?
(3) quais evidências de aprendizagem, acessibilidade, reprodutibilidade e
    avaliação por especialistas seriam exigidas por AJP ou RBEF?
(4) quais frases de novidade devem ser evitadas até concluir uma busca
    sistemática de anterioridade?
(5) proponha o menor estudo publicável: pergunta de pesquisa, participantes,
    pré/pós-teste, grupo de comparação, métricas, análise e pacote aberto.
```

**Critério interno de avaliação:** não existe gabarito de novidade. Em julho
de 2026, já devem ser tratados como vizinhos relevantes o
[General Relativity Explorer](https://generalrelativityexplorer.com/), o
[Black Hole Vision e seu laboratório quantitativo](https://arxiv.org/abs/2605.21887), o
[EinsteinPy](https://docs.einsteinpy.org/), o
[GYOTO](https://gyoto.obspm.fr/) e ferramentas simbólicas. A formulação segura
é “não encontramos ainda equivalente com esta combinação de recursos”, não
“não existe equivalente”. A política da
[AJP](https://www.aapt.org/Publications/AJP/About/editorial_policy.cfm) inclui
simulações e exercícios computacionais: um artigo técnico-pedagógico pode ser
publicável sem ensaio controlado se for correto, novo, claro, acessível e
diretamente útil em sala, de preferência com problemas/projetos. Já uma
afirmação de **ganho de aprendizagem** exige estudo educacional e análise
compatíveis. A [RBEF](https://www.sbfisica.org.br/rbef/) tem escopo amplo de
melhoria do ensino de Física; em ambos os casos, materiais replicáveis e
avaliação por especialistas fortalecem substancialmente a submissão.

---

## Matriz de interpretação

| Resposta do auditor | Ação no projeto |
| --- | --- |
| Derivação confirma fórmula e hipóteses | manter teste e citar as hipóteses junto ao valor |
| Resultado é correto só em 1PN/carta/observador específico | preservar, mas tornar a qualificação visível na UI e no relatório |
| Número é plausível, porém sem dados | não marcar “validado externamente”; fornecer CSV/script |
| Diagnóstico local foi usado como conclusão global | rebaixar para candidato/indício e adicionar teste de aplicabilidade |
| Conta mostra sinal, fator de `c`, unidade ou normalização errados | abrir issue com caso mínimo e teste falhando antes da correção |
| Duas implementações concordam só em um observável | declarar exatamente esse observável e mostrar os demais erros |
| Produto vizinho cobre parte dos recursos | atualizar matriz competitiva; não apagar a diferenciação restante |
| Produto equivalente cobre a combinação completa | revisar a alegação de novidade e focar contribuição pedagógica medida |

## Cobertura local correspondente

Execute:

```bash
npm test
npm run lint
npm run build
```

A suíte atual tem **75 testes**. Os principais arquivos são:

- `src/simulation/scientificValidation.test.ts`: deflexão, velocidade local,
  órbitas, Richardson, queda radial e Shapiro;
- `src/physics/relativity/metrics/flrw.test.ts`: Friedmann, Christoffels,
  redshift e momento comóvel;
- `src/physics/relativity/metrics/painleveGullstrand.test.ts`: bloco regular,
  cruzamento do horizonte, `u^r=−E` e invariantes;
- `src/physics/relativity/stressEnergy.test.ts`: vácuo, tétrade/observador,
  amostragem NEC e Morris–Thorne;
- `src/physics/relativity/metrics/godel.test.ts`: fronteira axial de CTCs e
  teste de aplicabilidade da periodicidade;
- `src/simulation/metricPassport.test.ts`: achados locais em Schwarzschild,
  Kerr, Gödel, FLRW e wormhole;
- `src/simulation/coordinateAtlas.test.ts`: concordância entre cartas;
- `docs/validation/`: dumps independentes e comparador CosmoLab × einsteinpy.

O documento técnico que registra tolerâncias e limites é
`docs/VALIDATION.md`.
