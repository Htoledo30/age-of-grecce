# Age of Grecce — estado atual

Este documento é uma fotografia curta do que o jogo faz hoje. Código e testes continuam
sendo a prova final. A visão desejada, inclusive sistemas ainda ausentes, fica em
`GDD.md`.

## Visão rápida

Age of Grecce é um grand strategy por províncias no mundo grego de 700 a.C. A versão
declarada pelo projeto é `0.1.0`.

O mapa possui 196 províncias de terra, **48 zonas marítimas**, 53 regiões e 139 poderes. A fatia autoral cobre a Grécia
central: 25 províncias com economia completa (Ática, Megáris, Coríntia, Beócia, Eubeia,
Opunte, Siciônia e Argólida), 18 poderes inteiramente configurados — e todos eles são
jogáveis (a regra é derivada: poder com todas as províncias configuradas aparece
disponível na escolha). **Nenhuma cidade começa com tropa**: o mapa abre em paz e
`exercitos.json` está deliberadamente vazio — o mecanismo continua de pé para cenários
futuros. Salamina continua ilha — nenhuma vizinha dela é chão —, mas deixou de estar fora do jogo:
ela encosta no Estreito de Salamina, e uma hoste que embarque num Porto chega lá. As outras
171 províncias seguem sem economia e sem simulação.

As 12 antigas províncias microscópicas das Cíclades foram agrupadas em três arquipélagos:
Norte (Andros, Tinos, Míconos, Ceos e Cítnos), Centrais (Naxos, Paros, Íos, Amorgos, **Tera e
Anafi**) e Ocidentais (Melos, Sifnos, Sérifos e Cimolos). As ilhas continuam desenhadas e
clicáveis; qualquer pedaço seleciona a província do arquipélago. A costa e o terreno não foram
alterados.

⚠️ **E cada arquipélago reivindica a água entre as ilhas dele** — 15 km de raio, com um canal
de 4 km sempre aberto para o vizinho. Agrupar tinha resolvido a contagem e não a leitura: as
Cíclades Ocidentais eram sete cacos preenchendo **3,3%** da caixa em que vivem (Atenas
preenche 40,8%), e Henrique, olhando o mapa: *"parecem mais fragmentos do que reinos"*. Com a
água, os cinco arquipélagos do mapa — as três Cíclades, as Espórades e Calimno — viram **uma
mancha só cada um**, com borda própria. Tera e Anafi mudaram de grupo no caminho: elas ficam
70 km a leste do resto do ocidental, e era por causa delas que aquele nunca fechava.

Assado: 292.173 pixels de água (11.293 km²) em cinco províncias, **um componente conexo cada
uma**. Uma zona nova de mar nasceu do corte — o **Canal de Ceos**, entre Sunião/Eubeia e as
Cíclades do Norte —, e o gerador passou a RECUSAR assar se alguma zona sair partida em dois
pedaços que não se tocam: província em dois pedaços é teleporte de graça, porque a hoste está
"no Mar das Cíclades" nos dois lados. Caco abaixo de 400 km² ele costura na zona vizinha e diz
em voz alta; acima disso, para e imprime a semente pronta para colar.

⚠️ **A cor do arquipélago tem uma exigência a mais: não sumir dentro do mar.** Ela é a única
que pinta sobre água, e as Cíclades Centrais estavam a 3,6 ΔE do azul do Egeu — o território
existia e não se via. A régua contra a água é 11 ΔE, e ela custou nove poderes.

O canal é a peça que impede isto de virar regra: sem ele a mancha de Andros encostaria na
Eubeia, as duas seriam vizinhas por terra, e um exército andaria de uma à outra **sem Porto e
sem embarcar**. Com ele, nenhuma vizinhança nova nasce — e um teste guarda isso. A área
continua contando só o chão, porque é ela que escolhe a capital quando um reino perde a sede.

**A IA entregue cuida da economia, se defende e ATACA.** Os 17 poderes jogáveis que não são o
jogador constroem, decretam imposto, levantam tropa, socorrem terra ameaçada, fazem surtida,
marcham sobre a vizinha que valorizam e que acreditam TOMAR, e **sentam na frente da cidade
murada** que não cai hoje — cada um com o estilo escrito em `dados/ia.json` (guerreiro,
mercador, cauteloso, equilibrado). "Tomar" e não "vencer": ela roda as mesmas funções da rodada
para prever o choque de campo e depois o assalto à muralha, com o que sobrou do primeiro.
Ela joga em `virarTurno`, ANTES de a rodada resolver, porque as ordens são simultâneas — e
fica FORA de `passarTurno` porque é um jogador e não uma regra da campanha. A ordem dentro do
turno é imposto, obra, leva, defesa, ataque: **uma decisão por hoste de cada vez**, e a casa
decide primeiro. `npm run partida` roda a coisa toda e conta o que aconteceu, inclusive marchas,
cercos e quantas províncias mudaram de dono.

**Ela REAGE, e é isso que faz os quatro estilos serem quatro jeitos de jogar.** Com exército
alheio na fronteira, a obra de defesa passa a valer `defesaAmeacada` — a mesma ideia de
`alimentoApertado`, que faz a comida atropelar tudo quando a despensa aperta — e a folha de
guerra sobe para todo estilo, porque a diferença entre eles é o que se gasta na PAZ. ⚠️ Sem
isso, medido em 100 turnos, **os quatro únicos sobreviventes eram os quatro `guerreiro`**:
mercador, cauteloso e equilibrado morriam todos, porque o estilo era um gosto fixo em vez de
uma reação.

**E ela DESISTE.** Volta para casa quando a terra deixou de ser inimiga, quando o cerco azedou
(o cofre parou de pagar a campanha, ou o dono juntou mais gente do que o sitiante tem) e quando
há inimigo pisando em terra dela — o exército que está longe é o que está faltando. Sentar é
uma decisão refeita todo turno, não um compromisso eterno.

Medido em 100 turnos com todos na IA: **36 guerras declaradas, 29 pazes, 42 marchas sobre terra
alheia, 33 províncias mudando de dono, 23% dos poder-turnos em guerra, 15 turnos com tropa
passando fome (eram 88) e zero cofre negativo.** Sobrevivem poderes dos três estilos, e não só
os guerreiros.

**A RELAÇÃO entre os reinos existe, de −100 a +100** — e ela é a mesma máquina do humor do
povo, de propósito: um valor que caminha em direção a um alvo feito de parcelas com nome, que
a tela mostra linha a linha. `indiferença 0 · em guerra −60 · fronteira comum (3) −15 · terra
dele na sua mão (1) −15`. Nada salta, o passado se apaga sozinho enquanto os fatos não o
renovam, e um ATO empurra o número na hora — tomar a cidade à força é um choque de −25, do
mesmo jeito que a conquista já derruba o humor do povo. É por essa porta que presente, pacto,
comércio e aliança vão entrar, sem mecânica nova nenhuma.

⚠️ **Nenhuma parcela existe que o jogador não veja no mapa**, e a opinião JÁ DECIDE: a IA não
declara guerra a quem ela gosta (`relacaoParaDeclarar` no estilo) e aceita paz mais fácil com
quem ela não odeia. Medido em 100 turnos, o efeito de a opinião entrar na conta: **poderes
eliminados caíram de 11 para 6 de 18, e o maior reino de 12 províncias para 5** — o mapa
briga mais (41 guerras, 36 pazes, 28% dos poder-turnos em guerra) e ninguém dispara na frente.
A relação existe só entre os 18 poderes com ficha: opinião de quem não arrecada nem decide
seria um número que não vira decisão nenhuma.

**Quatro ações diplomáticas existem, e cada uma paga com algo que já existe no jogo.**

**Presente** — ouro do tesouro. Vale pelo bolso de QUEM RECEBE: 500 moedas são quatro turnos de
renda para quem arrecada 120 e troco para quem arrecada 2.000. Satura (dobrar o presente não
dobra a amizade) e, sobretudo, **é um choque, não uma parcela**: empurra a opinião agora e o
número volta a cair para o que os fatos dizem. ⚠️ **Presente compra TEMPO, não amizade** — há um
teto de quanto o ouro levanta acima do que os fatos justificam, e é ele que impede o reino rico
de comprar o mapa sem levantar um soldado.

**Pacto de não-agressão** — paga com a sua liberdade de atacar. **O que estica o prazo não é
ouro, é confiança**: 10 turnos pedem opinião −20, 20 turnos pedem +15, 40 turnos pedem +45. É
isso que faz o presente ser a ENTRADA do pacto. Enquanto dura, ninguém declara guerra e a
opinião sobe sozinha, porque fronteira garantida é um fato. Romper é a única saída antes do
prazo, e custa a opinião do traído **e a sua REPUTAÇÃO com o mapa inteiro** — sem esse preço,
pacto seria papel.

**Acordo de comércio** — **mais uma fonte de renda para os dois lados.** O valor bruto é uma
fração da renda do MENOR dos dois: um parceiro minúsculo não tem mercado a oferecer, e um gigante
não despeja em você mais do que você absorve. A carteira inteira satura, mas é MONOTÔNICA: acordo
novo nunca reduz a renda nem rebaixa os anteriores. Como cada reino já tem parceiros
diferentes, o ganho marginal pode ser diferente dos dois lados; a mesa mostra **quanto você
ganha e quanto ele ganha**, já contando os acordos em pé. Daí caem três coisas: comerciar com o
grande vale mais que com o pequeno; crescer melhora todos os seus acordos; e **existe um caminho
pacífico de verdade** — quem faz as pazes com o mapa e assina com todos vive de comércio. O
quinto parceiro rende menos que o primeiro, a guerra desfaz o acordo na hora, e a exigência de
opinião é baixa de propósito: mercador atravessa fronteira que exército não atravessa.

⚠️ **A rede de bens distintos continua sendo só a SUA.** O acordo não faz o mármore dele
circular no seu reino — quem quer o bem toma a terra. É essa separação que mantém a conquista
valendo mais que o comércio, num jogo de conquista.

**A tipografia tem quatro vozes**, empacotadas com o jogo e não buscadas na rede: **Cinzel**
nas inscrições (os títulos de janela, em capitais romanas), **Cormorant Garamond** nos nomes
próprios de reino e província, **Alegreya Sans** no texto corrente e **Inter** nos números, com
algarismos de largura fixa para uma coluna não dançar entre turnos. A divisão entre inscrição e
nome é a que faltava: "DIPLOMACIA" é gravado e lido uma vez; "Elêusis" é lido cinquenta vezes
por partida numa lista de 15px, e uma capital esticada cansa ali.

**A janela é uma MESA, e não um menu** — refeita depois de "parece que nem estou negociando com
outro reino". Dois cartões espelhados, você de um lado e ele do outro na mesma moldura; a fala
com que ele abre a conversa; a barra de força; a opinião com **dois números** (onde está e para
onde caminha) sobre uma régua com a **linha em que aquele vizinho passa a te olhar** — que sai
do temperamento dele e é a mesma linha que decide se ele assina um pacto; o que ele quer de
você, com o nome das SUAS províncias que ele considera que valem a marcha; os laços dele com
terceiros; e cada proposta trazendo **a resposta dele antes do clique**, pela mesma função que a
IA usa quando decide de verdade. Nada de arte nova: tipografia, filete e texto.

**Tributo** — **o ano de sossego que se compra quando não há confiança para pedi-lo de graça.**
É o pacto pelo avesso: o pacto não custa moeda e exige opinião; o tributo não exige opinião
nenhuma e custa ouro todo turno. Por isso os dois nunca competem — o ouro entra exatamente onde
a confiança não chega, que era a faixa da régua abaixo de −25 em que não havia mais nada a fazer.

Enquanto corre, **quem RECEBE não declara guerra ao pagador** — é literalmente o que foi
comprado; quem paga continua livre, porque quem paga é quem quer sair. O prazo é negociado e
**prazo longo custa MENOS por turno**, na lógica do aluguel: 10 turnos a 20% da renda, 20 a 15%,
40 a 12%. Quem se compromete por quarenta ganha desconto; quem quer poder sair em dez paga o
preço da liberdade.

⚠️ **O valor congela na assinatura, e é o que faz o calote existir.** Recalculado todo turno ele
encolheria junto com o reino e ninguém jamais deixaria de pagar. Fixo, vira as duas histórias que
interessam: **quem perde província afunda** — o cofre não cobre mais, o tributo quebra e a
reputação cai com o mapa inteiro — e **quem cresce o supera**, e um dia olha a linha e vê troco
onde havia sangria.

⚠️ **Duas portas, e a principal é a da guerra.** Em paz é pedágio; **em guerra é o preço de uma
paz que o inimigo recusaria de graça** — e essa é a que importava, porque `querPaz` não tinha
alavanca nenhuma: quem estava perdendo com um inimigo que ainda tinha alvo não podia oferecer
nada, e perder província a província até não sobrar prêmio não é uma decisão, é uma espera.

⚠️ **Um tributo de cada lado**, e essa trava foi medida, não intuída: sem ela o tributo repetia,
número por número, a falha que o pacto já tivera — o fraco amarra o forte, o forte vai comer quem
não amarrou, e a violência apenas MUDA DE ENDEREÇO (41 províncias trocando de dono contra 12 sem
tributo nenhum).

⚠️ **Não é vassalagem.** O pagador não perde província, exército, decisão nem voz: é um poder
inteiro que comprou um ano. Suserania, chamado à guerra e herança de território são outra decisão.

⚠️ **A assinatura precisa dos DOIS.** A primeira versão aceitava com o consentimento de um lado
só, e a medição foi brutal: o fraco amarrava o forte, o forte ia comer quem não tinha amarrado,
e o resultado saltou para **46 províncias mudando de dono e 12 poderes eliminados** contra 22 e
6 sem pacto nenhum.

E a IA usa as três: medido em 100 turnos, **85 pactos, 37 presentes (12.838 de ouro) e 93
acordos de comércio — 90 de pé no fim, entre todos os 18 poderes, rendendo 695 por turno.** Com
o comércio aberto o mapa ficou visivelmente menos letal: as conquistas caíram de 32 para 12 e os
poderes eliminados de 10 para 6. O presente dela é suborno defensivo — vizinho mais forte, na faixa em
que ele declararia guerra — e é o que dá ao estilo `mercador` uma jogada que não é levantar
lanças que ele não sabe usar.

⚠️ **E ela senta com trava, porque cerco DURA.** Só abre cerco quem tem mais gente do que a
milícia da praça, quem ganharia do exército inteiro do dono se ele viesse socorrer, e quem tem
renda para pagar a taxa de campanha — três vezes a de casa — sem fim marcado. Sem as três, a
medição mostrou 142 homens acampados diante dos 415 milicianos de Atenas ainda no turno 59, e a
IA ficando MENOS agressiva por ter aprendido a sentar. O que ela ainda não faz é **levantar um
cerco que azedou**: isso é reação, e vem depois.
Save/load existe (a campanha salva sozinha a cada mudança e o menu oferece continuar), e a campanha tem começo e fim: vitória ao
dominar a Grécia central alcançável por terra, derrota ao deixar de existir. O que falta
para a campanha completa do GDD é a diplomacia necessária.

## O que o jogador consegue fazer

- iniciar uma campanha com qualquer cidade da Grécia central e navegar pelo mapa;
- selecionar províncias e hostes;
- arrecadar, decretar o nível de imposto de cada província, construir e acompanhar obras;
- ligar terras por MAR erguendo Porto nas duas pontas — é assim que Salamina entra na rede;
- recrutar por ARMA — leves em qualquer terra, hoplitas com Armaria, arqueiros onde há
  madeira, cavalaria onde há cavalos —, esperar a formação e dispensar soldados;
- dividir, reunir e mover hostes por ordens simultâneas;
- **embarcar num Porto e atravessar o mar** zona por zona, um salto por rodada — e brigar com
  quem estiver na água, sem tomar nada dela;
- **bloquear o cais de um inimigo** parando a hoste na água que o banha: o Porto dele para de
  ligar por mar e de levar mercadoria, e a ilha que dependia dele fica cortada. Sair de um porto
  bloqueado continua permitido — sair é atacar;
- enfrentar batalhas em províncias e encontros na estrada;
- assaltar, sitiar, fazer surtida, socorrer uma cidade e conquistar território;
- acompanhar marchas e ler a crônica da rodada;
- acompanhar o saldo alimentar inteiro do reino e ver crescimento, fome e mortes reagirem;
- especializar províncias usando quatro slots, prédios I–III e explorações condicionadas
  aos produtos locais;
- abrir o Governo e ver, na aba de Alimentação, quais províncias sustentam o reino e quais
  dependem dele;
- ver na aba Mercado quais bens distintos o reino alcança, de onde vêm e quais faltam —
  e escolher a conquista pelo que ela acrescenta, não só pelo que ela rende;
- fechar o jogo a qualquer momento e retomar depois: todo clique já está salvo;
- ver o humor das províncias reagir a comida, cerco, conquista e Templo — e pagar o preço
  da revolta quando ele desaba;
- **hipotecar uma província no confisco** para pagar a guerra de hoje, com a data do levante
  escrita no botão;
- **abrir a própria estrada** a quem não é inimigo, e **responder** ao que os outros reinos vêm
  pedir — pacto, comércio ou passagem, com aceitar e recusar;
- **virar o mapa para o modo de relações** e ver, de um golpe, o que cada reino acha de
  qualquer outro;
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

A economia monetária calcula impostos, produção abstrata e trânsito; ela paga tropas e
construções. Produtos são capacidade anual e identidade da terra, não unidades acumuladas.

**A renda é sobre a TERRA, não sobre cabeças** — 71% dela vem do que a província é, e não de
quanta gente mora nela. Por isso Sunião (10.000 habitantes, metais preciosos) rende mais que
Tebas (22.000, grão), e uma inversão dessas acontece em 26% dos pares de províncias. As três
parcelas, todas mordidas pela corrupção antes de chegar ao tesouro:

```
imposto  = população × impostoPorHabitante × nível de imposto × construções
produção = (valor_principal × nível + valor_secundário × nível × pesoDoSecundario) × construções
trânsito = transitoBase × escalaDeTransito × construções (zero sem rota até a capital)
```

⚠️ Três coisas mudaram de forma, não de número, e desfazer qualquer uma volta a achatar tudo:
o **trânsito deixou de ser uma fatia da produção** (era `produção × transitoBase`, e por isso
Corinto tirava um quinto da renda dali); o **produto secundário passou a render** (ele
estava escrito com nível em toda província e valia zero); e a **corrupção passou a comer as
três parcelas**, não só o imposto. `npm run economia` mede tudo isso do poder mais pobre ao
mais rico, cedo, meio e fim de jogo.

Cada província tem um **nível de imposto** decretável, e são **quatro**: baixo (×0,75, humor
+12), normal, alto (×1,8, humor −10) e **confisco** (×3, humor −25). Efeito imediato na renda,
gradual no humor; a conquista devolve a terra ao normal.

⚠️ **Os fatores são grandes porque o imposto é uma PARCELA e o humor cobra sobre o TODO.**
Henrique jogando: *"mudar entre imposto baixo, médio ou alto é uma mudança muito fraca"*.
Medido, era pior que fraco. O imposto é 13% a 48% da renda de uma província (mediana 27%),
e desde que o humor multiplica a arrecadação **cada ponto de humor vale 1% da renda inteira**
— então o ×1,35 com −8 de humor era **negativo no equilíbrio em 6 das 25 províncias**: um
botão que prometia mais dinheiro e entregava menos. Com ×1,8 e −10, nenhuma fica negativa, e
o alto passou de +9% para +21% na virada seguinte.

⚠️ **O confisco é a alavanca de emergência, e ela se cobra sozinha.** ×3 paga a guerra de
hoje — em Atenas são +214 por turno na virada seguinte — e derruba o alvo de humor para a
faixa do levante: medido, **9 turnos até o levante em toda província do mapa**. Não é "alto,
porém mais": é uma decisão com prazo. A IA a puxa numa condição só — em guerra e com a renda
sem cobrir a folha militar — e larga assim que a conta fecha. Medido em 100 turnos: baixo 79
decretos, normal 19, alto 70, confisco 19.

⚠️ **E a tela passou a dizer a consequência EM MOEDA.** O tooltip dizia "135% da arrecadação ·
humor −8", dois números que não se conversavam. Agora cada botão mostra o que ESTA terra
ganha na próxima virada e o que sobra quando o humor assentar — e, quando o decreto acende um
levante, a segunda linha vira o prazo dele, porque prometer um equilíbrio que nunca chega é
pior do que não prometer nada. Ver `governo/previsao-de-imposto.ts`.

A **rede de trocas** é a outra metade da renda, e ela é NACIONAL: cada bem distinto ao
alcance do reino rende um valor por turno, **uma vez só** — duas províncias de azeite não
rendem duas vezes. Um bem circula quando a terra que o dá é sua, não está sitiada e chega à
capital — por terra sua ou por mar entre dois Portos seus; reino partido não faz um mercado
só, ilha sem ligação terrestre fica de fora, e sem capital a rede para. É por aqui que o
produto **secundário** da província passou a servir para alguma coisa. A aba **Mercado** do
Governo lista o que circula, de onde vem, e — o mais útil — o que está FORA do alcance, que
é o mapa do que há para conquistar. Valores de `troca` em `economia.json` são iniciais.

O Governo mostra o **saldo completo por província**: renda líquida da terra E o custo da
tropa NASCIDA nela (a origem de cada soldado é rastreada), com o veredito — sustenta ou
puxa para baixo — em coluna própria; a linha no vermelho é marcada. A ficha soma a linha
"tropa nascida aqui" no tooltip da renda. A atribuição por origem pode divergir do total
do poder em uma moeda por arredondamento; a barra usa a conta do poder. ⚠️ O rodapé dessa
tabela é o **total das terras**, não a renda do reino: a rede não cabe em província nenhuma,
e quem soma as duas é o resumo em cima.

A renda inteira passa pela **corrupção** — as três parcelas, não só o imposto:
`corrupção = 1 − (1 − por tamanho) × (1 − por distância da capital)`. Cada fatia é uma
hipérbole saturante calibrada em `ajustes.json` (a distância reproduz a tabela do GDD:
0,8× a 3 saltos, 0,6× a 12). A distância é medida em saltos pelo grafo de vizinhança —
geografia, não política: inimigo no caminho não alonga a estrada. Conquistar uma terra
muda a distância dela para a capital do novo dono na hora, e mudar a capital muda a renda
do reino inteiro — é o que dá função real à escolha (e ao custo) da capital. A ficha
mostra a fração descontada no tooltip da renda; a tabela do `checar.ts` imprime a terra
sem corrupção (retrato autoral).

⚠️ **Não existe mais província sem corrupção.** Havia um limiar de 10.000 habitantes e abaixo
dele ela era exatamente zero: sete províncias caíam fora da conta, e a Ágora — que existe para
aliviá-la — virava armadilha em metade do mapa.

**Ágora e Estrada reduzem corrupção, e cada uma ataca uma metade:** a Ágora a de TAMANHO
(gente demais para administrar), a Estrada a de DISTÂNCIA (por isso ela não rende nada na
própria capital — é prédio de império, não de cidade-estado). O **Mercado** não mexe em
corrupção: ele é a praça, e tem DUAS pernas — multiplica a rede de trocas do REINO (uma vez
só, pelo melhor nível erguido) e o TRÂNSITO da própria província. O **Porto** abre a rota de
mar. Nenhum é o outro com números trocados.

⚠️ As duas pernas do Mercado existem porque cada uma sozinha era armadilha, e as duas
medições estão registradas: só local, ele não pagava onde `transitoBase` é pequeno; só
nacional, o preço escalava pelo peso da terra e Corinto ia a 1.729 turnos de retorno, com
"nunca" em metade do mapa. Juntas, o retorno do nível I caiu para **41 a 101 turnos** do poder
mais pobre ao mais rico. Corinto abre com Mercado I erguido pela autoria: lá o que se mede é o
nível II, que foi de 1.729 para 149 turnos.

Não existe teto populacional artificial. Crescimento, recrutamento, baixas e desmobilização
usam a população atual. Recrutar reduz população e imposto; Quartel não é requisito para
recrutar — ele multiplica o treino da leva.

Comida é saldo em pontos do poder, em DUAS contas: `saldo civil = subsistência + alimentos
− faixas de população` e `saldo final = civil − exército` (`−1` por `soldadosPorPonto`
homens ou fração, excluindo tropas presas em cidades sitiadas próprias).

**O tamanho da província pesa**: cada terra cai numa FAIXA de população absoluta, definida em
`ajustes.json`, e come os pontos dela — Atenas (35.000) custa mais que Salamina (3.000). Não
é upgrade de cidade: não se compra faixa e não há punição por não construir; quem faz a
província evoluir são as construções. O nome da faixa é a régua que a ficha mostra ao lado do
número de habitantes, e é a MESMA que decide o consumo — um sistema, um trabalho. O saldo
local (`produção − faixa`) dá o papel da terra: Sustentadora, Equilibrada ou Dependente.

⚠️ A régua era RELATIVA (um nível a cada 25% acima da própria população inicial), e por isso
o tamanho não importava para a comida — só a variação dele. Consequência prática de trocar:
Atenas abre **apertada** (a menor folga entre os 18 poderes jogáveis), porque tem 63.000
pessoas numa terra que o próprio dado descreve como pobre em cereal.

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

**O preço de uma obra acompanha a riqueza da terra que a ergue**, e a folha dela junto
(`campanha/custo-de-obra.ts`). A escala sai do peso econômico AUTORAL da província — nunca do
estado vivo, senão recrutar 3.000 homens baratearia as obras dali. ⚠️ Escalar por POPULAÇÃO
parecia óbvio e estava errado: a produção não cresce com o número de habitantes, então cobrar
o dobro de quem tem o dobro de gente mandava o Lagar de Atenas a 700 turnos de retorno.
Consequência medida: os 18 poderes jogáveis juntam a obra mais barata em **4 a 8 turnos**
(era 3 a 17), e todos têm pelo menos duas obras que se pagam — um teste guarda isso.

Universais: Ágora, Mercado, Muralha, Templo, Porto e Estrada. Porto exige ancoradouro.
Explorações aparecem conforme produto principal ou secundário: Fazenda, Pastagem, Porto
pesqueiro, Lagar, Vinhedo, Serraria, Mina e Pedreira. Fazenda, Pastagem e Porto pesqueiro dão
`+1/+2/+3` comida; as demais explorações multiplicam a produção.

**O Quartel VOLTOU ao catálogo**, e agora entrega: `efeito.tipo === 'qualidade'`, com
fatores `1,1/1,2/1,3` sobre o TREINO da tropa levantada naquela província. Ele passou um
tempo escondido por vender promessa — a regra segue valendo para qualquer prédio com
`efeito.tipo === 'futuro'`, que fica fora de todo catálogo até entregar alguma coisa.

**Três obras novas liberam armas, e a liberação é por PROVÍNCIA:** `armaria` (hoplita, sem
requisito de produto), `acampamento-de-arqueiro` (arqueiro, só onde há madeira) e
`treinamento-de-cavaleiros` (cavalaria, só onde há cavalos). O efeito é
`{ tipo: 'arma', arma }`, e `campanha/provincia/armas-da-provincia.ts` é quem lê o catálogo
e responde o que a terra levanta. Nenhuma delas consome mercadoria: o produto é REQUISITO,
como em Mina só onde há ferro.

Templo soma pontos ao ALVO de felicidade da província (+5/+8/+12). Muralha melhora a milícia
e impede assalto imediato. O número de milicianos mostrado na ficha é exatamente a força
enfrentada no assalto; não existe outro multiplicador escondido.

### Felicidade, revoltas e fim de campanha

O humor de cada província é vivo: caminha alguns pontos por turno (`passoPorTurno`) rumo
a um ALVO — base de 50, mais a comida do reino (fome −20 … abundante +10), cerco (−15),
o quanto o rei é ESTRANHO ao povo daqui (ver abaixo), a GUARNIÇÃO do dono (+12 na cheia,
proporcional abaixo dela), o nível de imposto (baixo +12,
alto −10, confisco −25) e Templo. A conquista dá um choque imediato (−25), único movimento não gradual.
Números em `ajustes.json`. A conta é LEGÍVEL como a da comida: o tooltip do humor na
ficha decompõe o alvo parcela a parcela ("base +50 · mesa farta +5 · imposto −8 · Templo
+8 → caminhando para N").

**A NACIONALIDADE decide o quanto o rei é estranho ali** — e é o que dá direção à expansão.
A regra que existia era binária e cega: *"o dono de hoje é o mesmo de 700 a.C.?"*, −12 e pronto.
Ela dava o mesmo peso para Atenas mandando em Elêusis — jônia, a dez quilômetros, com 15% de
atenienses já morando lá — e para Atenas mandando na Beócia. E dava ZERO para Mégara segurando
uma Salamina que é 20% ateniense. A província sabia que tinha mudado de bandeira e não sabia
de quem era o povo dela.

Os dados já traziam duas camadas, e nenhuma regra as usava: a **nacionalidade**, que é a cidade
(ateniense, eleusina, megarense), com a FRAÇÃO da população em cada uma; e o **povo**, que é a
tribo grega dela — jônio, dório, beócio, lócrio. A tribo passou a morar em
`dados/economia.json`, junto do nome, porque é fato do povo e não de quem manda nele.

Daí saem três degraus, e eles são a régua inteira:

| | exemplo | pontos |
|---|---|---|
| o meu próprio povo | Atenas em Maratona | 0 |
| outra cidade da minha tribo | Atenas em Elêusis (jônia) | `outraCidade` −6 |
| outra tribo | Atenas em Mégara (dória) | `povoEstrangeiro` −18 |

⚠️ **E é PROPORCIONAL à fatia do povo, não um carimbo na província.** Mégara segurando Salamina
paga pelos 20% de atenienses que vivem lá (−4); Atenas segurando a mesma Salamina paga pelos
80% de megarenses (−14). A mesma terra cobra preços diferentes de donos diferentes, que é
exatamente o que uma cidade mista faz. O rótulo da parcela leva a fatia junto — *"de outro povo
(85%)"* —, porque −18 sozinho não diz o tamanho do problema.

Medido com Atenas conquistando cada terra do recorte: a Ática sai de graça, a Eubeia jônia sai
por −6, e tudo o mais por −18. **Isso é o mapa ganhando uma direção**: unificar os seus é
barato, atravessar o Istmo é caro. E o LEVANTE passou a ser gatilho de maioria — a terra pega
em armas quando a maior parte do povo dela não reconhece o dono, e não porque a bandeira mudou
uma vez.

A/B em 100 turnos, com a parcela ligada e desligada: a faixa Revoltosa **não se mexeu** (2,1%
nas duas), e o que mudou foi o topo descer para o meio — Satisfeita 27,1% → 15,2%, Insatisfeita
8,2% → 16,3%. Ninguém foi empurrado para a revolta; o mundo ficou menos folgado.

**Guarnição é ordem pública** (pedido de Henrique jogando): tropa do DONO parada ali sobe o
alvo do humor, em proporção ao tamanho da cidade e com teto na guarnição cheia
(`alvo.guarnicaoPlena`). É a única coisa que se pode fazer contra o descontentamento no MESMO
turno — Templo leva turnos, imposto baixo custa renda, e o povo conquistado não deixa de ser
quem é. Tem preço: cobra folha todo turno e some quando a tropa
marchar. Exército inimigo acampado não conta — aquilo é cerco, e o cerco já desconta.

Na faixa Revoltosa (primeira faixa das `faixas`), a província entra em greve fiscal:
imposto zero, produção/comércio/manutenção seguem. Sob bandeira estrangeira, o pavio
corre: após `revolta.turnos` turnos revoltosos, 2% da população pega em armas como hoste
do dono de 700 a.C. — saindo da população, podendo reviver um poder eliminado, e **sentando
em cerco sobre a cidade com postura de assalto**. ⚠️ Ela nascia solta e sem ordem, e uma
hoste assim não luta nem toma nada: ficava parada para sempre. Com o cerco de pé, a cidade
para de produzir e de mandar trânsito, e a revolta vira a pergunta que devia ser — esmagar
(surtida ou socorro) ou perder a terra. Província revoltosa de dono
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

### Áudio

A campanha possui trilha ambiente em loop e efeitos próprios para seleção, clique, abertura,
fechamento, confirmação, recusa e passagem de turno. O navegador libera o áudio depois do
primeiro gesto do jogador; perder o foco pausa a música.

O controle provisório no canto foi removido. Durante a campanha, `Esc` abre o **menu de pausa**
com Continuar, Opções, sair para o menu principal e sair para a área de trabalho. Opções possui
volumes independentes de música e efeitos, de 0% a 100%, persistidos imediatamente. Voltar ao
menu preserva o salvamento e oferece Continuar campanha; fechar o aplicativo usa a ponte segura
do Electron. Se uma janela comum estiver aberta, o primeiro `Esc` fecha essa janela e o seguinte
abre a pausa.

Os efeitos são sintetizados em tempo real por `src/audio/motor-de-audio.ts`, sem samples
externos. A faixa provisória `Ancient Mysteries` fica em `assets/audio/musica/`, volume baixo,
loop contínuo e licença CC0 registrada em `assets/audio/LICENCA.txt`.

⚠️ **A paleta é GREGA, e não genérica** — pedido de Henrique: *"tem que fazer sentido com o
nosso jogo, e mundo grego"*. Os efeitos nasceram em seno e triângulo, que é som de painel de
configurações. Dois instrumentos sintetizados respondem por tudo:

- **a LIRA** (`corda`), dedilhada, para o que o jogador FAZ — clicar, escolher, abrir, fechar.
  É uma onda periódica de harmônicos ímpares fortes e pares fracos, o perfil de uma corda
  pinçada perto da ponta, com um filtro que fecha junto com o decaimento: a corda perde
  BRILHO antes de perder volume, e é isso que o ouvido lê como dedilhado;
- **o BRONZE** (`bronze`), batido, para o que o jogo ANUNCIA — a rodada que vira. Parciais
  **inarmônicas** (1 · 2,76 · 5,40 · 8,93), como as de um sino de verdade: é a quebra da série
  harmônica que faz o ouvido ouvir um objeto de metal em vez de uma nota afinada.

⚠️ **As notas saem do modo dórico e os intervalos são os que a música grega usava**: a QUINTA
sobe ao abrir uma janela e desce ao fechar (o intervalo que a lira afinava primeiro), toca
junta ao confirmar, e o erro é a SEGUNDA MENOR — mi contra fá, a dissonância que a teoria
grega evitava. Nenhuma frequência aqui é arbitrária.

### Guerra terrestre

- **O mapa abre em paz.** `dados/exercitos.json` tem `guarnicoes` vazio de propósito. Cada
  poder decide quanto recrutar durante a campanha e toda cidade já possui milícia local. O
  mecanismo de hostes iniciais continua funcionando para cenários. **Não repovoar sem
  Henrique pedir.**
- **A folha militar tem duas taxas: casa e campanha** (`combate.manutencaoPorHomem.emCasa`
  e `.emCampanha`). Vale a de casa quando a hoste está em província do próprio poder;
  a de campanha em terra alheia, inclusive sitiando. O predicado vive na `Mobilizacao`,
  que recebe um `donoDe` no construtor — a folha não conhece `Territorios`.
- Consequência: sitiar drena, e conquistar a província derruba o custo da mesma tropa no
  mesmo turno. A ficha da hoste mostra o valor da taxa vigente, e o painel de recrutamento
  mostra os dois números lado a lado.
- Com isso nenhum dos 18 poderes jogáveis abre em déficit. A razão de renda entre o maior
  (Atenas, 702) e o menor (Hermíone, 91) continua em 7,7×, e isso é POPULAÇÃO, não
  privilégio: por habitante Atenas é a 9ª de 18 e Tebas é a última. O que ainda separa os
  poderes na prática é o RITMO de decisão — turnos para juntar a construção mais barata vai
  de 3 (Atenas) a 17 (Hermíone), sem relação com tamanho, e isso é assunto do trabalho de
  fechar as construções.
- Hostes têm identidade própria e preservam a origem provincial de cada soldado.
- Ordens usam o id da hoste; mais de uma força pode ocupar a mesma província.
- Movimento é simultâneo, determinístico e limitado inicialmente a uma fronteira por
  rodada. O jogador pode clicar no destino final: a rota mais curta fica guardada, a hoste
  avança sozinha nas próximas viradas e pode ser cancelada em qualquer parada. Antes de cada
  trecho o caminho é recalculado; batalha em província, recuo ou rota que deixou de ser
  permitida encerram a viagem. A IA continua decidindo o próprio próximo trecho por turno.
- Pode marchar apenas parte da hoste; forças do mesmo poder se fundem ao se encontrar.
- **A batalha é choque + perseguição** (`combate/batalha.ts`), com quatro botões em
  `ajustes.json`: rodadas de choque, letalidade do choque, limiar de quebra e letalidade da
  perseguição. Substituiu `√(maior² − menor²)`, que aniquilava quem perdia.
- ⚠️ **O limiar de quebra é 70%** — subiu de 60% por decisão de Henrique (27/08/2026), e o
  efeito foi medido antes e depois na mesma versão. A linha cede mais tarde, e por isso o
  derrotado leva **11% para casa em vez de 15%**; em 100 turnos de campanha inteira: 29
  províncias trocando de dono contra 25, **9 poderes eliminados contra 7**, 32 guerras contra
  24, e 13.355 homens vivos no mapa contra 18.653. **É um mundo mais violento e mais
  concentrado.** Uma partida é uma amostra, não uma média — o jogo é determinístico, mas
  mudar o botão muda a cadeia inteira de decisões da IA.
- ⚠️ **A muralha deixou de salvar vidas na cidade que cai, e isso é consequência do 70%.**
  Contra 1.000 atacantes, 400 defensores murados agora saem com 38 homens contra os 43 de
  campo aberto: atrás do muro eles resistem até quase o fim, e resistir mais tempo contra um
  exército inteiro custa MAIS vidas. O que a muralha promete continua de pé — ela vira a luta
  em que o defensor tem chance (900 contra 1.000 e 2.500 contra 3.000 seguem vitórias do
  defensor) — e o teste que guardava a promessa foi reescrito para guardar isso, e não o
  número de sobreviventes de uma praça perdida.
- **A batalha lê a COMPOSIÇÃO** (`combate/composicao.ts`). Cada lado chega com três números
  por homem — ataque, aguento e o multiplicador da caçada —, todos medidos em leves, e
  `batalha.ts` não conhece hoplita nem arqueiro. As baixas são proporcionais entre os
  contingentes, então a composição não muda durante a batalha e os três números são
  constantes do primeiro round ao último.
- **As quatro armas** (`combate.batalha.armas`): leve (a régua: ataque 1, aguento 1, o mesmo
  valor de um miliciano), hoplita (aguenta), arqueiro (mata) e cavalaria (persegue). O
  triângulo é hoplita → cavalaria → arqueiro → hoplita, com `counter` multiplicando o ataque
  de quem tem a arma certa, proporcional à fatia inimiga que ela bate. Sem penalidade para
  quem sofre: contar as duas pontas dobraria o efeito.
- **A cavalaria compra o DEPOIS.** `perseguicaoPorCavalaria` multiplica a caçada do vencedor
  e o custo do recuo do perdedor, e SATURA por `meiaCavalaria`: um esquadrão de 10% já
  entrega a maior parte do bônus. Sem a saturação ela seria armadilha — a força cresce com o
  quadrado das cabeças, e toda tropa cara perde a corrida de números.
- **O cavalo cobra em comida, não em ouro.** `bocasEmArmasDe` alimenta o balanço alimentar em
  BOCAS (`armas[arma].comida`), e não em homens; a folha de pagamento segue por cabeça.
- **A milícia é sempre leve comum de qualidade 1** e nunca recebe Armaria, Quartel nem
  acampamento. Só a Muralha a fortalece.
- **O treino é carimbado na leva** (`treinoEm` lido no recrutamento) e multiplica o ataque, e
  não o aguento. Perder a província depois não rebaixa quem já está em armas.
- **Não existe empate**: quem chama passa o defensor como desempate, e barrar o invasor é a
  vitória de quem segura o chão.
- **A Muralha faz DUAS coisas, e nenhuma é endurecer o defensor** (decisão de Henrique,
  25/08/2026): ela multiplica a milícia (×1,25 / ×1,50 / ×1,75) e obriga o inimigo a sentar
  duas rodadas antes de assaltar. Um terceiro bônus — `aguento` no assalto — foi medido e
  recusado: no nível I mudava a conta de 250 para 260 atacantes, e no III de 340 para 410. O
  campo `aguento` continua no relatório valendo 1, e é por ele que um muro entraria se um dia
  entrar: multiplicador VISÍVEL, round a round, nunca escondido dentro da força da defesa.
- **Recuar** (`recuaAos`) sai de campo antes da quebra por uma fração pequena e sem
  perseguição — a fração sobe se o vencedor tiver cavalaria. `refugio` é uma pergunta que a
  resolução faz e a campanha responde: vizinha própria por geografia e posse, ou `null` na
  última terra. Está LIGADO de ponta a ponta: a ficha da hoste alterna entre "Lutar até o
  fim" e "Poupar o exército", e a ordem de marcha carrega `recuarAos`.
- ⚠️ **A composição do relatório é a ORDEM DE BATALHA, fotografada antes do primeiro golpe.**
  Ela era montada depois das baixas, sobre as mesmas referências de contingente que a
  resolução acabara de encolher, e por isso contava SOBREVIVENTES: numa hoste de 3.000 a
  janela dizia 308 homens já no round zero. Henrique achou jogando — procurou os 308 no mapa
  depois da derrota, achou só o marcador do inimigo e concluiu que os soldados dele tinham
  trocado de dono. Não tinham: quem quebra dispersa e volta para a população, e o único
  marcador que sobra ali é mesmo o do vencedor. Corrigido em `travar-lados.ts`, com teste que
  guarda a soma da composição contra o total de homens.
- **A janela de batalha** (`ui/batalha.ts`) abre só nas batalhas do jogador, depois da rodada
  resolvida, e reproduz a lista de rounds. Ela não recalcula nada e fechar não muda o mapa —
  um teste de tela confere que o último round bate com o que a regra deixou.
- Milícia deriva da população e não é um estoque humano separado.
- Sitiar não engaja automaticamente a guarnição nem conquista a cidade. Assaltar engaja e
  tenta tomar a praça. A cidade sitiada continua cobrando imposto e recrutando; quem
  definha lá dentro é obra da fome do cerco, não de batalha.
- A marca de cerco usa cor fixa de fogo, sem herdar a cor política da província ou do
  sitiante.
- O sitiado pode fazer surtida e reforços externos atacam o sitiante ao chegar.
- Cidade murada exige cerco antes do assalto; cidade aberta pode ser assaltada de imediato.
- A crônica distingue batalha de campo, estrada e assalto, e conta o SAQUE em linha própria.
- **Tomar à força quebra a cidade** (`campanha/guerra/saque.ts`): morre `conquista.mortosNoSaque`
  da população civil e uma obra perde `conquista.niveisPerdidos` níveis — a Muralha primeiro,
  a mais cara de pé quando não há muralha. Só o ASSALTO saqueia; entrar numa província sem
  defensor continua custando zero.
- A janela de batalha desenha **uma faixa por arma** dentro da barra de cada lado e escreve a
  composição ao lado do nome; o painel de recrutamento mostra as quatro armas sempre, com as
  trancadas apagadas e o motivo no tooltip.

### A janela de batalha

O jogador **assiste, não comanda**: a regra resolve a batalha quando o turno vira e a janela
reproduz a lista de rounds que ela produziu — não existe uma fórmula para decidir e outra para
animar, e por isso a tela não consegue mentir.

Refeita com o que as telas de resultado dos outros jogos ensinam:

- **dois exércitos frente a frente**, em colunas espelhadas com os mesmos campos na mesma
  ordem — duas barras empilhadas são uma lista, não um confronto;
- ⚠️ **o LIMIAR DE QUEBRA desenhado na barra desde o round zero, nos dois lados.** É o suspense
  inteiro e ele era invisível: a batalha não se decide no zero, se decide quando um lado passa
  do `limiarDeQuebra`. Agora a barra desce rumo a um filete, e ao lado dele lê-se *faltam 481 para
  quebrar*;
- **uma régua só para os dois** — antes cada barra era normalizada pelo próprio total, e 2.400
  contra 2.000 desenhavam a mesma largura: a diferença de tamanho dos exércitos estava apagada
  pelo CSS;
- **a firmeza em palavra** — firme, rangendo, vergando, cedeu — em degraus que são fração do
  limiar, e não do exército, para não mentirem se o limiar mudar no JSON;
- **barra é estado, número é delta, e o jogador precisa dos dois**: o segmento fantasma mostra a
  fatia perdida NESTE round, e a fita escreve `1.736 → 1.621` em vez de `−115`;
- **a fita ACUMULA** e rola sozinha, o round da quebra nasce em corpo maior, e cada fase tem
  canal próprio de cor com palavra junto;
- **o fecho separa o choque da debandada**: *"Elêusis perdeu 1.736: 1.340 no choque · 396 na
  debandada"*. São contas diferentes de propósito — uma linha que cede perde na fuga muito mais
  gente do que perdeu segurando, e é essa a lição que o jogador leva para a próxima marcha.

## O painel da província

⚠️ **A identidade é uma FAIXA de três coisas que não se confundem** — reino, região e nome.
Henrique clicando: *"ainda está muito confuso, qual o nome da província, da região e do reino?
o reino tem que ser o mais importante"*. Ele tinha razão pelo pior motivo: `ATENAS · MEGÁRIDA`
saía numa linha só, mesma fonte, mesmo tamanho, mesma cor, separados por um ponto — os dois
nomes eram indistinguíveis, e o mais importante dos três era o mais fraco da tela.

Agora: o **reino** abre a ficha numa faixa própria, acima do nome, em maiúsculas fortes e com o
escudo da tinta dele CHEIA (era um contorno vazio de 14 px); a **região** fica na outra ponta
da mesma faixa, menor e apagada; o **nome da província** continua grande, logo abaixo. Nenhum
rótulo dizendo qual é qual — a posição e o peso já dizem. Zona marítima usa a mesma faixa com
"Zona marítima" no lugar do reino, sem escudo e sem região.

Refeito por inteiro depois de Henrique jogar, com as telas de província de EU4, Total War, CK3
e Civ como referência. O que havia eram **três caixas empilhadas numa coluna que rolava** —
ficha, ações e recrutamento somavam mais de 800 px de altura, e levantar exército era a única
coisa do jogo que exigia rolar para achar. Nenhum jogo do gênero faz isso: o EU4 pendura as
construções numa gaveta lateral, o Total War as manda para um navegador próprio, e o painel
principal cabe inteiro na tela porque é ele que se lê a cada clique.

Agora é **uma moldura só, sem `overflow`**, ancorada no canto de baixo à esquerda, e a ordem
de leitura é a hierarquia:

1. **quem é** — nome, reino, região, e os SELOS do que a torna especial. Capital era uma frase
   de rodapé (*"0/4 slots ocupados · níveis I–III · capital do reino"*) e agora é a primeira
   coisa que se vê;
2. **o que está errado** — cerco, revolta, rota cortada e obra em andamento, cada um numa linha
   de alarme com causa e prazo. Só aparecem quando existem;
3. **as QUATRO MEDIDAS**, em número grande: **saldo · humor · povo · milícia**. São as quatro
   perguntas que fazem alguém clicar numa província — quanto ela me dá, o povo aguenta, quanta
   gente tem, ela se segura. Região e povo desceram para a linha de identidade e para o
   tooltip: dizem o que a terra É, não o que ela vale;
4. **a barra de comandos** — dois portões (Construções, Recrutar), os três níveis de imposto
   e o botão de capital quando ele faz sentido.

O que a terra dá — *Azeite IV · Grãos II* — é a **terceira linha da identidade**, em itálico,
e não um bloco próprio. As construções ERGUIDAS saíram do painel: estavam logo abaixo dos
produtos, com o mesmo desenho de pastilha, e as duas listas se confundiam — uma é o que a
terra é, a outra é o que se construiu nela. O contador do portão ("1/4") diz quantas existem;
a janela diz quais.

Duas medidas ganharam MOVIMENTO, e pela mesma razão. O **humor** ganhou a seta (`62 ↓`): 45
caindo para 12 e 45 subindo para 70 eram a mesma província na tela e são situações opostas na
mesa. O **povo** ganhou o passo do próximo turno na régua (`+175 · terra grande`), no formato
que o tesouro do reino já usava na barra — população parada e população derretendo eram o
mesmo `35.000`. O jogo calculava os dois desde sempre; a tela mostrava metade.

**Construir e recrutar viraram janelas próprias**, na mesma moldura de Governo e Diplomacia
(`src/ui/janela.ts`, escrita quando a quarta cópia da mesma casca ia nascer). ⚠️ **Elas não
trocam de cena**: véu leve e sem desfoque, tamanho proporcional ao conteúdo — a primeira
versão escurecia e desfocava o mapa inteiro e parecia ter engolido o jogo.

- **Construções** (980 px, larga e rasa): uma grade de cartões onde cada obra mostra o que
  faz, o custo, o prazo, a manutenção, o que rende e em quantos turnos se paga — tudo
  escrito, e não em tooltip. Numa faixa de 380 px cada construção cabia em uma linha, e uma
  linha só comporta nome e preço: o jogador escolhia por preço porque era a única coisa
  visível. Comparar É a decisão inteira;
- **Recrutar** (620 px): as quatro armas em cartões de **nome e quatro números** — custo,
  ataque, aguento, comida. As trancadas dizem o que falta em duas palavras.

Tudo isso passou pela régua do **[princípio de menos tutorial](GDD.md)**: saíram as
definições ao lado dos números, os "faltam 2.065 moedas", o teto de homens anunciado antes de
alguém pedir, e a instrução para arrastar a barra.

O nome da região também deixou de ser o id cru: `src/mundo/regioes.ts` traduz `atica` em
**Ática** para a tela, sem tocar no dado.

## O mar navegável — 48 zonas, e o exército anda nelas

**O buraco que ele fechou**: das 196 províncias, **26 não tinham nenhuma vizinha** — Rodes,
Naxos, Samos, Quios, Lemnos, Creta insular e outras. Nenhum exército do mapa, do jogador ou da
IA, podia pisar em nenhuma delas. **Salamina era o caso gritante**: a 2 km da costa de Atenas,
com economia autoral, população e produção — e território morto, intocável para sempre. Hoje
são **0**.

**Não existe frota.** Decisão de Henrique: *"o exército anda pela água (pelas zonas) como um
exército normal"* — o modelo do Age of History 2. É barato porque o jogo já sabia quase tudo: a
marcha anda por vizinhança, a batalha acontece sozinha quando duas forças se encontram, e a
conquista é um passo separado que a zona de mar simplesmente não tem.

**O mapa**: 48 zonas com nome histórico onde a antiguidade batizou (Helesponto, Euripo, Mar
Mirtoo, Golfo Sarônico) e geográfico onde não (Estreito de Salamina, Mar de Rodes). Elas
nascem de sementes em longitude e latitude reais (`dados/mares.json`) e crescem sobre a água
pelo mesmo método das províncias. ⚠️ **O gerador é ADITIVO**: lê o `provincias.png` pronto,
pinta só onde o índice é zero e o bioma é água, e numera a partir de 1000. Nenhum id de terra
mudou, nenhum salvamento quebrou. Cobertura medida: **99,99% da água livre**.

**As regras da água:**

- zona de mar **não tem dono** (`donoDe` devolve string vazia), não se conquista, não se sitia,
  não produz e não tem milícia;
- **embarcar exige Porto** na província de onde se sai; desembarcar é livre em qualquer costa, e
  navegar de zona em zona também. É a terceira razão de existir do Porto — depois do trânsito e
  do alcance comercial — e o que impede exército nascendo no meio do Egeu;
- **todo encontro no mar é batalha**: não há a quem declarar guerra na água, e não há praça a
  tomar. Os dois lados se matam e a zona continua de ninguém;
- **um salto por rodada**, como em terra. De Atenas a Andros são 3; a Rodes, 6; a Corcira, 8. A
  distância virou tempo, e o caminho pode ser interceptado. Para o jogador, um único clique
  no destino basta: a marcha continua automaticamente entre as viradas.

**A IA atravessa**, e são duas peças pequenas que a fizeram enxergar:

- **a rota longa** (`rotasLongasDaHoste`): a percepção dela lista o que ENCOSTA no reino, e nada
  encosta em ninguém através da água. A rota longa responde *"por onde eu chegaria lá, um dia?"*
  com as mesmas regras da marcha, e a expedição anda o primeiro trecho por virada.
  `oportunidadesNoLitoral` é a lista de alvos correspondente — toda costa alheia do mapa, e não
  só a vizinha. Perceber longe não é poder longe: quem peneira é o Porto;
- **o preço da porta** (`valorDoMar`, por estilo): o Porto custa 2.500 e paga em trânsito, a
  menor parcela da renda. Medido, **nenhum dos dezoito poderes erguia um em cem turnos** — o
  mar existia, o exército sabia navegar, e nenhum reino chegava à porta. Só o PRIMEIRO Porto
  vale isso; do segundo em diante a porta já está aberta e ele volta a valer o trânsito.

⚠️ **A travessia é decidida ANTES da retirada**, e a ordem é a regra inteira: uma hoste no meio
do mar está fora do próprio reino, e para a retirada isso basta para mandá-la voltar. Sem essa
ordem, todo exército que zarpasse daria meia-volta na virada seguinte. Quem está a caminho não
volta — e quando a guerra acaba, a expedição não se renova e a retirada o traz de volta da água.

⚠️ **E a travessia é dona do ÚLTIMO trecho, que é o desembarque — sem isso ela nunca terminava.**
Duas guardas separavam a travessia da marcha por terra: rota de dois trechos ou mais, e água
dentro dela. Elas valem para quem ainda está em casa; para quem já está boiando eram uma
armadilha fechada. Chegando à zona que ENCOSTA na ilha, o que falta é um trecho só e sem água
nenhuma — a travessia soltava a hoste, e `retiradasEscolhidas` a pegava no mesmo instante,
porque água não é terra inimiga e *"a terra deixou de ser inimiga"* é sempre verdade no mar.
`ataquesEscolhidos` também não a salvava: `emTerraAlheia` já conta os homens no mar como
gastos, então a fatia que pode marchar chega a zero justamente para quem está na água.

**Medido: 12 embarques e ZERO desembarques em terra alheia em 150 turnos.** Todas as doze
expedições voltaram para casa. Reproduzido no detalhe: 4.000 homens megarenses parados em
Euripo, encostados em Cálcis, deram meia-volta e passaram **sete turnos** contornando a Eubeia
até Mégara, perdendo 570 homens de folha e deserção, com a ilha intocada. **A IA atravessava o
mar inteiro para desistir no último passo** — e o número que teria mostrado isso não existia:
embarques e trechos de travessia estavam os dois saudáveis. `npm run partida` passou a contar
**desembarques em terra alheia**, que é o número que fica zerado quando a travessia não conclui.

Depois do conserto, nos mesmos 150 turnos: **3 desembarques em terra alheia**, e a postura do
último trecho volta a ser a decidida — no meio da água ela não significa nada, na praia ela é
a diferença entre assaltar a praça aberta e sentar na frente dela.

⚠️ **O jogador nunca teve este defeito**, e é o que o escondeu: a viagem dele é uma ordem só,
guardada com `continuar`, e ela atravessa e desembarca sozinha. Medido: Atenas com Porto sai da
Ática, cruza o Estreito de Salamina e o Golfo Sarônico e toma Cálcis na terceira virada.

**Medido em 100 turnos, isolando cada peça:**

| | conquistas | travessias | acordos de comércio de pé |
|---|---|---|---|
| antes | 20 | — | 23 |
| só a porta (Porto valorizado) | 24 | 0 | 45 |
| porta + travessia | **45** | **85** | 45 |

O mar não faz ninguém disparar: a distância entre o maior e o menor reino **diminuiu** (8,0× →
6,9×). Ele abre uma segunda frente para todo mundo ao mesmo tempo.

**Na tela**: a zona pinta transparente — não tem dono, então não recebe cor de reino — e a
divisa entre duas zonas é a mesma linha de fronteira a 40% (`provincias.forcaDoMar`), forte o
bastante para se ver onde uma acaba e fraca o bastante para não competir com os reinos.
Selecionada, ela acende **pelo contorno**: uma zona tem o tamanho de meia dezena de províncias,
e preenchimento cheio nela cega o resto do mapa. A ficha dela é o nome e a palavra "Zona
marítima", sem medida nenhuma, e a barra de comandos some — não há obra, leva nem imposto na
água.

**O que falta:**

1. **o custo de FICAR no mar.** O exército embarcado paga a taxa de campanha (três vezes a de
   casa) e come da mesa do reino — o que já é caro —, mas não há desgaste por estar na água.
   A pergunta esperava o bloqueio, e o bloqueio chegou: agora que ficar parado COMPRA alguma
   coisa, o desgaste é a próxima fase;
2. **bloqueio naval — FEITO na fase 2.** Ver a seção adiante. Proteção de rota escoltada
   continua fora: o que existe é o bloqueio do CAIS, e não da rota no meio da água;
3. **a IA patrulha? ainda não — mas ela já INTERCEPTA.** Ver a seção seguinte: a regra existe,
   está sob teste, e mediu **zero disparos** por uma razão que não é dela;
4. **quem desembarca não tem volta.** Embarcar exige Porto **em terra sua**, então o exército
   que desce numa ilha alheia e não a toma fica lá: a retirada não acha caminho nenhum e o
   exílio se resolve pela deserção. Hoje é a regra sendo coerente — sem frota, não há navio
   esperando na praia —, e é uma decisão por tomar, não um defeito: ou embarcar passa a valer
   de qualquer costa sob licença, ou toda travessia continua sendo aposta sem volta. Medido
   depois do conserto do desembarque: em 150 turnos, **15 expedições voltaram para casa e 3
   desembarcaram** — a maioria desiste porque a paz é assinada no meio da viagem, que é a
   regra funcionando; mas a que desce e erra não volta nunca.

   ⚠️ **Decidido por Henrique, e fica como está:** *"para desembarque não é obrigado porto, mas
   para ir pro mar é obrigado. Posso desembarcar em qualquer província, mas para voltar pro mar
   só por províncias com porto"* — e o caso que ele deu é o desenho inteiro: *"se sou um reino
   do mar e ataco um reino da terra e não houver um porto, não é possível retirar exércitos da
   terra"*. Não é buraco: é o preço de zarpar.

## Fase 1 do naval: a IA disputa o mar

Henrique, sobre a lista acima: *"essa ideia de ter guerras por controle no mar é perfeito"* — e
*"não faça tudo de uma vez, separe por fases cada implementação"*. Esta é a primeira.

**A INTERCEPTAÇÃO** entrou como a quarta reação de `ia/guerra/defender.ts`, ao lado do socorro,
do socorro à cidade sitiada e da surtida: **expedição inimiga parada na água que ENCOSTA no meu
chão é desembarque a caminho; se eu ganho dela lá, eu vou.**

- ⚠️ **Não fura a regra dura do arquivo — água não é terra alheia.** Zona marítima não tem dono,
  não se conquista e não se sitia, então sair para ela continua sendo defender. É a única saída
  de casa que aquele arquivo autoriza;
- ⚠️ **Encostar na minha costa é a régua inteira, e ela é estreita de propósito.** Sem isso a IA
  sairia caçando expedição alheia pelo Egeu inteiro, e uma frota que vai de Rodes a Corcira não
  é ameaça de ninguém no caminho. O que se defende é a praia: quem está na água ao lado da minha
  terra desembarca nela na virada seguinte, e a escolha do lugar já terá sido dele;
- ⚠️ **Quem não tem Porto não disputa o mar, e isso caiu sozinho.** A interceptação pergunta a
  `alcanceDaHoste`, e embarcar exige Porto na terra de onde se sai — um reino sem cais vê a frota
  passar e espera na praia. É a **quarta razão de existir da obra**, sem regra nova;
- **no mar não há milícia, muralha nem praça a segurar**: é a batalha mais limpa do jogo, e por
  isso a previsão vale ali mais do que em qualquer outro lugar. O desempate vai para quem já
  está na água — ninguém segura chão nenhum, e estar ali é o que mais se parece com defender.

**E o encontro na estrada passou a exigir guerra.** O cabeçalho dele sempre disse *"duas forças
HOSTIS"*, e o código emparelhava qualquer par de poderes diferentes — era o último lugar do jogo
onde gente em paz se matava, já que o choque na província pergunta pela guerra antes de escolher
o segundo lado. É no mar que a troca de aresta acontece mais: a rota longa põe muita gente na
mesma água.

⚠️ **Medido em 150 turnos: ZERO interceptações — e a razão não é a regra.** Instrumentado, **não
houve uma única ocasião**: nenhuma frota no mar, em nenhuma virada, estava em guerra com o dono
de alguma costa que ela tocava. Todas as 32 hoste-viradas na água eram de gente em paz.

**A causa é a expedição não sobreviver à diplomacia.** A IA decide do zero a cada turno e não
guarda plano nenhum — está escrito no cabeçalho de `ia/ia.ts` como dívida conhecida —, então a
paz assinada no meio da travessia dissolve a campanha e a retirada traz o exército de volta.
Medido nas mesmas 32 hoste-viradas na água: **13 seguiram viagem e 19 deram meia-volta**, e o
sintoma visível é o vaivém — Lócrida Opúntia oscilando entre o Golfo Maliaco e o Pagasético em
viradas alternadas, travessia num turno e retirada no outro.

A interceptação fica de pé e sob teste — e na fase 2 ela passou a disparar.

## Fase 2 do naval: o bloqueio, e a viagem entrando na conta

### O BLOQUEIO NAVAL — o cerco do mar

> **Frota inimiga parada na água que banha o teu Porto fecha aquele Porto.**

É a primeira razão que uma força tem para **FICAR** numa zona de mar. Até aqui a água era
estrada: servia para atravessar, e ocupá-la não comprava nada — zona de mar não tem dono, não se
conquista e não se sitia. O bloqueio dá a ela a única coisa que ela podia ter sem ter dono: **o
que passa por ela**.

Fechar o cais é tudo o que ele faz — não toma, não saqueia, não mata. O Porto é que tem três
razões de existir, e o bloqueio apaga duas:

1. **a ligação por mar** (`comercio/circulacao.ts`): a metade do reino que só chega à capital
   embarcando fica **cortada** e perde o trânsito. Salamina volta a ser uma ilha;
2. **o alcance do comércio** (`comercio/alcance.ts`): reino com todos os cais fechados não põe
   mercadoria no mar, e os acordos que só existiam por água param de render.

⚠️ **A terceira razão do Porto — EMBARCAR — continua livre, e é deliberado.** Um bloqueio que
também trancasse o cais seria inquebrável: o bloqueado não teria como sair para atacar quem o
bloqueia, e a única defesa contra uma frota seria não ter porto. Do jeito que está, **sair é
atacar** — a água que se precisa cruzar é justamente a ocupada, e o encontro no mar é batalha
pela regra que já existia.

⚠️ **É o mesmo desenho do cerco em terra, de propósito.** Sitiar não toma a cidade: corta a
produção e o comércio dela e espera. Bloquear não toma a água: corta o que passa por ela. Quem
leu uma das duas não precisa aprender a outra.

⚠️ **Uma zona banha meia dúzia de províncias, e é a geografia falando.** Uma frota fecha vários
cais de uma vez, e é isso que faz o Golfo Sarônico valer uma guerra e o Mar de Rodes não.

⚠️ **A ROTA DO ACORDO passou a ser conferida TODO TURNO** (`comercio/rede-de-trocas.ts`), e não
só na assinatura. O próprio `alcance.ts` já dizia por quê — *"um acordo assinado sobre rota
nenhuma seria dinheiro nascendo do nada"* — e a regra só valia no aperto de mão: depois disso o
papel pagava para sempre. Agora a fronteira perdida, o Porto derrubado e a frota inimiga cortam
a renda sem precisar rasgar o acordo. É por aqui que o bloqueio chega ao bolso.

**Na tela**: selo `bloqueada` e a linha *"Cais bloqueado por X"* na ficha da província, com o
tooltip dizendo o que se perde. Um Porto que para de funcionar sem dizer por quê lê-se como
defeito do jogo — a mesma razão pela qual a ficha distingue "em revolta" de "rota cortada".

**A IA bloqueia** (`ia/guerra/bloquear.ts`), e a decisão são três perguntas: que água fecha mais
cais inimigos; eu aguento ficar lá; e sobra reino em casa. Ela roda **depois da travessia e antes
da retirada** — depois porque tomar uma cidade vale mais que fechar um cais, antes porque frota
parada é, para a retirada, exército fora do reino, e sem essa ordem o bloqueio duraria um turno.

⚠️ **E quem já está bloqueando FICA — isso custou um teste vermelho.** A primeira versão
descartava da lista o cais já bloqueado, inclusive o bloqueado por mim: a frota que segurava a
água tornava a própria posição inútil na virada seguinte, saía da lista, e a retirada a levava
para casa. **O bloqueio se desfazia sozinho por ter dado certo.**

### A VIAGEM ENTRA NA CONTA DO ALVO

`oportunidadesNoLitoral` é deliberadamente larga — toda costa alheia do mapa —, e a travessia
escolhia o primeiro alvo que passasse, ordenado por valor puro. A frota zarpava atrás da costa
mais **rica** e não da mais **perto**: uma hoste de Mégara punha-se a caminho de Rodes, a oito
trechos, e a guerra acabava ou a casa pegava fogo muito antes. A régua passou a ser **valor por
trecho** — a distância já virou tempo quando o exército passou a andar um salto por rodada, e
tempo aqui é a folha de campanha.

### CASA EM CHAMAS FECHA O CAIS, NÃO AFUNDA A VIAGEM

A trava é a mesma do ataque — *"quem embarca fica turnos longe de casa, e casa pegando fogo é o
pior momento possível para **zarpar**"* — e ela guardava a função inteira, cancelando a expedição
que já estava no meio do Egeu. **Uma frota a três turnos de casa está a três turnos de socorrer
qualquer coisa**: dar meia-volta perde a viagem E chega tarde. Quem está na água segue; quem está
no cais fica.

### Medido em 6 partidas de 120 turnos (o jogador parado muda de reino a cada uma)

| | antes da fase 2 | depois |
|---|---|---|
| desembarques em terra alheia | 1,5 | **2,8** |
| trechos de travessia | 24,3 | 31,7 |
| interceptações na água | 0,2 | 0,3 |
| **bloqueios** | — | **1,7** |
| conquistas | 20,8 | 20,0 |
| poderes vivos de 18 | 10,2 | 10,5 |
| maior reino | 8,2 | 7,8 |

**O mar dobrou de movimento e o mundo não desandou** — o maior reino ficou menor e sobrevive
mais gente. Uma partida só não teria mostrado isso: as seis divergem completamente entre si.

### ⚠️ O resultado NEGATIVO que ficou de fora: a paz cega ao mar

*"Não há mais o que tomar dele"* pergunta a `oportunidadesDe`, que só vê o que ENCOSTA no reino
— e nada encosta em ninguém através da água. É a mesma cegueira que `oportunidadesNoLitoral`
consertou do lado do ataque, e do lado da paz ela custa caro: **medido, das 32 hoste-viradas na
água em 150 turnos, 16 eram de reinos SEM GUERRA NENHUMA.** Metade das expedições boiava por
nada, porque a paz fora assinada no meio da viagem.

Escrevi o conserto em três formas e **medi as três**. Nenhuma se pagou:

- **recusar toda paz com frota na água**: o maior reino saltou de 9 para **20 províncias**, os
  eliminados de 11 para 14, a distância entre o maior e o menor de 11,4× para **30,9×**. Quase
  todo poder deste mapa tem costa, então uma expedição travava TODAS as pazes do reino;
- **só a cláusula "o que tomar", com a costa dentro**: inerte — três das seis sementes deram
  resultado idêntico ao de não haver regra nenhuma;
- **a cláusula acima das outras três**: as travessias saltaram de 24 para 89 trechos e os
  desembarques **caíram de 2,0 para 1,0**. Mais frota no mar, menos chegando: as expedições
  passaram a circular sem concluir, e as conquistas subiram 71% por guerras que não terminavam.

A regra fica **anotada e fora**. A cegueira é real, e o conserto certo é a memória prometida no
cabeçalho de `ia/ia.ts` — *"estou comprometido a tomar Mégara"* —, que não cabe no tabuleiro: a
hoste que marcha com a força inteira renasce com id novo a cada virada, então a memória precisa
de campo no estado e de prazo próprio. Não vale a pena antes de o mar ter mais portos.

⚠️ **E é o número que explica o resto: o mapa inteiro termina com 6 Portos de pé em 150 turnos.**
O `valorDoMar` faz só o PRIMEIRO cais valer a obra, e é essa escassez — e não a regra naval — que
segura o teto de tudo: bloqueio, interceptação e desembarque dependem de haver cais dos dois
lados. Quem quiser um mar mais cheio mexe ali.

## A barra de comida diz o teto do exército, e é a única coisa que ela precisava dizer

Henrique perguntando por que Mégara sustenta mais soldados que Atenas. Fui medir os **três
tetos** do exército — comida, ouro e gente — nos 18 poderes, no turno 1:

| `soldadosPorPonto` | teto de Atenas | posição dela | o que trava os 18 |
|---|---|---|---|
| 3.000 (antigo) | 3.000 homens | 2º de 18 | gente 16 · comida 1 · ouro 1 |
| **500 (atual)** | **500 homens** | **18º de 18** | comida 8 · ouro 1 · gente 9 |

⚠️ **A mais rica do mapa abre em último lugar em capacidade militar, e nada na tela dizia por
quê.** Atenas tem renda 774 — o dobro do segundo colocado — e 63.000 bocas numa terra que a
própria ficha descreve como de azeite e prata. Ela *pode pagar* 7.740 homens e só consegue
alimentar 500.

A saída existe e é a certa: **a Fazenda**. Medido em Atenas — 2 fazendas (≈12 turnos) levam o
teto a 1.500, 4 a 2.500, 6 a 3.500 — e aí a comida para de importar, porque o teto de GENTE
dela é 3.498. **O teto de Atenas é temporário; o de Mégara, que trava em OURO com renda 208, é
estrutural.** Mégara começa forte e estaciona; Atenas começa de joelhos e não tem teto.

O problema, então, nunca foi o balanço — era o jogo não contar.

⚠️ **E o aviso mora no RECRUTAMENTO, não na barra do topo.** A primeira tentativa pôs o número
na barra — `+1 500 homens` no lugar de `+1 Abastecido` — e Henrique matou na hora: *"aqueles
1500 jogados na UI é ridículo"*. Ele tinha razão, e a lição vale para o resto do jogo: **um
número solto no HUD é ruído permanente; a informação pertence ao instante da decisão**, quando
a mão já está na barra do recrutamento. Foi ele quem propôs o lugar certo.

Então o painel de recrutar, que já dizia o que a leva custa em ouro e em gente, passou a dizer
o terceiro teto — o único que estava mudo. Passando da despensa, o número de soldados fica
vermelho e a previsão troca de conta por consequência:

> **A despensa alimenta 500: o resto passa fome no próximo turno.**

⚠️ **Não é uma trava.** O botão continua liberado: passar do que se alimenta é uma decisão do
jogador, como é para a IA, e ele paga na virada. E o que cabe depende da ARMA — cavalo come por
vários, então a mesma despensa alimenta menos cavaleiros que hoplitas.

## O mundo passa a olhar a tua POSIÇÃO — e uma assimetria que estava escondida

Depois da pesquisa nos jogos do gênero, o buraco tinha nome: **a nossa conta só sabia responder
por fatos bilaterais.** A guerra entre os dois, a fronteira entre os dois, a terra que um tomou
do outro. Um reino podia engolir meia Grécia e **nenhum terceiro sentia nada** — a conquista
abalava a opinião de um par, o da vítima.

Os quatro jogos pesquisados punem expansão globalmente: é a **expansão agressiva** do EU4 (que a
−50 forma coalizão), o *"poderoso demais"* do Total War, as **grievances** do Civ VI. E o Age of
History 2 e o Total War têm também a metade que nos faltava do outro lado: **tratado com o
inimigo dela baixa a opinião dela.**

### As duas parcelas

- **sombra do maior** — a diferença de porte entre os dois, em províncias. ⚠️ **E aqui ela não é
  importada, é o tema**: Tucídides explicando a Guerra do Peloponeso, *"o crescimento do poder de
  Atenas, e o alarme que isso causou em Esparta"*. Repare que o jogo já punia o tamanho **por
  dentro** — corrupção por tamanho, com teto de 50% — e não tinha nada por fora. Faltava metade
  do freio;
- **amigo do meu inimigo** — quantos reinos abraçam quem está em guerra com o outro. É o que faz
  a diplomacia ser **escolha**: sem ela, ser amigo de todo mundo é grátis e sempre certo.

⚠️ **A sombra conta acordo MILITAR e não comércio, de propósito.** Pacto, aliança, tributo e
passagem são compromissos; comércio é o degrau mais barato da escada, e foi ele que tirou a mesa
de 82% de indiferença. Cobrar por comerciar com um inimigo trancaria de volta o que acabou de
abrir.

⚠️ **E a sombra tem LIMIAR, que é o que separa sombra de ruído.** Sem ele ela disparava entre um
reino de três províncias e um de uma — o mapa inicial, não uma ameaça — e a mesa inteira
afundava: **as propostas ao jogador caíam de 54 para ZERO**, em toda dose testada. É o mesmo
limiar que a corrupção por tamanho já usava.

### A assimetria que elas revelaram

⚠️ **A conta do alvo era assimétrica, e a opinião é UM número por par.** `fronteira` contava só
as províncias DELE que encostam nas minhas — não é o mesmo número que o contrário —, e
`terrasTomadas` só a terra que o primeiro da ordem alfabética tirou do segundo. Como
`andarRelacoes` sempre chama na ordem dos ids, **quem decidia qual das duas contas valia era o
alfabeto**.

Medido numa partida de 60 turnos: **7 pares divergiam**, com Argos e Epidauro em *"fronteira
comum (1)"* num sentido e *"(3)"* no outro. E o efeito grave: **metade das conquistas do mapa não
envenenava relação nenhuma** — no par argos–corinto, uma província que Corinto tomasse de Argos
era invisível.

Agora a fronteira é a maior das duas contas e a terra tomada soma os dois sentidos. Há teste
varrendo o mapa inteiro e exigindo que os dois sentidos deem o mesmo número.

### Medido em três passos, 150 turnos

| | antes de hoje | só a simetria | **+ as duas parcelas** |
|---|---|---|---|
| guerras declaradas | 33 | 41 | **38** |
| províncias que mudaram de dono | 12 | 29 | **28** |
| propostas ao jogador | 59 | 54 | **37** |
| **maior reino** | 8 | 10 | **6** |
| **poderes vivos de 18** | 12 | 9 | **13** |
| distância entre o maior e o menor | 7,6× | — | **6,2×** |

⚠️ **A correção da simetria sozinha deixou o mundo mais violento**, e está certa: as conquistas
passaram a envenenar nos dois sentidos, então há mais motivo de guerra do que antes. O maior
reino foi a 10 e sobraram 9 poderes. **As duas parcelas são o que o mundo precisava para
absorver isso**: com elas o maior reino não passa de 6, sobrevivem 13 de 18, e a distância entre
o maior e o menor é a menor já medida neste projeto.

O preço são as propostas ao jogador caindo de 59 para 37 — a mesa ficou mais desconfiada com
todo mundo, inclusive contigo. Continua sendo dez vezes o que era antes da semana começar (zero).

## A LIGA: mandar num reino sem tomá-lo

Até aqui um vizinho tinha dois estados possíveis — independente ou conquistado — e um caminho
só entre eles: exército. A liga é o terceiro estado, e é o que a Grécia tinha no lugar de
império: a Liga do Peloponeso e a de Delos, em que o chefe manda e o membro **continua sendo
ele mesmo**.

⚠️ **"Vassalagem" é a mesma mecânica em outro século**, e a palavra não se usa porque é feudal.
Na tela e na conversa é **chefe** e **membro**.

### O que fica de cada lado

O membro mantém governo, províncias, exército, tesouro e despensa; o chefe não constrói na
terra dele, não define o imposto dele e não move a hoste dele. O que passa a ser do chefe é
**tributo** (uma fatia da renda, todo turno), **as guerras** (o membro entra nelas como um
aliado entra) e **a paz entre os dois**.

⚠️ **E o tributo é para o membro o que o imposto é para uma província**, de propósito: mais
ouro agora, mais vontade de sair depois. É uma forma que Henrique já conhece.

### O desejo de sair é a terceira aparição da mesma máquina

Um valor que anda um passo por turno em direção a um alvo feito de parcelas com nome — como o
humor do povo e como a opinião entre reinos. As parcelas: *servir a alguém* (positiva, a base —
ninguém serve por gosto), o nível do tributo, *mesma gente*, *ele é maior* (a sombra do chefe,
que aqui SEGURA em vez de afastar), *décadas de costume* e *a guerra dele*.

Cheio, ele se revolta: sai da liga **e declara guerra**. No chão, ele aceita virar província.

### Anexar só acontece com o SIM do membro

⚠️ **Esta regra nasceu de uma pergunta de Henrique que derrubou o primeiro desenho.** Eu havia
proposto que o chefe pudesse anexar à força pagando reputação; ele perguntou *"e se eu fosse
Mégara nessa situação?"* — e a resposta era que o jogador perderia o reino por um botão que
outro apertou, sem batalha e sem reação. E abrir exceção para o jogador seria pior ainda: seria
regra diferente para ele.

Então o chefe **pede** e o membro responde. O membro da IA diz sim quando o desejo está no
chão; o jogador recebe a proposta como recebe pacto e aliança, e **recusar não custa nada**.
Recusado, o chefe tem um caminho só: romper a liga, pagar a reputação, e invadir.

⚠️ **E não se anexa quem entrou ontem.** `turnosParaAnexar` existe porque sem ele, medido em
150 turnos, as 6 ligas formadas terminaram em 4 anexações e **nenhum membro de pé** — entrar e
ser engolido virou um passo só, e o degrau que a liga deveria ser desapareceu.

Quem passa de mão por acordo NÃO leva o choque de humor da queda: usa `trocarDono` e não
`conquistar`. O preço permanente é outro e continua existindo — a nacionalidade. Mégara é
dória; na liga de Atenas a infelicidade dela é problema dela, anexada ela custa −18 de humor
por povo estrangeiro para sempre.

### Três coisas nasceram mortas e as três apareceram medindo

1. **Zero ligas em 150 turnos.** `opiniaoMinima` era 45 e passava em **10 de 23.890
   pares-turno**; a maior opinião que existe no jogo é 50. Foi para 40.
2. **Zero revoltas, em toda dose.** O desejo só variava de 17 a 33 porque a alavanca do tributo
   era fraca demais e as parcelas que acalmam comiam tudo. Pesado subiu de +15 para +30, leve
   de −10 para −18, e a guerra do chefe de +12 para +18 — o intervalo abriu e a IA passou a
   usar os três níveis.
3. ⚠️ **A revolta saía em SILÊNCIO.** O membro deixava a liga no turno 6 e a guerra
   simplesmente não nascia, porque o **pacto** entre os dois a recusava. Um reino que se
   revolta e não luta é um reino que sumiu do mapa por um defeito. Agora a revolta rasga o
   papel, como o levante de uma província já fazia.

### O que ela fez com o mundo, 150 turnos

| | sem liga | com liga |
|---|---|---|
| ligas formadas · membros no fim | — | **7 · 1** |
| anexações | — | **4** |
| guerras declaradas | 51 | **46** |
| províncias que mudaram de dono | 23 | **20** |
| **maior reino** | **11** | **7** |
| poderes vivos de 18 | 8 | 7 |

⚠️ **A liga converte CONQUISTA em domínio**, e é isso que a última linha mostra: o maior reino
cai de 11 para 7 províncias porque os pequenos que seriam engolidos viram membros — e membro
mantém a própria terra. O preço é um poder a menos vivo no fim, que são os que aceitaram virar
província depois de décadas bem tratadas.

## A ALIANÇA: o único acordo que obriga a fazer

*"Vamos de aliança então!"*. Ela era o degrau que faltava, e a falta dela tinha forma: **todo o
resto da mesa é promessa de NÃO fazer** — não atacar, não fechar a estrada, não cobrar. Nenhum
acordo do jogo obrigava alguém a FAZER alguma coisa, e por isso dois reinos podiam sangrar
cinquenta turnos contra o mesmo agressor lado a lado sem que um levantasse um homem pelo outro.

### As cinco regras

1. **É um pacto que também obriga.** Nenhum dos dois declara guerra ao outro, e **a guerra de um
   vira a guerra do outro**.
2. **A entrada é automática, e não pergunta.** ⚠️ Não é falta de agência: a agência foi
   ASSINAR, e ela continua existindo em `romperAlianca`. Uma convocação recusável de graça seria
   uma aliança que não obriga — ou seja, um pacto com nome pomposo.
3. **Só o aliado DIRETO entra.** Aliado de aliado não é aliado; sem isso uma escaramuça de
   fronteira viraria guerra mundial em três turnos.
4. **Promessa que já existe segura a convocação.** Quem tem pacto, trégua ou aliança com o
   inimigo não é arrastado contra ele: a aliança não pode fazer você quebrar de graça uma
   promessa que te custaria reputação quebrar sozinho.
5. **A paz é de cada um.** Entrar é automático, sair não — e é isso que impede a aliança de
   virar um bloco que só existe inteiro.

Romper custa mais que romper um pacto, e é a resposta honesta a *"e se a guerra dele não me
servir?"*: rompa e fique fora dela, pagando por abandonar quem contava com você.

### Ela nasceu morta duas vezes, e as duas foram medidas

⚠️ **Zero alianças em 150 turnos na primeira versão.** O mesmo sintoma dos zero Portos e dos
zero presentes, e a mesma disciplina resolveu: contar quantos pares-turno passam em cada
portão. Eram dois defeitos independentes.

- **A opinião mínima era inalcançável por dois pontos.** O prazo mais barato pedia 40, e a maior
  opinião que dois poderes atingem em 150 turnos era **38**. Um número calibrado contra um teto
  que ninguém tinha medido. Passou a pedir 25 e 35.
- **A RAZÃO era exigida dos dois lados, e isso matava a aliança do fraco por construção**: quem
  está ameaçado tem motivo, e o forte que poderia salvá-lo justamente não está ameaçado — logo
  nunca tinha. **9 pares-turno de 13.247 passavam.** Agora a razão é do PAR e basta um lado
  tê-la; a VONTADE é que continua sendo consultada nos dois sentidos, como no pacto.

⚠️ **E a aliança levantou o teto da própria mesa**: com ela em jogo a maior opinião vista subiu
de **38 para 47** — o que, de quebra, tirou do limbo o pacto de 40 turnos, que pedia 45 e nunca
tinha sido assinado por ninguém.

### O que ela fez com o mundo, em 150 turnos

| | sem aliança | com aliança |
|---|---|---|
| alianças assinadas · de pé no fim | — | **70 · 10** |
| propostas ao jogador | 34 | **59** |
| poder-turnos em guerra | 4% | **10%** |
| **trechos de travessia pelo mar** | 6 | **118** |
| passagens militares concedidas | 36 | **68** |
| acordos de comércio abertos | 90 | **126** |
| províncias que mudaram de dono | 15 | **12** |
| distância entre o maior e o menor | 9,8× | **7,6×** |

⚠️ **Mais guerra e MENOS conquista, e é isso que uma coalizão faz.** Os poder-turnos em guerra
mais que dobraram enquanto as províncias que mudaram de dono caíram — quem ataca um reino
pequeno agora enfrenta o aliado dele, e a distância entre o maior e o menor encolheu. O mapa
briga mais e consolida menos.

E o efeito que ninguém pediu e que é o mais bonito: **as travessias pelo mar saltaram de 6 para
118.** A aliança é o primeiro acordo que faz sentido através do Egeu — ela não pede fronteira,
só um inimigo em comum —, e foi ela que finalmente pôs os exércitos nos barcos.

## A mesa diplomática deixa de ser 82% indiferença

Henrique: *"o que mais de diplomacia tá meia-boca? Tá faltando?"*. Fui medir antes de opinar, e
o diagnóstico tinha um número só.

⚠️ **Dos 306 pares possíveis entre os 18 poderes, apenas 56 tinham alguma parcela de opinião
acontecendo. Os outros 250 ficavam em zero para sempre.** A causa era estrutural, e ela se lê
na própria régua:

```
POSITIVAS (todas exigem ASSINAR algo):  comércio +10 · pacto +15 · tributo +6
NEGATIVAS (todas acontecem sozinhas):   guerra −60 · trégua −15 · fronteira −20
                                        terra tomada −45 · promessa quebrada −25
```

A única coisa que a geografia sabia produzir era *fronteira comum*, e ela é negativa. Quem não
te encosta não tinha como ter opinião nenhuma sobre ti — e a IA só abre comércio com opinião
acima de `relacaoParaDeclarar`, que é **0** no equilibrado. Ou seja: **o estado natural da mesa
era reprovado de saída.** O único caminho para entrar nela era presente, e o banco mostrava a
IA fazendo exatamente isso — 51 presentes e 25.201 de ouro em 150 turnos, comprando o direito
de existir numa mesa que nascia trancada.

Duas consequências:

- **o vizinho, que é o parceiro natural, era estruturalmente o pior parceiro possível** —
  fronteira dá −5 por província e nada cicatrizava; dois vizinhos que nunca se bateram seguiam
  em −20 no turno trezentos;
- **o jogador parado recebia ZERO propostas em 150 turnos**, com opinião 0 contra todo mundo.
  Não por hostilidade: por inelegibilidade.

### Três razões de gostar de alguém, e nenhuma delas pede assinatura

- **mesma gente** — a tribo grega (jônio, dório, beócio, lócrio) já estava escrita nas fichas
  autorais e já movia a felicidade desde a nacionalidade; **não havia uma linha dela em toda a
  pasta de diplomacia.** É a razão certa porque é o que a Grécia de 700 a.C. tinha no lugar de
  nação: o dório de Corinto reconhece o dório de Argos, e o jônio de Atenas reconhece o jônio
  de Eretria através do Egeu inteiro. Ser de outra tribo não afasta — dá indiferença, que é o
  que a base já diz;
- **inimigo em comum** — o motor mais básico do gênero, e não havia uma linha dele: dois reinos
  podiam sangrar contra o mesmo agressor por cinquenta turnos e continuar indiferentes. Ao
  contrário da tribo, esta parcela é VIVA: aparece com a guerra e some com ela, que é o que faz
  a aliança de conveniência ser exatamente isso. Com teto, senão uma guerra geral faria todo
  mundo amar todo mundo por aritmética;
- **paz por década** — é o que faz a fronteira parar de ser veneno eterno. Com teto também:
  durar não vira amizade infinita.

⚠️ **E nada disso pediu estado novo.** A paz sai do registro de TRÉGUA, que guarda o turno em
que ela vence e não é apagado quando vence — é, portanto, a data em que a última guerra deixou
de doer. Quem nunca guerreou conta desde o começo da campanha, que é a resposta certa: não ter
história de sangue é a paz mais longa que dois reinos podem ter.

### O que mudou, medido em 150 turnos

| | antes | depois |
|---|---|---|
| pares em opinião zero | 54% | **0%** |
| **propostas ao jogador** | **0** | **34** |
| opinião dos outros sobre o jogador | 0 (de 0 a 0) | **6 (de −7 a 12)** |
| acordos de comércio abertos | 52 | **90** |
| pactos assinados | 88 | **113** |
| presentes (o suborno de entrada) | 51 · 25.201 de ouro | **23 · 10.253** |
| guerras declaradas | 40 | **29** |
| províncias que mudaram de dono | 30 | **15** |
| poderes varridos de 18 | 6 | **6** |

⚠️ **O preço está na última metade da tabela, e ele é honesto: o mundo guerreia menos.** As
conquistas caíram pela metade — o que é o que se pede a um sistema cujo trabalho é dar razões
para não brigar. As doses foram varridas antes de escolher; a mais generosa que testei (o dobro
desta) derrubava as conquistas para 10 e deixava a mesa boa demais.

⚠️ **E sobrou um nó conhecido, que é o próximo se ele quiser a guerra de volta:
`relacaoParaDeclarar` faz DOIS trabalhos.** Ele é ao mesmo tempo *"acima disto eu não te
ataco"* e *"acima disto eu comercio contigo"*, e os dois puxam para lados opostos — subir a
barra devolve a guerra e apaga as propostas ao jogador. Medido: com a barra +8 as conquistas
voltam a 42 e as propostas caem a zero. Separá-los é o conserto, e ele não cabia nesta mudança.

## O editor de balanceamento passa a escrever nos dados

Henrique, ao descobrir para onde iam os números que ele afinava: *"uai, quando eu mudo no
editor que o chat criou não muda no repositório?"* — e a resposta era não. O editor (F2) fazia
a parte difícil, que é mexer no número e ver o jogo responder na hora, sem recarregar; o que
faltava era a saída. Os valores viviam em `localStorage`, então **não iam para o git, não iam
para a outra máquina, e nenhuma ferramenta os enxergava** — `npm run partida`, os testes e o
`npm run economia` leem `dados/*.json`.

Agora o rodapé do editor tem **"Gravar em dados/"**, e ele grava de verdade:
`ferramentas/vite-gravar-balanco.ts` é um plugin do vite que recebe os ajustes já mexidos e
reescreve `dados/ajustes.json` e `dados/construcoes.json`. Daí em diante é arquivo como
qualquer outro — entra no `git diff`, viaja no `git push`.

⚠️ **Só durante o `npm run dev`.** `apply: 'serve'` mantém a rota fora do `vite build`: o jogo
empacotado não carrega nada que escreva em disco. Fora do desenvolvimento o botão responde
*"Gravar em disco só funciona no npm run dev"*, e não um erro de parser.

⚠️ **E ele valida antes de escrever, com o mesmo esquema que o jogo usa para carregar.** Um
editor capaz de corromper os dados é pior que nenhum editor. Se o Zod recusar, nada é escrito e
o motivo volta em uma linha legível — `alimento.soldadosPorPonto: esperava número`, e não o
despejo cru do erro.

⚠️ **Grava o OBJETO, e não uma lista de campos.** O editor já mantém `ajustes.jogo` e
`construcoes.construcoes` mexidos em memória; mandar o objeto pronto dispensa um mapa de "id do
campo → caminho no JSON", que é o tipo de tabela paralela que envelhece torto quando alguém
acrescenta um campo de um lado e esquece do outro. Isso se apoia numa propriedade que agora tem
teste em `testes/dados.test.ts`: **a ida e volta pelo esquema não perde um campo sequer.** O
Zod descarta chave que não conhece, então dado novo no JSON sem entrada no esquema sobreviveria
a carregar o jogo e sumiria na primeira gravação — o teste é o alarme.

Detalhe que aparece uma vez só: `JSON.stringify` normaliza `1.0` para `1`. A primeira gravação
mexe em quatro linhas do `ajustes.json` por isso, e nunca mais.

## Um ponto de comida passou a sustentar 500 soldados, e não 3.000

Decisão de Henrique depois de afinar no editor. `alimento.soldadosPorPonto` foi de 3.000 para
**500**: a comida deixa de ser um teto distante e vira o gargalo de verdade.

⚠️ **O que isso significa no turno 1, e é a parte que surpreende: Atenas sustenta 500 homens.**
Medido em todo o mapa, o jogador começa com o saldo alimentar mais APERTADO de todos — 1 ponto,
contra 6 de Mégara e 5 de Argos e Tebas. Erguer exército passa a exigir erguer a lavoura antes.

O mundo, porém, ficou mais saudável, e não menos — porque a IA aprendeu a plantar antes (ver a
seção seguinte). `npm run partida 100`, comparado com o antigo 3.000:

| | 3.000/ponto | **500/ponto** |
|---|---|---|
| turnos com fome em algum lugar | 3 | **0** |
| turnos com a tropa passando fome | 29 | **3** |
| homens em armas no mapa | 19.958 | **20.167** |
| poderes varridos de 18 | 6 | **6** |
| distância entre o maior e o menor | 11,0× | **8,5×** |

⚠️ **E 25 testes ficaram vermelhos de uma vez, em 11 arquivos — nenhum deles sobre comida.**
Eram folha militar, marcha, cerco, dispensa, milícia: todos plantavam mil homens em Atenas, que
a 500 já não os alimenta, e passaram a medir fome sem querer. A correção não foi encolher os
exércitos dos testes, e sim tirar a comida da equação onde ela não é o assunto:
`testes/apoio/mundo.ts` ganhou `ajustesFartos` e `novaCampanhaFarta`, e quem testa comida
continua nos ajustes de verdade.

⚠️ **Um deles estava verde pelo motivo errado, e só o andaime revelou.** O teste da deserção
alistava 3.500 homens e afirmava que eles desertavam por falta de pagamento — mas 3.500 homens
custam 350 por turno contra 774 de renda de Atenas, folgadíssimo. Quem encolhia aquele exército
era a FOME. Agora ele recruta **até a folha passar da renda**, derivado e não escrito à mão, e
mede o mecanismo que diz medir.

## A IA e a comida: ela planta para crescer, ou planta por emergência?

Pergunta de Henrique depois de mexer no balanço: *"uma config que eu gostei foi exército a
partir de 500 soldados já tira 1 da comida. A IA está configurada com o sistema de comida
também? Ela entende que precisa ter mais comida para poder criar mais exército?"*

**Ela já estava ligada em quatro lugares**, e nenhum deles era novo: saldo negativo tranca o
recrutamento inteiro; o que sobra na despensa vira o TETO da leva, em bocas, dividido pela
comida da arma; despensa apertada tira a cavalaria da lista; e a obra de alimento troca de
preço. O que **não** existia era o plano.

⚠️ **Medido antes de mexer, com um ponto de comida para cada 500 soldados: 21 das 28 obras de
comida saíam com a parede já nas costas.** O ciclo dela era de bombeiro — bater no teto, parar
de recrutar, erguer a fazenda, recomeçar. A causa era a régua: `saldo <= limiarDeAperto` só
enxerga o saldo de HOJE, e um saldo de hoje que fecha não diz nada sobre o exército de amanhã.

### A régua nova olha para frente

`src/ia/percepcao/sustento.ts`: a despensa conta como apertada quando **o exército que a
economia do reino banca não caberia nela** — a folha de guerra convertida em homens, e os
homens em pontos de comida. É a pergunta que faz um reino encher celeiro em tempo de paz.

⚠️ **Pela folha de GUERRA, e nunca pela de paz — a primeira versão errou aqui.** Usando a
folha vigente, que é um décimo da renda em paz, a conta dava menos de um ponto e a antecipação
quase não disparava: as 21 de 28 continuavam iguais. Quem espera a guerra para plantar planta
tarde.

⚠️ **E a régua SENTE `soldadosPorPonto`, que a antiga não sentia.** A conta é em bocas, então
baixar o número de 3.000 para 500 — um ponto de comida seis vezes mais valioso em soldado —
move o gatilho sozinho, sem reajustar nenhum peso em `dados/ia.json`.

### E a comida passou a ter TRÊS preços, porque um só quebrou o mundo

A primeira tentativa reaproveitou `alimentoApertado` (40 moedas por turno) para o gatilho novo,
e ela plantou: as fazendas reativas caíram de 21 de 28 para 18 de 52. **Mas o mapa quebrou.**
`alimentoApertado` foi calibrado como preço de EMERGÊNCIA, raro e altíssimo, e cobrá-lo numa
rotina fez a IA construir só fazenda: em 150 turnos a riqueza do mapa caiu 33% e sobraram
**5 poderes vivos de 18**, com um reino de treze províncias. Uma corrida armamentista com
todo mundo pobre.

Então são três degraus, e a ordem é guardada por teste: **gosto** (`valorDaObra.alimento`, 4 a
6) → **gargalo** (`alimentoNoGargalo`, 20 a 25, o preço de quem planeja) → **emergência**
(`alimentoApertado`, 40 a 50, o saldo já no chão).

### O que mudou, medido — e o que NÃO mudou

Com `soldadosPorPonto` em 500, 100 turnos, 18 poderes na IA:

| | régua antiga | um preço só | **três degraus** |
|---|---|---|---|
| homens em armas | 12.151 | 15.800 | **20.167** |
| obras de comida (quantas na parede) | 28 (21 = 75%) | 52 (18 = 35%) | **43 (20 = 47%)** |
| turnos com a tropa passando fome | 14 | 41 | **3** |
| conquistas | 22 | 49 | **29** |
| poderes vivos de 18 | 11 | 8 | **12** |
| riqueza do mapa | 7.317 | 5.450 | **6.125** |

Ela planta antes, mantém um exército 66% maior, quase não passa fome, e o mundo continua tão
plural quanto era. A conta que ela paga é 16% de riqueza — ela troca Ágora por fazenda, que é
exatamente a decisão que o balanço apertado deveria forçar.

⚠️ **E no padrão do repositório (3.000 por ponto) nada se mexeu — nem um dígito.**
`npm run partida 100` devolve os mesmos 19.958 homens, as mesmas 3 viradas com fome, os mesmos
6 poderes de 18 varridos. A régua nova só morde onde a comida é de fato o gargalo, então quem
não apertou o balanço não sente diferença nenhuma.

## O teto do zoom, e a arte que ele escondia

Henrique: *"consegue liberar o quanto eu consigo dar zoom in? pelo que me lembre tinha travado
em 0,40"*. Lembrava certo — `camera.zoomMaximo` estava em 0,4, e a faixa inteira ia de 0,156
(o mapa todo na tela) a 0,4: **2,5× de ponta a ponta**.

⚠️ **O que aparecia passando de 0,4 não estava pintado no terreno — era uma camada.**
Comparados lado a lado 0,4 / 0,7 / 1,0 / 1,4, apareciam árvores que o jogador nunca tinha
visto, e a leitura óbvia (*"há arte no `terreno.png` que o teto escondia"*) estava errada: elas
vinham de `DetalhesDoMapa`, uma camada de sprites desenhada em tempo de partida, que só
acendia acima de um limiar de zoom. O teto de 0,4 ficava logo abaixo do limiar, então a camada
existia sem nunca ser vista. **O teto foi para 1,0** — e as árvores foram embora, ver a seção
seguinte. Em 1,4 a textura do terreno começa a papar; subir mais custa nitidez, não desempenho.

⚠️ **E o passo da roda anda junto, o que é fácil esquecer.** O número de entalhes de ponta a
ponta é `ln(máximo/mínimo) / ln(passo)`: com o teto em 1,0, o passo de 1,12 passaria de 8 para
**16 voltas de roda** para atravessar a faixa. 1,18 devolve o percurso a 11 sem tornar o passo
brusco.

## As árvores, e a linha de fronteira que sumia

Henrique, com o teto de zoom novo na mão: *"destrói essas árvores aí pelo amor de deus, e
outra coisa, o que consegue fazer em relação às linhas? que elas começam a sumir e quebrar
quando dou muito zoom"*. Duas queixas, dois defeitos independentes — e o segundo estava
escondido pelo teto antigo.

### As árvores

Saíram inteiras. Elas **não estavam assadas no `terreno.png`**: eram uma camada de sprites
montada em tempo de partida a partir de `assets/mundo/detalhes.json`, que o gerador espalhava
pelo mapa. Como a leitura do zoom mostrou, o teto de 0,4 ficava logo abaixo do limiar em que
ela acendia, então era arte que custava memória e quadro sem nunca chegar à tela.

O que sobrou dessa camada é o **grão do chão** — a textura fina que entra com o zoom e tira o
achatado das áreas grandes de cor. `src/mapa/detalhes.ts` virou `src/mapa/grao-do-mapa.ts`, com
a classe `GraoDoMapa` e três números só (`graoInicio`, `graoFim`, `graoOpacidade`); saíram
junto o gerador `gerador/pintar-terreno/detalhes.ts`, o `detalhes.json`, o `espalharDetalhes`
do `gerar-mapa.ts` e o código que só ele usava (`longeDosRios`, `distanciaSegmentoMundo`).

### A linha de fronteira

⚠️ **O defeito não era a linha ser fina demais: era a conta da distância usar `dFdx`.**

A fronteira do mapa político não é desenhada por geometria — ela sai do `provincias.png` no
chuveirinho (`src/mapa/provincias-mapa/sombreador.ts`). Perto, monta-se um campo contínuo que
vale 1 dentro da província e 0 fora, interpolado entre os quatro texels em volta do fragmento;
a fronteira é a curva onde esse campo vale 0,5, e a largura da linha sai de **quanto o campo
muda por pixel de tela** — a inclinação. Isso é *marching squares* por pixel, e é o que dá o
traço liso em cima de uma máscara que é uma escada de texels.

A inclinação vinha de `dFdx`/`dFdy`, as derivadas de hardware. Elas comparam **dois pixels
vizinhos** — e, perto, esses dois pixels caem em **células diferentes** da grade de texels.
Cada um interpola quatro amostras diferentes, e a diferença entre eles não mede inclinação
nenhuma: mede o degrau entre duas interpolações distintas. O número sai grande e às vezes com
o sinal trocado, a distância estimada até a fronteira infla, e **a linha some naquele pixel**.

Isso explica o que se via, e explica por que era diagonal: numa escada de 45° toda célula
difere da vizinha, então o furo cai em *todo* degrau e a fronteira vira uma fileira de pontos;
num trecho raso as células se repetem em corridas longas e a linha sai inteira, com um furo em
cada degrau. E explica por que só apareceu agora: com o teto em 0,4 o mapa vivia no regime
LONGE, que usa outra medida (o anel de amostras) e não passa por aqui. Subir o teto para 1,0
pôs o jogo dentro de um regime que quase nunca era exercitado.

O conserto é `inclinacaoDoCampo`: a derivada do campo bilinear tem **forma fechada** — sai das
mesmas quatro amostras que já estão em mãos, sem tocar em `dFdx` —, exata dentro da célula e
cega para o que acontece fora dela. Com um piso de meia unidade por texel como rede de
segurança do **ponto de sela** (o xadrez em que as quatro amostras se alternam e a inclinação
zera de verdade); piso só pode engrossar a linha, nunca afiná-la. A mesma função passou a
servir a máscara do litoral, que dividia pela mesma derivada.

Efeito medido no par de capturas da mesma cena (`capturas/par-antes.png` e `par-depois.png`):
a linha deixa de ter furos **e volta à espessura pedida**. A derivada inflada não fazia só
buracos — ela afinava a fronteira inteira, então `larguraDaLinha: 2.0` vinha entregando um fio
de cabelo. Se o traço ficar pesado demais para o teu olho, o número é esse, em
`dados/ajustes.json`, e há `calibrarFronteira` no console para achar o valor sem recarregar.

## O nome de cada província, escrito nela

Pedido de Henrique: *"o nome de cada província deve ser escrito diretamente no mapa dentro de
cada província"*. Interruptor **Nomes no mapa** no painel da direita, ao lado das cores e das
relações.

**Onde o nome vai.** Não no `centro` — o centroide, a média das coordenadas —, porque numa
forma torta ele cai fora dela: medido, **15 das 244 províncias têm o centroide no vizinho ou
no mar**, entre elas Ítaca, Melos e o Estreito de Salamina. O ponto é o **pólo de
inacessibilidade**: o mais distante da borda, centro do maior círculo que cabe dentro da
forma, sempre interno mesmo num C. É o que a cartografia digital usa para rotular área — o
`polylabel` da Mapbox faz isso com busca em grade sobre o polígono —, e aqui sai **exato** de
graça porque o mapa é raster: é o pixel de maior distância até a borda, duas varreduras de
transformada de distância. `gerador/gerar-rotulos.ts` é aditivo: escreve só o JSON, não toca
no PNG, e dispensa re-assar o mapa.

⚠️ **O nome ENCOLHE até caber, e nunca some.** A primeira versão seguia a regra dos
renderizadores de mapa de verdade — rótulo que não cabe na área não é desenhado —, e ela está
certa para um atlas e errada para este jogo. Henrique jogando: *"muitos nomes não aparecem
(...) tem que aparecer de todas as zonas"*. Num mapa impresso o nome é enfeite; num jogo de
estratégia ele é como se sabe onde se está, e uma província muda é uma província que o jogador
precisa clicar para identificar. O que sobrou da boa metade da regra é o TAMANHO: o corpo é
fixo em pixels de tela e a província cresce com o zoom, então terra grande fica no corpo cheio
e terra pequena encolhe até um piso de 8 px. Nível de detalhe sem limiar de zoom escrito à mão,
e sem esconder nada.

⚠️ **A opção mora no MENU DE PAUSA, e vem LIGADA.** Decisão dele: *"essa opção tem que estar
ativa 24 horas por dia; o único jeito de desligar seria indo em opções"*. Nome de província não
é modo de visualização como as cores ou as relações — é parte de como o mapa se lê, e um
interruptor à mão convida a desligar o que deveria estar sempre lá. A preferência fica no
navegador, como os volumes.

⚠️ **E a camada não pode roubar o clique.** `base.css` tem `#ui > * { pointer-events: auto; }`
— seletor de ID —, que ANULA um `pointer-events: none` escrito só na classe. Como a camada
cobre a tela inteira, o jogo parava de responder a clique e a arrasto assim que os nomes
acendiam. O seletor aqui precisa do `#ui` junto, e um teste de tela guarda isso: o TypeScript
não vê CSS.

**O que os outros fazem, e onde falham.** O Age of History 2 tem interruptor de nomes e faz
aparecerem com o zoom; a queixa mais repetida dos jogadores é *"nomes e bandeiras grandes
demais"*, e a resposta da comunidade é escolher uma escala de mapa menor — o jogo empurra o
problema para o jogador. O EU4 põe "Display province names" como opção e tem o mesmo
comportamento; o ponto fraco conhecido dele é o CONTRASTE, e há mods populares que só
engrossam a fonte. As duas lições entraram: **é opção**, e o texto leva contorno próprio para
sobreviver a um terreno que vai de verde a ocre a azul.

⚠️ **Água em ITÁLICO** — convenção de cartografia com séculos de uso, e ela resolve de graça um
problema que este mapa criou: desde que o mar virou zona com nome, "Mar de Esciros" e "Cálcis"
são coisas de natureza diferente. O itálico e o azul dizem qual é qual sem uma palavra a mais.

## O mapa também responde "o que acham dele"

Henrique: *"preciso saber qual a relação de um reino com outro reino (...) uma opção que
mostra a cor de um reino que eu selecionar e em volta vermelho, amarelo ou verde"*.

O painel da direita ganhou **Relações: ligadas/desligadas**. Com o modo ligado, o mapa deixa de
pintar de quem é a terra e passa a pintar o que cada reino acha do ESCOLHIDO — que começa
sendo o jogador e troca com um clique em qualquer terra do mapa, que era o pedido ao pé da
letra. A legenda vive no painel, e some com o modo.

Seis casos, e cada um responde uma pergunta diferente: **o escolhido** em osso — uma cor fora
da régua, porque ele é a pergunta e não a resposta —, **em guerra** num vermelho próprio
(guerra não é uma opinião muito ruim: é outra coisa), **hostil / indiferente / amigo** nas três
faixas de opinião, e **sem relação** em cinza para os 121 poderes sem economia, cuja opinião
nunca anda — pintá-los de indiferente daria por resposta um número que ninguém calculou.

⚠️ **Nenhuma camada nova, e é o que fez isto custar um arquivo em vez de um sistema.** O mapa
político já é uma textura de índices lida contra uma paleta de 256×256: trocar o SIGNIFICADO
da cor é reescrever a paleta e mais nada — fronteira, litoral e seleção continuam iguais. A
única coisa que muda além da cor é a opacidade: ela é baixa no mapa político de propósito, para
o relevo aparecer, e num modo de DADOS a cor é a resposta — a 55% duas faixas vizinhas somem
sobre um terreno que vai de verde a ocre. Ver `intensificar`.

## O acesso militar, e a mesa que fala nos dois sentidos

Henrique jogando, duas queixas na mesma anotação: *"para ela poder andar em território de
reinos neutros precisamos criar algum sistema em diplomacia de liberar acesso militar"* e
*"não sinto a IA tentando se conectar comigo para oferecer diplomacia (...) eu ter opção de
aceitar ou recusar"*. Elas se encaixam: o acesso é justamente o acordo que **precisa** de um
sim do outro lado.

**O ACESSO MILITAR** é o único acordo do jogo que tem lado e não tem par. Guerra, trégua,
pacto e comércio valem igual para os dois; Mégara deixar Atenas passar não deixa Mégara passar
por Atenas. A chave no estado é `concedente>beneficiário`, e os dois sentidos podem existir ao
mesmo tempo com prazos diferentes.

Ele dá **passagem**, e só: a hoste entra, atravessa e sai, e a terra vira CAMINHO para a rota
— não só destino. Não dá conquista, não dá cerco, não dá saque, porque nada disso existe sem
guerra. Duas hostes em paz dividem a província sem se tocar, que é a mesma regra que já valia
no mar. A guerra rasga a licença nos dois sentidos, sem preço: quem declara guerra ao dono da
estrada não continua andando por ela com licença dele.

⚠️ **A regra e a vontade são coisas separadas.** `podeConcederAcesso` responde só pelas regras
— não estar em guerra, não haver licença aberta —, porque **a estrada é de quem a abre e
ninguém precisa de licença para dar a própria**. Quem pergunta *"ele abriria para mim?"* é a
IA, e a resposta dela é `aceitaAbrirAcesso`, com a opinião mínima do prazo. A opinião chegou a
morar do lado errado, travando o jogador de tomar uma decisão que é dele — inclusive a decisão
ruim, que é metade do jogo.

**A IA pede passagem por geografia, não por simpatia**: só quando tem guerra em curso, e só a
quem encosta no inimigo. Medido em 100 turnos: **39 passagens concedidas**.

⚠️ **A licença precisa valer nas DUAS portas, e por um tempo valeu só numa.** `podeOrdenarMarcha`
aceitava o destino pela licença; `atualizarViagens`, que reconfere as viagens antes de cada
trecho, conhecia só mar, terra própria e guerra. A ordem era aceita no clique e apagada em
silêncio na virada seguinte. Só a viagem do JOGADOR passa por ali — a IA refaz tudo todo turno,
e por isso nunca viu o defeito —, então quem via o exército parar sem explicação era ele. As
duas portas agora fazem a mesma pergunta, e um teste guarda a viagem de duas pernas terminando
em terra com licença.

**A MESA DE PROPOSTAS** é a outra metade. A IA já decidia com quem assinar pacto e comércio; ela
só não perguntava — o jogador descobria pela aba que tinha assinado alguma coisa. Agora, quando
a outra ponta é o jogador, a assinatura vira **pedido**: aparece a marca `PEDE` na lista de
reinos, um contador na barra (`DIPLOMACIA · 2`) e, no topo do dossiê daquele reino, a frase
dele com **Aceitar** e **Recusar**.

⚠️ **Recusar não custa nada**, de propósito: um "não" que abalasse a opinião faria a resposta
certa ser nunca abrir a aba, e um sistema que pune quem o usa é um sistema que ninguém usa. A
mesa é do TURNO — a virada a esvazia, para o jogador nunca responder a um mundo que já mudou.

⚠️ **Jogador parado não recebe proposta nenhuma, e isso é a regra funcionando.** Medido: uma
Atenas que não faz nada termina 20 turnos com opinião média −6 e **comércio possível com zero
reinos** — sem Porto ela não alcança ninguém por mar, e a fronteira comum é uma parcela
NEGATIVA de opinião. Um jogador que joga (ergue o Porto, cultiva os vizinhos) recebeu **5
propostas de 5 reinos diferentes em 60 turnos**. A diplomacia é conquistada, não distribuída.

## A cor dos reinos: dois que se veem juntos nunca são iguais

Eram **139 poderes para 70 cores**, e o resultado se via a olho nu: **31 pares de reinos que
fazem FRONTEIRA tinham a cor idêntica**. Tebas, Platéias e Téspias eram o mesmo verde — aquele
borrão ao norte da Ática eram três reinos, não um. Atenas e Elêusis, o mesmo azul, logo no
começo da partida do jogador. Contando também quem se vê do outro lado de um estreito, eram
171 pares indistinguíveis.

A régua é a cor **lavada**: o mapa político pinta a 55% sobre o terreno, então a diferença que
importa é a que sobra depois da mistura, e não a do valor hexadecimal. Duas cores precisam de
pelo menos 5 ΔE já lavadas, e a exigência vale entre vizinhos **e entre quaisquer dois poderes
a menos de 120 km** — porque o que engana é o que aparece na mesma tela.

75 dos 139 poderes mudaram de tom, com deslocamento médio de **5 ΔE** e máximo de 11: cada um
recebeu a cor mais parecida possível com a que tinha, dentro da mesma família da paleta. O
mapa continua com a mesma cara; some a confusão. Foram 171 pares indistinguíveis para **zero**.

## O comércio ganhou ALCANCE, e a mesa deixou de ser a vizinhança

Henrique jogando: *"comércio não rende quase nada, não sei o porquê"*. Medido, o porquê
apareceu inteiro — e não era o valor do acordo:

| | o jogador | a IA |
|---|---|---|
| parceiros possíveis | **2** | **17** |
| acordos aos 100 turnos | 2 | 7 a 16 |
| comércio na renda | ~4% | **18% a 40%** |

⚠️ **A regra nunca exigiu fronteira; quem prendia era a TELA.** `podeDeclararGuerra` e
`podeAcordarComercio` só olhavam pacto, trégua e opinião — mas a mesa diplomática listava só
quem faz fronteira, e a IA não passa por tela nenhuma. E havia uma ironia no meio: os dois
vizinhos de Atenas são os poderes mais pobres da região. Um acordo com Elêusis paga 23 por
turno; um com Argos pagaria 48. O jogador ficava preso aos dois piores parceiros do mapa.

**O PORTO passou a abrir o mar** (`campanha/comercio/alcance.ts`), e a regra já estava escrita
no próprio catálogo desde antes — o motivo da obra diz: *"Com Porto nas duas pontas, mercadoria
atravessa o mar — mas exército, não: isso é frota."* Faltava a regra cumprir o dado. Comércio
alcança **por terra entre quem se toca, ou por mar entre quem tem Porto nos dois lados**.
Distância passou a custar em vez de proibir, o Porto ganhou uma segunda razão de existir, e
vale igual para os dois lados da mesa.

**A mesa passou a listar os 18 poderes com ficha**, e não só os vizinhos — decisão de Henrique:
*"temos que quebrar a ideia que só posso guerrear com quem faz fronteira, não faz sentido
isso"*. Ele tem razão pela própria história: Atenas guerreou com Siracusa e com a Pérsia, não
com o vizinho de muro. O balde continua sendo um balde (18, não 139), a fronteira virou um
**selo** na lista em vez do filtro dela, e quem encosta em você aparece primeiro — porque é com
quem a hoste pode marchar hoje.

Medido depois, em 100 turnos: os acordos caíram de 111 abertos para 35, e os de pé no fim de 97
para 21 — **e a renda de comércio SUBIU**, de 420 para 464 por turno. A saturação por parceiro
punia quem assinava com meio mapa; com alcance, cada poder tem poucos acordos e bons.

## O humor deixou de ser decorativo

Henrique jogando: *"humor das províncias continua muito esquisito, todo travado esses
valores"*, *"a escolha de fazer o templo está muito inútil ainda"* e *"sempre que tento
conquistar alguma província que o humor dela já está baixo, a chance de em duas rodadas ela
já se revoltar é muito alta"*. Medido antes de mexer, em 100 turnos e 2.500 amostras de
província-turno: **metade das províncias vivia em "Neutra", seis valores concentravam 80% de
tudo, e "Muito feliz" nunca acontecia.**

⚠️ **A causa era uma só: o humor não fazia NADA.** A única consequência em todo o sistema era
a greve fiscal da faixa revoltosa (≤19). Entre 20 e 100, 50 e 79 eram exatamente a mesma
coisa para o jogo — por isso o Templo não se pagava, o imposto alto não doía e o número
parecia travado. Três frentes:

**1. O humor multiplica a RENDA da província** — uma reta, e não degraus (`felicidade.renda`:
centro 50, 1% por ponto, entre 0,7 e 1,3). Faixa criava degrau invisível: o Templo subia o
alvo de 50 para 55 e não mudava nada, porque os dois caem em "Neutra". E multiplica as **três
parcelas**, não só o imposto — imposto é 13% da renda de Atenas, e preso a ele nenhum ajuste
de humor competiria com um Mercado. A greve fiscal da faixa revoltosa continua sendo regra à
parte, e zera só o coletor.

**2. A régua ganhou três parcelas de situação**, e é o que tirou o humor do mesmo lugar em
todo o mapa: **tamanho da cidade** (metrópole é mais difícil de governar que vila, −3 a −15
por faixa de população), **reino em guerra** (−6, em toda a terra dele) e **sem estrada até a
capital** (−10, a mesma pergunta que a corrupção e a rede de trocas já fazem). A base subiu
de 50 para 56 para compensar.

**3. Duas faixas fervem, em ritmos diferentes** — a revoltosa em 3 turnos, a insatisfeita em
9 —, e ⚠️ **o pavio só corre para quem NÃO está melhorando**: o prazo sai da pior entre a
faixa de hoje e a faixa do ALVO. Era essa a revolta em duas rodadas que Henrique via — o
choque da queda joga a cidade para o fundo de uma vez, ela sobe quatro pontos por turno e o
pavio queimava antes. Reproduzido: uma província tomada com humor 30 se levantava no turno 2,
**com ou sem guarnição**. Agora não se levanta — e a que continua mal governada (imposto alto
sob bandeira alheia) se levanta no turno 9, como deve.

O Templo passou de +5/+8/+12 para **+9/+15/+22** e saiu do *"nunca se paga"* para **172
turnos** em Atenas — ainda o dobro do Mercado, e é justo: ele também é a única obra que
segura uma província contra a revolta.

Medido depois, nos mesmos 100 turnos:

| faixa | antes | depois |
|---|---|---|
| Revoltosa | 0,8% | 1,7% |
| Insatisfeita | 16,8% | 18,0% |
| Neutra | **50,4%** | 45,8% |
| Satisfeita | 32,0% | 19,7% |
| Muito feliz | **0,0%** | **14,8%** |

O valor de humor mais comum caiu de 20,6% para 7,4% das amostras: a régua espalhou. Levantes
em 100 turnos: 3 → 12, e todos de províncias que continuam mal governadas.

⚠️ **A NACIONALIDADE fica para depois, por decisão de Henrique.** Povo eleusino sob bandeira
ateniense infeliz por gerações, com assimilação que leva turnos, é o próximo degrau deste
sistema — e o que vai dar peso histórico à conquista.

## Tipografia e nitidez

Henrique jogando: *"não sei o que acontece com as letras, elas são muito finas, quase não dá
para ler, parece diferente dos jogos que eu estou acostumado."* Eram **três causas somadas**,
e a principal não tinha nada a ver com a escolha das fontes.

**1. `transform: scale()` desligava o antialiasing de subpixel.** O palco tem 1920x1080 fixos
e era escalado com `transform` para caber na janela. Sob `transform`, o Chromium promove a
camada para a GPU e o texto passa a ser rasterizado em escala de cinza — sem hinting e sem
subpixel. Em fundo escuro isso come o traço: a letra fica magra e lavada. Trocado por `zoom`,
que **refaz o layout** no tamanho final em vez de esticar um bitmap. O texto volta a ser
rasterizado no corpo em que aparece. Ver `src/estilo/escala.ts`.

**2. O palco quase nunca roda a 100%.** Numa tela de 1920x1080 com barra de tarefas e barra de
título sobram ~1000 px de altura: a escala fica em ~0,93 e **toda** a tipografia encolhe
junto. Um rótulo de 9 px virava 8,3 px reais. A ferramenta de captura ganhou `--tela=LxA` por
causa disso — antes ela fotografava sempre a 1920x1080, a única situação em que a escala é 1,
e por isso eu não conseguia ver o que ele estava vendo.

**3. Piso tipográfico baixo demais, peso leve e contraste justo.** Corrigido:

- **nada abaixo de 11 px** (eram 8 e 9 px em rótulos); a escada subiu tudo entre 8 e 12 px;
- **corpo em peso 500**, e não 400 — o peso normal de uma humanista desaparece em corpo
  pequeno sobre pedra escura, e o 500 do Alegreya Sans já estava empacotado;
- **os dois tons secundários clareados** (`--ui-texto-fraco` e `--ui-texto-tenue`).

⚠️ Os números dos MAPAS ficaram de fora da escada: etiqueta sobre a terra é outro problema —
crescer ali atravanca o mapa em vez de ajudar.

O que o gênero faz, pesquisado antes de mexer: as diretrizes de acessibilidade de jogos pedem
**28 px a 1080p como mínimo** para texto lido de longe, e tratam isso como piso e não meta;
para UI de mesa, a regra prática é **peso médio, nunca fino** — *"thin fonts may disappear on
low-resolution screens"* — e afrouxar entrelinha e tracking no corpo pequeno. A Paradox usa
faces proprietárias desenhadas para a tela, não fontes de texto adaptadas. Aqui as quatro
faces continuam as mesmas; o que mudou foi corpo, peso, contraste e rasterização.

## Estrutura técnica

- TypeScript, Pixi.js/WebGL, HTML/CSS, Vite, Electron e Zod.
- **Um arquivo, um assunto.** Tamanho gera aviso para revisão, não reprovação automática;
  coesão, e não contagem de linhas, decide quando dividir. Apenas as fachadas `main.ts` e
  `campanha.ts` mantêm tetos rígidos.
- `src/main.ts` é só o ponto de entrada; o boot vive em `src/aplicacao/`, com um arquivo por
  etapa (montar tela, ligar ações, vistas, crônica, salvamento, inspeção).
- **O editor de balanceamento vive isolado em `src/editor/`.** F2 abre a ferramenta por cima
  do jogo e Esc fecha. A casca tem as dez abas planejadas, busca, alterações pendentes,
  desfazer, restaurar e perfil persistido no navegador. Seis abas estão funcionais:
  **Exército** reúne custo base, folha em casa/campanha, população protegida, milícia e
  multiplicadores de custo/comida das quatro armas; **Combate** reúne ritmo do choque,
  quebra, recuo, perseguição, ataque e aguento das armas, counter e preparação do cerco.
  **Alimentação** reúne subsistência do reino, consumo militar, mortalidade da fome e
  mantimentos de cidade sitiada. **População** reúne crescimento natural, início e consumo
  das cinco faixas; os limites aparecem como 15.000, 30.000 etc., embora o dado inclusivo
  interno termine em 14.999, 29.999 etc. **Economia** reúne as fontes de renda, arrecadação
  e humor dos quatro decretos de imposto e as curvas de corrupção por tamanho e distância;
  imposto por habitante aparece na unidade legível de moedas por 1.000 pessoas.
  **Construções** reúne as regras gerais e as 18 obras por função; custo, duração,
  manutenção e efeito numérico aparecem em linhas compactas com I, II e III lado a lado. O
  mesmo perfil persistido altera `ajustes.json` e o catálogo validado de `construcoes.json`
  antes de a campanha consultá-los. O editor recusa um limiar de recuo igual ou posterior ao
  de quebra, faixas populacionais fora de ordem, decretos com progressão invertida, uma
  distância desconectada menor que a meia distância e níveis de construção invertidos. Cada
  controle declara limites, passo, unidade, explicação e quando passa a valer; nenhuma tela
  recebe acesso genérico ao JSON.
- `src/campanha/campanha.ts` é uma FACHADA: guarda o núcleo e delega. As regras vivem em
  `campanha/turno/`, `alimentacao/`, `sociedade/`, `governo/`, `guerra/`, `provincia/` e
  `estado/`; as perguntas ficam nas camadas de `campanha/fachada/`.
- **Só a fachada chama `aoMudar`.** Nenhum módulo de regra notifica a interface, e por isso
  existe um lugar só que sabe quando a tela se redesenha.
- Conteúdo e balanceamento ficam em `dados/*.json`, validados pelos esquemas de
  `src/dados/esquemas/`, cuja porta única é `src/dados/esquema.ts`.
- Assets assados do mapa ficam em `assets/mundo/` e são carregados em runtime.
- Estado mutável fica na campanha; dados autorais e geografia ficam nos JSON e no Atlas.
- Pastas, arquivos, funções e variáveis usam português.

⚠️ **`campanha.ts` e `main.ts` têm teto próprio, mais apertado que o geral**, e não recebem
regra nova: mecânica nova nasce em módulo próprio. Os dois já foram arquivos-deus (1.942 e
1.259 linhas), e a trava existe para que não voltem a ser.

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
  carregamento. ⚠️ **E o mesmo vale para Vitest disputando a máquina com o Playwright**: rodar
  `npm run teste-tela` em paralelo com `npm run verificar` produziu **11 testes estourando o
  timeout de 30 s** que passavam sozinhos segundos antes. Suíte vermelha por contenção de CPU
  parece regressão e não é — rode uma de cada vez antes de investigar.

## Verificação

Comandos principais:

- `npm run dev`: navegador;
- `npm run app`: Electron em desenvolvimento;
- `npm run verificar`: tipos, lint, código morto, testes unitários e dados;
- `npm run teste-tela`: Playwright, limitado a dois workers;
- `npm run simular`: cenários longos de paz, construção e pressão militar no terminal;
- `npm run economia`: banco de provas da economia, do poder mais pobre ao mais rico;
- `npm run partida`: uma partida inteira com todo mundo na IA, e o que sobrou dela;
- `npm run armas`: banco de provas das armas — por gente, por moeda, por boca, o triângulo e
  o que sobra do derrotado;
- `npm run entregar`: verificação, testes de tela e build numa única chamada;
- `npm run build`: build de produção;
- `npm run capturar`: captura 1920×1080 e erros de console;
- `npm run gerar-mapa` e `npm run gerar-provincias`: ferramentas de autoria, não runtime.

A suíte unitária passa inteira. ⚠️ **O número exato não fica escrito aqui de propósito**: ele
muda a cada trabalho e este documento envelhecia sozinho. Quem quiser saber roda
`npm run verificar`.

## Crédito de asset

Os placeholders de cidades e aldeias em `assets/placeholders/kenney-medieval-rts/` são do
Kenney Vleugels, pacote Medieval RTS, sob CC0. A licença original permanece junto aos
arquivos em `LICENCA.txt`.
