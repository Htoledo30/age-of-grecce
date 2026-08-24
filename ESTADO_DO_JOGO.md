# Age of Grecce — estado atual

Este documento é uma fotografia curta do que o jogo faz hoje. Código e testes continuam
sendo a prova final. A visão desejada, inclusive sistemas ainda ausentes, fica em
`GDD.md`.

## Visão rápida

Age of Grecce é um grand strategy por províncias no mundo grego de 700 a.C. A versão
declarada pelo projeto é `0.0.3`. O worktree atual substitui a antiga economia física por
alimentação em pontos e refaz as construções em slots e níveis, ainda sem commit.

O mapa possui 205 províncias, 53 regiões e 148 poderes. A fatia autoral cobre a Grécia
central: 25 províncias com economia completa (Ática, Megáris, Coríntia, Beócia, Eubeia,
Opunte, Siciônia e Argólida), 18 poderes inteiramente configurados — e todos eles são
jogáveis (a regra é derivada: poder com todas as províncias configuradas aparece
disponível na escolha). Onze cidades começam com guarnição em pé (`exercitos.json`);
Salamina é ilha sem vizinhança terrestre e espera o sistema naval. As outras 180
províncias seguem sem economia e sem simulação.

Ainda não existem IA, diplomacia nem naval. Save/load existe (a campanha salva sozinha a
cada mudança e o menu oferece continuar), e a campanha tem começo e fim: vitória ao
dominar a Grécia central alcançável por terra, derrota ao deixar de existir. O que falta
para a campanha completa do GDD é a IA mínima e a diplomacia necessária.

## O que o jogador consegue fazer

- iniciar uma campanha com qualquer cidade da Grécia central e navegar pelo mapa;
- selecionar províncias e hostes;
- arrecadar, decretar o nível de imposto de cada província, construir e acompanhar obras;
- recrutar usando ouro e população, esperar a formação e dispensar soldados;
- dividir, reunir e mover hostes por ordens simultâneas;
- enfrentar batalhas em províncias e encontros na estrada;
- assaltar, sitiar, fazer surtida, socorrer uma cidade e conquistar território;
- acompanhar marchas e ler a crônica da rodada;
- acompanhar o saldo alimentar inteiro do reino e ver crescimento, fome e mortes reagirem;
- especializar províncias usando quatro slots, prédios I–III e explorações condicionadas
  aos produtos locais;
- abrir o Governo e ver, na aba de Alimentação, quais províncias sustentam o reino e quais
  dependem dele;
- fechar o jogo a qualquer momento e retomar depois: todo clique já está salvo;
- ver o humor das províncias reagir a comida, cerco, conquista e Templo — e pagar o preço
  da revolta quando ele desaba;
- vencer a campanha unificando a Grécia central, ou perdê-la deixando de existir.

## Sistemas implementados

### Mundo e campanha

- O turno/rodada representa aproximadamente um ano.
- O Atlas guarda geografia e identidade imutáveis; a campanha guarda dono, população,
  hostes, construções e demais estados mutáveis.
- Conquista altera a paleta política sem regenerar o mapa.
- Um poder continua vivo sem território enquanto possuir uma hoste.
- Cada poder tem tesouro e capital próprios. A capital do jogador que cai trava a virada
  até ele assentar outra (grátis; a crônica avisa e o botão de turno diz por quê); mudá-la
  por vontade própria custa ouro (`ajustes.json`); não se assenta em cidade sitiada. Os
  demais poderes reassentam sozinhos na virada pela regra derivada (homônima → maior área
  → menor id); poder sem chão fica sem capital, e o jogador exilado passa o turno
  normalmente. O painel de ações marca a sede e oferece "Tornar/Assentar capital"; o
  Balanço marca a linha.

### Economia e população

A economia monetária calcula impostos, produção abstrata e comércio; ela paga tropas e
construções. Produtos são capacidade anual e identidade da terra, não unidades
acumuladas. Principal e secundário podem liberar construções locais.

Cada província tem um **nível de imposto** decretável — baixo (×0,8, humor +6), normal e
alto (×1,35, humor −8), números em `ajustes.json` — com efeito imediato na renda e
gradual no humor; a conquista devolve a terra ao normal. É a alavanca do GDD (receita
trocada por pressão social, referência Rome: Total War) e substituiu o antigo decreto de
investimento, removido por ser redundante com as construções e de retorno ilegível.

O Governo mostra o **saldo completo por província**: renda líquida da terra E o custo da
tropa NASCIDA nela (a origem de cada soldado é rastreada), com o veredito — sustenta ou
puxa para baixo — em coluna própria; a linha no vermelho é marcada. A ficha soma a linha
"tropa nascida aqui" no tooltip da renda. A atribuição por origem pode divergir do total
do poder em uma moeda por arredondamento; a barra usa a conta do poder.

O imposto passa pela **corrupção**: `população × taxa × (1 − corrupção)`, com
`corrupção = 1 − (1 − por tamanho) × (1 − por distância da capital)`. Cada fatia é uma
hipérbole saturante calibrada em `ajustes.json` (a distância reproduz a tabela do GDD:
0,8× a 3 saltos, 0,6× a 12). A distância é medida em saltos pelo grafo de vizinhança —
geografia, não política: inimigo no caminho não alonga a estrada. Conquistar uma terra
muda a distância dela para a capital do novo dono na hora, e mudar a capital muda a renda
do reino inteiro — é o que dá função real à escolha (e ao custo) da capital. A ficha
mostra a fração descontada no tooltip da renda; a tabela do `checar.ts` imprime a terra
sem corrupção (retrato autoral). Ágora e Estrada ainda NÃO reduzem corrupção — é papel
futuro prometido nas fichas delas.

Não existe teto populacional artificial. Crescimento, recrutamento, baixas e desmobilização
usam a população atual. Recrutar reduz população e imposto; Quartel não é requisito.

Comida é saldo em pontos do poder, em DUAS contas: `saldo civil = subsistência (+1) +
alimentos − níveis populacionais` e `saldo final = civil − exército` (`−1` por mil
soldados ou fração, excluindo tropas presas em cidades sitiadas próprias). População sobe
um nível a cada 25% acima do valor inicial; o saldo local (`produção − nível`) dá o papel
da terra: Sustentadora, Equilibrada ou Dependente.

**O povo come primeiro.** Civil negativo é **Fome**: as Dependentes (não sitiadas) perdem
`−1%` — sustentadoras nunca morrem pelas outras — e o exército `−5%`. Civil fechado com
final negativo é **Exército sem mantimentos**: só a tropa perde `−5%`, nenhum civil
morre. Final `0` é No limite; positivo, Abastecido (categorias: 4). Não há mais bônus de
crescimento por fartura.

**Cidade sitiada sai da circulação inteira** — não contribui, não pesa, não come — e vive
de UM contador de mantimentos (`alimento.cerco.mantimentos + comida da própria terra`
turnos; Fazenda é resistência de cerco). Enquanto ele dura, ninguém morre e a cidade não
cresce; vencido, povo (`−1%`) e guarnição (`−5%`) definham juntos, todo turno, sitiante
intacto. A ficha mostra a fase ("mantimentos para N turnos" → "a cidade passa fome").
Cerco não fabrica fome nacional.

**Crescimento com trava preventiva**: só cresce com saldo final positivo, e o crescimento
é simulado antes de aplicado — se empurrasse o saldo pro negativo, não acontece e a ficha
diz "limitado pela alimentação" (tudo-ou-nada por poder, determinístico). É o que garante
que Fazenda nunca causa fome (a simulação de 100 turnos que matava 10.403 civis com uma
Fazenda virou teste de regressão).

A barra mostra, por exemplo, `+3 · Abastecido` ou `−2 · Exército sem mantimentos`, e todo
negativo aparece em vermelho. A aba **Alimentação** do Governo decompõe a mesma conta —
subsistência, alimentos, população, civil, exército — com o papel de cada província e a
sitiada marcada "fora da circulação". Não há estoque ou deterioração.

### Construções

Cada província possui quatro slots e cada prédio sobe de I a III. Upgrade ocupa o mesmo
slot, paga apenas o nível novo e respeita uma obra por vez. Construções concluídas
normalmente sobrevivem à conquista.

Toda construção de pé cobra manutenção em ouro por turno (números em
`dados/construcoes.json`): a renda provincial é LÍQUIDA e uma província pode render
negativo — um Mercado numa terra pobre custa mais do que devolve, e a interface avisa
("custaria N por turno a mais do que rende"). A manutenção é cobrada inclusive sob cerco;
obra em andamento ainda não cobra. O tesouro não desce de zero pela arrecadação — o que
acontece com construção sem manutenção paga é a questão aberta "danos a construções" do
GDD. A ficha, o Governo (coluna própria) e a tabela do `checar.ts` mostram a folha.

Universais: Ágora, Mercado, Quartel, Muralha, Templo, Porto e Estrada. Porto exige
ancoradouro. Explorações aparecem conforme produto principal ou secundário: Fazenda,
Pastagem, Porto pesqueiro, Lagar, Vinhedo, Serraria, Mina e Pedreira. Fazenda, Pastagem e
Porto pesqueiro dão `+1/+2/+3` comida; as demais explorações funcionais melhoram renda.

Quartel já não bloqueia recrutamento e informa honestamente que seu bônus de qualidade é
futuro. Templo soma pontos ao ALVO de felicidade da província (+5/+8/+12). Muralha
multiplica a milícia conforme o nível e impede assalto imediato.

### Felicidade, revoltas e fim de campanha

O humor de cada província é vivo: caminha alguns pontos por turno (`passoPorTurno`) rumo
a um ALVO — base de 50, mais a comida do reino (fome −20 … abundante +10), cerco (−15),
domínio estrangeiro (dono atual ≠ dono de 700 a.C., −12), o nível de imposto (baixo +6,
alto −8) e Templo. A conquista dá um choque imediato (−25), único movimento não gradual.
Números em `ajustes.json`. A conta é LEGÍVEL como a da comida: o tooltip do humor na
ficha decompõe o alvo parcela a parcela ("base +50 · mesa farta +5 · imposto −8 · Templo
+8 → caminhando para N").

Na faixa Revoltosa (primeira faixa das `faixas`), a província entra em greve fiscal:
imposto zero, produção/comércio/manutenção seguem. Sob bandeira estrangeira, o pavio
corre: após `revolta.turnos` turnos revoltosos, 2% da população pega em armas como hoste
do dono de 700 a.C. — saindo da população, podendo reviver um poder eliminado, e cercando
a cidade até ser esmagada (surtida) ou definhar de fome. Província revoltosa de dono
legítimo faz greve e nada mais, por enquanto. A crônica noticia os levantes.

A campanha termina: vitória ao dominar todas as províncias simuladas alcançáveis por
terra (Salamina fica fora da régua até o naval), derrota ao deixar de existir. A tela de
fim aparece uma vez; dá para continuar observando o mapa ou recomeçar.

### Salvamento

O estado da campanha vai ao `localStorage` a cada mudança — não existe botão de salvar. O
menu oferece "Continuar campanha" quando há salvamento (com turno e ano escritos), e
"Iniciar jogo" vira "Nova campanha", com o aviso de que recomeçar apaga a partida.
`src/campanha/salvamento.ts` valida a forma (envelope com `versao: 1`); a
`Campanha.restaurar` confere o conteúdo contra o atlas e os catálogos e falha alto em
salvamento que não bate com o mundo (o boot avisa no console e ignora). Efêmeros —
crônica da rodada, relatório da fome — não são salvos. O índice de territórios é
remontado por `reindexar()`; as referências vivas de `estado.dono` e do objeto de estado
são preservadas na restauração.

### Guerra terrestre

- Hostes têm identidade própria e preservam a origem provincial de cada soldado.
- Ordens usam o id da hoste; mais de uma força pode ocupar a mesma província.
- Movimento é simultâneo, determinístico e limitado inicialmente a uma fronteira por
  rodada.
- Pode marchar apenas parte da hoste; forças do mesmo poder se fundem ao se encontrar.
- A matemática de combate atual é numérica, determinística e provisória.
- Milícia deriva da população e não é um estoque humano separado.
- Sitiar não engaja automaticamente a guarnição nem conquista a cidade. Assaltar engaja e
  tenta tomar a praça. A cidade sitiada continua cobrando imposto e recrutando; quem
  definha lá dentro é obra da fome do cerco, não de batalha.
- A marca de cerco usa cor fixa de fogo, sem herdar a cor política da província ou do
  sitiante.
- O sitiado pode fazer surtida e reforços externos atacam o sitiante ao chegar.
- Cidade murada exige cerco antes do assalto; cidade aberta pode ser assaltada de imediato.
- A crônica distingue batalha de campo, estrada e assalto.

## Estrutura técnica

- TypeScript, Pixi.js/WebGL, HTML/CSS, Vite, Electron e Zod.
- `src/main.ts` monta o jogo; regras vivem nos módulos de campanha, combate, movimento,
  população e produção.
- Conteúdo e balanceamento ficam em `dados/*.json`, validados por
  `src/dados/esquema.ts`.
- Assets assados do mapa ficam em `assets/mundo/` e são carregados em runtime.
- Estado mutável fica na campanha; dados autorais e geografia ficam nos JSON e no Atlas.
- Pastas, arquivos, funções e variáveis usam português.

`src/campanha/campanha.ts` ainda coordena muitos domínios e `src/main.ts` concentra a
montagem da interface. Extrair responsabilidades quando uma tarefa real exigir, sem
fragmentar apenas para reduzir linhas.

## Regras técnicas que evitam regressões

- O palco lógico é 1920×1080; somente `src/estilo/escala.ts` lê o tamanho real da janela.
- Coordenadas do mouse passam por `paraPalco()` e a entrada do mapa escuta o canvas.
- Interface é HTML/CSS sobre o canvas. Cores vêm de `src/estilo/tokens.css`, ícones de
  `src/ui/icones-gregos.ts` e tooltips de `src/ui/tooltip.ts`.
- Marcadores são endereçados por id de hoste, nunca apenas por província.
- Camadas que cobrem o palco não podem capturar cliques; seletores como `#ui > .hostes`
  evitam a regra genérica de `#ui > *`.
- A animação de marcha é apresentação: o estado já foi resolvido antes dela.
- O mapa assado usa índices de província sem interpolação ou mipmap.
- Relevo, rios e biomas atuais são procedurais e não sustentam regras históricas de
  agricultura, movimento ou combate. A costa é o dado geográfico confiável.
- As primeiras 26 linhas e as últimas 26 colunas da moldura são água artificial e devem
  ser removidas antes de qualquer futuro recorte naval.
- Duas execuções simultâneas de Vitest podem disputar o cache e produzir falhas falsas de
  carregamento.

## Verificação

Comandos principais:

- `npm run dev`: navegador;
- `npm run app`: Electron em desenvolvimento;
- `npm run verificar`: tipos, lint, código morto, testes unitários e dados;
- `npm run teste-tela`: Playwright, limitado a dois workers;
- `npm run simular`: cenários longos de paz, construção e pressão militar no terminal;
- `npm run entregar`: verificação, testes de tela e build numa única chamada;
- `npm run build`: build de produção;
- `npm run capturar`: captura 1920×1080 e erros de console;
- `npm run gerar-mapa` e `npm run gerar-provincias`: ferramentas de autoria, não runtime.

No worktree atual, `npm run verificar` passa com tipos, lint, código morto, 299 testes
unitários e validação dos dados. A suíte de tela possui 32 testes e também passa, e o
`npm run build` de produção compila limpo.

## Crédito de asset

Os placeholders de cidades e aldeias em `assets/placeholders/kenney-medieval-rts/` são do
Kenney Vleugels, pacote Medieval RTS, sob CC0. A licença original permanece junto aos
arquivos em `LICENCA.txt`.
