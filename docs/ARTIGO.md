# O que o CosmoLab descobriu — e o que disso é publicável

Análise de portfólio (jul/2026 — inventário canônico em
docs/RELATORIO_ESTADO.md §1: 95 testes, 13 cenários, 10 métricas como
plugins). Regra de ouro herdada da auditoria: **classificar cada achado com
honestidade antes de escrever qualquer frase de novidade**. Três camadas:

- **Camada A — contribuições próprias defensáveis** (ninguém registrou, ou
  registrou de forma dispersa e nunca operacionalizou);
- **Camada B — física conhecida por especialistas, mas sem NENHUMA
  ferramenta interativa/mensurável pública** (a novidade é o instrumento e o
  desenho de medição, não o teorema);
- **Camada C — validação/engenharia** (sustenta credibilidade; não é
  manchete).

## Camada A — o que é genuinamente nosso

**A1. Colapso de tolerâncias baseadas em invariantes em espaços VSI.**
Qualquer diagnóstico numérico que normalize "isto é vácuo?" ou "isto é
ruído?" por um invariante escalar (√K, R²...) FALHA silenciosamente em
espaços-tempos VSI (ondas pp): todos os invariantes polinomiais se anulam
exatamente, a tolerância colapsa a zero e a onda é rotulada como matéria.
Encontramos isso porque aconteceu conosco; o conserto — escala pela maior
componente do Riemann projetado na tétrade local (escala de maré) — é
geral. Não encontramos registro explícito dessa armadilha em literatura de
métodos. **É pequeno, mas é real, reprodutível e útil a qualquer código.**
→ Nota curta em *Classical and Quantum Gravity* (seção de notas) ou
*Computer Physics Communications*; no mínimo, seção forte no artigo da
ferramenta.

**A2. O desenho de medição "epistemologia como interface".**
Proveniência por número (numérico/analítico/campo-fraco), status
epistemológico por cenário, norma g(u,u) ao vivo, passaporte de métricas
como triagem local com linguagem calibrada, exagero visual sempre rotulado
com fator. Como *conjunto operacionalizado num produto*, não achamos
equivalente (Bloco 9 do protocolo manda verificar por matriz de recursos).
→ É a TESE do artigo principal.

**A3. Armadilhas de teste que redesenham experimentos numéricos** (acervo):
órbitas circulares são subespaço invariante de RK explícitos (inutilizam
testes de convergência); o coeficiente do Shapiro é convenção-de-baseline;
época obrigatória em diagnósticos de métricas não-estacionárias (o scan no
Big Bang); ν contraído em Γ varre todas as direções (o bug que só aparece
no tensor de Einstein, não na geodésica). Individualmente pequenos; juntos
são um capítulo de "como validar um laboratório de RG" que não existe
escrito em lugar nenhum.

## Camada B — física conhecida, instrumento inédito

**B1. VSI como resposta a "por que o LIGO mede distâncias?"** — a onda é
invisível a todo invariante escalar; só o desvio geodésico a sente. O
CosmoLab é, até onde sabemos, a única ferramenta onde o usuário VÊ isso:
painel de invariantes zerado enquanto o anel deforma. Pergunta que nenhum
material didático responde com um experimento executável.

**B2. Focalização ponderomotriz + memória de velocidade, mensuráveis.**
A deriva secular ⟨Δx̄⟩ ≈ −K²h²L·t²/32 (derivada e conferida a 10–20% nos
ciclos tardios; resíduo consistente com a dessincronização em z, mesma
ordem) e o anel que não volta ao círculo após o merger. Memória
gravitacional é tema QUENTE (BMS, soft theorems, alvos de LISA), com zero
ferramentas interativas. Formulação exata para o artigo: com p_v
conservado, o movimento transverso é a equação de Mathieu com a = 0 —
região estável em q pequeno; o "foco" é o modo lento ponderomotriz, e o
foco de Penrose clássico emerge no limite de pulso.
→ **Candidato mais forte a artigo independente**: *American Journal of
Physics* ou *European Journal of Physics*: "Velocity memory and wave
focusing in an exact plane wave: an interactive laboratory".

**B3. A fatura do warp em tempo real** — massa exótica integrada da eq. 19
com slider; dτ = dt exato como antídoto ao imaginário de dilatação;
NEC violada medida pelo G_μν numérico. Divulgação séria sem equivalente.

**B4. As redescobertas como pedagogia de confiança**: Friedmann, eq. 19 de
Alcubierre e teoria linearizada de GW *emergem* do pipeline numérico sem
terem sido programadas. "O motor não sabe cosmologia e mediu ρ =
3c²H²/8πG" é um argumento de credibilidade que nenhum applet tem.

## Camada C — validação (sustenta, não estrela)

einsteinpy a 2 ppm (precessão; forma orbital ~1e-4), 88 testes analíticos,
Christoffels analíticos vs FD, p_v a 1e-10, invariantes em horizonte,
comparador reproduzível em docs/validation/.

## Estratégia de publicação (ordem recomendada)

1. **JOSS** (*Journal of Open Source Software*) — revisão por pares do
   software em si. Rápido, dá DOI citável e credencial. Pré-requisitos:
   licença (decisão do Marco), CONTRIBUTING, testes (temos), paper.md curto.
2. **Artigo principal** — AJP (EUA) ou RBEF (Brasil) ou EJP (Europa):
   "CosmoLab: um laboratório de RG onde cada número carrega proveniência".
   Tese A2, casos B1–B4, acervo A3, validação C. RBEF primeiro se a
   estratégia MNPEF (validação com professores) vier antes; AJP se quisermos
   alcance internacional já.
3. **Nota de memória/focalização** (B2) — independente, tema quente,
   apoia-se no artigo principal.
4. **Nota de métodos VSI** (A1) — curta, para CQG/CPC, ou fundida em (2).

O que AJP/RBEF vão exigir e ainda não temos: **evidência de uso** (estudo
piloto com professores/alunos — o menor estudo publicável está desenhado no
Bloco 9 do protocolo) e **busca sistemática de anterioridade** (matriz de
recursos contra EinsteinPy, GYOTO, Black Hole Vision etc., com datas).

## Lacunas pouco exploradas — onde pode haver descoberta de verdade

- **Ondas planas em COLISÃO (Khan–Penrose 1971)**: duas pp-waves exatas
  colidindo geram singularidade de curvatura a partir de PURA gravidade —
  solução exata fechada, jamais visualizada interativamente. O motor já tem
  tudo (métrica por plugin + ensemble). É espetacular e praticamente
  inexplorado em ensino. **Próximo alvo físico recomendado.**
- **Mathieu exato da focalização** (fechar B2 em precisão de 1%: resolver
  Hill com Floquet e comparar com o motor — transforma "ordem dominante"
  em "exato").
- **Processo de Penrose** com ensemble na ergosfera de Kerr (extração de
  energia medida por partícula que se divide).
- **Marés/geodesic deviation como produto**: o ensemble abre "chuva de
  detritos" em Schwarzschild (espaguetificação medida, não desenhada).
- **Carta TT × Brinkmann no Atlas** — a mesma onda em duas cartas: nada se
  move × tudo se move; fecha o ciclo com a funcionalidade-assinatura.

## Frases que NUNCA usar (herança da auditoria)

"Descobrimos física nova" (não descobrimos — descobrimos *instrumentação e
desenho de medição*); "solução exata" para resultados integrados;
"superluminal" sem "em coordenadas"; "vácuo confirmado" sem "na tolerância
de maré local"; qualquer "primeiro do mundo" antes da busca de
anterioridade do Bloco 9.
