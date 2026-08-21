# Esqueleto: estado de partida e o turno

## Para a Claude

Leia este documento antes de mexer em estado de campanha, turno, tesouro ou salvamento.
Ele é a fatia seguinte do esqueleto jogável descrito em
`documentacao/design/estrategia-de-desenvolvimento.md`, e para **antes** de exército,
combate e IA de propósito.

**Situação: em andamento.** Fatiado em ciclos pequenos a pedido do usuário, pra dar pra
jogar e avaliar entre um e outro.

| ciclo | o quê | estado |
|---|---|---|
| 1 | começar como Atenas, ano, turno, tesouro, renda, barra e passar turno | **feito** |
| 1b | economia: produto, nível, população, comércio e investimento | **feito** |
| 1c | construções econômicas permanentes (Ágora, Oficina, Mercado) | **feito** |
| 2 | propriedade mutável e anexação provisória | a fazer |
| 3 | salvar e carregar | a fazer |
| 4 | realçar todo o território de um poder | a fazer |
| — | adjacência marítima | adiada até movimento militar ou liberar poderes insulares |

O ciclo 1 entregou `src/campanha/{renda,estado-campanha,campanha}.ts`,
`src/ui/barra-turno.{ts,css}`, `src/ui/controles.css` e `testes/campanha.test.ts`, ligados
ao `InicioJogo` que já existia. Conferido na tela: turno 1 = 700 a.C. / 50 moedas / +15;
turno 2 = 699 a.C. / 65 moedas, sem erro de console.

**Decisão levantada e ainda em aberto:** um turno = um ano. Está em
`dados/ajustes.json` como `jogo.anosPorTurno`, com comentário no esquema, justamente pra
não virar regra por omissão.

## Contexto

O tabuleiro está pronto e o primeiro núcleo de simulação já funciona. O mapa real da
Grécia possui 205 províncias e 148 poderes, camada política com preenchimento e fronteira,
clique que seleciona e ficha que informa. A campanha guarda jogador, ano, turno e tesouro;
Atenas recebe renda ao passar o turno. `src/nucleo/tempo.ts` continua sendo somente o
relógio de quadro: o calendário da campanha só avança por comando. Nesta etapa,
`assets/mundo/provincias.json` ainda é dado assado e imutável e representa os donos
iniciais, pois nenhuma regra altera propriedade ainda.

O `documentacao/design/estrategia-de-desenvolvimento.md` já decidiu o rumo: **fechar um
esqueleto completamente jogável antes de aprofundar qualquer sistema**, com regras
provisórias permitidas. A lista de lá, com o que já existe:

| do esqueleto | hoje |
|---|---|
| navegar pelo mapa | ✅ |
| selecionar e inspecionar províncias | ✅ |
| entender quem controla cada território | ⚠️ parcial — dá pra clicar uma a uma, não dá pra ver um reino |
| **iniciar campanha, escolher um poder** | ⚠️ parcial — o fluxo existe, mas somente Atenas está liberada no protótipo |
| **passar o turno** | ✅ — avança calendário e arrecada renda |
| **ter um recurso genérico pra decidir** | ⚠️ parcial — tesouro e renda existem, ainda não há onde gastar |
| **conquistar e perder províncias** | ❌ (`trocarDono` existe e ninguém chama) |
| **salvar e continuar** | ❌ |
| exército, guerra, batalha, IA | ❌ — **fatia seguinte, não esta** |

Esta fatia pega exatamente o próximo bloco contíguo dessa lista e para antes do exército.
O motivo de parar ali: exército, combate e IA todos dependem de existir estado mutável,
turno e adjacência utilizável. Construir a fundação primeiro é o que evita refazê-la sob
pressão depois.

## A descoberta que muda o desenho

Conferido no dado real, duas vezes:

- **35 das 205 províncias não têm nenhuma vizinha terrestre**
- **34 dos 148 poderes são inteiramente ilhados** — Egina, Córcira, Cós, Quios, Samos,
  Ítaca, Rodes, Tasos, Lemnos, Cítera, Pafos…
- o grafo de terra tem **38 componentes**

Num jogo cujo prémio é "comece com qualquer um dos 148 poderes", **23% deles não teriam
ação legal nenhuma**: não podem atacar e não podem ser atacados. E o problema não some na
fatia seguinte — o exército faz a mesma pergunta.

Então esta fatia inclui **adjacência marítima derivada**, calculada no carregamento a
partir do arquivo assado, sem regerar mapa nem tocar em `provincias.json`:

> Duas províncias são vizinhas por mar quando estão em **componentes de terra
> diferentes** e cada uma está entre as **K mais próximas** da outra dentro de uma
> distância máxima. **Mútuo**, não unilateral.

"Componentes diferentes" proíbe pular por cima de um vizinho terrestre. "Mútuo" impede
explosão de grau. Com `K = 5` e `distanciaMaxima = 1100` unidades (~108 km) o grafo vira
um componente só mais Pafos, que é uma lasca de Chipre na borda e fica honestamente
inalcançável. Custo: ~42 mil comparações uma vez no boot.

---

## Arquitetura

### A regra que sustenta tudo

> **`campanha.estado` é exatamente o que vai pro disco.** `JSON.stringify(estado)` é o
> salvamento. O que não está nele é, por definição, efêmero.

E uma regra de dependência que torna todas as regras testáveis sem navegador:

> **Nada em `src/jogo/` importa `pixi.js` nem toca no DOM, exceto `vinculo.ts`.**

Isso deixa o conjunto de regras inteiro rodar em `vitest` (que é `environment: 'node'`,
sem jsdom) lendo o `provincias.json` de verdade, como `testes/dados.test.ts` já faz.

### Módulos novos

```
src/nucleo/eventos.ts     Emissor<M> tipado, ~30 linhas
src/jogo/atlas.ts         visão indexada e IMUTÁVEL do assado: id↔índice, poder,
                          vizinhança terrestre, componentes e a vizinhança MARÍTIMA
src/jogo/regras.ts        funções puras: renda(), custoDeAnexar(), formatarAno()
src/jogo/estado.ts        as interfaces do estado mutável + o esquema Zod do salvamento
src/jogo/campanha.ts      classe Campanha: dona do estado, aplica regras, emite eventos
src/jogo/salvamento.ts    gravar/ler num Armazem injetado, com Zod + coerência cruzada
src/jogo/vinculo.ts       o ÚNICO arquivo que conhece Campanha e CenaMapa ao mesmo tempo
src/ui/barra-turno.ts+css topo-centro: data, tesouro, renda, "Passar o turno"
src/ui/barra-acao.ts+css  baixo-centro: o que dá pra fazer com o que foi clicado
src/ui/controles.css      vocabulário de botão compartilhado (.botao, .botao--principal)
```

### O estado

```ts
export interface EstadoCampanha {
  versao: 1;
  /** Impressão digital do recorte assado. Salvar num mapa e ler noutro é erro. */
  recorte: { epoca: string; provincias: number; poderes: number };
  /** Negativo é a.C.: 700 a.C. é -700. Não existe ano 0. */
  ano: number;
  turno: number;
  /** null enquanto ninguém foi escolhido — é o que distingue abertura de partida. */
  jogador: string | null;
  tesouro: Record<string, number>;
  /** Dono ATUAL por id. Sempre completo: 205 entradas. */
  dono: Record<string, string>;
  anexacoesNoTurno: number;
  cronica: string[];
}
```

**Assado × mutável × derivado**, e a regra é: tudo que dá pra derivar, deriva.

| o quê | onde | por quê |
|---|---|---|
| `indice`, `nome`, `regiao`, `areaKm2`, `centro`, `vizinhas`, cor do poder | assado | é geometria e identidade |
| `dono` no arquivo assado | assado, e passa a significar **dono INICIAL** | é a condição de 700 a.C. |
| dono corrente, tesouro, ano, turno, jogador, crônica | estado | é o que a partida muda |
| renda, poder vivo/morto, províncias de um poder, vitória/derrota | **derivado, nunca gravado** | gravar é convidar dessincronia |
| província selecionada | campo efêmero de `Campanha`, **fora** de `estado` | é ponteiro, não partida |

**Guardar os 205 donos, não um diff contra o assado.** Diff é menor e é armadilha: se o
`provincias.json` for reassado com uma fronteira movida, o diff mistura duas eras em
silêncio. A tabela cheia mais a impressão digital falham alto.

### Ligação: comando por chamada, notícia por evento

- **UI → Campanha é chamada direta.** `botao.onclick = () => campanha.passarTurno()`.
  Comando é 1→1; passar por barramento só esconde o grafo de chamadas.
- **Campanha → mundo é evento.** `mudouDono` já tem quatro consumidores no primeiro dia
  (paleta, barra de turno, ficha, salvamento automático). O padrão atual de callback em
  `main.ts` (`aoSelecionar`, `aoTrocarCores`) serve pra dois e deixa de servir aqui — é
  exatamente assim que `main.ts` vira função-deus.

`vinculo.ts` faz cinco coisas: traduz seleção do mapa em id, **repinta tudo** a cada
evento (função idempotente — 205 entradas é de graça, e é o que faz retomar salvamento
produzir a mesma tela que jogar), chama `trocarDono`, salva no fim do turno, e entrega os
callbacks de comando pra UI. `main.ts` cresce ~5 linhas e continua sendo raiz de
composição.

### Uma correção de raiz que precisa entrar junto

`InfoProvincia.poder` é montado no construtor de `ProvinciasMapa` a partir do dono
**assado**. Na primeira conquista, a ficha passa a mentir para sempre. Consertar
atualizando também esse mapa duplicaria a verdade num terceiro lugar.

**Corrigir na raiz:** `provinciaEm()` passa a devolver `number | null` (o índice),
`CenaMapa.aoSelecionar` recebe índice, e **`InfoProvincia` é apagada**. A ficha passa a
receber um modelo de vista que `vinculo.ts` compõe de `Atlas` (geografia) + `Campanha`
(dono atual, renda, é-meu). Três arquivos tocados, um dado duplicado a menos.

---

## Realce de reino: o byte de alfa da paleta

A paleta 256×256 de `provincias-mapa.ts` escreve alfa 255 e o shader lê só `.rgb` —
**o byte de alfa está livre**, confirmado. Ele vira o **nível de realce** da província:

- `1.00` — reino da província **selecionada** (de qualquer poder)
- `0.35` — reino do **jogador**, sempre levemente aceso depois que a campanha começa
- `0.00` — nada

Nível contínuo, não enumeração: quando o jogador seleciona uma província própria, 1,0
vence por construção, sem tabela de prioridade. Custo: um byte por província e um envio
de textura por mudança de seleção. Nenhuma textura nova, nenhuma geometria nova.

⚠️ **`alphaMode: 'no-premultiply-alpha'` na fonte da paleta passa a ser estrutural.** Se
alguém trocar pra pré-multiplicado, escrever alfa 0 zera o RGB e todo reino não realçado
fica preto. Comentário no `BufferImageSource` e linha no `CLAUDE.md`.

⚠️ **`escreverNaPaleta` escreve `paleta[base+3] = 255`. Essa linha tem que sair** — senão
o mapa inteiro nasce permanentemente realçado, e vai parecer bug de shader por uma hora.

No fragmento, a leitura da paleta passa a trazer o alfa, e as duas linhas que montam
`corBase`/`alfaBase` viram:

```glsl
vec4 tinta = texture(uPaleta, (meus + 0.5) / 256.0);
vec3 cor = tinta.rgb;
float realce = tinta.a;
...
vec3 corBase = mix(cor, uCorRealce.rgb, realce * uCorRealce.a);
corBase = mix(corBase, uCorSelecao.rgb, destacada * 0.5);
float alfaBase = max(uOpacidade, max(realce * uCorRealce.a, destacada * uCorSelecao.a));
```

O realce carrega cobertura própria pelo mesmo `max(uOpacidade, …)` que a seleção já usa —
é isso que o mantém visível **com as cores dos reinos desligadas**, que é justamente
quando ele mais importa. Nada abaixo dessa linha muda: fronteira, litoral e
pré-multiplicação da saída ficam como estão.

API nova em `ProvinciasMapa` (com repasse fino em `CenaMapa`, no estilo do
`mostrarCoresDosPoderes` que já existe):

```ts
pintarDonos(dono: Readonly<Record<string, string>>): void;   // repinta todos de uma vez
realcar(niveis: ReadonlyMap<string, number>): void;          // o que faltar volta a zero
```

Mais um detalhe barato agora e caro depois: `fontePaleta.update()` reenvia 256 KB. Vale
uma flag `sujo` marcada por `trocarDono`/`realcar`/`pintarDonos` e drenada uma vez por
quadro em `CenaMapa.atualizar()`. Três linhas, e mata a classe "N conquistas = N envios"
antes de a IA existir.

---

## Interface

A convenção atual é "controle à direita, informação embaixo à esquerda". O botão de
anexar não é nenhum dos dois: é **ação sobre a seleção**, e não pode ficar escondido
atrás de painel recolhível. Em vez de furar a regra em silêncio, ampliá-la:

| região | elemento | papel |
|---|---|---|
| topo-direita | `.painel-lateral` | o que o jogador **aciona** (global) + Salvar / Abandonar |
| baixo-esquerda | `.ficha` | o que o jogador **escolheu** (informação) + linha "renda" |
| **topo-centro** | `.barra-turno` | **o estado da campanha** |
| **baixo-centro** | `.barra-acao` | **o que dá pra fazer com o que foi clicado** |

`.barra-turno`, só depois que a campanha começa:

```
[■] ATENAS · 700 a.C. · turno 1 · ◈ 50 (+15) · 3 províncias   [ Passar o turno ▸ ]
```

`.barra-acao`, um componente com três vidas:

- sem campanha, sem seleção → `Clique numa província para escolher por onde começar.`
- sem campanha, com seleção → `ATENAS · 3 províncias · renda 15` + `[ Começar como Atenas ]`
- com campanha, província alheia → `[ Anexar Mégara — 88 ouro ]`, **ou o botão desativado
  com o motivo escrito**: `ouro insuficiente (88)`, `não faz fronteira com o seu reino`,
  `você já anexou neste turno`

Escrever o motivo é a decisão de interface mais valiosa da fatia: ensina a regra sem
tutorial. E o `podeAnexar` devolve união discriminada justamente pra isso —
`{pode:true, custo}` ou `{pode:false, motivo}`, com os textos sob teste.

**A escolha do poder é o mapa, não uma lista.** Com 148 poderes, uma lista seria pior — e
o realce de reino é o que faz o mapa-como-menu funcionar: clicar Egina acende um ponto,
clicar Sardes acende seis províncias. Dá pra **ver** o que se vai jogar antes de escolher.
Existe uma tela inicial separada na interface, sobre o mapa, seguida pela etapa de escolha
no próprio tabuleiro. Não existe uma segunda cena Pixi nem uma segunda cópia do mundo: a
mesma `Campanha` existe desde o boot com `jogador: null` e começa quando o poder é
confirmado.

Detalhes: as duas barras são centradas por conteúdo (`left:50%; translateX(-50%)`), nunca
largura cheia — `#ui > *` liga `pointer-events:auto` e uma barra larga comeria clique de
mapa. Espaço passa o turno pelo laço; **`blur()` no fim do clique do botão**, senão o botão
focado dispara clique sintético e o turno anda duas vezes. E **não usar o nome `.cartela`**:
`testes/tela/mapa.spec.ts:17` afirma que ele não existe, de propósito.

---

## Números

**Renda por província** — `max(1, round(base + porArea × areaKm2 ^ expoente))`, com
`base 2`, `porArea 0.12`, `expoente 0.5`.

As áreas variam 487× (31 → 15.101 km²). Linear faria a Frígia render 487 vezes Tenedos e
o mapa viraria uma lista ordenada por tamanho. A raiz comprime pra **6×**:

| área km² | 31 | 569 | 1158 | 2750 | 4564 | 15101 |
|---|---|---|---|---|---|---|
| renda | 3 | 5 | **6** | 8 | 10 | 17 |

Arredondado **por província**, piso 1 — assim a soma das fichas bate exata com a barra de
turno, sem deriva de ponto flutuante, e tesouro inteiro deixa asserção de igualdade
trivial no teste. Resulta: Atenas 15, Esparta 19, Macedônia 16, Corinto 5, Egina 3;
mediana 6; Frígia 92 — que continua aparecendo como a anomalia que o `CLAUDE.md` já
registra, em vez de sumir.

**Anexação** — `custoBase 40 + custoPorRenda 8 × renda(alvo)`, e **uma por turno**. Sem o
limite o jogador clica 200 vezes no turno 1 e o turno não significa nada.

**Ordem do turno** (bug de ordem aqui é silencioso, então está escrito): renda dos poderes
**vivos** → `ano += 1`, `turno += 1` → zera `anexacoesNoTurno` → crônica → emite
`passouTurno` (repinta e salva). Eliminação é resolvida na conquista, não na virada.

`formatarAno`: −700 → `700 a.C.`, −1 → `1 a.C.`, 1 → `1 d.C.`. **Não existe ano 0**, então
`passarTurno` pula de −1 pra +1. Quatro linhas e um teste.

Bloco novo em `dados/ajustes.json`, com esquema Zod (`expoente` limitado a `(0,1]`):

```json
"jogo": {
  "anoInicial": -700,
  "tesouroInicial": 50,
  "renda":     { "base": 2, "porArea": 0.12, "expoente": 0.5 },
  "anexacao":  { "custoBase": 40, "custoPorRenda": 8, "porTurno": 1 },
  "travessia": { "distanciaMaxima": 1100, "vizinhosPorProvincia": 5 },
  "cronicaMaxima": 50
}
```
mais `corRealce`, `forcaRealce`, `realceProprio` no bloco `provincias` que já existe.

Expectativa honesta de balanço: o poder mediano espera ~7 turnos pra primeira anexação, e
uma ilha pobre ~13, que provavelmente é lento demais. O primeiro botão a girar é
`tesouroInicial` — e ele está em `ajustes.json`, não em código.

---

## Salvamento

Chave `age-of-grecce:campanha:1`, versionada **na chave**, pra que subir o esquema não
consiga sequer ler bytes velhos. `salvamento.ts` recebe um `Armazem { getItem, setItem,
removeItem }` injetado: `window.localStorage` satisfaz estruturalmente e o vitest injeta
um falso com `Map` — **sem acrescentar jsdom ao projeto**.

Ler passa por três portões, nessa ordem: `JSON.parse` → **Zod** (reaproveitando o
`validar()` de `carregar.ts`, que hoje é privado do módulo e precisa ser exportado, pra
manter a mensagem padrão `arquivo inválido:\n  campo.caminho: mensagem`) →
**`conferirCoerencia`**, que confere o que o Zod estruturalmente não sabe: impressão
digital do recorte, todo id de província e de poder existe, os 205 donos estão lá,
`jogador` é poder real.

**Alto, mas não fatal.** `carregarCampanha()` estoura com o caminho do campo;
`main.ts` captura, imprime inteiro no console, começa campanha nova, e a barra de ação
diz `A campanha salva não pôde ser lida.` Salvamento corrompido não pode brickar o
executável. Salvamento automático a cada virada de turno, com `setItem` em try/catch —
cota estourada ou aba anônima avisa e segue, nunca estoura dentro do laço.

---

## Ordem do trabalho

Cada passo termina com `npm run verificar` verde.

1. **`eventos.ts` + `atlas.ts` + `regras.ts` + `estado.ts` + `campanha.ts` + testes.** Sem
   UI, sem GPU, sem DOM. O conjunto de regras inteiro testável antes de um pixel se mexer.
2. **Alfa da paleta + shader + `realcar`/`pintarDonos` + flag `sujo` + chaves de ajuste.**
   Puramente visual e independente das regras; dirigir por gancho de desenvolvimento e
   conferir com `npm run capturar -- realce --visivel`. Antes da UI de propósito: é o
   realce que faz o mapa-como-menu valer a pena.
3. **Refatoração `InfoProvincia` → índice** (`provincias-mapa.ts`, `cena-mapa.ts`,
   `ficha-provincia.ts`). Pequena e mecânica, e precisa cair antes de a campanha ser dona
   da verdade sobre donos.
4. **`vinculo.ts` + `barra-turno` + `barra-acao` + `controles.css`.** Começar e passar
   turno; o ciclo fica visível.
5. **Anexação ligada à UI**, com o texto do motivo quando desativada.
6. **`salvamento.ts` + automático + retomada + botões no painel.**
7. **`campanha.spec.ts`, `--tecla` na captura, `checar.ts`, `CLAUDE.md`.**

## Arquivos principais tocados

- `src/mapa/provincias-mapa.ts` — shader, alfa da paleta, `realcar`/`pintarDonos`, flag
  `sujo`, remoção de `InfoProvincia`
- `src/mapa/cena-mapa.ts` — repasses e `aoSelecionar(indice)`
- `src/dados/esquema.ts` — bloco `jogo` em `Ajustes`, esquema de `EstadoCampanha`
- `src/dados/carregar.ts` — exportar `validar()`
- `src/main.ts` — ~5 linhas de composição + ganchos `inspecao.campanha`
- `dados/ajustes.json` — bloco `jogo` e chaves de realce
- `src/ui/ficha-provincia.ts` — modelo de vista em vez de `InfoProvincia`
- `ferramentas/checar.ts` — `checarJogo()`
- `ferramentas/captura.ts` — `--tecla=Code` repetível
- `testes/tela/mapa.spec.ts` — só a linha do `.cartela` se necessário

## Verificação

**Unidade (`npm run teste`), lendo o `provincias.json` de verdade:**

- `regras`: `formatarAno` nas três faixas e **a sequência −700…+2 nunca contém ano 0**;
  renda monótona na área; **`renda(15101)/renda(31) < 8`** — guarda de regressão contra
  alguém tornar a renda linear, que é a falha que arruinaria o balanço em silêncio.
- `atlas`: `vizinhas` resolve e é simétrica; **35 províncias sem vizinha terrestre**;
  com `K=5, D=1100` o grafo tem **exatamente 2 componentes** e o pequeno é `['pafos']`;
  **nenhum elo marítimo une duas províncias do mesmo componente de terra**; grau ≤ K.
- `campanha`: `comecar` põe turno 1 e ano −700; `passarTurno` soma **exatamente** a renda;
  cada motivo de `podeAnexar` asserido pelo texto; `anexar` move o dono, debita o custo
  exato e recusa a segunda no mesmo turno; poder sem províncias deixa de arrecadar;
  perder a última província emite `terminou: 'derrota'`; **um poder ilhado (Egina) tem ao
  menos um alvo legal** — é o teste que teria pegado o problema dos 34 poderes.
- `salvamento`: ida e volta iguais; poder inexistente no `dono` estoura com o caminho do
  campo; `recorte.epoca` diferente é recusado; província faltando é recusada; lixo não-JSON
  é recusado.

**Tela (`npm run teste-tela`), novo `testes/tela/campanha.spec.ts`:** limpar
`localStorage`, apontar a câmera com `inspecao.posicionar(centro de Atenas, zoom 1)` e
clicar em **(960, 540)** — o centro está livre porque as duas barras são ancoradas nas
bordas. Depois: começar como Atenas → barra mostra `700 a.C.` e `50`; passar o turno →
`699 a.C.` e **exatamente 65**; dar ouro pelo gancho e anexar Elêusis → a ficha mostra
Atenas como dono; **`page.reload()` e a barra ainda diz `699 a.C.` e 4 províncias** — é o
passo que prova o salvamento automático e a fatia inteira de ponta a ponta. Zero erros de
console no percurso.

Ganchos só de desenvolvimento em `inspecao` (mesmo espírito do `calibrarFronteira`, atrás
de `import.meta.env.DEV`): `campanha.comecar`, `passarTurno`, `darOuro` e **`estado()`**,
que devolve cópia do estado — vale mais que os outros três juntos, porque deixa o teste de
tela afirmar sobre a **verdade** em vez de raspar texto.

**Olho:** `npm run capturar -- turno --em=<centro de Atenas> --zoom=1 --clicar=960,540
--clicar=<botão> --tecla=Space --visivel`, e eu leio o PNG.

**Dados:** `checarJogo()` em `ferramentas/checar.ts` imprime renda mínima/mediana/máxima
por província e por poder, faixa de custo de anexação, turnos até a primeira anexação do
poder mais pobre, componentes de terra, elos marítimos, grau máximo e **o nome de toda
província que ficar inalcançável**. Transforma os botões de balanço em número impresso em
vez de folclore.

---

## Fora desta fatia, de propósito

Exército, movimento, guerra e paz, batalha, IA, produtos, construções, múltiplos
salvamentos, desfazer, e **nenhuma cena de menu inicial**. Os 148 tesouros vão acumular
sem ninguém gastar — é inofensivo, e é exatamente o dado que a IA vai querer na fatia
seguinte. A anexação é unilateral e paga em ouro; a própria barra vai dizer
`ação provisória`, porque é o que ela é.

## Dois recados que não são desta fatia mas não deviam esperar

1. **O repositório não tem nenhum commit.** Todo o trabalho de hoje — mapa, gerador,
   províncias, shader, interface — está fora de controle de versão, e o índice ainda
   carrega 5 arquivos fantasma do projeto antigo (`MUNDO.md`, `cena-prova.ts`,
   `cartela.ts/.css`, `prova.spec.ts`). Um primeiro commit antes de abrir esta fatia é
   barato e é a única rede que existe. **Não faço isso sem você mandar.**
2. **`ferramentas/sitios.ts` está mentindo em silêncio.** Ele compila e roda, mas suas
   constantes de mundo são as antigas (`8192 × 7168`, `0,14 km/unidade`) contra o mundo
   atual de `12288 × 8256` a `0,098 km/unidade`. As coordenadas e distâncias que ele
   imprime estão num sistema que não existe mais. Ou apagar (com o script npm e a linha do
   `CLAUDE.md`), ou corrigir as três constantes. Resposta errada em silêncio é pior que
   ferramenta ausente.
