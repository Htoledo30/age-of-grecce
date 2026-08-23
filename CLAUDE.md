# Age of Grecce — memória técnica atual

Leia `AGENTS.md` e `PATCH_ATUAL.md` antes de trabalhar. Este arquivo descreve somente o
que o jogo faz **agora** e as armadilhas técnicas que ainda importam.

## Fontes de verdade

Não existe uma hierarquia única; cada pergunta tem sua fonte:

| pergunta                         | fonte                                     |
| -------------------------------- | ----------------------------------------- |
| comportamento atual              | código → testes → este arquivo            |
| decisão de design ou arquitetura | `DECISOES.md`                             |
| trabalho autorizado agora        | `PATCH_ATUAL.md`                          |
| direção macro                    | `ROADMAP.md`                              |
| ideias futuras                   | `BACKLOG.md` — não autoriza implementação |
| processo e coordenação           | `AGENTS.md`                               |

`DECISOES.md` prevalece sobre este arquivo quando descreve uma intenção futura. Exemplo:
hoje o Quartel ainda bloqueia recrutamento; a decisão registrada é fazê-lo melhorar a
qualidade sem continuar como requisito.

## Projeto e estado atual

Age of Grecce é um grand strategy por províncias no mundo grego de 700 a.C. O mapa é fixo:
205 províncias, 53 regiões e 148 poderes. A última versão fechada é
**`0.0.2 — Fechamento da guerra básica`** (2026-08-23). **Não há patch em desenvolvimento**:
o próximo da fila é o `0.0.3 — Economia física básica`, e ele só começa quando virar
`PATCH_ATUAL.md`.

O ciclo terrestre local já permite:

- iniciar campanha com Atenas;
- selecionar e conquistar províncias;
- construir, investir e recrutar;
- formar, dividir, dispensar e mover hostes;
- resolver movimentos simultâneos e batalhas;
- usar milícia, assalto e cerco;
- surtir da cidade sitiada e socorrê-la de fora;
- sofrer e impor a regra da Muralha, que exige cerco antes do assalto;
- ler na crônica o que aconteceu em cada rodada;
- manter poderes em exílio enquanto ainda possuem hoste.

Ainda não existem IA, diplomacia, naval, save/load nem fim de campanha. Economia física,
alimentação, felicidade funcional, nacionalidade funcional e fluxo de troca de capital
pertencem a patches futuros do `ROADMAP.md`.

## Stack

- TypeScript para regras e integração.
- Pixi.js/WebGL para o mapa.
- HTML e CSS para toda a interface.
- Vite para desenvolvimento e build.
- Electron para desktop; o processo principal permanece em `electron/*.cjs`.
- Zod para validar os JSON na carga.

## Regras estruturais

### Tela e entrada

- O palco lógico é sempre **1920×1080** e escala por CSS.
- Somente `src/estilo/escala.ts` lê o tamanho real da janela.
- Coordenadas do mouse passam por `paraPalco()`.
- A entrada do mapa escuta o **canvas**, não `#palco`, para cliques na UI não vazarem.
- Arrasto e clique se separam pelo percurso entre apertar e soltar; até 5 px é clique.
- A soltura pode ocorrer na janela, mas só vale quando o aperto começou no alvo. Isso evita
  o clique fantasma coberto por `testes/tela/selecao.spec.ts`.

### Dados, assets e módulos

- Conteúdo e balanceamento ficam em `dados/*.json`, validados por
  `src/dados/esquema.ts`; não esconder números ajustáveis no TypeScript.
- `assets/` é público do Vite. Saídas assadas em `assets/mundo/` são carregadas em runtime,
  nunca importadas como módulos JavaScript.
- Estado mutável da partida fica na campanha; dados iniciais e geográficos ficam no atlas
  ou nos JSON de autoria.
- Sistemas relevantes ganham pasta própria em `src/`. `main.ts` apenas monta; arquivos
  centrais não devem acumular regras novas.
- Dívida conhecida: `src/campanha/campanha.ts` ainda coordena domínios demais e `main.ts`
  concentra montagem de UI. Extrair responsabilidades reais quando uma tarefa exigir;
  não fragmentar apenas para reduzir linhas.
- Nomes de pasta, arquivo, função e variável permanecem em português.

### Interface

- Cores vêm de `src/estilo/tokens.css`.
- Ícones vêm de `src/ui/icones-gregos.ts` e `src/ui/icones-gregos.css`.
- A linguagem visual é pedra escura, bronze e marfim, com ornamentação grega discreta.
- Interface é HTML/CSS sobre o canvas; não desenhar painéis ou texto no Pixi.
- Nunca usar `title` nativo como tooltip; usar `src/ui/tooltip.ts`.
- Regra CSS com `display` precisa respeitar `[hidden] { display: none }`.
- Ficha, ações e recrutamento só aparecem com província selecionada.
- Ações numéricas frequentes usam slider e botões proporcionais, não campos de digitação.
- O friso dos painéis é uma regra compartilhada em `src/estilo/base.css`, não um desenho
  duplicado em cada componente.

## Mapa e províncias

O mapa nasce em `gerador/gerar-mapa.ts` e é salvo em `assets/mundo/`. É ferramenta de
autoria executada manualmente; nada é gerado durante a campanha.

- Costa: Natural Earth 1:10m, sem espelhar, girar ou deformar.
- Mundo: 12288×8256 unidades; arte: 6144×4128 px.
- Janela: 18,7°–32,4° E e 34,5°–41,7° N.
- `ALTURA_MAPA` carrega a proporção e `conferirProporcao()` recusa distorção acima de 1%.
- O relevo e os rios atuais são procedurais. Não derivar regras históricas de terreno,
  agricultura ou combate a partir deles. A costa é o dado geográfico confiável.

`dados/provincias.json` guarda as sementes autorais. `npm run gerar-provincias` produz:

- `assets/mundo/provincias.png`: índice de província por pixel;
- `assets/mundo/provincias.json`: identidade, região, dono inicial, centro, área e
  vizinhanças.

O shader em `src/mapa/provincias-mapa.ts` usa o índice para endereçar uma paleta política.
Conquista troca a paleta; não regenera imagem ou geometria. Índices usam amostragem por
vizinho mais próximo e sem mipmap: interpolar IDs inventa províncias inexistentes. A
fronteira política não redesenha o litoral.

Perto, a fronteira usa campo interpolado para não serrilhar; longe, usa amostras que
acompanham o fragmento para não ficar tracejada. Escada e tracejado são problemas de
medida, não de cor. Calibração visual usa `npm run calibrar-fronteira`.

Ilhas sem semente são atribuídas explicitamente por `anexos` em `dados/provincias.json`.
Não escolher automaticamente “a ilha mais próxima”. Componentes separados não criam
vizinhança terrestre falsa. O recorte atual deve continuar com zero pixels de terra sem
dono.

### Armadilhas geográficas

- As primeiras 26 linhas e as últimas 26 colunas da moldura são canal artificial de água.
  Qualquer futuro recorte naval deve removê-las antes de detectar litoral.
- A Anatólia ainda tem províncias grandes por falta de sementes; isso é conteúdo futuro.
- `ferramentas/sitios.ts` usa constantes antigas e não é fonte confiável. Corrigir ou
  remover antes de usar seus resultados.

## Atlas, campanha e propriedade

Há três níveis diferentes:

| fonte                            | significado                       |
| -------------------------------- | --------------------------------- |
| `assets/mundo/provincias.json`   | estado inicial assado de 700 a.C. |
| `Atlas` em `src/mundo/atlas.ts`  | geografia e identidade imutáveis  |
| `estado.dono` em `src/campanha/` | proprietário atual e mutável      |

- `estado.dono` contém as 205 províncias, não apenas diferenças contra o atlas.
- `trocarDono` é uma primitiva: não contém regras de fronteira ou guerra.
- Conquista remove incentivo e obra em curso, mas preserva construção concluída.
- Repintar donos é idempotente e a paleta é enviada à GPU no máximo uma vez por quadro.
- Um poder está vivo enquanto possui território **ou hoste**. Sem território e com hoste,
  está no exílio.

## Economia e população atuais

Existem **duas camadas econômicas ao mesmo tempo**, e é de propósito.

A antiga, em moeda, continua sendo a única que paga tropa e obra:

`renda = impostos da população + produção do produto + comércio`

A física, do patch `0.0.3`, vive ao lado dela e ainda não vira dinheiro:

`unidades por turno = potencial natural (nível) × população produtiva`

- a conta está em `src/producao/producao-fisica.ts` e a escala em
  `dados/ajustes.json` (`economia.producao`), nunca cravada no TypeScript;
- **principal e secundário produzem pela mesma regra**; o secundário sai menor porque o
  nível dele é menor, não porque exista multiplicador de "ser secundário";
- a colheita entra no **estoque da própria província** (`estado.estoques`) ao passar o
  turno, no mesmo instante da arrecadação — antes da resolução das marchas, para a safra
  do ano não cair no colo de quem tomou a província naquela virada;
- **ninguém consome, vende ou deteriora nada ainda**: o estoque só enche. Consumo é o
  `0.0.4`, mercado o `0.0.5`, dinheiro o `0.0.6`;
- não somar a colheita na renda: o mesmo trigo seria contado duas vezes. A troca de uma
  camada pela outra pertence aos patches de dinheiro e mercado;
- modificadores (Oficina, incentivo) **ainda não entram** na produção física; eles são
  reescritos no `0.0.11` e no `0.0.6`, e é lá que voltam a esta conta.

Somente Atenas, Maratona, Sunião, Elêusis e Tanagra possuem ficha econômica. As outras 200
não arrecadam nem são simuladas economicamente. Valores atuais pertencem a
`dados/economia.json` e `dados/ajustes.json`; não duplicá-los neste arquivo.

- Área não gera dinheiro.
- Produto e nível natural ficam nos dados; investimento temporário melhora exploração,
  nunca o nível.
- Investimento, obra, renda e manutenção usam o tesouro do poder correto.
- `estado.tesouros` é indexado por id de poder. `Campanha.tesouro` é apenas a visão do
  tesouro do jogador para a interface.
- Arrecadação e pagamento percorrem poderes em ordem de id para manter determinismo.
- Investir e construir ainda exigem ficha econômica; recrutar não deve depender dela.
  Elêusis e Tanagra começam com Quartel; Atenas, não — erguer o primeiro é decisão do
  jogador, e há teste de tela contando com isso.

População atual vive em `estado.populacao`; `dados/economia.json` guarda a população
inicial. Recrutamento retira pessoas imediatamente, desmobilização devolve cada origem e
mortes são perdas reais.

- Não existe capacidade máxima artificial de população.
- Crescimento atual é proporcional à população e arredondado para baixo; a taxa vem de
  `dados/ajustes.json`.
- Sem alimentação, o crescimento ainda não possui freio sistêmico. Essa é a transição até
  o patch `0.0.4`, não autorização para recriar um teto artificial.
- População zero não se repovoa sozinha; migração continua fora do escopo.
- `populacaoMinima` preserva o piso que a província não cede ao recrutamento.

### Ficha das cinco províncias

Além de produto, nível e comércio-base, cada província da região de teste tem em
`dados/economia.json`: nacionalidades da população, felicidade inicial, recurso
secundário, estoque, construções iniciais e `ancoradouro`. Tudo é copiado para o estado na
montagem da campanha e lido por `Campanha.perfilDe`.

Quatro desses campos **existem sem fazer nada ainda**, de propósito, e cada um espera seu
patch no `ROADMAP.md`:

- o secundário não entra na renda — o `0.0.3` introduz a economia física;
- ninguém consome alimento — `alimento.consumoPorHabitante` é só a régua que dimensiona
  o estoque inicial em cerca de cinco turnos; o `0.0.4` faz o consumo morder;
- a felicidade não muda nem influencia nada — isso pertence ao `0.0.7`;
- a nacionalidade não pesa em nada — ela existe pro dia em que um poder governar gente que
  não é dele; seus efeitos pertencem ao `0.0.8`.

Não “completar” esses sistemas por conta própria: a ordem das etapas existe porque cada uma
depende da anterior. O que vale conferir é que o dado continua coerente — o esquema recusa
secundário que renda mais que o principal, fração de povo que não soma 1 e id de produto
inexistente.

Construções atuais: Ágora, Oficina, Mercado, Celeiro, Quartel e Muralha. Obras são pagas à
vista, concluem após algumas rodadas, não podem ser canceladas e avançam depois da
arrecadação. Uma província executa uma obra por vez. O catálogo usa união discriminada de
efeitos; construção que não gera renda não mostra prazo de retorno financeiro.

O Porto ainda não existe. Slots, níveis de construção e a nova função do Quartel pertencem
aos patches `0.0.10` e `0.0.11` do roadmap.

## Hostes, recrutamento e movimento

- Recrutar custa tesouro do dono e população da província.
- A leva aparece em `estado.formacoes` e só vira hoste na rodada seguinte.
- Formação não marcha, não luta e não paga manutenção.
- Ao concluir, posse e ocupação são verificadas novamente; formação inválida devolve os
  homens à origem, mas não o ouro.
- Cada soldado mantém origem provincial. Força total é derivada de `origem`, nunca guardada
  em paralelo.
- Deserção proporcional ocorre quando o poder não paga; desertores retornam às origens.
- Dispensar homens em território conquistado pode devolver população ao atual dono daquela
  terra. Isso é consequência deliberada da origem provincial.

`estado.hostes` é indexado pelo **id da hoste**; posição fica em `hoste.posicao` e o próximo
id em `estado.proximaHoste`. Ordens também usam id de hoste. Não voltar a indexar hoste por
província: o modelo precisa permitir mais de uma força no mesmo lugar.

- **A hoste é endereçada por id, inclusive pela interface.** `hoste(id)` devolve uma;
  `hostesEm(provincia)` devolve todas as que estão num lugar, e pode haver duas de poderes
  diferentes — é o caso do cerco. `exercitoEm(provincia)` não existe mais: ele devolvia "a
  primeira por id" e passou a mentir no dia em que sitiante e guarnição puderam dividir a
  província.
- `forcaEm(provincia)` responde **pelo dono da terra** quando o poder é omitido. Na cidade
  sitiada isso é a guarnição do defensor, nunca o acampamento do sitiante; quem fala de uma
  hoste específica usa `forcaDaHoste(id)`.
- Hostes do mesmo poder podem fundir ao se encontrar por regra de mobilização, não por
  limitação estrutural.
- Movimento é ordem resolvida ao passar o turno, uma fronteira por rodada.
- É possível destacar somente parte da hoste.
- A resolução é simultânea e determinística; detalhes vivem em
  `documentacao/design/resolucao-da-rodada.md`.
- Ao implementar partida, guardar a lista antes de remover hostes do tabuleiro; iterar o
  estado já esvaziado faz todas desaparecerem.

## Milícia, combate e cerco

Combate atual é numérico, determinístico e provisório. Não adicionar tipos de tropa,
moral, generais, terreno ou combate tático durante o patch atual.

- Milícia é derivada da população, nunca armazenada como outro manancial humano.
- Ela defende a cidade, não vira hoste e dispersa depois da resolução.
- Muralha multiplica a defesa; perdas devem voltar de unidades defensivas para homens antes
  de reduzir população.
- **A Muralha também proíbe o assalto imediato.** Cidade aberta cai no primeiro assalto;
  contra uma província fortificada é preciso ter sentado na frente dela por
  `combate.cerco.rodadasParaAssaltarMuralha` rodadas. Quem diz que a obra exige isso é o
  campo `impedeAssaltoImediato` do catálogo, nunca o id `muralha` escrito na regra.
- `Cerco.rodadas` conta há quanto tempo o exército está sentado ali e **não é progresso**:
  nenhuma cidade abre os portões sozinha ao fim da contagem. Ele responde uma pergunta só —
  já dá para assaltar aquela muralha? Zera quando o sitiante sai, morre ou é substituído.
- Na região de teste, **Tanagra começa com Muralha e Elêusis não**: são os dois vizinhos de
  Atenas, um de cada tipo, e é esse par que torna a diferença jogável sem montar cenário.
- Entrar numa província inimiga com população não transfere automaticamente a posse.
- Assaltar tenta tomar a cidade imediatamente e custa homens.
- Sitiar nunca conquista sozinho: corta produção e comércio, preserva impostos e espera
  uma decisão posterior.
- Sitiar também **não engaja o exército inimigo**: sitiante e defensor ficam acampados na
  mesma província sem se aniquilar. Assaltar engaja — o choque de campo acontece antes da
  muralha. A regra é `quemLuta` em `src/movimento/resolucao.ts`, e quem defende a própria
  terra luta sempre.
- O cerco acaba quando o SITIANTE sai, não quando o dono aparece. Apagar o cerco só porque
  há hoste do dono ali daria ao defensor uma forma de quebrá-lo sem lutar.
- A **surtida** é a resposta do sitiado: ele sai para atacar quem o cerca e o choque deixa
  de ser opcional para o sitiante. Vitória levanta o cerco; derrota desfaz a hoste que
  saiu e o cerco continua. A milícia não vai junto — ela é da cidade.
- **Socorro que chega de fora também engaja**: marchar para a própria cidade sitiada é
  atacar quem a sitia, sem nada a declarar. As duas regras vivem em `choqueObrigadoEm`,
  em `src/movimento/resolucao.ts`.
- Marcha para terra própria **não declara postura**. As posturas são indexadas por
  província de destino, e sem isso a ida do defensor para casa rebaixava o assalto do
  sitiante a cerco.
- Província inimiga realmente vazia cai ao primeiro ingresso.
- O sitiante acampa visualmente próximo da divisa; postura pertence à ordem de destino.
- Marchar embora, morrer ou perder a condição territorial encerra o cerco como
  consequência do estado.

## Interface das hostes e movimento

- Marcadores de hoste são HTML sobre o canvas e usam a cor do dono da hoste. **Um marcador
  por HOSTE, com o id dela por chave** — por província só cabia um, e o segundo exército
  sumia do mapa numa cidade sitiada.
- A bandeira de cerco tem camada própria (`#ui > .cercos`) porque o sitiante é desenhado na
  divisa e a marca precisa ficar sobre a cidade. Ela não intercepta clique.
- A camada deve ser selecionada como `#ui > .hostes`; `.hostes` sozinho pode capturar todos
  os cliques do mapa por causa da especificidade de `#ui > *`.
- Posição usa a propriedade CSS `translate`, não `transform`, para animação de `scale` não
  deslocar a peça.
- Elemento novo só aparece depois de receber coordenada (`data-posicionada`). Isso evita
  piscar em `(0,0)` antes do próximo quadro.
- Província selecionada fica à esquerda; hoste selecionada, abaixo à direita. Recrutar é
  ação da província; dispensar é ação da hoste.
- Possibilidades usam rotas tracejadas e destinos; ordem registrada usa seta e quantidade;
  resolução anima a marcha e depois remove a seta.
- A animação é apenas apresentação. O estado já foi resolvido e não pode depender dela.
- Relatório guarda a trilha completa, não um resumo separado de origem/destino.
- O relatório da rodada vira texto em `src/ui/cronica.ts`: batalhas, milícia, conquistas,
  cercos começados e levantados. **Só notícia, nunca playback** — barra, velocidade e pular
  são o visor de batalha do `0.0.13`. Quem escreve a frase é `main.ts`, que sabe os nomes;
  a crônica recebe texto pronto.
- `batalhas[].tipo` separa `campo`, `estrada` e `assalto`: um assalto produz duas batalhas
  na mesma província e na mesma rodada, e sem o tipo a crônica escrevia duas linhas iguais.
- `inspecao.passarTurno` deve seguir o mesmo fluxo visual do botão.

## Verificação

Comandos principais:

| comando                    | função                                    |
| -------------------------- | ----------------------------------------- |
| `npm run dev`              | servidor no navegador                     |
| `npm run app`              | Electron em desenvolvimento               |
| `npm run capturar`         | captura 1920×1080 e erros de console      |
| `npm run verificar`        | tipos, lint, código morto, testes e dados |
| `npm run teste-tela`       | Playwright com até 2 workers              |
| `npm run build`            | build de produção                         |
| `npm run empacotar`        | instalador Electron                       |
| `npm run gerar-mapa`       | regenera o mapa; demorado                 |
| `npm run gerar-provincias` | regenera o recorte político               |

Para UI: alterar → capturar → abrir o PNG → corrigir. Captura oculta usa SwiftShader e não
serve para medir FPS. Artefato preto visto apenas nela deve ser confirmado com
`--visivel` antes de virar investigação.

Testes de tela precisam permanecer limitados a 2 workers: o mapa WebGL torna a execução
paralela demais instável.

## Armadilhas operacionais

- `ELECTRON_RUN_AS_NODE` faz Electron rodar como Node; `ferramentas/app.mjs` remove a
  variável. Não voltar a lançar Electron por shell.
- `JANELA=1` abre o Electron em janela.
- Vite deve subir pela API dentro de `app.mjs` e `captura.ts`; subprocesso via shell no
  Windows deixa servidor órfão na porta 5173.
- O título usado para reconhecer o servidor vem de `index.html`; não duplicar a string no
  código.
- `jogar.bat` é a entrada por duplo clique e deve encerrar também o servidor ao fechar.
- **Duas execuções de `vitest` ao mesmo tempo fazem TODOS os arquivos falharem na carga**,
  não em asserção — duas sessões trabalhando no repositório disputam o cache de transformação.
  O sintoma é assustador e o conserto é rodar de novo. Confirmar antes de investigar.

Antes de marcar qualquer tarefa como concluída, siga a Definition of Done de `AGENTS.md`,
atualize o status no `PATCH_ATUAL.md` e registre mudanças concluídas em `CHANGELOG.md` sob
**Não lançado**.
