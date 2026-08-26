# Age of Grecce — estado atual

Este documento é uma fotografia curta do que o jogo faz hoje. Código e testes continuam
sendo a prova final. A visão desejada, inclusive sistemas ainda ausentes, fica em
`GDD.md`.

## Visão rápida

Age of Grecce é um grand strategy por províncias no mundo grego de 700 a.C. A versão
declarada pelo projeto é `0.0.4`.

O mapa possui 196 províncias, 53 regiões e 139 poderes. A fatia autoral cobre a Grécia
central: 25 províncias com economia completa (Ática, Megáris, Coríntia, Beócia, Eubeia,
Opunte, Siciônia e Argólida), 18 poderes inteiramente configurados — e todos eles são
jogáveis (a regra é derivada: poder com todas as províncias configuradas aparece
disponível na escolha). **Nenhuma cidade começa com tropa**: o mapa abre em paz e
`exercitos.json` está deliberadamente vazio — o mecanismo continua de pé para cenários
futuros. Salamina é ilha sem vizinhança terrestre e espera o sistema naval. As outras 171
províncias seguem sem economia e sem simulação.

As 12 antigas províncias microscópicas das Cíclades foram agrupadas em três arquipélagos:
Norte (Andros, Tinos, Míconos, Ceos e Cítnos), Centrais (Naxos, Paros, Íos e Amorgos) e
Ocidentais (Melos, Sifnos e Tera). As ilhas continuam desenhadas e clicáveis; qualquer
pedaço seleciona a província do arquipélago. A costa e o terreno não foram alterados.

**A IA entregue cuida da economia, se defende e ATACA.** Os 17 poderes jogáveis que não são o
jogador constroem, decretam imposto, levantam tropa, socorrem terra ameaçada, fazem surtida,
marcham sobre a vizinha que valorizam e que acreditam TOMAR, e **sentam na frente da cidade
murada** que não cai hoje — cada um com o estilo escrito em `dados/ia.json` (guerreiro,
mercador, cauteloso, equilibrado). "Tomar" e não "vencer": ela roda as mesmas funções da rodada
para prever o choque de campo e depois o assalto à muralha, com o que sobrou do primeiro.
Ela joga em `virarTurno`, ANTES de a rodada resolver, porque as ordens são simultâneas — e
fica FORA de `passarTurno` porque é um jogador e não uma regra da campanha. A ordem dentro do
turno é imposto, obra, leva, defesa, ataque: **uma ordem por hoste por rodada**, e a casa
decide primeiro. `npm run partida` roda a coisa toda e conta o que aconteceu, inclusive marchas,
cercos e quantas províncias mudaram de dono. Diplomacia e naval continuam ausentes.

⚠️ **Sem diplomacia, os 18 poderes começam em guerra com todo mundo, e isso se vê.** Medido em
100 turnos com todos na IA: 35 marchas sobre terra alheia, 25 províncias mudando de dono, 19
turnos de cerco em pé, 8 poderes absorvidos, o maior reino saindo de 3 para 6 províncias, zero
fome e zero cofre negativo. A guerra não para no meio da partida e ninguém dispara na frente.

O ritmo vem de três números, todos em `dados/ia.json`: `fracaoQueMarcha` (que fatia do exército
pode estar fora de casa — e ela desconta quem já está lá), `custoDaConquista` (o que uma terra
tomada à força custa por turno enquanto não assenta) e `sobraMinima` (com quanto de exército ela
topa terminar a briga). ⚠️ **São remendo no lugar da diplomacia, e mexer neles é loteria:** a
resposta é caótica porque uma conquista cedo vira bola de neve — medido, andar na mesma direção
de um dial deu 20 conquistas numa configuração e 105 na vizinha. O conserto de verdade é a
diplomacia, e é o próximo item.

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

Cada província tem um **nível de imposto** decretável — baixo (×0,8, humor +6), normal e
alto (×1,35, humor −8), números em `ajustes.json` — com efeito imediato na renda e
gradual no humor; a conquista devolve a terra ao normal. É a alavanca do GDD (receita
trocada por pressão social, referência Rome: Total War) e substituiu o antigo decreto de
investimento, removido por ser redundante com as construções e de retorno ilegível.

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
domínio estrangeiro (dono atual ≠ dono de 700 a.C., −12), a GUARNIÇÃO do dono (+12 na cheia,
proporcional abaixo dela), o nível de imposto (baixo +6,
alto −8) e Templo. A conquista dá um choque imediato (−25), único movimento não gradual.
Números em `ajustes.json`. A conta é LEGÍVEL como a da comida: o tooltip do humor na
ficha decompõe o alvo parcela a parcela ("base +50 · mesa farta +5 · imposto −8 · Templo
+8 → caminhando para N").

**Guarnição é ordem pública** (pedido de Henrique jogando): tropa do DONO parada ali sobe o
alvo do humor, em proporção ao tamanho da cidade e com teto na guarnição cheia
(`alvo.guarnicaoPlena`). É a única coisa que se pode fazer contra o descontentamento no MESMO
turno — Templo leva turnos, imposto baixo custa renda, e o domínio estrangeiro não sai
enquanto a terra não assimilar. Tem preço: cobra folha todo turno e some quando a tropa
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
  rodada.
- Pode marchar apenas parte da hoste; forças do mesmo poder se fundem ao se encontrar.
- **A batalha é choque + perseguição** (`combate/batalha.ts`), com quatro botões em
  `ajustes.json`: rodadas de choque, letalidade do choque, limiar de quebra e letalidade da
  perseguição. Substituiu `√(maior² − menor²)`, que aniquilava quem perdia.
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

## Estrutura técnica

- TypeScript, Pixi.js/WebGL, HTML/CSS, Vite, Electron e Zod.
- **Um arquivo, um assunto.** Tamanho gera aviso para revisão, não reprovação automática;
  coesão, e não contagem de linhas, decide quando dividir. Apenas as fachadas `main.ts` e
  `campanha.ts` mantêm tetos rígidos.
- `src/main.ts` é só o ponto de entrada; o boot vive em `src/aplicacao/`, com um arquivo por
  etapa (montar tela, ligar ações, vistas, crônica, salvamento, inspeção).
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
  carregamento.

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
