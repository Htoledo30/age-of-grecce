# Age of Grecce — contexto do projeto

Jogo de estratégia em desenvolvimento. Este arquivo é a memória do projeto: leia antes
de mexer em qualquer coisa.

## O jogo

**Estratégia por província na Grécia antiga, no espírito do Age of History.** O mapa é a
Grécia real — Epiro, Macedônia, Trácia, Tessália, Ática, Peloponeso, Creta, as Cíclades,
Rodes e a costa jônia. O tabuleiro é recortado em províncias; cada uma tem dono, e a
partida é a disputa por elas.

O recorte é histórico e nasce de dentro pra fora: Atenas tem a Ática, e a partir dela
vêm os vizinhos que existiram de verdade — Mégara, Beócia, Eubeia, Egina — até o mapa
fechar. Província não é célula de grade: é território que alguém governava.

**Este projeto nasceu de um jogo anterior** (`c:\jogos\sucessao`, mundo aberto estilo
Mount & Blade num mundo fictício). Foi copiado inteiro e teve a camada de mundo aberto
removida: personagem, cidades, vilas, travessias, rótulos, caminho e a câmera que seguia
o peão. O projeto original continua lá, intacto, e é onde está o histórico de tudo que
saiu daqui.

## Stack e por quê

- **TypeScript** — tipagem forte e ferramental de saúde de código maduro.
- **Pixi.js (WebGL)** — canvas do mapa. Lote na GPU; centenas de províncias com
  fronteira, preenchimento e destaque é confortável.
- **HTML + CSS** — toda a interface. Jogo de estratégia é painel, lista, ficha de
  província, muito texto. Foi o motivo principal da escolha da stack.
- **Vite** — servidor de desenvolvimento e empacotador.
- **Electron** — vira programa de desktop. Processo principal em JS puro
  (`electron/*.cjs`) de propósito: são poucas linhas e assim o projeto tem um
  empacotador só.
- **Zod** — valida os JSON de dados na carga.

## Regras do projeto

**Full HD é regra estrutural.** Todo layout é desenhado em **1920×1080**. O `#palco` tem
esse tamanho fixo e é escalado por CSS pra caber na tela do jogador, com barras pretas se
não for 16:9. Consequência: o que se desenha é exatamente o que aparece, em qualquer
monitor.

- Toda a resolução vive em `src/estilo/escala.ts`. **Nenhum outro arquivo deve ler
  `window.innerWidth` nem lidar com escala.**
- Coordenada de mouse sempre passa por `paraPalco()`.
- O jogo abre em tela cheia (F11 alterna).

**Dados de conteúdo ficam em JSON, nunca em código.** Ajuste, balanço e conteúdo em
`dados/*.json`, validados pelos esquemas em `src/dados/esquema.ts`. Lógica, algoritmo e
matemática de interface ficam em TypeScript.

⚠️ **`assets/` é o diretório público do Vite, e arquivo de lá NÃO se importa de
JavaScript.** Importar funciona no servidor de desenvolvimento e quebra (ou duplica o
arquivo) no empacotamento; o Vite avisa, e o aviso passa batido no meio do log. Conteúdo
escrito à mão vive em `dados/` e é importado; saída assada de ferramenta vive em
`assets/mundo/` e é buscada com `fetch` em tempo de execução, como a arte.

**Cores só via variáveis CSS** de `src/estilo/tokens.css`. Direção de arte: documento de
papel — tinta, sépia, pouca saturação.

**Nomes de pasta, arquivo, função e variável em português.**

### Regra rigorosa de arquitetura por sistemas

**Todo sistema importante do jogo deve possuir um módulo próprio em `src/`, organizado
em uma pasta com o nome do domínio.** Um sistema de combate, por exemplo, vive em
`src/combate/`; economia em `src/economia/`; diplomacia em `src/diplomacia/`. Não se
coloca a implementação inteira de um domínio em `main.ts`, em arquivos genéricos como
`util.ts`, nem em um único arquivo gigante.

Dentro do módulo, **cada arquivo deve ter uma responsabilidade clara e limitada**. Um
possível módulo de combate poderia conter, conforme a necessidade, `batalha.ts`,
`unidade.ts`, `dano.ts`, `moral.ts` e `ia-combate.ts`. Esses arquivos colaboram entre si,
mas nenhum deles deve concentrar sozinho todas as regras do sistema. Só criar uma nova
divisão quando existir uma responsabilidade real; não fragmentar uma função pequena em
arquivos artificiais.

Esta organização é obrigatória ao criar ou ampliar sistemas:

- arquivos de entrada, como `main.ts`, apenas montam e conectam os sistemas;
- interface, estado, regras, cálculos e persistência ficam separados quando forem
  responsabilidades diferentes;
- lógica compartilhada pertence ao módulo que é dono do conceito, com uma API pública
  pequena e explícita;
- conteúdo e valores ajustáveis continuam em `dados/`, nunca escondidos na lógica;
- antes de aumentar muito um arquivo, deve-se extrair a nova responsabilidade para um
  arquivo do mesmo módulo;
- nenhuma funcionalidade nova pode transformar um arquivo central em ponto único que
  conhece e executa todas as regras do jogo.

**Uma alteração que funcione, mas viole essa separação, não está concluída.** Testes
devem acompanhar o módulo correspondente e seguir a mesma divisão por sistema.

## O mapa

Nasce em `gerador/gerar-mapa.ts` e é salvo em `assets/mundo/`. É **ferramenta de
autoria**: roda na mão, nada é gerado durante uma partida.

A costa vem da **Natural Earth 1:10m** (domínio público, cache em `gerador/cache/`) e
chega ao jogo **intacta** — sem espelhar, girar ou distorcer. A forma tem que ser a que o
jogador reconhece.

| o quê | valor |
|---|---|
| janela | 18,7°–32,4° E, 34,5°–41,7° N |
| moldura | 12288 × 8256 unidades (proporção 1,50) |
| escala | ~98 m por unidade (1.199 × 801 km) |
| projeção | equirretangular, paralelo de referência em 38,1° N |
| arte do terreno | 6144 × 4128 px |
| ilha mínima | 10 km² |

A janela é panorâmica com o Egeu no centro. **A borda oeste passa rente a Otranto
(18,52° E), a ponta mais a leste da Itália** — de propósito: um grau a menos e o calcanhar
italiano entra solto no canto do mapa, do outro lado de um mar vazio, e fica ridículo. A
leste vai até Sardes, com o Helesponto e o Bósforo inteiros e com terra nas duas margens.

Não dá pra chegar a 16:9 cheio sem estragar o mapa — de um lado a Itália solta, do outro
o planalto da Anatólia, que é laje sem recorte. **A sobra dos lados é resolvida no jogo**:
`cena-mapa.ts` pinta o fundo com `0x586f70`, a mesma cor do bioma `mar-fundo`, e a borda
lê como mar aberto em vez de moldura de quadro. Se algum dia o mar do terreno mudar de
cor, esse número muda junto.

⚠️ **`ALTURA_MAPA` carrega a proporção do mundo.** Mudou a janela, ela tem que mudar
junto — `conferirProporcao()` estoura o gerador se a distorção passar de 1%, e diz qual
número usar. Sem isso a Grécia sai gorda e ninguém percebe olhando.

**O relevo ainda é procedural**, não é a altimetria real da Grécia. O Pindo, o Olimpo e o
Taigeto não estão nos lugares certos — a serra nevada que aparece no Epiro é ruído, não
montanha de verdade. Os rios também são inventados. Trocar por dado real é o maior
trabalho pendente do mapa.

Detalhe menor: no topo da moldura fica um fio claro, que é o traço de costa desenhado
onde a terra é cortada pela borda. Cosmético, mas some quando alguém cuidar dele.

## As províncias

**Época: 700 a.C., a Grécia arcaica** — escolhida porque é o momento em que nada estava
unido. Atenas mal acabou de juntar a Ática e Elêusis ainda resiste, Esparta só tem a
Lacônia e briga pela Messênia, a Macedônia é um reino minúsculo em Egas, a Pérsia não
existe, e a Trácia e a Ilíria são dezenas de tribos. Nenhum império no mapa inteiro.

O conteúdo mora em `dados/provincias.json`: **cada província é uma semente**, um lugar
real em longitude e latitude de verdade, com o dono que tinha em 700 a.C. Nada é
sorteado — mover uma fronteira é mover a semente.

`npm run gerar-provincias` faz cada semente crescer até esbarrar na vizinha, com
**Dijkstra de muitas origens, só por terra, com custo por bioma**: planície é barata,
serra é cara, água é intransponível. Por isso a fronteira cai em cima da cumeeira em vez
de do outro lado dela, e uma ilha inteira fica com um dono só — de graça, sem regra
especial. Voronoi simples não serviria: mede em linha reta, cortaria o Pindo pelo meio e
deixaria província pulando estreito.

Saída em `assets/mundo/`:

- **`provincias.png`** — índice da província em cada pixel; vermelho é o byte baixo,
  verde o alto. É a textura que o jogo vai ler pra pintar dono e fronteira.
- **`provincias.json`** — nome, região, dono, área, centro e **vizinhas** de cada uma.
  A vizinhança sai de graça da varredura e é o que exército vai usar pra se mover.

`npm run ver-provincias [nome] [x0,y0,x1,y1]` gera uma prévia colorida por cima do
terreno, em `capturas/`. É ferramenta de autoria, não é o jogo.

### Como isso vira imagem na tela

`src/mapa/provincias-mapa.ts` desenha um único quadrilátero com shader próprio, entre o
terreno e os detalhes. O chuveirinho lê o índice em `provincias.png`, endereça com ele
uma **paleta de 256×256** e pinta a cor do dono; um pixel é fronteira quando o vizinho
tem outro índice.

**Consequência que importa: conquistar território é escrever quatro bytes na paleta** —
`trocarDono(idProvincia, idPoder)`. Nada de regerar imagem, remontar geometria ou traçar
polígono, e por isso a coisa toda roda a 144 fps com o mapa inteiro na tela.

### A fronteira: duas medidas, uma pra cada regime de zoom

Este é o pedaço mais sutil do shader e o que mais custou a acertar. A primeira versão
perguntava *"o texel vizinho é de outra província?"* e pintava o texel inteiro quando
sim. Dois defeitos vinham juntos, e **nenhum tinha conserto de cor**:

- a linha nunca podia ser mais fina que um texel — ≈200 m, uns 7 pixels no zoom máximo;
- ela seguia a grade, então toda diagonal virava escada.

**Nenhuma medida única serve nos dois extremos.** Tentar uma só produziu primeiro a escada
grossa e depois a linha tracejada. São dois problemas diferentes:

**Perto** (um texel ocupa vários pixels) o problema é **precisão**. Monta-se um campo
contínuo que vale 1 dentro da província e 0 fora, interpolado entre os quatro texels em
volta do fragmento; a fronteira é a curva onde esse campo vale 0,5, e ela corta o texel na
diagonal quando é diagonal o que existe ali. Marching squares por pixel. As amostras ficam
**presas à grade de texels** — é isso que dá a precisão sub-texel. `dFdx`/`dFdy` convertem
distância-no-campo em distância-na-tela, e daí `larguraDaLinha` estar em pixels.

**Longe** (um pixel cobre vários texels) o problema é **continuidade**. Ali a grade presa
vira armadilha: as amostras não acompanham o fragmento, o campo fica constante por célula,
a derivada zera dentro dela e a linha sai **tracejada** — foi exatamente o que apareceu
quando a linha ficou mais forte. Então conta-se quantas amostras de um **anel que anda
junto com o fragmento** caem em outra província. Perde precisão, ganha uma linha inteira,
e no panorama é a linha inteira que importa.

A troca é misturada em volta de um texel por pixel (`smoothstep(0.8, 1.6, …)`), pra
ninguém ver o degrau enquanto dá zoom.

⚠️ **Sintoma → causa, pra não perder tempo de novo:** fronteira em ESCADA é medida presa à
grade sem interpolação; fronteira TRACEJADA é medida presa à grade num zoom em que ela não
vale mais.

Outros três detalhes que parecem preciosismo e não são:

- **O índice é amostrado com vizinho mais próximo, sem mipmap.** A média entre a
  província 7 e a 9 é a 8, que fica do outro lado do mapa. Interpolar aqui não borra:
  inventa território.
- **A fronteira contra o mar não é desenhada.** No campo de pertencimento o mar conta
  como "dentro", então nenhuma curva nasce no litoral — a linha de costa já está pintada
  no terreno e repeti-la engrossaria o contorno inteiro.
- **O litoral do preenchimento usa o mesmo campo**, com a pergunta trocada pra "isto é
  terra?". Sem isso a cor política vira escada de 200 m contra uma costa desenhada lisa.

**Calibrar a linha se faz olhando, não escolhendo número.** `npm run calibrar-fronteira`
abre o jogo uma vez, aponta a câmera pros mesmos três lugares e troca largura, força e cor
pelo gancho de inspeção, salvando um print por variação em `capturas/calibre/`. Os valores
bons voltam pra `dados/ajustes.json`. Foi assim que saíram os atuais: **2,0 px, força 0,9,
`#3a2f26`**. Fina e clara ao mesmo tempo some; grossa e preta vira placa.

O que ainda não é perfeito, e onde mexer se incomodar: o recorte em si continua nascendo
de crescimento em quatro direções no gerador, então sobra um micro-zigue-zague nas
diagonais no zoom máximo. Consertar isso é mexer na GEOMETRIA (crescer também na
diagonal, ou traçar as fronteiras como polilinha), não na linha — e só vale a pena depois
que a linha já estiver boa, que é o caso agora.

Ideia guardada: **hierarquia por zoom** — no panorama, fronteira forte entre povos e
fronteira provincial discreta; de perto, todas iguais.

Estado do recorte: **205 províncias, 148 poderes**, mediana de 1.158 km². Atenas tem 3.

⚠️ **A Anatólia está grossa demais.** Frígia, Lídia e Cária ficaram com províncias de até
15.000 km² porque têm poucas sementes, e no mapa elas parecem impérios — exatamente o que
a época não quer. Falta semear o interior da Anatólia na mesma malha do lado grego.

### Ilhas: desenhada, jogável e província são três coisas

Uma ilha pequena não precisa sumir do mapa só porque não merece província própria — e não
pode ficar sem dono, senão vira buraco sem cor com cara de esquecimento. A regra:

| tamanho | tratamento |
|---|---|
| acima de ~2.000 km² | pode ter várias províncias (Creta com 8, Eubeia com 4) |
| ~100 a 2.000 km² | normalmente uma província por ilha |
| abaixo de ~100 km² | anexada a uma província vizinha, ou agrupada em arquipélago |
| ilhota | continua desenhada, mas com o índice político da província a que pertence |

O mecanismo é `anexos` em `dados/provincias.json`: uma lista de pontos, cada um dentro de
uma ilha sem semente. O gerador acha o pedaço de terra ali e pinta o pedaço **inteiro**
com o índice daquela província. Como continua sendo um componente separado, nenhuma
vizinhança terrestre falsa nasce disso — 35 províncias insulares têm `vizinhas: []`.

⚠️ **Marcador explícito, nunca "a mais próxima".** Proximidade não é pertencimento: a
ilhota entre duas ilhas grandes fica com quem faz sentido, e a decisão fica escrita e
versionada. `npm run gerar-provincias -- --sugerir` lista as órfãs com um palpite e não
grava nada — é ponto de partida pra revisão, não decisão automática. Das 46 órfãs, as 12
mais isoladas ficam fora do alcance do anel de busca e saem como "nenhuma perto"; foram
identificadas na mão (Psara, Anafi, Gavdos, Anticítera, Leros, Ágio Estrátio…).

Decisões tomadas nesta revisão, com o motivo:

- **Rodes: três províncias viraram uma.** Lindos, Ialiso e Camiro existiram de verdade
  até 408 a.C., mas 1.384 km² partidos em três davam três fronteiras e três poderes num
  espaço pequeno demais pra ler, e a menor ficava com 242 km². Os três nomes estão
  guardados pra virarem cidades dentro da província.
- **Espórades:** Escíatos (42) e Escópelos (88) já tinham o mesmo dono e são vizinhas de
  vista; viraram uma província de arquipélago. Escíros fica sozinha, com 204 km².
- **Serifos** (63 km²) entrou em Sifnos, que é a vizinha com peso histórico.
- **Pafos:** só a ponta oeste de Chipre cabe na janela, e era a maior massa sem dono
  (166 km²). Virou província própria — anexá-la a alguma ilha do Egeu seria inventar um
  vínculo que não existe.
- **Lesbos fica com duas**, contra a regra de tamanho. É exceção deliberada: 775 e 864
  km², cada metade maior que a maioria das províncias cicládicas e fácil de clicar, e o
  corte Mitilene/Metimna é o que de fato pesou na história da ilha.
- **Egina (70), Tenedos (31), Míconos (81), Ítaca (82) e Tera (96) continuam sozinhas.**
  São pequenas demais pela régua e ficam mesmo assim: potência naval arcaica, guarda da
  boca do Helesponto, dona de Delos, casa de Odisseu e mãe de Cirene. Quando a seleção
  ficar pronta elas vão precisar de área de clique maior que a silhueta.

Verificação que fecha a conta: **zero pixels de terra sem dono político**, 205 índices
distintos, nenhum índice vazando pra água.

## A interface

**Interface é HTML e CSS, nunca desenho no canvas.** Texto selecionável, foco de teclado,
leitor de tela e ajuste de estilo sem recompilar shader — nada disso se ganha desenhando
botão na placa de vídeo. Tudo vive dentro de `#ui`, que é transparente a ponteiro por
padrão; cada painel liga o seu.

⚠️ **Clique fantasma: o aperto é escutado no canvas e a soltura na janela.** A soltura
precisa ser na janela pra não se perder quando o jogador arrasta o mapa e solta fora
dela — mas isso fazia um clique em QUALQUER painel gerar uma soltura sem aperto, que a
cena lia como clique no mapa. O sintoma era estranho: apertar um botão selecionava a
província do **último ponto pisado no mapa** (não a de baixo do painel, porque a posição
do mouse só é atualizada sobre o canvas), ou limpava a seleção se ali fosse mar. A guarda
está em `entrada.ts`: só conta soltura se o aperto tiver acontecido no alvo.
`testes/tela/selecao.spec.ts` cobre isso — e **só reprova o bug se o cursor passar pelo
mapa antes de ir ao painel**, senão o fantasma reseleciona a mesma província e o teste
passa à toa.

⚠️ **A `Entrada` escuta o CANVAS, não o `#palco`.** Se escutar o palco, todo clique num
painel também chega ao mapa, porque o evento borbulha. Escutando o canvas, o painel
intercepta o que é dele e o resto passa direto.

**Controle e informação são coisas separadas, em lugares separados.**

- `src/ui/painel-lateral.ts` — canto superior direito, só o que o jogador ACIONA.
  Recolhe e abre pela aba; recolher desliza pra fora sem destruir nada, então reabrir é
  instantâneo e não perde estado. Hoje tem o interruptor das cores dos reinos, e o
  estado dele mora em `aria-pressed`, não numa classe: a marcação já diz a verdade e o
  CSS só reage a ela.
- **Janela de Governo** (`src/ui/governo.ts`) — **como o reino inteiro se sustenta**.
  Abre pelo botão na barra de turno, fecha no Esc ou clicando fora. Nasceu já como casca
  com abas: hoje só a de **Balanço** (`src/ui/balanco.ts`), e a segunda vai custar uma
  linha em `main.ts` em vez de uma remodelação de layout.

  ⚠️ **É o ÚNICO lugar onde impostos, produção e comércio aparecem separados**, e o único
  onde existe total do reino — totais não pertencem a província nenhuma. Na ficha eles
  eram informação de contador competindo com a identidade do território.

  Ela se redesenha junto com o resto, **mas só quando está aberta**: fechada, montar a
  tabela a cada turno seria trabalho jogado fora.

- **Canto inferior esquerdo — a província selecionada**, numa coluna (`.coluna-provincia`)
  que empilha dois blocos:
  - `src/ui/acoes-provincia.ts` em cima — **o que dá pra FAZER** com ela (hoje, investir).
  - `src/ui/ficha-provincia.ts` embaixo — **o que ela É**: dono, povo, região, produto
    e nível, e **uma** linha de dinheiro (`rende 350 por turno`). A decomposição fica no
    Governo; clicar numa província e não saber quanto ela vale seria pior que o excesso.

  Ação e informação sobre a mesma província no mesmo canto: o jogador clica no mapa e
  encontra ali as duas coisas. O investimento já morou no painel da direita e saiu de
  lá — aquele painel é controle de MAPA, não fala de província nenhuma em particular.

  ⚠️ **A coluna é quem ancora os dois.** Empilhar por posição absoluta exigiria saber a
  altura da ficha, que muda com o conteúdo: a de uma província sem economia é bem mais
  baixa que a de Atenas.

## Selecionar província

`ProvinciasMapa` guarda os índices de `provincias.png` **também na memória do
processador**, num `Uint16Array`. Descobrir onde o mouse está é converter a coordenada do
mundo em texel e ler um número: sem geometria, sem ponto-em-polígono, sem passe de
seleção na GPU. A imagem é lida em faixas de 256 linhas porque de uma vez seriam ~100 MB
de RGBA.

O botão esquerdo faz duas coisas — arrasta o mapa e seleciona — então o que as separa é
o **percurso do ponteiro entre apertar e soltar**: até 5 px é clique, acima disso é
arrasto. Selecionar no aperto seria mais simples e estaria errado, porque todo arrasto
começa com um aperto.

O destaque é uniforme no shader (`uSelecionada`): a província ganha cobertura própria e
traço 2,4× mais grosso. A cobertura própria é o que a mantém visível **com as cores dos
reinos desligadas**, quando não existe preenchimento nenhum pra diferenciá-la.

## De quem é a província: o assado, o atlas e o estado

Três coisas diferentes, e confundi-las foi o bug que já custou um conserto de raiz:

| o quê | onde | significa |
|---|---|---|
| `dono` em `assets/mundo/provincias.json` | assado, imutável | **dono INICIAL**, a condição de 700 a.C. |
| `Atlas` (`src/mundo/atlas.ts`) | derivado do assado, imutável | geografia e identidade: nome, região, vizinhança, componentes |
| `estado.dono` (`src/campanha/`) | mutável, vai pro disco | **de quem é AGORA** |

`Atlas` existe separado porque campanha, combate e diplomacia fazem todos as mesmas
perguntas de geografia. Se cada um montar o próprio índice, a mesma verdade passa a viver
em três lugares e um dia dois discordam. Ele também confere o recorte na carga — dono ou
vizinha inexistente estoura com o nome do culpado — e carrega a **impressão digital**
(época, nº de províncias, nº de poderes) que um dia vai recusar salvamento feito noutro
mapa.

⚠️ **A tabela de donos é CHEIA — as 205 —, não um diff contra o assado.** O diff é menor
e é armadilha: com o `provincias.json` reassado com uma fronteira movida, ele mistura dois
recortes em silêncio e a partida segue rodando errada.

⚠️ **`trocarDono` é primitiva sem regra de guerra nenhuma.** Não pergunta se há fronteira,
exército ou paz — quem decide se pode é quem chama. Misturar as duas coisas faria dela o
lugar onde toda regra do jogo acabaria morando.

**Conquistar mata o incentivo e a obra em andamento, e preserva a construção.** A
construção é da PROVÍNCIA, não de quem mandava nela — e é isso que faz tomar uma cidade
rica valer mais que tomar uma pobre. O incentivo é de quem pagou; a obra paga e não
entregue não vai de presente pro inimigo.

**Eliminação é derivada**: um poder está vivo enquanto tiver ao menos uma província. Não
existe um segundo lugar onde alguém possa marcar "morto" e discordar da tabela de donos.

⚠️ **A camada de mapa NÃO sabe de quem é a província.** `provinciaEm()` devolve o
**índice**; quem monta a ficha junta `Atlas` (o que ela é) e `Campanha` (de quem ela é
hoje). Já foi diferente: `ProvinciasMapa` montava a ficha com o dono assado, no
construtor, e a primeira província a trocar de mãos passava a mentir para sempre — com um
nome de poder plausível, que é o erro que ninguém vê. `testes/tela/conquista.spec.ts`
guarda isso.

**Repintar é `pintarDonos`, e é idempotente de propósito.** Repintar as 205 custa menos
que descobrir quais mudaram, e é o que faz retomar um salvamento produzir exatamente a
mesma tela que jogar até ali produziria. A paleta é marcada como suja e drenada **uma vez
por quadro**: vinte conquistas numa virada de turno viram um envio de 256 KB, não vinte.

## Comandos

| comando | o que faz |
|---|---|
| `npm run gerar-mapa` | regera o mapa a partir da costa real (demora) |
| `npm run gerar-provincias` | recorta o mundo em províncias a partir das sementes |
| `npm run ver-provincias` | prévia colorida do recorte, em `capturas/` |
| `npm run calibrar-fronteira` | compara variações da linha de fronteira lado a lado |
| `npm run dev` | servidor de desenvolvimento (navegador) |
| `npm run app` | Electron apontando pro servidor de dev |
| `npm run capturar` | **print automático do jogo** — salva em `capturas/` |
| `npm run verificar` | tipos + lint + código morto + testes + dados, tudo junto |
| `npm run teste-tela` | testes de interface com Playwright, em série por causa do mapa WebGL pesado |
| `npm run sitios` | ⚠️ **quebrado, ver abaixo** — lista foz de rio, enseada e passagem |
| `npm run build` | compila pra `dist/` |
| `npm run empacotar` | gera o instalador em `dist-app/` |

## Como eu (IA) verifico o próprio trabalho

`npm run capturar` sobe o jogo, abre um navegador em 1920×1080, espera a cena desenhar,
salva um PNG em `capturas/` e relata erros de console. **Eu leio esse PNG.** É o ciclo
fechado: mudar → rodar → olhar → corrigir, sem depender de screenshot do usuário.

`--em=x,y --zoom=n` aponta a câmera pra um ponto do mundo antes do print, `--afastar`
mostra o mapa inteiro, e `--clicar=x,y` clica numa posição da tela — **pode repetir**, e
os cliques saem na ordem escrita, que é como se testa painel: um clique liga o botão, o
seguinte escolhe no mapa.

`--executar='<javascript>'` roda um trecho na página antes dos cliques, com `inspecao` à
mão. É o que deixa uma captura **montar cenário** em vez de só olhar o estado inicial —
conquistar províncias, dar ouro, pular turnos. Foi assim que a conquista foi conferida no
olho: `--executar` tomando o Peloponeso inteiro pra Atenas, e as 25 províncias virando uma
cor só com as fronteiras internas preservadas.

⚠️ **O FPS da captura oculta é mentira.** Sem `--visivel` o navegador renderiza por
software (SwiftShader) e trava o `requestAnimationFrame` em ~20/s. Pra layout e erro,
serve; **pra medir desempenho use `npm run capturar -- nome --visivel`**, que abre janela
de verdade e usa a GPU.

⚠️ **A captura oculta também inventa artefato.** Quando um elemento sai de `hidden` pra
visível, o renderizador por software às vezes deixa um retângulo PRETO em outro canto da
tela. Não existe no jogo: some na captura com `--visivel`. Antes de caçar um bug de
desenho visto numa captura oculta, repita com `--visivel`.

## Estado atual

**O tabuleiro está de pé e vazio.** O mapa do mundo grego desenha em panorâmica 16:9 sem
tarja nenhuma, a câmera de estratégia sobrevoa (arrastar com o botão esquerdo ou o do
meio, WASD/setas, roda pra zoom), e `npm run verificar` passa inteiro.

**O tabuleiro político está na tela e roda a 144 fps.** O mapa da Grécia arcaica abre
inteiro, recortado em 205 províncias de 148 poderes, com preenchimento por dono e
fronteira desenhada. `npm run verificar` passa inteiro.

**O esqueleto do jogo começou.** Clicar numa província a destaca e abre a ficha dela no
painel da direita (nome, dono, povo, região, área, fronteiras), e o painel tem o
interruptor que liga e desliga a cor dos reinos mantendo o recorte desenhado.

O jogo agora abre em um menu com **Iniciar jogo**. A tela seguinte permite examinar os
poderes no mapa, mas neste protótipo somente Atenas pode ser escolhida. Confirmar Atenas
inicia a campanha e devolve ao mapa a seleção normal de províncias.

Já existe o estado mínimo da campanha: poder do jogador, ano, turno, tesouro, renda e
**a tabela de donos das 205 províncias**. `src/nucleo/tempo.ts` continua sendo apenas o
relógio de quadro; o tempo da campanha avança explicitamente quando o jogador passa o
turno.

**Território já troca de mãos.** `trocarDono` move a província nas regras e o mapa
repinta no mesmo instante, a ficha mostra o dono novo, a barra conta as províncias do
jogador e quem perde a última fica no exílio enquanto ainda tiver uma hoste — tudo
derivado da mesma tabela. Ver "De quem é a província: o assado, o atlas e o estado".

**O exército existe e aparece no mundo.** Ergue-se um Quartel, reúne-se uma leva que custa
ouro e população, e um marcador com o número de homens aparece sobre a província; clicar
nele abre a ficha da hoste em baixo-centro. **A tropa fica parada onde foi levantada:**
faltam movimento, declaração de guerra, batalha, cerco e IA — é isso que decide quando a
troca de dono pode acontecer. Ver "O exército", "A hoste no mapa" e
`documentacao/design/combate-e-mar.md`.

⚠️ **Decisão tomada, ainda não implementada: o MAR VAI SER RECORTADO EM ZONAS**, como a
terra é recortada em províncias — zona de mar com nome, vizinhas e disputa, e a frota
andando de zona em zona. Isso substitui as duas ideias anteriores do projeto: "alcance
naval a partir do porto" e "adjacência marítima derivada por proximidade". As duas estão
**descartadas**. Medido no spike: a água é 56% do mapa (14,2 milhões de pixels) e o mesmo
Dijkstra multi-origem do gerador de províncias a recorta em **1,1 s com 216 MB**, deixando
0,01% sem dono — o algoritmo não é o problema, a distribuição das sementes é.

⚠️ **O relevo do mapa é ruído procedural e NÃO sustenta mecânica.** A única fonte
geográfica real do gerador é `ne_10m_land.geojson`, ou seja, a **costa**. Medido por
varredura de `biomas.png` × `provincias.png`: Larissa, a planície da Tessália, sai como
55% terreno alto; Mantineia e Tegeia, planaltos pelados da Arcádia, saem 100% floresta; a
Ática sai com 0% de terreno alto, sem Himeto nem Láurion. **Litoral é dado verdadeiro e
pode virar regra; relevo e bioma não.**

⚠️ E o litoral tem uma pegadinha medida: as **26 primeiras linhas e as 26 últimas colunas**
da moldura são 100% água — canal da moldura, não mar. Contando a água crua dão **161
costeiras**; cortando a faixa dão **151 costeiras e 54 interiores**, e as dez que caem são
Agrianes, Astas, Derríopo, Górdio, Licaônia, Medos, Odrisas, Penestas, Peônia e Pessinunte.
Górdio e Pessinunte estão a 200 km de qualquer mar. **Quem for gerar o mar corta 26 px ao
norte e a leste** — sem isso, o Ponto Euxino fica soldado ao Egeu pelo Bósforo e cidades do
planalto anatólio viram candidatas a porto. Bônus
de terreno em batalha, custo de marcha e vocação agrícola derivados de bioma seriam regra
construída sobre ficção plausível — o pior tipo de bug, o que ninguém enxerga.

**Primeiro pedaço do ciclo já roda:** menu → escolher Atenas no mapa → campanha começa no
turno 1, ano 700 a.C., com 50 moedas e renda 15; passar o turno leva a 699 a.C. e 65
moedas. As regras vivem em `src/campanha/` e **não importam Pixi nem tocam no DOM**, o que
deixa o turno e a renda inteiros sob teste no vitest, contra o `provincias.json` de
verdade. A barra de turno é a terceira região da interface: painel da direita é o que se
**aciona**, ficha embaixo à esquerda é o que se **escolheu**, barra no topo é **em que pé a
campanha está**.

## A economia

**Renda = impostos da população + produção do produto + comércio.** Área **não** gera
dinheiro: a fórmula antiga, que era função só da área, foi removida inteira e **não
sobrou como reserva pra ninguém** — duas economias diferentes escondidas no mesmo jogo
seria pior que uma economia incompleta.

O que é **fixo e mora nos dados** (`dados/economia.json`): população, produto, nível (1 a 5) e comércio-base. O que é **mutável e mora na campanha**: tesouro e os
incentivos em curso. O que é **calculado**: as três parcelas e o total.

O **valor de cada produto mora no catálogo**, não nas províncias: balancear todos os
territórios de um produto é mudar um número só. Grão vale 15 por nível e metal precioso
28 — é o que faz o Láurion importar.

⚠️ **Só a Ática está configurada.** As outras 202 províncias **não recebem economia
inventada**: `economiaDe()` devolve `null`, elas não arrecadam, não são simuladas, e a
ficha diz "Economia ainda não configurada" com todas as letras. Um teste garante que
continue assim.

| província | produto | nível | impostos | produção | comércio | total |
|---|---|---:|---:|---:|---:|---:|
| Atenas | Azeite | 4 | 175 | 100 | 55 | **330** |
| Maratona | Grãos | 3 | 90 | 45 | 11 | **146** |
| Sunião | Metais preciosos | 5 | 50 | 140 | 42 | **232** |

Atenas soma **708 por turno**, com **3.000** de tesouro inicial. Sunião é a lição do
sistema: menos gente e menos terra que Maratona, e rende 60% mais — nível e produto
decidem, tamanho não.

**Investimento** compra exploração temporária, nunca nível. O bônus é **regra de três
contra o investimento máximo**: pôr o máximo (500) compra o teto (25%), pôr metade compra
metade. Dura **20 arrecadações**. Só existe um incentivo por província — investir de novo
substitui e cobra de novo.

⚠️ **A caixa de ações mostra a conta do retorno, e ela decide.** Não basta a porcentagem:
o que importa é `+X por turno · +Y em 20 turnos · paga-se em Z turnos`, com o texto em
vermelho quando o incentivo não devolve o que custou. Foi essa conta que revelou que a
versão anterior (máximo 30.000) era pura armadilha — 30.000 devolviam 156.

### Construções econômicas

**Três construções, uma por parcela da renda** — e é isso que faz a melhor escolha mudar
de província em vez de ser sempre a mesma:

| construção | melhora | custo | melhor em |
|---|---|---:|---|
| Ágora | impostos (×1,4) | 3.000 | Atenas (+70/t, 43 turnos) e Maratona (+36/t) |
| Oficina | produção (×1,3) | 2.500 | Sunião (+55/t, 46 turnos) |
| Mercado | comércio (×1,6) | 3.000 | fraca em toda parte hoje (91 turnos no melhor caso) |

`npm run checar` imprime essa tabela toda vez, então desequilíbrio aparece como número em
vez de virar folclore. O alvo é obra se pagando em algumas dezenas de turnos — retorno de
150 a 200 é justamente o defeito do Age of History II que
`documentacao/design/referencias-economicas.md` registra.

**Obra leva tempo, e o prazo varia por construção** (Oficina 2 turnos, Ágora e Mercado 3),
vindo do catálogo junto com o custo. Prazo igual pra todas não informaria nada e seria só
atrito; variando, ele vira mais um eixo da escolha — barata e rápida contra cara e lenta —
e acompanhar o custo faz isso ler sem explicação.

⚠️ **Paga à vista, entrega depois.** O dinheiro sai no clique e o benefício só chega
quando a obra termina. É o que faz o custo ser sentido em vez de o número subir no mesmo
instante. **Não existe cancelar**: devolver o dinheiro faria da obra um cofre sem risco,
onde estacionar tesouro.

⚠️ **As obras andam DEPOIS da arrecadação**, pelo mesmo motivo do incentivo: quem paga no
turno 1 uma obra de três turnos passa três arrecadações sem o benefício e recebe na
quarta. Adiantar isso daria um turno de graça sem ninguém perceber.

⚠️ **Uma obra por vez em cada província.** A recusa diz qual está em andamento e quanto
falta, em vez de só desabilitar.

⚠️ **A construção entra ANTES do incentivo, e é isso que faz os dois se comporem.** Quem
ergue a Oficina primeiro tem uma produção maior pro incentivo multiplicar depois — existe
uma ordem de operações pro jogador descobrir. Um teste guarda essa propriedade.

⚠️ **`retornoDaConstrucao` responde duas perguntas com a mesma conta:** pra obra que não
existe, "quanto ela ACRESCENTARIA"; pra que já existe, "quanto ela ESTÁ dando". Sem essa
distinção, a linha de uma Ágora construída mostrava o efeito de uma **segunda** Ágora por
cima da primeira.

⚠️ **O portão do painel de ações é a PROVÍNCIA, não uma ação.** `podeAgirEm()` responde
"é minha e tem economia?"; estar sem dinheiro **não** entra ali. Quando entrava, o jogador
que gastava tudo via o painel inteiro sumir em vez de ver cada opção dizendo quanto falta.

⚠️ **Infraestrutura é construção, não campo da província.** Porto, estrada e torre são
comprados; o `comercioBase` continua sendo a vantagem natural do sítio. E **nenhuma
construção paga só em ouro** — porto paga em alcance marítimo, estrada em comércio e
marcha, torre em informação. Se todas pagassem em ouro, escolher seria aritmética.

⚠️ **Porto está bloqueado até o modelo de movimentação existir**, de propósito: mexer em
porto é mexer em como tropa anda, e "como a tropa passa da terra pra água" não tem
resposta antes de "como a tropa anda em terra". Rome Total War, CK3 e Age of History II
levariam a portos completamente diferentes. **Não comece o dado de costa nem o porto sem
essa decisão** — o foco atual é economia.

⚠️ **Todo poder marítimo começa com porto.** Sem isso os **34 poderes insulares** (de 148)
nasceriam congelados: sem porto não saem da ilha, e sem sair não conquistam nada pra pagar
o porto. Isso substitui a ideia antiga de derivar adjacência marítima por proximidade —
navio sai de onde há porto, e a ilha deixa de ser exceção do motor. **Falta o dado de
província costeira**, que o gerador ainda não produz. Ver
`documentacao/design/economia-e-produtos-regionais.md`.

⚠️ **Nenhum bônus temporário absorve tesouro de late game, e isso é aritmética.** O
retorno de um incentivo é sempre `bônus × renda afetada × duração`, e as três são
pequenas: mesmo dobrando a produção por vinte turnos, Atenas devolveria 3.100. Pra 30.000
se pagarem seriam precisos 85 turnos da renda inteira de Atenas. **O ralo de dinheiro de
late game tem que ser exército (recrutar + manter) e construção permanente**, não um
multiplicador temporário. O incentivo é gasto tático e vive na escala das centenas.

Com máximo 500 e 20 turnos, os números dividem as três províncias de propósito: Atenas
devolve 1,56×, Sunião 1,80× e **Maratona 0,56×** — investir onde a produção é baixa não
se paga, e isso é a decisão que a mecânica existe pra criar.

O comércio sai da produção **já incentivada**, de propósito: mais azeite prensado é mais
azeite pra vender, e é isso que faz o porto de Atenas valer o investimento enquanto
Maratona, sem escoamento, aproveita bem menos o mesmo dinheiro.

⚠️ **Arrecada antes de gastar a arrecadação do incentivo.** Se o incentivo vencesse antes
da cobrança, o jogador pagaria por quatro turnos e receberia por três — e o erro não daria
mensagem nenhuma, só um número torto.

⚠️ **O campo chama-se `nivel`, não "potencial".** O nome foi trocado porque prometia o
que o jogo não faz: potencial soa como coisa que se desenvolve, e o jogador ficava
procurando como subir. Nível é grau — a terra é assim e continua assim. Na ficha aparece
como **`Produção: Azeite IV`**, produto e grau numa linha só.

⚠️ **`display` explícito vence o atributo `hidden`.** O `hidden` só esconde porque a
folha padrão do navegador diz `display: none`; qualquer regra nossa com `display` o
anula. Tudo que ganhar `display` no CSS precisa de um par `[hidden] { display: none }` —
foi assim que o botão de investir continuou aparecendo numa província que não era do
jogador.

⚠️ **A tela mostra o que muda uma decisão; o resto vai pro tooltip.** Área e número de
fronteiras saíram da ficha — são verdadeiros e não servem pra escolher nada. Fórmula não
fica escrita na tela: `título[title]` explica de onde sai o número pra quem quiser
conferir, e some pra quem já entendeu. Cada construção é **uma linha** com nome e custo;
o que ela faz, o prazo e o retorno vivem no tooltip.

⚠️ **O veredito fica na tela, a conta que o sustenta vai pro tooltip.** O decreto mostra
`+12,5% · paga-se em 13 turnos` (ou `nunca se paga`, em vermelho) — esconder isso seria
esconder justamente o que impede a armadilha. O detalhe (`+20 por turno durante 20
turnos, 400 ao todo`) é que vira tooltip.

⚠️ **Nada de sumir em silêncio.** A seção "Investir" fica na tela durante a campanha
inteira, mesmo quando não dá pra investir, dizendo o motivo (`Mantineia: esta província
não tem economia configurada`). Esconder o controle esconde a existência da mecânica, e o
jogador não tem como adivinhar que ela existe.

⚠️ **População é ESTADO, e a linha anterior deste arquivo estava errada.** Ela dizia que
população era dado autoral fixo "por decisão" — mas isso descrevia uma conveniência da
fase de testes (bastava um número inicial pra economia básica rodar), não uma escolha de
design. Desde que recrutar passou a custar população, ela vive em
`estado.populacao` e o `dados/economia.json` guarda só a população INICIAL, de 700 a.C.

Continua **não havendo crescimento populacional**, e isso sim é decisão de escopo:
crescimento exigiria natalidade, mortalidade, alimento, migração e capacidade
territorial. O que existe hoje é o vaivém da mobilização — recrutar tira, dispensar
devolve.

⚠️ **`jogo.anosPorTurno` é decisão em aberto**, exposta no arquivo de ajustes de propósito:
um turno por ano funciona no protótipo, mas é o que decide o ritmo da campanha inteira.

**Estado de partida, menu de escolha, turno, data, tesouro e propriedade mutável estão
implementados.** Faltam **salvamento** e **realce de reino** — os dois estão desenhados em
`documentacao/tarefas/salvamento-e-realce-de-reino.md`.

⚠️ **Este arquivo já afirmou que o realce de reino estava implementado, e era mentira:**
não existe `realcar` em lugar nenhum do código. Se você encontrar outra afirmação de
"já está pronto" aqui, confira no código antes de confiar.

## O exército

**Só se recruta onde há Quartel**, e a leva custa **ouro e população da própria
província**. As regras vivem em `src/combate/`, uma mecânica por arquivo:
`exercito.ts` (o que é uma força), `recrutamento.ts` (o que custa e por que é recusado)
e `mobilizacao.ts` (reunir, dispensar, manter e desertar). Posse vive em
`src/campanha/territorios.ts`; cálculos e incentivos vivem em `src/economia/`; obras vivem
em `src/construcoes/`. `Campanha` coordena as transações entre esses sistemas e o estado
que um dia vai para o disco.

### O Quartel é a primeira construção que não paga em ouro

O documento de economia já exigia isso — *"nenhuma construção deve pagar somente em ouro;
se todas pagarem, escolher vira aritmética"* — e nenhuma cumpria: Ágora, Oficina e Mercado
rendem todas moeda, em parcelas diferentes da mesma conta. O Quartel custa **5.000**, leva
**4 turnos** e **rende zero**. Comparar 5.000 por um exército com 3.000 por +70 moedas por
turno não é uma conta: é uma decisão.

Por isso o catálogo passou a ter `efeito` como **união discriminada** — `renda` (parcela +
fator) ou `capacidade`. União e não campos opcionais: assim o compilador obriga quem lê a
decidir de que tipo é antes de usar `fator`, em vez de deixar um `undefined` atravessar a
fórmula da renda em silêncio.

⚠️ **Construção de capacidade nunca mostra "paga-se em N turnos".** A tela diz o que ela
destrava. `+0 por turno, não muda nada aqui` é verdade aritmética e mentira sobre o que o
Quartel é — e o `checar` lista as duas famílias em tabelas separadas pelo mesmo motivo.

### Soldado sai da população, e é o teto que importa

**O ouro sozinho faria exército brotar de tesouro grande**, e um reino rico venceria
digitando. O limite real é `fracaoRecrutavel` — hoje 10% da população — e ele conta
**quem já está em armas**, onde quer que esteja; senão bastava recrutar, marchar pra fora
e recrutar de novo pra esvaziar a cidade em rodadas.

Quem vai pras armas **sai da população na mesma hora**, então o imposto daquela província
cai junto e o próprio teto aperta. Mobilizar tem preço contínuo, não só preço de entrada.

O número que o sistema existe pra produzir, e que um teste fixa:

| Atenas | valor |
|---|---|
| população | 35.000 |
| teto em armas | 3.500 |
| manutenção com o teto cheio | 700/turno |
| renda com o teto cheio | 691/turno (o imposto cai de 175 pra 158) |
| **saldo** | **−9 por turno** |

**Mobilização total é insustentável por construção**, sem nenhuma regra dizendo isso.

⚠️ **Quem não paga vê a tropa desertar, proporcionalmente, e os desertores VOLTAM pra
casa.** Espiral de morte não é decisão: é o jogo terminando sozinho enquanto o jogador
assiste. O tesouro nunca fica negativo, o exército encolhe aos poucos, e a saída existe
(dispensar antes, ou tomar mais renda).

⚠️ **`origem` guarda de qual província veio cada homem.** Sem isso, marchar de uma
província pobre até uma rica e dispensar ali seria lavagem de população — e nenhuma regra
proibiria explicitamente. Dispensar devolve cada um à sua terra, e `retirar` tira
proporcionalmente de cada origem, pra que a ordem em que as levas entraram não vire uma
regra escondida.

⚠️ **A força é DERIVADA de `origem`, nunca guardada ao lado dela.** Guardar um total junto
do detalhe é convidar os dois a discordarem.

⚠️ **A manutenção aparece na barra de turno** (`17.130 moedas (+698 −400)`), não escondida
no Governo. É a única despesa recorrente do jogo: sem ela visível, o jogador vê o tesouro
parar de crescer e não tem como saber que foi o exército que comeu.

**População na ficha não é enfeite.** Ela saiu do esconderijo porque decide duas coisas: a
Ágora multiplica imposto, que vem de população, e o teto de recrutamento é uma fração
dela. Enquanto ficou invisível, escolher a Ágora era um chute informado.

### A hoste no mapa

**O exército existe no mundo, não só nas regras.** Um marcador por província com tropa,
com o número de homens escrito, na cor do **dono da hoste** — que não é necessariamente a
cor do chão sob ela.

**É HTML por cima do canvas, não desenho no canvas**, e aqui a regra da casa paga bem: o
marcador carrega o número em texto de verdade, com tooltip e foco de teclado, e muda de cor
por variável CSS. Um sprite não daria nada disso, e o projeto não tem sprite pra dar. A cada
quadro, `camera.mundoParaPalco` põe a peça onde a província está — ela pertence ao mundo;
só quem desenha é que é HTML.

⚠️ **`#ui > .hostes`, nunca `.hostes`.** `base.css` tem `#ui > * { pointer-events: auto }`,
e seletor de id vence seletor de classe. Escrita só com a classe, a camada — que cobre a
tela inteira — comia **todos** os cliques do mapa: arrastar, dar zoom e selecionar
província paravam de funcionar **sem um erro sequer no console**. `testes/tela/hostes.spec.ts`
guarda isso.

### Quatro regiões, quatro perguntas

| região | elemento | responde |
|---|---|---|
| topo | `.barra-turno` | em que pé a campanha está |
| topo-direita | `.painel-lateral` | o que o jogador **aciona** (global) |
| baixo-esquerda | `.coluna-provincia` | a **província** escolhida — ações em cima, ficha embaixo |
| **baixo-centro** | `.exercito` | a **hoste** escolhida |

A hoste ganhou região própria por dois motivos, e o segundo é estrutural: quatro painéis
empilhados na coluna estouravam os 1080 e cortavam o de cima; e **a hoste não é a
província** — assim que ela marchar, as duas deixam de coincidir, e um painel dentro da
coluna da província estaria mentindo sobre o que descreve.

⚠️ **Recrutar é ação da PROVÍNCIA; dispensar é ação da HOSTE.** Ver e dispensar tropa já
moraram dentro do painel de recrutamento, e aquilo só funcionava enquanto exército e
Quartel estivessem na mesma província. Seleções diferentes viram painéis diferentes.

Clicar no marcador escolhe **as duas coisas** — a tropa e o chão sob ela —, e os dois
painéis ficam verdadeiros ao mesmo tempo. Clicar no mapa é escolher chão, e solta a hoste.

### O exílio, e o homem de terra perdida

⚠️ **Perder o último chão não é morrer.** `vivo` é ter **chão OU hoste**. Antes era só
território, e o poder era dado como eliminado enquanto o exército dele continuava de pé no
mapa. Perder tudo é ficar **no exílio** (`noExilio`), e o exílio não precisa de
temporizador: sem província não há renda, sem renda a folha não é paga, e a tropa deserta
sozinha em poucos turnos. **A regra da deserção, que já existia, é quem dá o prazo.**

⚠️ **Quem é dispensado volta pra terra dele, mesmo que ela seja do inimigo agora.** Uma
regra só, sem exceção: gente pertence ao chão, não a quem manda no chão. A consequência é
dura e é de propósito — dispensar tropa levantada em província perdida **entrega aqueles
habitantes ao conquistador**, e por isso retomar a terra antes de desmobilizar vira
decisão. A ficha do exército escreve isso em vermelho, província por província. A
alternativa (fazê-los sumir do mundo) tornaria população uma catraca de sentido único.

As duas se encaixam: o exército no exílio deserta de volta para a terra natal, que agora é
do conquistador — e engorda exatamente quem o expulsou.

## Armadilhas conhecidas

- ⚠️ **`ferramentas/sitios.ts` mente em silêncio.** Ele compila, roda e imprime números
  bonitos, mas suas constantes de mundo são as antigas — `8192 × 7168` a `0,14 km` por
  unidade — contra o mundo atual de `12288 × 8256` a `0,098 km`. As coordenadas e as
  distâncias que ele imprime estão num sistema que não existe mais. **Ou corrigir as três
  constantes, ou apagar o arquivo com o script npm e a linha da tabela acima**; resposta
  errada em silêncio é pior que ferramenta ausente. Nada no jogo depende dele.

- **`ELECTRON_RUN_AS_NODE`** — se essa variável estiver no ambiente, o binário do Electron
  roda como Node puro e o processo principal quebra com `app` indefinido.
  `ferramentas/app.mjs` já remove a variável antes de lançar. Ao rodar Electron na mão,
  use `env -u ELECTRON_RUN_AS_NODE npx electron electron/main.cjs`.
- **`JANELA=1`** abre o Electron em janela em vez de tela cheia — útil pra testar sem
  tomar a tela inteira.
- **Servidor órfão na porta 5173.** No Windows, `spawn(..., { shell: true })` põe um
  `cmd.exe` no meio: matar o filho mata só o intermediário e o Vite fica no ar segurando
  a porta, e a próxima abertura do jogo morre com "port in use". Por isso `app.mjs` e
  `captura.ts` sobem o Vite **dentro do próprio processo**, pela API. Nunca volte a
  lançar o servidor por shell. Se acontecer mesmo assim:
  `Get-NetTCPConnection -LocalPort 5173 -State Listen` acha o PID.
- **Não crave o título do jogo no código.** `app.mjs` confere se quem responde na 5173 é
  o nosso jogo comparando o `<title>`, e esse título ele lê do `index.html`. Quando a
  string estava escrita à mão, renomear o projeto quebrou a checagem em silêncio: ela
  passou a dar sempre falso e o script tentava subir um segundo servidor por cima do
  primeiro.

## Abrir o jogo

**`jogar.bat`** na raiz — duplo clique abre direto no Electron, subindo o servidor de
desenvolvimento junto. Fechar a janela do jogo encerra tudo e libera a porta.

`ferramentas/app.mjs` sobe o Vite **dentro do próprio processo** (API do Vite) em vez de
lançar um programa separado, e chama o executável do Electron direto, sem `npx` nem shell.
Foi assim de propósito: com processo filho via shell no Windows, fechar a janela deixava o
servidor órfão segurando a porta 5173.
