# Plano de prioridades — construindo a base científica citável (jul/2026)

Objetivo declarado: **não é descobrir física nova; é preencher lacunas e
construir uma base científica que tenha relevância quando for citada.**
Descoberta, se vier, será consequência da base — nunca o pré-requisito.

Regra de ouro deste plano: **toda entrega termina em algo citável, ou
destrava diretamente algo citável.** Se uma tarefa não passa nesse teste,
ela sai do plano (ou espera).

Companheiros: docs/ARTIGO.md (estratégia editorial), docs/RELATORIO_ESTADO.md
(inventário — fonte canônica dos números), docs/VALIDACAO_EXTERNA.md
(protocolo de auditoria), docs/VALIDATION.md (tolerâncias).

---

## Como ler este plano

Cada item tem: **custo** (dias/semanas de trabalho real), **entrega**
(o artefato concreto que fica pronto), **destrava** (o que depende dele).
As fases 0–1 são sequenciais e urgentes; 2 em diante rodam em paralelo
conforme energia. A ordem dentro de cada fase é a ordem recomendada.

---

## Fase 0 — Higiene e fundação citável (dias, custo quase zero)

Nada aqui é glamoroso; tudo aqui é pré-requisito de credibilidade. Um
auditor que encontre um número desatualizado desconta TODOS os outros.

**0.1 [CONCLUÍDO 2026-07-18] Sincronizar a documentação com o código real.**
VALIDATION.md dizia 75 testes/v0.8.0; ARTIGO.md dizia 88 testes/12 cenários/
8 métricas; o real (medido) é 95 testes, 13 cenários, 10 métricas — corrigido
nos quatro documentos. VALIDATION.md ganhou a tabela do arco de ondas
(pp-wave, Khan–Penrose, Alcubierre, DP54). A razão da arbitragem KP (DESCOBERTAS
dizia "dez ordens"; RELATORIO dizia "100×+") foi medida por sonda direta:
10⁷–10⁹×, unificada nos três lugares e no comentário do teste. Todos os
documentos agora apontam RELATORIO_ESTADO §1 como fonte canônica.

**0.2 [CONCLUÍDO 2026-07-19] Licença: MIT.** Decisão do Marco — maximiza
adoção e citação (padrão de facto em software científico: EinsteinPy é MIT);
monetização futura permanece possível via dual licensing/open core, já que
o copyright é dele. `LICENSE` criado, `package.json` com `"license": "MIT"`.

**0.3 [CONCLUÍDO 2026-07-19] Repositório citável: tag v1.0.0 + Zenodo DOI +
CITATION.cff.** Repositório renomeado de `cosmoslab` para `cosmolab`
(corrige typo antes do primeiro DOI — GitHub redireciona a URL antiga);
47 commits locais enviados a `origin/main`; ORCID do autor criado
(0009-0005-0545-3791); release `v1.0.0` publicada; Zenodo arquivou e emitiu
**DOI 10.5281/zenodo.21436967**. Badge no README, `doi:` no CITATION.cff.
O CosmoLab agora é formalmente citável, antes de qualquer periódico.

**0.4 Pré-requisitos JOSS: README científico em inglês, CONTRIBUTING.md,
paper.md (~1 página).** Os testes (95) e a arquitetura já cumprem o resto.
Custo: 2–3 dias. Entrega: pacote de submissão pronto.

---

## Fase 1 — Proteção de prioridade (semanas 1–3)

A preocupação com anterioridade corta nos dois sentidos: alguém pode
publicar a armadilha VSI antes de nós. Preprint estabelece prioridade
com data pública; a revisão lenta do periódico deixa de ser risco.

**1.1 Preprint arXiv da nota de métodos: VSI × tolerâncias + o motor
como árbitro.** Em inglês, 4–6 páginas, physics.comp-ph (cross-list
gr-qc). Conteúdo já existe em DESCOBERTAS Partes 1.1–1.2; os testes
`ppWave.test.ts` e `khanPenrose.test.ts` são o material suplementar.
Custo: 1–2 semanas. Entrega: arXiv ID citável, prioridade datada.
Destrava: a nota CQG/CPC (Fase 3) sem pressa.

**1.2 Matriz de anterioridade datada (Bloco 9).** Comparar por recursos
(não por impressão) contra EinsteinPy, GYOTO, Black Hole Vision, General
Relativity Explorer, xAct/GRTensor, ScienceClic, Universe Sandbox — com
datas e links. SEM ela, nenhuma frase de novidade pode ir a manuscrito.
COM ela, vira a rubrica de auditabilidade da Fase 5.4.
Custo: 1 semana de pesquisa. Destrava: artigo principal, todas as frases
de novidade.

**1.3 Submeter ao JOSS.** Revisores instalam, rodam os 95 testes, avaliam
docs. Primeira credencial revisada por pares; DOI de artigo.
Custo: submissão em 1 dia (após 0.2–0.4); revisão leva semanas–meses mas
não bloqueia nada em paralelo.

---

## Fase 2 — As features de maior retorno por esforço (semanas 2–6)

**2.1 GW150914 real como perfil de Brinkmann ("surfe na onda real").**
A métrica de Brinkmann é vácuo exato para QUALQUER A(u); injetar o strain
público do LIGO via A ≈ −½·d²h/du² (dicionário já rotulado) põe o anel de
geodésicas respondendo ao evento astronômico real numa métrica exata com
vácuo certificado ao vivo. Nenhuma ferramenta faz isso. Implementação:
parsing do dado aberto (GWOSC) + perfil tabelado no plugin ppWave
existente + proveniência "dado observacional" (nova categoria — estende
a tese epistemológica!).
Custo: 1 semana. Entrega: feature-manchete do arco de ondas. Destrava:
2.2 e o caso mais forte do artigo principal.

**2.2 Missão "leia M_c do chirp" sobre o dado real** (já listada como
custo baixo no RELATORIO §6 — agora sobre GW150914, não sobre sintético).
Custo: dias após 2.1. Entrega: demo vira avaliação com dado real.

**2.3 Sondagem das línguas instáveis de Mathieu (uma tarde).** O plano
atual fecha Floquet só na região estável. Girar h para cima e procurar
ressonância paramétrica do anel (crescimento exponencial nas línguas
instáveis) custa uma tarde no cenário existente. Se aparecer, é material
pouco explorado pedagogicamente e enriquece a nota 3.1; se não, é um
limite medido — também publicável.
Custo: 1 tarde de experimento + análise. Risco: zero (qualquer resultado
serve).

**2.4 Fechar Mathieu/Floquet a 1%.** Resolver Hill/Floquet numericamente
e comparar com o motor — eleva a deriva ponderomotriz de "ordem dominante
a 10–20%" para "exato". É O passo que transforma a nota de memória de
boa em forte.
Custo: 1–2 semanas (análise, não infra). Destrava: 3.1.

---

## Fase 3 — Os artigos (meses 2–4)

Ordem de submissão (a estratégia do ARTIGO.md, refinada):

**3.1 Nota de memória/focalização (AJP ou EJP).** "Velocity memory and
wave focusing in an exact plane wave: an interactive laboratory." Tema
quente (BMS, LISA, pulsar timing), zero ferramentas interativas, vizinho
mais próximo é Zhang–Duval–Gibbons–Horváthy 2017. Requer 2.4 (Floquet a
1%); ganha força com 2.1 (dado real) e 2.3 (línguas instáveis).
Custo: 3–4 semanas de escrita.

**3.2 Artigo principal (AJP ou RBEF).** "CosmoLab: um laboratório de RG
onde cada número carrega proveniência." Tese: epistemologia como
interface. Requer 1.2 (matriz). NOTA IMPORTANTE do Bloco 9: a AJP aceita
artigo técnico-pedagógico SEM ensaio controlado se for correto, novo,
claro e útil em sala — o estudo piloto só é pré-requisito para frases de
GANHO DE APRENDIZAGEM. Ou seja: o artigo principal NÃO espera a Fase 5.3;
apenas evita essas frases.
Custo: 4–6 semanas de escrita. Decisão pendente: AJP (alcance) × RBEF
(alinha com estratégia MNPEF) — pode ser decidida na hora da submissão.

**3.3 Meta-artigo do protocolo de auditoria cega.** VALIDACAO_EXTERNA.md
já É um protocolo maduro de auditoria adversarial de afirmações
científicas por revisores externos (humanos ou LLM): blocos cegos,
critérios internos separados, matriz de interpretação, limite de citação
literal. Em 2026 isso é exatamente o que a comunidade de ciência assistida
por IA está tentando inventar. Registrar os resultados das auditorias
reais (quantos CONFIRMADO/QUALIFICADO/ERRADO, o que cada um mudou no
projeto) e escrever o protocolo + estudo de caso.
Custo: 2–3 semanas (o documento existe; falta o registro de resultados e
a redação). Venue: CPC, ou venue de meta-ciência/ferramentas.

---

## Fase 4 — Enriquecimento físico do arco (meses 3–5, intercalável)

Cada item preenche uma lacuna real de ensino e vira seção/figura de
artigo. Ordem por (impacto ÷ custo):

**4.1 Boost de Aichelburg–Sexl — o elo entre os dois arcos.** Schwarzschild
ultra-relativístico É uma pp-wave impulsiva: um slider de boost
transformando o buraco negro na onda unifica "arco de buracos negros" e
"arco de ondas" numa demonstração praticamente inexistente em forma
interativa. Os dois extremos já são plugins.
Custo: 1–2 semanas (métrica boostada + cenário).

**4.2 Isometria de Ferrari–Ibañez no Atlas.** A região de interação de
Khan–Penrose é localmente isométrica ao INTERIOR de Schwarzschild — hoje
citada como curiosidade; o Atlas de Coordenadas (funcionalidade-assinatura)
é o lugar de MOSTRAR o mapa: mesma geometria, duas cartas, "colidir ondas
fabrica o interior de um buraco negro". Inédito interativamente.
Custo: 2 semanas. Bônus: fecha TT × Brinkmann pelo mesmo mecanismo do
Atlas (a onda em duas cartas — nada se move × tudo se move).

**4.3 Processo de Penrose (ensemble na ergosfera de Kerr)** — 4º capítulo
do arco: extrair energia de um buraco negro, medida por partícula que se
divide. **4.4 Chuva de detritos em Schwarzschild** — espaguetificação
medida (ensemble pronto). Ambos já dimensionados no RELATORIO §6 como
custo médio; entram conforme fôlego, cada um vale uma seção de artigo.

---

## Fase 5 — Infraestrutura comunitária (contínuo; citações de longo prazo)

É aqui que a "relevância quando citar" se multiplica: infraestrutura
comunitária gera citações por décadas; capítulos de artigo, não.

**5.1 Corpus de testes agnóstico de linguagem.** Empacotar o acervo de
armadilhas (VSI×tolerâncias, órbita circular×RK, época em métricas
não-estacionárias, ν contraído, custo de frentes impulsivas) como spec
JSON: métrica + ponto + invariantes esperados + tolerâncias + a armadilha
que o caso detecta. Qualquer código de RG (EinsteinPy, GYOTO, o próximo
que nascer) pode adotar como CI. Publicar como repositório próprio +
nota CPC ("A reference test corpus for geodesic and curvature codes").
Custo: 2–3 semanas. Retorno: o tipo de artefato mais citado em métodos.

**5.2 Caça de erratas na literatura de soluções exatas (programa
contínuo).** Generalizar o motor-árbitro: rodar o pipeline sobre métricas
COMO IMPRESSAS em livros/artigos (catálogo de Stephani et al., Griffiths)
e certificar numericamente se são o vácuo/fonte que declaram. Cada errata
encontrada é resultado concreto e citável; o programa inteiro é "o
laboratório que revisa a literatura". Começar com 5–10 métricas do
catálogo por iteração, registrando tudo no formato do corpus 5.1.
Custo: contínuo, fatiável (uma métrica por sessão). Risco: baixo — mesmo
zero erratas produz "verificação numérica independente do catálogo", que
é citável.

**5.3 Estudo piloto REMOTO e assíncrono (destrava frases de ganho de
aprendizagem).** O produto já é o instrumento de coleta: URLs
reproduzíveis + relatório de laboratório exportável. Desenho: professores
do MNPEF fazem as missões remotamente, relatórios coletados com
consentimento, pré/pós-teste online (o menor estudo publicável já está
desenhado no Bloco 9). Rebaixa o custo de "alto (humano presencial)" para
médio.
Custo: médio, majoritariamente coordenação. Destrava: versão reforçada do
3.2 ou artigo educacional próprio na RBEF.

**5.4 Rubrica de auditabilidade publicada.** Evoluir a matriz de
anterioridade (1.2) de escudo para régua: publicar a rubrica
(proveniência visível? validação contínua? exageros rotulados?
reprodutível por URL?) e pontuar as ferramentas do campo por ela. Uma
rubrica publicada é contribuição própria — e o campo passa a ser medido
pela régua que nós definimos.
Custo: 1 semana em cima de 1.2.

---

## O que NÃO fazer agora (e por quê)

- **Lensing GPU de métrica arbitrária** — alto custo, espetáculo visual
  sem destravar nada citável no curto prazo. Depois da Fase 3.
- **Buscar "física nova" deliberadamente** — é anti-foco declarado. As
  candidatas a surpresa (línguas de Mathieu, erratas) já estão no plano
  como subprodutos baratos de tarefas que valem por si.
- **Qualquer frase de novidade antes de 1.2** — herança da auditoria,
  continua valendo ("Frases que NUNCA usar", ARTIGO.md).

## O mapa de dependências em uma linha por trilha

- **Trilha citabilidade**: 0.1 → 0.2 → 0.3 → 0.4 → 1.3 (JOSS) e 1.1 (arXiv).
- **Trilha ondas**: 2.1 → 2.2; 2.3 e 2.4 → 3.1 (nota de memória).
- **Trilha artigo principal**: 1.2 → 3.2 (sem esperar 5.3).
- **Trilha infraestrutura**: acervo A3 → 5.1 → 5.2; 1.2 → 5.4; Bloco 9 → 5.3.
- **Trilha meta**: auditorias registradas → 3.3.

## Critério de sucesso da base (12 meses)

1. DOI Zenodo + artigo JOSS aceito + preprint arXiv no ar (≤3 meses);
2. nota de memória/focalização submetida com Floquet a 1% (≤6 meses);
3. artigo principal submetido com matriz de anterioridade (≤9 meses);
4. corpus de testes público com ≥1 código externo interessado (≤12 meses);
5. zero afirmações no produto ou nos docs sem qualificação de hipóteses
   (auditável a qualquer momento pelo protocolo).

Quando alguém citar o CosmoLab, deve encontrar: software com DOI e
revisão por pares, precisão declarada por observável, protocolo de
auditoria aberto e reprodutibilidade por URL. Essa é a base. Se algo
genuinamente novo aparecer no caminho (uma errata importante, uma língua
de Mathieu inexplorada), a base é o que fará a descoberta ser levada a
sério.
