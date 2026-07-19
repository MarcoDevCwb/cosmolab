# As descobertas do CosmoLab, explicadas para estudo profundo

Este documento explica CADA achado com potencial de artigo: o contexto
físico (o que é), o que fizemos, o que exatamente encontramos, onde está
no código, e o que estudar para dominar o assunto. A ordem segue a
hierarquia de publicação. Companheiros: docs/ARTIGO.md (estratégia),
docs/RELATORIO_ESTADO.md (números), docs/VALIDACAO_EXTERNA.md (auditoria).

---

## Parte 0 — Os quatro alvos de publicação, o que cada um é

**JOSS (Journal of Open Source Software)** — revista que faz revisão por
pares do SOFTWARE: revisores instalam, rodam os testes, avaliam
documentação e arquitetura. O "paper" é curto (~1 página); o objeto
revisado é o repositório. Dá DOI citável. É a porta de entrada porque não
exige estudo com humanos. Único bloqueio: escolher a licença (MIT, GPL,
Apache — decisão sua; MIT maximiza adoção, GPL protege contra
fechamento).

**AJP (American Journal of Physics) / RBEF (Revista Brasileira de Ensino
de Física) / EJP (European Journal of Physics)** — revistas de ENSINO e
instrumentação didática de física. Não publicam física nova; publicam
formas novas de ensinar, medir e demonstrar física conhecida — exatamente
o que temos. Exigem: contribuição pedagógica clara, honestidade sobre
anterioridade, e (idealmente) evidência de uso em sala.

**Notas técnicas (CQG — Classical and Quantum Gravity; CPC — Computer
Physics Communications)** — para os achados de MÉTODOS numéricos (a
armadilha VSI, o motor-árbitro), que interessam a quem escreve código de
relatividade, não a quem ensina.

A frase que organiza tudo: **não descobrimos física nova; descobrimos
instrumento, método e desenho de medição.** Einstein, Khan, Penrose,
Alcubierre e Zel'dovich descobriram a física. Nós descobrimos (a) como
transformá-la em números medidos ao vivo num navegador com precisão
rastreável, e (b) várias armadilhas reais no caminho — e armadilha real
documentada é contribuição real.

---

## Parte 1 — As duas contribuições técnicas mais fortes

### 1.1 O colapso de tolerâncias em espaços VSI (a "armadilha do vácuo")

**Contexto físico.** Da curvatura (tensor de Riemann, ~20 componentes
independentes) extraem-se INVARIANTES escalares — números iguais em
qualquer sistema de coordenadas. Os dois mais famosos: o escalar de Ricci
R e o de Kretschmann K = R_αβγδR^αβγδ. São os "detectores de
singularidade": em Schwarzschild, K = 48M²/r⁶ é finito no horizonte
(logo o horizonte não é singularidade física) e diverge em r = 0 (essa é
real).

Existe porém uma classe de espaços-tempos chamada **VSI (Vanishing
Scalar Invariants)**: TODOS os invariantes escalares polinomiais da
curvatura se anulam identicamente, embora a curvatura NÃO seja zero. As
ondas gravitacionais planas (pp-waves) são o exemplo canônico. O motivo
profundo: a curvatura de uma onda é "tipo nulo" (alinhada com a direção
de propagação da luz), e contrações de objetos nulos consigo mesmos se
cancelam — como um vetor nulo tem norma zero sem ser o vetor zero.
Consequência física linda: **nenhum instrumento que meça invariantes
escalares detecta uma onda gravitacional**. Só o desvio geodésico (duas
massas de teste comparadas) a sente — e é por isso que o LIGO é um
interferômetro de distâncias, não um "curvaturômetro".

**O que fizemos e o que quebrou.** Nosso diagnóstico de matéria calcula
T_μν = (c⁴/8πG)·G_μν numericamente e pergunta "isto é vácuo?"
comparando as componentes de T com uma TOLERÂNCIA. Tolerância precisa de
escala: usávamos √K (a escala de curvatura local). Na pp-wave, K = 0
exatamente → tolerância zero → qualquer ruído numérico de 10⁻¹⁶ era
maior que a tolerância → o motor rotulava a onda (vácuo exato!) como
"matéria". Falha silenciosa: nenhum erro, só uma resposta errada.

**O conserto (nossa contribuição).** A escala certa é a MARÉ física: o
máximo do Riemann projetado numa tétrade ortonormal local (a base de um
observador de verdade, com réguas e relógios). A projeção na tétrade não
se cancela — mede o que um corpo extenso sente. Em Schwarzschild ela
coincide com √K (nada muda); em VSI ela é finita e o selo de vácuo volta
a funcionar. Qualquer código de RG que use tolerâncias por invariantes
tem esse bug latente.

**Onde está**: `curvature.ts` (busca "escala de maré");
`ppWave.test.ts` ("VSI"). **Estudar**: Pravda, Pravdová, Coley & Milson,
"All spacetimes with vanishing curvature invariants", CQG 19, 6213
(2002); MTW cap. 1 (maré) e cap. 35 (ondas); o conceito de tétrade em
Wald §3.

### 1.2 O motor como árbitro (a rodada Khan–Penrose)

**Contexto.** Para implementar uma solução exata publicada em 1971,
normalmente copia-se a fórmula do artigo. Não tínhamos o artigo à mão.
Reconstruímos por primeiros princípios: para colisões colineares de ondas
planas, as equações de campo têm estrutura conhecida (e^{−U} = f(u)+g(v);
o limite de onda única fixa os fatores transversais). Sobrou UMA
ambiguidade que a álgebra de limites não decide: o fator conforme F
podia conter (pq+uv)² ou (pq−uv)² — ambos com o limite correto em todas
as regiões de onda única.

**A sacada.** Em vez de adivinhar, deixamos o TENSOR DE EINSTEIN NUMÉRICO
decidir: a solução de Khan–Penrose é vácuo; então implementamos os dois
candidatos e medimos G_μν na região de interação. Resultado: (pq+uv)² dá
ρ no nível do ruído de diferenças finitas (~10¹⁶ J/m³, com Christoffels
analíticos) — vácuo certificado; (pq−uv)² exige matéria ~10²⁵–10²⁶ J/m³,
sete a nove ordens de grandeza acima (razão medida 10⁷–10⁹ nos três
pontos da sonda; o teste de regressão aceita ≥100×) — rejeitado. O teste de regressão
(`khanPenrose.test.ts`, "ARBITRAGEM PELO MOTOR") mantém os DOIS
candidatos no código para documentar o método.

**Por que é artigo.** É um protocolo replicável: *como implementar
soluções exatas sem acesso (ou sem confiança) na fonte, usando o próprio
validador numérico como revisor*. Fecha o círculo da tese do produto: o
laboratório valida até a memória de quem o programa. **Estudar**: Khan &
Penrose, Nature 229, 185 (1971); Griffiths, "Colliding Plane Waves in
General Relativity" (1991), cap. 3 — o livro todo está publicamente
disponível pelo autor.

---

## Parte 2 — O arco das ondas (o material da "nota quente")

### 2.1 A onda exata de Brinkmann (por que não usamos a linearizada)

Todo site de divulgação mostra o anel oscilando +/× via teoria
LINEARIZADA: escreve-se g = η + h, |h| ≪ 1, e anima-se h. Nós usamos a
onda plana EXATA (Brinkmann 1925): ds² = −(dx⁰)² + dx²+dy²+dz² + H du²,
com u = (x⁰−z)/√2 e H = A₊(u)(x²−y²) + 2A×(u)xy. Fato notável: essa
métrica é solução EXATA de vácuo para QUALQUER perfil A(u), porque
x²−y² e xy são funções harmônicas (∇²H = 0 ⟹ R_μν = 0). Não há
aproximação em h — o motor confere G_μν ≈ 0 dentro da onda, ao vivo.
A ligação com o h do LIGO é o dicionário A ≈ −½·d²h/du² (esse sim,
aproximado, e rotulado).

**A redescoberta nº 3**: soltamos 16 geodésicas em anel e MEDIMOS que
cada braço oscila com amplitude (h/2)·L em antifase — exatamente o que a
teoria linearizada prevê — partindo da geometria exata, com 3% de
precisão. A teoria linearizada emergiu; não foi programada.

### 2.2 Focalização ponderomotriz (o "erro" que virou física)

**Como apareceu.** O teste do anel dava amplitude 11% MAIOR que a teoria
linear — e o excesso não diminuía com o refinamento do passo. Sondamos:
o excesso escala com h (não h²... na amplitude), é INDEPENDENTE do raio
do anel, e cresce com o tempo. Não era bug: era física de segunda ordem.

**O mecanismo (derivado).** A partícula do braço oscila como
x = L[1 + ε(1−cos Ωt)], ε = h/2. A força da onda é ∝ A(u)·x; na média
sobre um ciclo, ⟨A·x⟩ ≠ 0 porque a oscilação de x está correlacionada
com A — sobra uma força média ATRATIVA: ⟨ẍ⟩ = −¼A₀εL, ou seja, deriva
⟨Δx̄⟩ ≈ −K²h²L·t²/32. É o mesmo mecanismo da força ponderomotriz de
plasmas (partícula carregada em campo oscilante), transplantado para
gravitação: **a onda gravitacional atrai as massas que atravessa**,
porque transporta energia (o argumento da "conta pegajosa" de
Bondi/Feynman, agora com número). Conferimos: sinal certo, escala h²
certa (4× ao dobrar h), magnitude certa a 10–20% nos ciclos tardios — e
identificamos o resíduo: os braços x e y derivam ao longo da propagação
(z) com SINAIS OPOSTOS, dessincronizando as fases locais na mesma ordem.

**A conexão profunda.** Isso é a versão em geodésicas da FOCALIZAÇÃO de
Penrose (1965): ondas exatas focam geodésicas. E a formulação exata que
identificamos para o artigo: como p_v é conservado, o movimento
transverso obedece exatamente a **equação de Mathieu com a = 0** — a
análise de Floquet dá o resultado exato (o "foco" periódico é o modo
lento ponderomotriz; para pulsos recupera-se Penrose clássico). Fechar
essa conta a 1% é o passo que falta para a nota.

**Estudar**: força ponderomotriz (qualquer livro de física de plasmas,
ex. Chen cap. 8); equação de Mathieu/teoria de Floquet (Bender &
Orszag §11, ou Landau–Lifshitz Mecânica §27 — oscilações paramétricas);
Penrose, "A remarkable property of plane waves", Rev. Mod. Phys. 37, 215
(1965); Bondi & McCrea sobre a conta pegajosa.

### 2.3 Memória de velocidade (o tema quente)

**Contexto.** Depois que uma onda gravitacional passa, o espaço-tempo
NÃO volta exatamente ao que era: detectores livres ficam com deslocamento
permanente (memória de deslocamento) e, em ondas exatas, com VELOCIDADE
residual (memória de velocidade). Previsto por Zel'dovich & Polnarev em
1974, redescoberto nos anos 2010 pela conexão com simetrias BMS e "soft
theorems" (Strominger), é hoje alvo observacional do LISA e de pulsar
timing arrays. Área ativíssima, ZERO ferramentas interativas.

**O que temos.** No cenário gw-ring, após o merger o anel não volta ao
círculo — e isso é um OBSERVÁVEL do produto ("desvio RMS do anel"), não
uma narrativa. O teste verifica que o resíduo pós-onda excede o limiar. E
o nosso protocolo de análise é o mesmo do LIGO: remover a tendência
secular (detrend/high-pass) antes de correlacionar o strain medido com o
template.

**Estudar**: Zel'dovich & Polnarev, Sov. Astron. 18, 17 (1974);
Zhang, Duval, Gibbons & Horváthy, "The memory effect for plane
gravitational waves" (2017, arXiv:1704.05997) — é o paper mais próximo do
que fazemos (geodésicas em ondas exatas!); Strominger, "Lectures on the
Infrared Structure of Gravity" (2017) para a visão moderna.

### 2.4 Khan–Penrose: a singularidade de gravidade pura

**Contexto.** A relatividade é NÃO-linear: onda gravitacional gravita.
Uma onda plana sozinha é inofensiva (as regiões que ela atravessa são
planas — só o impulso carrega curvatura). Khan & Penrose (1971) mostraram
o que acontece quando DUAS colidem: a região de interação colapsa numa
singularidade de curvatura REAL em tempo próprio finito, sem massa
nenhuma envolvida. Gravidade criando singularidade a partir de pura
gravidade. Bônus surreal: a região de interação é localmente isométrica
ao INTERIOR de um buraco negro de Schwarzschild (Ferrari & Ibañez 1987) —
colidir ondas "fabrica" geometricamente o interior de um buraco negro.

**O que o cenário mede**: o fator de área W = 1−u²−v² caindo de 1 a 0
(contagem regressiva); o tempo próprio restante até a singularidade
(integrado da métrica); o aperto ANISOTRÓPICO tipo Kasner — compressão em
x (√g_xx → 0) com estiramento em y (√g_yy → ∞), produto exatamente W
(testado a 10⁻¹⁰) — espaguetificação por pura gravidade; e K divergindo
de verdade (contraste pedagógico com o horizonte, onde K fica finito).

**Sutileza técnica que virou lição**: as frentes impulsivas têm métrica
contínua mas não-diferenciável (curvatura tipo delta de Dirac). O RK4
perde ordem localmente ao cruzá-las (~10⁻⁵ por cruzamento) — isso é
CUSTO FÍSICO do impulso, não defeito do integrador; o teste separa a
conservação limpa no interior (10⁻⁸) do custo do impulso.

**Estudar**: Griffiths (1991) caps. 3–4; sobre Kasner: MTW §30 (o
universo anisotrópico de Kasner é o protótipo do comportamento perto de
singularidades — conjectura BKL).

---

## Parte 3 — As redescobertas (o argumento de credibilidade)

O pipeline Christoffel → Riemann → Ricci → Einstein → T_μν é UM código
genérico, sem nenhuma fórmula específica de cenário. Três vezes, demos a
ele uma métrica e ele devolveu uma lei física que NÃO estava programada:

1. **Friedmann (cosmologia)**: dada a métrica FLRW, o T_μν medido dá
   ρ = 3c²H²/8πG a <0,1% — a equação de Friedmann, redescoberta.
2. **Eq. 19 de Alcubierre**: dada a métrica warp, a densidade euleriana
   medida bate com a fórmula do artigo de 1994 a 6 dígitos — incluindo o
   sinal NEGATIVO (a violação da condição nula de energia).
3. **Teoria linearizada de GW**: dado o anel na onda exata, a resposta
   h/2 por braço emerge a 3%.

Por que isso importa para o artigo: é a demonstração operacional de que o
motor CALCULA física em vez de EXIBIR física. Um applet comum desenha a
resposta certa porque a resposta foi desenhada; o CosmoLab chega nela
porque as equações de Einstein chegam. **Estudar**: a derivação da
Friedmann a partir de G_00 (Weinberg, Cosmology §1.5); Alcubierre, CQG
11, L73 (1994) — são 4 páginas.

---

## Parte 4 — O acervo de armadilhas (o capítulo de metodologia)

Cada uma destas custou horas e redesenhou um teste; juntas formam o
capítulo "como validar um laboratório de RG" que não existe na literatura:

**4.1 Órbitas circulares são inúteis para medir convergência de RK.**
Uma órbita circular exata é subespaço invariante de qualquer Runge–Kutta
explícito (em aritmética exata, r nunca muda: todas as derivadas radiais
se anulam por simetria). O erro é 0/0 e a "ordem de convergência" medida
é lixo. Solução: órbita excêntrica + extrapolação de Richardson (razão
~16 para RK4 ✓). *Estudar: Hairer–Lubich–Wanner, "Geometric Numerical
Integration", cap. IV (integradores e invariantes).*

**4.2 O coeficiente do atraso de Shapiro depende da baseline.** O atraso
"da luz que tangencia o Sol" só é definido contra uma referência do que
seria a viagem "sem Sol" — e a constante da fórmula muda com a escolha
(corda euclidiana ⟹ ln(4x₁x₂/b²) − 1; outras baselines ⟹ outras
constantes). Só a DIFERENÇA entre dois parâmetros de impacto,
Δt = (2r_s/c)ln(b₂/b₁), cancela a convenção (contra mudanças aditivas
independentes de b). Nosso teste usa a forma diferencial. *Estudar:
Shapiro, PRL 13, 789 (1964); MTW §40.4; e o Bloco 2 do protocolo.*

**4.3 O poço-navalha da ISCO.** Em Schwarzschild, órbitas circulares
estáveis existem só até r = 6M (ISCO). Logo acima dela, o poço de
potencial efetivo que separa "órbita ligada" de "mergulho" é raso como
navalha: 99% da velocidade circular local em r = 3,1r_s já mergulha
(L² < 12M² ⟹ a barreira centrífuga desaparece). E a ISCO NÃO é uma
parede: órbitas excêntricas entram abaixo de 6M e voltam. A missão
pedagógica foi redesenhada em cima da medição real. *Estudar: potencial
efetivo V²_eff = (1−2M/r)(1+L²/r²) — MTW §25 ou Hartle cap. 9.*

**4.4 Diagnósticos precisam de ÉPOCA em métricas não-estacionárias.**
Nosso passaporte de métricas escaneava tudo em t = 0. Para FLRW, t = 0 é
o BIG BANG (a = 0, métrica degenerada): o scan devolvia vazio
silenciosamente. Regra: todo diagnóstico recebe a época do cenário.

**4.5 O ν contraído dos Christoffels.** Em Γ^μ_αβ = ½g^μν(∂g+∂g−∂g), o
índice somado ν varre TODAS as direções — restringi-lo às direções em
que g varia zera componentes transversais. O sutil: a geodésica do
cenário ficava CERTA (os termos zerados não a afetavam no centro) e só o
tensor de Einstein saía errado, com o sinal da densidade trocado. Pegamos
porque o teste de redescoberta exigia o valor exato. Moral: teste a
derivada mais alta que você usa, não a mais baixa.

**4.6 Frentes impulsivas custam ~10⁻⁴–10⁻⁵ por cruzamento** (item 2.4) —
separar no teste o custo do impulso da conservação no interior.

---

## Parte 5 — "Epistemologia como interface" (a tese que amarra tudo)

O nome que demos à ideia central do produto: **o estado epistemológico de
cada número é parte da interface**. Concretamente:

- todo observável carrega proveniência: NUMÉRICO (integrado das equações
  completas), ANALÍTICO (fórmula exata) ou CAMPO FRACO (aproximação — e o
  regime em que ela falha dispara aviso);
- todo cenário carrega status: validado / modelo aceito / teórico /
  especulativo / didático;
- a validação roda À VISTA: norma g(u,u), derivas de E e L (apenas quando
  os Killing existem), invariantes, matéria;
- todo exagero visual é rotulado com o fator (h ×10¹⁹, tempo ×75...);
- todo experimento é reproduzível por URL e exportável em relatório.

O contraste que o artigo desenha: applets tradicionais mostram a resposta
certa porque ela foi desenhada à mão; aqui o usuário pode AUDITAR o
caminho até cada número — e o Bloco 9 do protocolo desenha o menor estudo
publicável para testar se isso melhora aprendizagem de verdade.

---

## Parte 6 — Mapa de estudo sugerido (ordem)

1. Hartle, "Gravity" (o mais acessível) — caps. 5–9 (geodésicas,
   Schwarzschild) e 16 (ondas); depois MTW ou Wald nos tópicos.
2. Alcubierre 1994 (4 páginas) + Morris & Thorne AJP 1988 (wormholes,
   pedagógico) — condições de energia na prática.
3. Zhang–Duval–Gibbons–Horváthy 2017 (memória em ondas exatas) — é quase
   um roteiro do nosso cenário gw-ring.
4. Griffiths 1991 caps. 1–4 (colisões de ondas).
5. Pravda et al. 2002 (VSI) — só a introdução já basta para a nota.
6. Hairer–Lubich–Wanner cap. IV — para defender a parte numérica.
7. Os nossos testes, nesta ordem: `scientificValidation.test.ts` →
   `flrw.test.ts` → `alcubierre.test.ts` → `ppWave.test.ts` →
   `khanPenrose.test.ts`. Cada `it(...)` é uma afirmação falsificável
   com o número da tolerância — o esqueleto dos artigos já está neles.
