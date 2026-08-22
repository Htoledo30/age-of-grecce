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
205 províncias, 53 regiões e 148 poderes. O patch em desenvolvimento é
**`0.0.2 — Fundação do Mundo`**; IA continua fora do patch.

O ciclo terrestre local já permite:

- iniciar campanha com Atenas;
- selecionar e conquistar províncias;
- construir, investir e recrutar;
- formar, dividir, dispensar e mover hostes;
- resolver movimentos simultâneos e batalhas;
- usar milícia, assalto e cerco;
- manter poderes em exílio enquanto ainda possuem hoste.

Ainda não existem IA, diplomacia, naval, save/load nem fim de campanha. Economia física,
alimentação, felicidade, nacionalidades e capitais funcionais pertencem ao patch atual e
devem seguir `PATCH_ATUAL.md`; não presumir que já estejam implementadas.

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

A economia antiga continua ativa enquanto a economia física do patch não a substituir:

`renda = impostos da população + produção do produto + comércio`

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

População atual vive em `estado.populacao`; `dados/economia.json` guarda a população
inicial. Recrutamento retira pessoas imediatamente, desmobilização devolve cada origem e
mortes são perdas reais.

- Não existe capacidade máxima artificial de população.
- Crescimento atual é proporcional à população e arredondado para baixo; a taxa vem de
  `dados/ajustes.json`.
- Sem alimentação, o crescimento ainda não possui freio sistêmico. Essa é a transição até
  a Etapa 4 do patch, não autorização para recriar um teto artificial.
- População zero não se repovoa sozinha; migração continua fora do escopo.
- `populacaoMinima` preserva o piso que a província não cede ao recrutamento.

Construções atuais: Ágora, Oficina, Mercado, Celeiro, Quartel e Muralha. Obras são pagas à
vista, concluem após algumas rodadas, não podem ser canceladas e avançam depois da
arrecadação. Uma província executa uma obra por vez. O catálogo usa união discriminada de
efeitos; construção que não gera renda não mostra prazo de retorno financeiro.

O Porto ainda não existe. Slots, níveis de construção e a nova função do Quartel pertencem
às etapas posteriores de `PATCH_ATUAL.md`.

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

- `exercitoEm(provincia)` é conveniência e devolve a primeira hoste; para todas, usar
  `hostesEm`.
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
- Entrar numa província inimiga com população não transfere automaticamente a posse.
- Assaltar tenta tomar a cidade imediatamente e custa homens.
- Sitiar nunca conquista sozinho: corta produção e comércio, preserva impostos e espera
  uma decisão posterior.
- Província inimiga realmente vazia cai ao primeiro ingresso.
- O sitiante acampa visualmente próximo da divisa; postura pertence à ordem de destino.
- Marchar embora, morrer ou perder a condição territorial encerra o cerco como
  consequência do estado.

## Interface das hostes e movimento

- Marcadores de hoste são HTML sobre o canvas e usam a cor do dono da hoste.
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

Antes de marcar qualquer tarefa como concluída, siga a Definition of Done de `AGENTS.md`,
atualize o status no `PATCH_ATUAL.md` e registre mudanças concluídas em `CHANGELOG.md` sob
**Não lançado**.
