/**
 * Internacionalização do CosmoLab (PT-BR nativo → EN).
 *
 * Estratégia: o MOTOR permanece em português (fonte da verdade); a tradução
 * acontece na borda de exibição via `t(textoPt)`. Chave = a própria string
 * PT (impossível dessincronizar chave e texto). Strings dinâmicas (com
 * números interpolados pelo motor) são cobertas por REGRAS DE PADRÃO
 * (regex → template). Chave ausente ⇒ devolve o PT — degradação graciosa,
 * nunca uma chave crua na tela.
 */

export type Language = "pt" | "en"

let currentLanguage: Language = "pt"

export function setLanguage(language: Language): void {
  currentLanguage = language
}

export function getLanguage(): Language {
  return currentLanguage
}

/** Regras para strings montadas com números pelo motor. */
const PATTERNS: [RegExp, string][] = [
  [/^b < b_crítico ≈ ([\d.,]+) r_s: o fóton será CAPTURADO pelo buraco negro\.$/, "b < b_critical ≈ $1 r_s: the photon will be CAPTURED by the black hole."],
  [/^r₀ < ISCO = (\d+) r_s: não há órbita circular estável — a partícula tende a mergulhar\.$/, "r₀ < ISCO = $1 r_s: no stable circular orbit exists — the particle tends to plunge."],
  [/^Campo fraco: α = 2·r_s\/b ≈ (.+) de deflexão total\.$/, "Weak field: α = 2·r_s/b ≈ $1 of total deflection."],
  [/^Campo fraco: Δt ≈ (.+) µs para esta configuração\.$/, "Weak field: Δt ≈ $1 µs for this configuration."],
  [/^Geodésicas na métrica "(.+)" definida no editor abaixo\. A validação numérica \(norma, E, L\) é o termômetro de confiabilidade\.$/, 'Geodesics in the "$1" metric defined in the editor below. The numeric validation (norm, E, L) is the reliability gauge.'],
  [/^K cresce ≈ r\^−([\d.,]+) na borda interna do scan\. É indício de divergência; confirmar singularidade exige estudar o limite e a extensão geodésica\.$/, "K grows ≈ r^−$1 at the scan's inner boundary. This suggests divergence; confirming a singularity requires studying the limit and geodesic extension."],
]

const EN: Record<string, string> = {
  /* ---- barra superior / controles ---- */
  "pausar": "pause",
  "retomar": "resume",
  "reiniciar": "restart",
  "preset": "preset",
  "unidades": "units",
  "tempo coordenado": "coordinate time",
  "relativity lab · v0.8": "relativity lab · v0.8",
  "a mesma queda em duas cartas — sincronizada por τ": "the same fall in two charts — synchronized by τ",
  "Atlas de Coordenadas": "Coordinate Atlas",
  "geodésica nula": "null geodesic",
  "geodésica timelike": "timelike geodesic",
  "Controles da simulação": "Simulation controls",

  /* ---- painel esquerdo ---- */
  "cenários": "scenarios",
  "métrica": "metric",
  "comparação de cartas": "chart comparison",
  "parâmetros físicos": "physical parameters",
  "Massa central": "Central mass",
  "Parâmetro de impacto b": "Impact parameter b",
  "Raio inicial r₀": "Initial radius r₀",
  "Raio de partida r₀": "Starting radius r₀",
  "Raio inicial r₀ [M = GM/c²]": "Initial radius r₀ [M = GM/c²]",
  "Raio inicial r₀ [r_CTC]": "Initial radius r₀ [r_CTC]",
  "Velocidade tangencial local (× circular)": "Local tangential speed (× circular)",
  "Velocidade angular inicial (× ω_Gödel)": "Initial angular velocity (× ω_Gödel)",
  "Spin a/M": "Spin a/M",
  "Schwarzschild × Painlevé–Gullstrand": "Schwarzschild × Painlevé–Gullstrand",
  "A MESMA queda radial integrada em duas cartas, sincronizada pelo tempo próprio: invariantes coincidem; o congelamento no horizonte se revela artefato de coordenadas.":
    "The SAME radial fall integrated in two charts, synchronized by proper time: invariants agree; the horizon freeze is revealed as a coordinate artifact.",

  /* ---- status científico ---- */
  "validado": "validated",
  "modelo aceito": "accepted model",
  "teórico": "theoretical",
  "especulativo": "speculative",
  "modelo didático": "toy model",

  /* ---- cenários: rótulos ---- */
  "Espaço plano": "Flat space",
  "Espaço plano — fóton": "Flat space — photon",
  "Deflexão da luz": "Light deflection",
  "Atraso de Shapiro": "Shapiro delay",
  "Órbita relativística": "Relativistic orbit",
  "Horizonte": "Horizon",
  "Horizonte de Schwarzschild": "Schwarzschild horizon",
  "Através do horizonte": "Through the horizon",
  "Kerr — arrasto": "Kerr — frame dragging",
  "Kerr — arrasto de referenciais": "Kerr — frame dragging",
  "Gödel — CTCs": "Gödel — CTCs",
  "Universo de Gödel — CTCs": "Gödel universe — CTCs",
  "Métrica personalizada": "Custom metric",

  /* ---- cenários: descrições ---- */
  "Geodésica nula na métrica de Minkowski: linha reta percorrida à velocidade da luz. Cenário de controle do integrador.":
    "Null geodesic in the Minkowski metric: a straight line traversed at the speed of light. The integrator's control scenario.",
  "Integração numérica da geodésica nula completa de Schwarzschild para um fóton com parâmetro de impacto b ajustável. Aproxime b de 2,6 r_s e veja a captura.":
    "Numerical integration of the full Schwarzschild null geodesic for a photon with adjustable impact parameter b. Bring b close to 2.6 r_s and watch the capture.",
  "O 4º teste clássico: a luz que tangencia a massa chega ATRASADA em relação ao espaço plano, mesmo quase sem entortar. Compare o atraso medido com a fórmula de Shapiro.":
    "The 4th classical test: light grazing the mass arrives DELAYED relative to flat space, even while barely bending. Compare the measured delay with Shapiro's formula.",
  "Partícula massiva com raio e velocidade tangencial local ajustáveis: 100% = órbita circular; menos = roseta de precessão ou mergulho; a ISCO fica em 3 r_s.":
    "Massive particle with adjustable radius and local tangential speed: 100% = circular orbit; less produces a precessing rosette or a plunge; the ISCO is at 3 r_s.",
  "Queda radial livre do repouso em raio ajustável: tempo próprio finito, tempo coordenado divergente ao se aproximar do horizonte.":
    "Radial free fall from rest at an adjustable radius: finite proper time, divergent coordinate time as the horizon is approached.",
  "A mesma queda radial, agora em coordenadas de Painlevé–Gullstrand: a partícula CRUZA o horizonte sem nada divergir e segue até perto de r = 0.":
    "The same radial fall, now in Painlevé–Gullstrand coordinates: the particle CROSSES the horizon with nothing diverging and continues to near r = 0.",
  "Partícula com momento angular ZERO largada perto de um buraco negro em rotação: o espaço-tempo a arrasta em φ (Lense–Thirring). Ajuste o spin a/M.":
    "A particle with ZERO angular momentum released near a rotating black hole: spacetime drags it in φ (Lense–Thirring). Adjust the spin a/M.",
  "L = g_φμu^μ deve permanecer 0, dentro do erro numérico, enquanto φ cresce — quem gira é o espaço-tempo (Kerr roda como plugin).":
    "L = g_φμu^μ should remain zero within numerical error while φ grows — spacetime is what rotates (Kerr runs as a plugin).",
  "Solução exata com rotação global: além do anel vermelho (r_CTC), círculos de φ são curvas temporais FECHADAS. Geodésicas (rosa) permanecem causais — a CTC tracejada exige propulsão.":
    "Exact solution with global rotation: beyond the red ring (r_CTC), φ-circles are CLOSED timelike curves. Geodesics (pink) remain causal — the dashed CTC requires propulsion.",

  /* ---- painel direito: abas e chips ---- */
  "resultados": "results",
  "validação": "validation",
  "equações": "equations",
  "passaporte": "passport",
  "integrando": "integrating",
  "pausado": "paused",
  "parado": "halted",
  "cenário ativo": "active scenario",
  "numérico": "numeric",
  "analítico": "analytic",
  "campo fraco": "weak field",

  /* ---- observáveis (rótulos do motor) ---- */
  "Deflexão acumulada": "Accumulated deflection",
  "Atraso de Shapiro acumulado": "Accumulated Shapiro delay",
  "Precessão do periastro (média)": "Periastron precession (mean)",
  "Desvio padrão da precessão": "Precession standard deviation",
  "Periastros detectados": "Periastra detected",
  "Voltas completadas": "Turns completed",
  "Dilatação temporal": "Time dilation",
  "Dilatação da partícula em queda": "Infalling particle dilation",
  "Fator estático 1/√(1−r_s/r)": "Static factor 1/√(1−r_s/r)",
  "Distância ao horizonte": "Distance to horizon",
  "Raio atual r / r_s": "Current radius r / r_s",
  "τ ao cruzar o horizonte": "τ at horizon crossing",
  "dT/dτ (tempo-chuva)": "dT/dτ (rain time)",
  "Arrasto acumulado (L = 0)": "Accumulated dragging (L = 0)",
  "Voltas arrastadas": "Dragged turns",
  "Posição vs fronteira de CTCs": "Position vs CTC boundary",
  "g_φφ do círculo fechado": "g_φφ of the closed circle",
  "Desvio da linha reta": "Deviation from straight line",

  /* ---- referências analíticas dos observáveis ---- */
  "aproximação de campo fraco 4GM/(c²b)": "weak-field approximation 4GM/(c²b)",
  "aproximação de campo fraco 6πGM/(c²p)": "weak-field approximation 6πGM/(c²p)",
  "campo fraco (2GM/c³)[ln(4x₁x₂/b²) − 1], baseline de corda coordenada":
    "weak field (2GM/c³)[ln(4x₁x₂/b²) − 1], coordinate-chord baseline",
  "geodésica de Minkowski é reta exata": "Minkowski geodesics are exactly straight",
  "referência analítica": "analytic reference",

  /* ---- avisos de regime ---- */
  "campo forte: a aproximação de campo fraco não é confiável neste b":
    "strong field: the weak-field approximation is unreliable at this b",
  "campo forte: a aproximação pós-newtoniana subestima a precessão":
    "strong field: the post-Newtonian approximation underestimates the precession",
  "região ACAUSAL: os círculos de φ por aqui são curvas temporais FECHADAS (g_φφ < 0) — percorrê-las exige propulsão, não são geodésicas":
    "ACAUSAL region: φ-circles here are CLOSED timelike curves (g_φφ < 0) — traversing them requires propulsion; they are not geodesics",

  /* ---- resultados: cards ---- */
  "Tempo coordenado": "Coordinate time",
  "Tempo próprio": "Proper time",
  "Intervalo próprio": "Proper interval",
  "x⁰/c da carta; a interpretação depende das coordenadas":
    "chart coordinate x⁰/c; its interpretation depends on the coordinates",
  "relógio da partícula": "the particle's clock",
  "geodésica nula: não há relógio próprio": "null geodesic: there is no proper clock",
  "0 (exato)": "0 (exact)",
  "Diferença coordenada Δ = t − τ": "Coordinate difference Δ = t − τ",
  "grandeza dependente da carta; compare relógios físicos apenas após definir o observador de referência":
    "chart-dependent quantity; compare physical clocks only after defining the reference observer",
  "Raio de Schwarzschild": "Schwarzschild radius",
  "Raio atual r": "Current radius r",

  /* ---- validação ---- */
  "Energia específica E": "Specific energy E",
  "Momento angular L": "Angular momentum L",
  "Erro de norma": "Norm error",
  "Deriva de E": "E drift",
  "Deriva de L": "L drift",
  "n/a — sem Killing temporal": "n/a — no timelike Killing vector",
  "n/a — sem Killing axial": "n/a — no axial Killing vector",
  "Parâmetro afim λ": "Affine parameter λ",
  "Integrador": "Integrator",
  "Passos (aceitos / rejeitados)": "Steps (accepted / rejected)",
  "Tolerâncias (rel / abs)": "Tolerances (rel / abs)",
  "Custo de CPU": "CPU cost",
  "Densidade de energia ρ": "Energy density ρ",
  "Condição de energia (NEC)": "Energy condition (NEC)",
  "violação detectada em direção amostrada": "violation detected along a sampled direction",
  "sem violação detectada (amostragem)": "no violation detected (sampled)",
  "≈ 0 (vácuo)": "≈ 0 (vacuum)",
  "Escalar de Ricci R": "Ricci scalar R",
  "Kretschmann K": "Kretschmann K",
  "Causalidade (g_φφ)": "Causality (g_φφ)",
  "nenhum círculo φ temporal detectado": "no timelike φ-circle detected",
  "n/a — x³ não é φ periódico": "n/a — x³ is not periodic φ",
  "CTC! (g_φφ < 0)": "CTC! (g_φφ < 0)",
  "ID do experimento": "Experiment ID",
  "exportar JSON": "export JSON",
  "exportar CSV": "export CSV",
  "relatório de laboratório": "lab report",
  "RK4 (passo fixo)": "RK4 (fixed step)",
  "Dormand–Prince 5(4) adaptativo": "Dormand–Prince 5(4) adaptive",
  "A norma deve conservar-se em toda geodésica. E e L só são constantes quando a métrica declara, respectivamente, simetria temporal e axial. R e K são invariantes locais; nenhum escalar isolado decide toda a estrutura global.":
    "The norm must be conserved along every geodesic. E and L are constants only when the metric declares temporal and axial symmetry, respectively. R and K are local invariants; no single scalar determines the full global structure.",
  "Integração interrompida: a trajetória saiu do domínio de validade da carta de coordenadas.":
    "Integration halted: the trajectory left the coordinate chart's domain of validity.",
  "Integração interrompida: condição de parada física do cenário atingida (ex.: aproximação do horizonte, onde a carta degenera).":
    "Integration halted: the scenario's physical stop condition was reached (e.g., approaching the horizon, where the chart degenerates).",

  /* ---- equações ---- */
  "Elemento de linha": "Line element",
  "Componentes definidas pelo usuário": "User-defined components",
  "Equação da geodésica": "Geodesic equation",
  "Convenções": "Conventions",
  "assinatura (−,+,+,+) · x⁰ = c·t [m] · λ = c·τ (massivas)": "signature (−,+,+,+) · x⁰ = c·t [m] · λ = c·τ (massive)",
  "referências": "references",

  /* ---- passaporte ---- */
  "gerar passaporte": "generate passport",
  "escanear novamente": "scan again",
  "Nenhuma assinatura local foi detectada no alcance e na resolução do scan; isso não prova ausência global.":
    "No local signature was detected within the scan range and resolution; this does not prove global absence.",
  "Horizonte:": "Horizon:",
  "Limite estático": "Static limit",
  "Região de CTCs": "CTC region",
  "Região com círculos φ temporais": "Region with timelike φ-circles",
  "Matéria exótica": "Exotic matter",
  "Singularidade de curvatura (indício)": "Curvature singularity (indication)",
  "Horizonte candidato": "Candidate horizon",
  "Compatível com planicidade assintótica": "Compatible with asymptotic flatness",
  "g^rr = 0: a superfície r = constante é nula nesta carta; identificá-la como horizonte exige informação causal global ou simetria adicional.":
    "g^rr = 0: the constant-r surface is null in this chart; identifying it as a horizon requires global causal information or additional symmetry.",
  "g_tt = 0: o Killing temporal fica nulo; em carta estacionária adaptada, observadores em coordenadas espaciais fixas deixam de ser timelike.":
    "g_tt = 0: the timelike Killing vector becomes null; in an adapted stationary chart, observers at fixed spatial coordinates cease to be timelike.",
  "g_φφ < 0 com φ periódico: os círculos de φ são CTCs. É condição suficiente; outros tipos de CTC não são excluídos quando g_φφ ≥ 0.":
    "g_φφ < 0 with periodic φ: φ-circles are CTCs. This is sufficient; other kinds of CTC are not excluded when g_φφ ≥ 0.",
  "Violação da NEC detectada: T(k,k) < 0 para ao menos uma direção nula amostrada. Isso não implica, em geral, densidade de energia negativa no referencial escolhido.":
    "NEC violation detected: T(k,k) < 0 for at least one sampled null direction. In general, this does not imply negative energy density in the chosen frame.",
  "Todas as componentes normalizadas aproximam Minkowski, nesta carta, na borda de uma métrica estacionária. É indício local; planicidade assintótica requer o limite e o falloff das componentes e derivadas.":
    "All normalized components approach Minkowski, in this chart, at the boundary of a stationary metric. This is local evidence; asymptotic flatness requires the limiting behavior and falloff of components and derivatives.",

  /* ---- editor de métrica ---- */
  "editor de métrica g_μν": "metric editor g_μν",
  "nome": "name",
  "aplicar métrica": "apply metric",
  "aplicada ✓": "applied ✓",

  /* ---- missões ---- */
  "missões": "missions",
  "dica": "hint",
  "esconder dica": "hide hint",
  "🏅 Missão cumprida — verificada pelo motor.": "🏅 Mission accomplished — verified by the engine.",
  "Esta missão acontece em outro cenário — reabra a missão.": "This mission takes place in another scenario — reopen the mission.",
  "O eclipse de Eddington": "The Eddington eclipse",
  "A beira do abismo": "The edge of the abyss",
  "A armadilha de luz": "The light trap",
  "Reproduza a medição que consagrou Einstein: com a massa do Sol e um fóton tangenciando o limbo solar (b = R☉), meça a deflexão total da luz.":
    "Reproduce the measurement that made Einstein famous: with the Sun's mass and a photon grazing the solar limb (b = R☉), measure the total deflection of light.",
  "Perto da ISCO o poço de estabilidade é uma lâmina: monte uma órbita que MERGULHE até um periastro ≤ 4 r_s e, ainda assim, complete 3 voltas sem ser engolida.":
    "Near the ISCO the stability well is razor thin: build an orbit that DIVES to a periastron ≤ 4 r_s and still completes 3 turns without being swallowed.",
  "Capture um fóton SEM exagerar: faça-o cair no buraco negro com parâmetro de impacto entre 2,50 e 2,60 r_s — a janela logo abaixo do valor crítico.":
    "Capture a photon WITHOUT overshooting: make it fall into the black hole with an impact parameter between 2.50 and 2.60 r_s — the window just below the critical value.",
  "O preset do cenário já é o Sol; deixe o fóton completar a travessia e leia a deflexão acumulada. O valor histórico é ≈ 1,75″.":
    "The scenario preset is already the Sun; let the photon complete the crossing and read the accumulated deflection. The historical value is ≈ 1.75″.",
  "Reduza a velocidade tangencial local para afundar o periastro. Cuidado: reduza demais e a partícula perde a barreira do potencial efetivo e mergulha.":
    "Lower the local tangential speed to move the periastron inward. Lower it too far and the particle loses the effective-potential barrier and plunges.",
  "Existe um b crítico: acima dele todo fóton escapa (por mais que entorte); abaixo, é capturado. A janela pedida força você a encostar nesse limiar.":
    "There is a critical b: above it every photon escapes (however much it bends); below it, it is captured. The requested window forces you to graze that threshold.",
  "massa central = 1 M☉ (±5%)": "central mass = 1 M☉ (±5%)",
  "parâmetro de impacto b = R☉ (±5%)": "impact parameter b = R☉ (±5%)",
  "fóton completou a travessia": "photon completed the crossing",
  "deflexão medida entre 1,60″ e 1,90″": "measured deflection between 1.60″ and 1.90″",
  "3 voltas completadas": "3 turns completed",
  "periastro alcançou r ≤ 4 r_s": "periastron reached r ≤ 4 r_s",
  "sobreviveu (não caiu nem escapou)": "survived (neither fell nor escaped)",
  "b entre 2,50 e 2,60 r_s": "b between 2.50 and 2.60 r_s",
  "fóton capturado (cruzou rumo ao horizonte)": "photon captured (crossed toward the horizon)",

  /* ---- legenda da cena ---- */
  "horizonte r_s": "horizon r_s",
  "horizonte r₊": "horizon r₊",
  "ergosfera (equador)": "ergosphere (equator)",
  "campo ZAMO (comprimento ∝ ω)": "ZAMO field (length ∝ ω)",
  "esfera de fótons 1,5 r_s": "photon sphere 1.5 r_s",
  "ISCO 3 r_s": "ISCO 3 r_s",
  "fronteira de CTCs (g_φφ = 0)": "CTC boundary (g_φφ = 0)",
  "CTC demonstrativa — NÃO-geodésica (exige propulsão)": "demonstration CTC — NON-geodesic (requires propulsion)",
  "geodésica (Einstein)": "geodesic (Einstein)",
  "geodésica nula (Einstein)": "null geodesic (Einstein)",
  "Órbita de Newton (fechada)": "Newton's orbit (closed)",

  /* ---- atlas ---- */
  "Carta de Schwarzschild": "Schwarzschild chart",
  "Carta de Painlevé–Gullstrand": "Painlevé–Gullstrand chart",
  "t do observador distante — degenera em r = r_s": "distant observer's t — degenerates at r = r_s",
  "T dos observadores em queda — regular no horizonte": "infalling observers' T — regular at the horizon",
  "Integração parada: a carta degenera no horizonte (t → ∞). A física continua — veja ao lado.":
    "Integration halted: the chart degenerates at the horizon (t → ∞). The physics continues — see the other pane.",
  "Parada na aproximação da singularidade de curvatura (r → 0), o único limite real.":
    "Halted approaching the curvature singularity (r → 0), the only real limit.",
  "mesma física, dois mapas": "same physics, two maps",
  "os runners avançam pelo mesmo Δτ; invariantes devem coincidir até a carta esquerda degenerar":
    "both runners advance by the same Δτ; invariants must agree until the left chart degenerates",
  "tempo próprio τ": "proper time τ",
  "raio areal r": "areal radius r",
  "energia E": "energy E",
  "destino da integração": "integration fate",
  "parou em": "halted at",
  "carta": "chart",
  "invariante ✓": "invariant ✓",
  "invariante": "invariant",
  "depende da carta": "chart-dependent",
  "depende da carta e do observador de referência":
    "depends on the chart and reference observer",

  /* ---- relatório ---- */
  "Relatório de laboratório": "Lab report",
  "laboratório de relatividade geral": "general relativity laboratory",
  "Imprimir / salvar PDF": "Print / save PDF",
  "Configuração": "Configuration",
  "Resultados": "Results",
  "Validação numérica": "Numeric validation",
  "Séries do experimento": "Experiment series",
  "Missões verificadas pelo motor": "Missions verified by the engine",
  "Referências": "References",
  "Reprodutível:": "Reproducible:",
  "Gerado por CosmoLab": "Generated by CosmoLab",
  "precessão validada contra einsteinpy (2 ppm no observável) e motor coberto por suíte científica — docs/VALIDATION.md":
    "precession validated against einsteinpy (2 ppm in the observable) and engine covered by a scientific test suite — docs/VALIDATION.md",
  "Observável": "Observable",
  "Valor": "Value",
  "Origem": "Provenance",
  "Referência analítica": "Analytic reference",
  "Grandeza": "Quantity",
  "Interpretação": "Interpretation",
  "qualidade da integração": "integration quality",
  "constante de Killing temporal": "timelike Killing constant",
  "constante de Killing axial": "axial Killing constant",
  "E não é conservada em geral": "E is not generally conserved",
  "L não é conservado em geral": "L is not generally conserved",
  "≈ 0 em vácuo": "≈ 0 in vacuum",
  "invariante de curvatura (independe da carta)": "curvature invariant (chart-independent)",
  "Matéria efetiva (ρ, NEC)": "Effective matter (ρ, NEC)",
  "Círculos axiais (g_φφ)": "Axial circles (g_φφ)",
  "teste suficiente para CTCs axiais; não decide causalidade global":
    "sufficient test for axial CTCs; does not determine global causality",
  "Geodésica": "Geodesic",
  "Parâmetros": "Parameters",
  "Métrica": "Metric",
  "nula (fóton)": "null (photon)",
  "timelike (partícula massiva)": "timelike (massive particle)",
  "nula (fóton)_geo": "null (photon)",

  /* ---- FLRW ---- */
  "Expansão cósmica": "Cosmic expansion",

  /* ---- warp (Alcubierre) ---- */
  "Warp — Alcubierre": "Warp — Alcubierre",
  "O piloto cruza a distância em queda livre DENTRO da bolha: dτ = dt (sem paradoxo dos gêmeos) e, com β > 1, chega antes do fóton de referência — em coordenadas. O preço, medido pelo motor: densidade de energia NEGATIVA na parede (NEC violada).":
    "The pilot crosses the distance in free fall INSIDE the bubble: dτ = dt (no twin paradox) and, with β > 1, arrives before the reference photon — in coordinates. The price, measured by the engine: NEGATIVE energy density in the wall (NEC violated).",
  "Chegada em t = D/(βc); envelhecimento do piloto 1:1; fatura de massa exótica ∝ β² e ao tamanho da bolha.":
    "Arrival at t = D/(βc); pilot ages 1:1; exotic-mass bill ∝ β² and bubble size.",
  "Velocidade da bolha β = v/c": "Bubble speed β = v/c",
  "Distância da viagem": "Journey distance",
  "β ≥ 1: superluminal em coordenadas (localmente nenhum fóton é ultrapassado). Duas bolhas em rotas opostas permitiriam CTCs (Everett 1996).":
    "β ≥ 1: superluminal in coordinates (locally no photon is overtaken). Two bubbles on opposite routes would allow CTCs (Everett 1996).",
  "A parede da bolha exige densidade de energia NEGATIVA (NEC violada) — a fatura está nos resultados.":
    "The bubble wall requires NEGATIVE energy density (NEC violated) — the bill is in the results.",
  "Velocidade média da bolha": "Mean bubble speed",
  "β programado na métrica": "β programmed into the metric",
  "superluminal em COORDENADAS: localmente nenhum fóton é ultrapassado":
    "superluminal in COORDINATES: locally no photon is overtaken",
  "Massa-energia exótica exigida": "Exotic mass-energy required",
  "∫T(n,n)dV dos observadores eulerianos (Alcubierre 1994)":
    "∫T(n,n)dV of the Eulerian observers (Alcubierre 1994)",
  "NEGATIVA: nenhuma matéria clássica conhecida fornece isso (Ford–Roman 1996)":
    "NEGATIVE: no known classical matter provides this (Ford–Roman 1996)",
  "Envelhecimento do piloto dτ/dt": "Pilot aging rate dτ/dt",
  "no centro da bolha dτ = dt exato: sem paradoxo dos gêmeos":
    "at the bubble center dτ = dt exactly: no twin paradox",
  "Vantagem sobre a luz": "Lead over light",
  "fóton de referência partindo junto, no vácuo distante":
    "reference photon departing together, in the distant vacuum",
  "Densidade na parede (euleriano)": "Wall density (Eulerian)",
  "ρ_E = −(c⁴/32πG)·β²·(df/dr)² no equador da parede":
    "ρ_E = −(c⁴/32πG)·β²·(df/dr)² at the wall equator",
  "parede da bolha (energia NEGATIVA)": "bubble wall (NEGATIVE energy)",
  "fóton de referência (corrida)": "reference photon (race)",
  "partida e chegada": "departure and arrival",
  "Expansão cósmica — FLRW": "Cosmic expansion — FLRW",
  "Um fóton emitido rumo a nós quando o universo tinha metade do tamanho: em distância PRÓPRIA ele primeiro RECUA (expansão superluminal) antes de chegar, avermelhando como 1/a. Sem Killing temporal, E não se conserva — o conservado é a²·u^x.":
    "A photon emitted toward us when the universe was half its size: in PROPER distance it first RECEDES (superluminal expansion) before arriving, redshifting as 1/a. With no timelike Killing vector, E is not conserved — the conserved quantity is a²·u^x.",
  "1+z = a(hoje)/a(emissão) = 2 para a emissão em a = 0,5; a chegada depende de Ω_m e da distância.":
    "1+z = a(today)/a(emission) = 2 for emission at a = 0.5; arrival depends on Ω_m and the distance.",
  "Ω_matéria (Ω_Λ = 1 − Ω_m)": "Ω_matter (Ω_Λ = 1 − Ω_m)",
  "Distância comóvel da fonte [c/H₀]": "Comoving distance of the source [c/H₀]",
  "Redshift cosmológico z": "Cosmological redshift z",
  "Fator de escala a(t)": "Scale factor a(t)",
  "Deriva de a²·u^x (conservado)": "Drift of a²·u^x (conserved)",
  "analítico 1+z = a(obs)/a(emissão)": "analytic 1+z = a(obs)/a(emission)",
  "nós (Via Láctea)": "us (Milky Way)",
  "galáxias comóveis (recuando em distância própria)": "comoving galaxies (receding in proper distance)",

  /* ---- diversos ---- */
  "algo quebrou": "something broke",
  "recarregar o laboratório": "reload the laboratory",
  "raio r(λ) [r_s]": "radius r(λ) [r_s]",
  "raio r(λ)": "radius r(λ)",
  "erro de norma log₁₀|g·u·u − ε|": "norm error log₁₀|g·u·u − ε|",
  "relógios t e τ [s]": "clocks t and τ [s]",
  "tempo coordenado t [s]": "coordinate time t [s]",
}

/** Traduz uma string PT para o idioma atual (fallback: a própria string). */
export function t(textPt: string): string {
  if (currentLanguage === "pt") {
    return textPt
  }

  const exact = EN[textPt]
  if (exact !== undefined) {
    return exact
  }

  for (const [pattern, replacement] of PATTERNS) {
    if (pattern.test(textPt)) {
      return textPt.replace(pattern, replacement)
    }
  }

  return textPt
}
