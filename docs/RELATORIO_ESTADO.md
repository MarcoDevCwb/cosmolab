# CosmoLab — relatório de estado completo (jul/2026)

Fotografia honesta de tudo: o que existe, com que precisão, quais são as
sacadas próprias, e o que disso sustenta artigo. Números medidos pela
suíte (95 testes) e pelas sondas registradas nos commits.

## 1. O que existe (inventário)

| Dimensão | Estado |
| --- | --- |
| Métricas como plugins | **10**: Minkowski, Schwarzschild, Painlevé–Gullstrand, Kerr, Gödel, FLRW, editor do usuário, Alcubierre, pp-wave (Brinkmann), Khan–Penrose |
| Cenários | **13**, do fóton em espaço plano à colisão de ondas com singularidade |
| Integradores | RK4 fixo + Dormand–Prince 5(4) adaptativo com telemetria |
| Diagnósticos | invariantes (R, K), matéria/NEC (134 direções), causalidade, passaporte de métricas (triagem local), ensembles de geodésicas |
| Produto | Atlas de Coordenadas, 3 missões verificadas pelo motor, relatório de laboratório imprimível, URLs reproduzíveis, PT/EN completo |
| Código | 12,8 mil linhas (6,5 mil de física/simulação puras, zero React/Three), 2,3 mil de testes, 44 commits |
| Protocolo de auditoria | docs/VALIDACAO_EXTERNA.md com 12 blocos cegos + critérios internos |

## 2. Precisão medida (o número que você pediu)

Regra da casa: cada número abaixo é o pior caso aceito pela suíte; quando a
sonda mediu melhor, indicamos.

| O quê | Precisão | Contexto |
| --- | --- | --- |
| Precessão do periastro vs einsteinpy | **2 ppm** (2×10⁻⁶) | implementações independentes; forma orbital ~10⁻⁴ |
| Norma g(u,u) conservada | **10⁻⁸–10⁻¹⁰** | DP54, inclusive quase-horizonte e FLRW |
| Norma cruzando frentes IMPULSIVAS (KP) | ~10⁻⁵ | custo físico da métrica C⁰, não do integrador |
| Christoffels analíticos ≡ diferenças finitas | **6×10⁻¹¹** (KP medido); ≤10⁻⁵ nos demais | valida álgebra à mão contra a métrica |
| Friedmann redescoberta (ρ = 3c²H²/8πG) | **<10⁻³** | G_μν numérico, sem a equação programada |
| Densidade euleriana de Alcubierre (eq. 19) | **6 dígitos** (sonda); aceito <10⁻³ | numérico ≡ analítico na parede |
| Anel GW vs teoria linearizada (h/2 por braço) | **3%** (aceito); ~1% típico | regime linear h = 2×10⁻³ |
| p_v (Killing nulo da pp-wave) | **10⁻¹⁰** | 1200 passos |
| p_x no interior de Khan–Penrose | **10⁻⁸** | região suave |
| Produto de Kasner √g_xx·√g_yy = W | **10⁻¹⁰** | identidade exata da geometria |
| Redshift FLRW numérico ≡ analítico | **10⁻⁸** | via u⁰ vs razão de fatores de escala |
| Ordem de convergência RK4 (Richardson) | razão ~16 (aceita 8–32) | órbita excêntrica |
| Deriva ponderomotriz vs previsão −K²h²Lt²/32 | **10–20%** | ordem dominante; resíduo identificado (drift-z) |
| Vácuo certificado numericamente | Schwarzschild, Kerr, pp-wave, KP região IV | tolerância = escala de maré na tétrade |

Síntese honesta: **o núcleo geodésico opera na faixa 10⁻⁶–10⁻¹⁰; o
pipeline de curvatura na faixa 10⁻³–10⁻⁶; um efeito de segunda ordem
(focalização) está em 10–20% com o mecanismo do resíduo identificado.**
Nunca dizer "precisão de X%" sem dizer de qual observável.

## 3. As sacadas especiais (em ordem de valor)

1. **O motor como árbitro (rodada Khan–Penrose)** — reconstruímos a métrica
   de 1971 com uma ambiguidade algébrica e deixamos o tensor de Einstein
   numérico decidir: só (pq+uv)² é vácuo; o candidato errado exige matéria
   100×+ acima do ruído. O teste documenta a arbitragem. É metodologia
   replicável: qualquer implementador de soluções exatas pode usar.
2. **Colapso de tolerâncias em espaços VSI** — heurísticas normalizadas por
   invariantes (√K) falham silenciosamente em ondas exatas (invariantes
   todos nulos); o conserto (Riemann projetado na tétrade = escala de maré)
   é geral. Não encontramos registro explícito na literatura de métodos.
3. **Epistemologia como interface** — proveniência por número, status por
   cenário, validação contínua visível, exageros rotulados com fator. Como
   sistema operacionalizado, sem equivalente conhecido (verificar por
   matriz — Bloco 9).
4. **Física emergente que virou teste**: focalização de Penrose apareceu
   como "erro" de 11%, foi derivada (ponderomotriz), prevista (∝h², ∝t²,
   independente de L) e virou regressão; memória de velocidade
   (Zel'dovich–Polnarev) virou observável de produto.
5. **As três redescobertas** — Friedmann, eq. 19 de Alcubierre e teoria
   linearizada de GW emergem do pipeline sem terem sido programadas: o
   argumento de credibilidade mais forte que um laboratório pode exibir.
6. **Acervo de armadilhas de validação** — órbitas circulares × RK4;
   baseline do Shapiro; época em métricas não-estacionárias; ν contraído
   dos Christoffels; custo de frentes impulsivas; poço-navalha da ISCO.
7. **O arco narrativo de ondas**, único no mundo em ferramenta pública:
   *a onda que invariantes não veem (VSI) → a onda que deixa cicatriz
   (memória) → as ondas que criam singularidade (Khan–Penrose)* — tudo com
   vácuo verificado numericamente.

## 4. Pontos positivos estruturais

- Separação física/render intacta após 13 cenários (nenhuma equação em UI);
- Cada feature nova saiu MAIS barata (ensemble reutilizado 2×; toRenderFrame
  reutilizado 3×; padrão de plugin: Khan–Penrose inteiro em ~1 dia);
- Idioma duplo, reprodutibilidade por URL e relatório desde cedo — custos
  que projetos adiam e nunca pagam;
- A auditoria externa do Marco endureceu a linguagem ANTES de qualquer
  exposição pública — o produto já fala como um artigo de físico fala.

## 5. Temos algo relevante para artigo? SIM — com esta hierarquia

1. **Artigo principal (AJP/RBEF/EJP)**: a ferramenta + tese (sacada 3) com
   os casos de medição (sacadas 1, 2, 4, 5). O que falta NÃO é código:
   estudo piloto com professores (desenhado no Bloco 9) e matriz de
   anterioridade datada.
2. **Nota quente (AJP/EJP)**: memória de velocidade + focalização numa onda
   exata interativa (sacada 4) — tema ativo (LISA, BMS), zero ferramentas.
   Fechar Mathieu/Floquet a 1% elevaria de "ordem dominante" a "exato".
3. **Nota de métodos (CQG/CPC)**: VSI × tolerâncias (sacada 2) + o motor
   como árbitro (sacada 1) — pode ser fundida no artigo 1.
4. **JOSS**: revisão do software, rápida, DOI. Bloqueio único: escolher
   licença (decisão do proprietário).

O que NÃO temos: física nova. Temos instrumento, método e desenho de
medição — que é exatamente o que AJP/RBEF/JOSS publicam.

## 6. Possibilidades à frente (custo × impacto)

| Próximo passo | Custo | Impacto |
| --- | --- | --- |
| Blocos 13+ do protocolo (Khan–Penrose, arbitragem) | baixo | fecha auditoria cega do arco de ondas |
| Missão pedagógica do arco de ondas (ler M_c do chirp) | baixo | transforma demo em avaliação |
| TT × Brinkmann no Atlas | médio | casa o arco com a funcionalidade-assinatura |
| Mathieu/Floquet a 1% | médio | eleva a nota de memória a "exato" |
| Pacote JOSS | médio | primeira credencial formal |
| Processo de Penrose (ensemble na ergosfera) | médio | 4º capítulo do arco: extrair energia de um buraco negro |
| Marés/"chuva de detritos" em Schwarzschild | médio | espaguetificação medida (ensemble pronto) |
| Estudo piloto MNPEF | alto (humano) | destrava AJP/RBEF |
| Lensing GPU de métrica arbitrária | alto | espetáculo visual + técnica |
