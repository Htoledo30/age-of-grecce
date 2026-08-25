# Age of Grecce — GDD vivo

Este documento descreve a visão atual do jogo, não uma promessa nem uma ordem de
implementação. Ele pode ser alterado, reduzido ou ampliado conforme os testes mostrarem o
que combina com Age of Grecce. O Git guarda as ideias antigas.

## Proposta

Age of Grecce é um grand strategy ambientado no mundo grego por volta de 700 a.C. O
jogador governa um poder através de províncias, população, recursos, construções, guerra e
política.

A meta é obter profundidade por consequências entre sistemas, não por excesso de botões.
Realismo e plausibilidade histórica servem ao gameplay; não justificam microgerenciamento,
falsa precisão ou fórmulas impossíveis de compreender.

O combate deve ser mais rico que uma simples comparação de números, mas não virar uma
batalha tática no estilo Total War. O orçamento visual principal é mapa, interface, texto,
números, barras, ícones e animações simples.

## Experiência desejada

O jogador deve conseguir:

1. escolher um poder e entender suas forças e carências;
2. administrar províncias sem repetir ações cansativas;
3. produzir, consumir, armazenar e fazer recursos circularem;
4. arrecadar, construir e sustentar forças militares;
5. planejar ordens e resolver uma rodada anual;
6. lutar, cercar, conquistar e perder território;
7. reagir a fome, insatisfação e diferenças populacionais;
8. enfrentar poderes controlados por IA sob as mesmas regras;
9. negociar quando diplomacia for necessária;
10. salvar, carregar, vencer e perder uma campanha.

A primeira campanha completa pode ser simples. Profundidade militar, política, naval e
comercial vem depois que esse ciclo existir de ponta a ponta.

## Mundo e tempo

- Mapa fixo por províncias, com dados autorais e relações plausíveis entre regiões.
- Ilhas pequenas próximas podem formar uma única província de arquipélago: continuam
  desenhadas e clicáveis, mas não fingem ser vários reinos microscópicos ilegíveis.
- Um turno/rodada representa aproximadamente um ano.
- A validação começa em Atenas, Maratona, Sunião, Elêusis e Tanagra; o restante do mundo é
  preenchido gradualmente depois que as regras provarem seu valor.
- Classificações só existem quando produzem consequência de gameplay.
- Poder sem território pode sobreviver no exílio enquanto possuir hostes.

## Economia e recursos

**A renda é sobre a TERRA, não sobre o número de cabeças.** Uma província pequena pode ser
mais rica que uma grande, e uma grande pode ser pobre — é a diferença entre um mapa com
lugares e um mapa com um censo. As três parcelas:

```
imposto  = população × taxa × nível de imposto × construções
produção = (valor_principal × nível + valor_secundário × nível × peso) × construções
trânsito = transitoBase × escala × construções     (zero sem rota até a capital)
renda    = (imposto + produção + trânsito) × (1 − corrupção) − folha das construções
```

- **O trânsito não é uma fatia da produção.** Ele é POSIÇÃO, porto e rota: uma vila de porto
  pode viver do mar sem plantar nada. ⚠️ Ele já foi `produção × transitoBase`, e por isso
  Corinto — a potência comercial grega, com o maior `transitoBase` do mapa — tirava um quinto
  da renda dali.
- **E ele é a única parcela que exige ROTA.** Terra cortada da capital não manda o pedágio ao
  tesouro; imposto e produção continuam. A parcela se chamava "comércio" e foi renomeada
  quando ficou claro que comércio pressupõe alguém do outro lado — ver *Comércio interno e
  externo*.
- **Os DOIS produtos da terra rendem**, o segundo com peso menor. Toda província tem os dois
  escritos com nível, e por muito tempo o segundo não valia um centavo.
- **A corrupção come as três parcelas**, não só o imposto: é o que se perde entre a província
  e o tesouro, e o que se perde no caminho não pergunta de onde veio a moeda. Ela é o freio
  de tamanho e de distância, e é o que Ágora e Estrada existem para aliviar.
- ⚠️ **Não existe província sem corrupção.** Havia um limiar de população abaixo do qual ela
  era exatamente zero, e isso tirava sete províncias da conta e tornava a Ágora armadilha em
  metade do mapa.
- **A largura dos números é o que faz a terra importar.** Se o `valor` dos produtos variar
  menos que a população, a população manda — e foi o que aconteceu: `valor` ia de 15 a 28
  (1,87×) enquanto a população ia de 3.000 a 35.000 (11,7×). Ao mexer em qualquer dial,
  conferir isso com `npm run economia`.
### Comércio interno e externo

São **duas coisas**, e hoje só uma existe de verdade. Escrito aqui para entrar em patches
pequenos no futuro, não agora.

**Interno — construído.** A rede de trocas: cada bem DISTINTO que o reino alcança rende uma
vez por turno. Ele circula se a terra é sua, não está sitiada e chega à capital — por terra
própria **ou por mar, entre dois Portos seus**. Tem risco de verdade: sitiar a terra que dá o
bem, partir o reino ao meio ou tomar a capital cortam a rede.

**A parcela agora se chama TRÂNSITO, e o nome é honesto.** Ela nasceu chamada de "comércio"
pensando em comércio externo — `transitoBase` é o pedágio da posição, e a ficha de Corinto diz
isso na cara ("tudo que cruza da Itália ao Egeu paga passagem aqui"). Mas comércio pressupõe
alguém do outro lado, e não há ninguém: a palavra ficou reservada para quando houver.

**E ela ganhou risco.** Era um valor fixo que só o cerco reduzia — Corinto rendia o mesmo em
paz com toda a Grécia ou em guerra com toda ela. Agora o trânsito **exige rota até a
capital**: terra cortada do resto do reino não manda o pedágio ao tesouro. É a única parcela
em que isso vale, porque é a única que existe por causa de um caminho — imposto e produção
continuam, que o lavrador colhe e o coletor cobra mesmo com o reino partido ao meio.

⚠️ **Partir um império ao meio passa a custar caro a ele**, e um segundo Porto costura a
ferida. É consequência econômica de guerra sem precisar de diplomacia nenhuma.

**Externo — ainda não existe, e não pode existir sozinho.** Comércio com parceiro precisa de:

- **Diplomacia**, que dá a contraparte: com quem se comercia, quanto vale cada acordo, e o que
  a guerra corta. É aqui que o **acordo de grãos** encaixa — romper o acordo é arma de guerra
  sem disparar flecha.
- **Mar e zonas marítimas**, que dão o bloqueio: fechar o Euripo e Cálcis sente.

⚠️ A cadeia de dependência é **IA → diplomacia → comércio externo**, e ela é o inverso da
ordem em que os itens foram planejados. Por isso o item 4 foi partido em dois, como o 3 foi:
o que não precisa de parceiro foi construído; o resto espera quem esteja do outro lado.

- Produtos representam a capacidade anual e a identidade econômica da terra, não um
  inventário de unidades acumuladas.
- Cada província pode ter um recurso principal forte e um secundário mais fraco.
- O nível natural é fixo; população e construções alteram exploração, não a natureza.
- Não existe alocação manual de trabalhadores.
- Recursos precisam ter função: alimento, matéria-prima, luxo/comércio ou outra consequência
  real. Não criar categorias decorativas.

### Alimentação

- Comida é saldo anual em pontos, sem estoque nem deterioração, em DUAS contas que se
  leem de cabeça: `saldo civil = subsistência + alimentos − população` e
  `saldo final = saldo civil − exército`. **O povo come primeiro.**
- Produtos alimentares somam seus níveis principal e secundário; construções alimentares
  somam por cima.
- **O tamanho da província pesa na mesa**: cada terra cai numa FAIXA de população absoluta
  (`ajustes.json`) e come os pontos dela. Não é upgrade — não se compra faixa, não há prédio
  de governo que a suba e não existe punição por não construir; quem faz a província evoluir
  são as construções. A faixa só lê a população e diz quanto ela consome, e o nome dela é a
  régua que a ficha mostra ao lado do número cru de habitantes.
- ⚠️ A régua já foi RELATIVA (um nível a cada 25% acima da própria população inicial), e o
  efeito era que Atenas com 35.000 e Salamina com 3.000 custavam o mesmo ponto: o tamanho não
  importava, só a variação dele. Com a faixa absoluta, a Ática — populosa e pobre em cereal,
  como o dado dela mesma diz — passa a sentir isso, e tomar Elêusis vira pão, não renda.
- O saldo local (`produção − faixa`) dá o papel da terra: Sustentadora, Equilibrada ou
  Dependente.
- O exército do poder, hostes e levas em formação, custa `−1` por cada `soldadosPorPonto`
  homens ou fração — exceto as tropas presas em cidades sitiadas do próprio poder, que comem
  da despensa da cidade. ⚠️ O número existe para que um soldado coma da ordem de **três
  civis**; com a faixa por tamanho essa razão passou a ser mensurável, e antes ela era 35×
  sem que ninguém pudesse ver.
- Consequências: saldo civil negativo é **Fome** — as províncias DEPENDENTES perdem `−1%`
  (sustentadoras nunca morrem pelas outras) e o exército `−5%`. Saldo civil fechado com
  final negativo é **Exército sem mantimentos** — só a tropa perde `−5%`, nenhum civil
  morre. Final `0` é No limite; positivo, Abastecido. Não há bônus de crescimento por
  fartura.
- **Cidade sitiada sai da circulação inteira** — não contribui, não pesa, não come da
  mesa — e vive de UM contador de mantimentos (`base + comida da própria terra` turnos; a
  Fazenda é resistência de cerco). Enquanto ele dura, ninguém morre e a cidade não
  cresce; vencido, povo (`−1%`) e guarnição (`−5%`) definham juntos, todo turno, com o
  sitiante intacto. Cerco não fabrica fome nacional.
- **Crescimento com trava preventiva**: o povo só cresce com saldo final positivo, e o
  crescimento é simulado antes de aplicado — se fosse empurrar o saldo pro negativo, ele
  não acontece ("limitado pela alimentação"), tudo-ou-nada por poder. Uma Fazenda amplia
  capacidade e nunca pode causar fome.
- Não existe capacidade populacional artificial; alimento, felicidade e outros sistemas
  reais limitam o crescimento.

### Circulação e comércio

- O mercado interno é abstrato e automático; não existe transporte manual de unidades.
- **Bem comercial é ACESSO, não estoque.** O reino alcança o mármore ou não alcança: não há
  inventário, caravana nem rota a administrar. Cada bem DISTINTO ao alcance rende um valor
  por turno, **uma vez só** — duas províncias de azeite não rendem duas vezes. É isso que dá
  à conquista um valor não-linear: tomar a única terra de vinho vale mais que tomar a segunda
  terra de grão, e é aí que a variedade do mapa vira decisão.
- Um bem circula quando a província que o dá é sua, **não está sitiada** e **chega à
  capital** — por terra sua, ou por mar entre dois Portos seus. Reino partido em dois não faz
  um mercado só; com Porto nas duas metades, faz. Sem capital não há rede.
- **O Porto liga por mar, e precisa de porto nos DOIS lados.** Navio mercante atraca em algum
  lugar: uma ponta sozinha é um cais olhando para o horizonte. É o que tira Salamina de fora
  do jogo, e o que faz "onde ergo o segundo Porto?" ser pergunta de mapa.
- ⚠️ **Mercadoria embarca; exército não.** Mercadoria aqui é abstrata — sem inventário, sem
  caravana, sem navio no mapa —, então rota de mar abstrata cabe. Hoste é peça concreta, com
  posição e batalha: movê-la por mar exige frota, que é o sistema naval.
- O produto SECUNDÁRIO da província entra por aqui — é o que ele sempre esperou para servir
  a alguma coisa. Ele continua fora da renda da terra, que é do principal.
- Escassez é distribuída de forma compreensível, com prioridade limitada da capital.
- Recursos só devem circular por conexões válidas; conexão marítima completa exige Porto.
- Comércio internacional depende de tratado e transforma capacidade produtiva em renda,
  sem inventário ou barter manual. Um acordo futuro pode cobrir no máximo `+1` comida de
  um parceiro que preserve pelo menos `+2` para si.
- Preços-base simples bastam inicialmente; oferta, demanda e preços regionais só entram se
  trouxerem decisões melhores.
- O mesmo produto pode sustentar o reino e gerar comércio porque ambos representam fluxos
  anuais; não existe venda de estoque acumulado.

## População, sociedade e governo

- População é provincial e fornece trabalhadores, contribuintes, recrutas e milícia.
- Soldados preservam origem provincial; desmobilização devolve cada homem à sua terra.
- Felicidade é provincial, guardada numericamente e mostrada em categorias compreensíveis.
- Impostos, alimento, conquista, nacionalidade, prosperidade, guerra e presença militar
  podem afetar felicidade quando seus sistemas existirem.
- Nacionalidade pertence à população, pode ser misturada e muda lentamente.
- Diferença entre governante e população cria tensão, não uma trava artificial de uso da
  província conquistada.
- Insatisfação persistente pode gerar revoltas; migração pode responder a fome,
  prosperidade, guerra e segurança no futuro.
- Cada poder possui uma capital. Perdê-la deve obrigar a escolher outra antes de continuar.
- Distância da capital e tamanho da província viram **corrupção**: o que se perde entre o
  campo e o tesouro. Ver a seção de dinheiro.

## Dinheiro e impostos

- Tesouro pertence ao poder, nunca à província.
- Impostos devem possuir níveis baixo, normal e alto, trocando receita por pressão social.
- Receita considera população, atividade e **corrupção**.
- Atividade econômica pode gerar dinheiro automaticamente; não exigir venda manual de toda
  colheita.
- Batalha por si só não gera saque; **tomar a cidade à força, sim** — e o saque é destruição,
  não lucro: o vencedor herda menos gente e uma obra quebrada, não um baú. Conquista poderá dar dinheiro com perdas quando o
  saque existir; não há estoque de produtos para capturar.

### Corrupção

O imposto não pode crescer para sempre em linha reta com a população: uma província de
100.000 habitantes renderia o dobro de uma de 50.000 e o dinheiro deixaria de ser
decisão. A corrupção é o freio, e ela é o mesmo canal por onde a distância da capital
entra na economia.

Dois fatores a alimentam, e o segundo é o que dá sentido geográfico ao mapa:

- **tamanho**: quanto mais gente, mais se perde no caminho. Nada abaixo de um limiar,
  crescendo depois numa curva que satura sozinha;
- **distância da capital**, em saltos pelo território: a província no fim do mundo é
  fodida duas vezes — é pobre e ainda entrega menos do pouco que arrecada.

Compõem-se de modo que cada uma coma uma fatia do que a outra deixou, e o total nunca
passe de 100% sem precisar de teto artificial:

```
corrupção = 1 − (1 − por tamanho) × (1 − por distância)
imposto   = população × taxa × (1 − corrupção)
```

Ordem de grandeza pretendida, com o mapa atual (Elêusis a 1 salto de Atenas, Corinto a 3,
Esparta a 7, o canto mais distante a 26):

| habitantes | na capital | 3 saltos | 12 saltos |
| ---------- | ---------- | -------- | --------- |
| 10.000     | 50         | 40       | 30        |
| 35.000     | 165        | 132      | 99        |
| 100.000    | 341        | 273      | 205       |

⚠️ **Corrupção é consequência, nunca recurso.** Ela é derivada e mostrada, e o jogador não
tem barra para administrar nem número para comprar de volta. Quem a reduz são decisões do
mundo — mudar a capital, erguer Ágora, abrir estrada —, e cada sistema novo entra nesta
mesma conta em vez de inventar o próprio modificador.

### Província pode dar saldo negativo

Referência declarada: Rome: Total War, onde o império tem cidades que sustentam e cidades
que pesam. **Província no vermelho não é defeito de balanceamento** — é o que faz território
ser escolha em vez de sempre-mais. O saldo que precisa fechar é o do REINO, nunca o de cada
província.

Isso muda como a conquista se lê: tomar uma terra distante e pobre pode custar dinheiro
todo turno, e valer assim mesmo por outro motivo — o grão que ela planta, a prata que ela
tem, o caminho que ela abre, o inimigo que ela nega.

Para existir de verdade, a província precisa ter **custos próprios** e não só receita:
corrupção sozinha apenas empurra o imposto na direção de zero, nunca abaixo dele. A
manutenção de construção já entrou; o abastecimento é o balanço alimentar. A guarnição
entrou pela taxa de casa da folha militar — e a lição do caminho fica escrita: enquanto ela
foi tropa embutida nos dados e cobrada à taxa cheia, ela não criou decisão, criou falência
em três dos dezoito poderes jogáveis.

## Construções

A base usa quatro slots por província e níveis I, II e III, forçando especialização.
Upgrades não consomem outro slot, pagam somente o nível novo e levam prazo próprio.
Construções normalmente sobrevivem à conquista.

**Todo prédio comprável tem que servir AGORA.** O que só promete fica escondido do catálogo
até ter função. Vender promessa é pior que não vender nada: o jogador paga, não vê diferença,
e passa a duvidar do resto do catálogo. O Quartel já esteve escondido por esse motivo e
voltou quando passou a carimbar treino na leva — a regra é essa: some enquanto não entrega,
volta quando entregar.

**O preço de uma obra acompanha a riqueza da terra que a ergue**, e a folha dela junto. Preço
fixo contra renda variável nunca serve província pequena: com o preço igual para todos, a
maior potência juntava a obra mais barata em 3 turnos e a menor em 17 — não é assimetria
interessante, é a terra pequena ficando sem decisão nenhuma. A escala sai do dado AUTORAL,
nunca do estado vivo, senão mobilizar baratearia as obras.

Cada prédio ataca uma pergunta diferente, e nenhum é o outro com números trocados: a Ágora
corta a corrupção de TAMANHO (engolir população), a Estrada corta a de DISTÂNCIA (espalhar o
império, e por isso ela não rende nada na própria capital), o Porto abre a rota de MAR, e o
Mercado é a praça — ele multiplica a rede do REINO e o trânsito da própria terra.

⚠️ **O Mercado tem duas pernas de propósito, e cada uma sozinha já foi armadilha.** Só local,
ele não pagava onde o trânsito é pequeno; só nacional, ele não pagava na encruzilhada rica de
uma província só — o preço da obra escala pelo peso da terra, e Corinto pagava o preço mais
alto do catálogo por um ganho que dependia de quantas províncias ela tinha. **A perna local
paga a encruzilhada; a nacional paga o império.**

- Ágora: economia, administração e futura redução de corrupção;
- Mercado: a praça — multiplica a rede de trocas do REINO e o trânsito desta terra;
- Quartel: não é requisito para recrutar — multiplica o TREINO da tropa levantada naquela
  província, e o treino é carimbado na leva;
- Armaria: libera o hoplita naquela província, e não pede produto nenhum — é escolha de
  slot, não permissão do mapa;
- Acampamento de arqueiro: libera o arqueiro, e só nasce onde há madeira;
- Treinamento de cavaleiros: libera a cavalaria, e só nasce onde há cavalos;
- Muralha: fortalece milícia e impede assalto imediato;
- Templo: felicidade, cultura ou estabilidade futura;
- Porto: liga esta terra ao reino POR MAR (precisa de porto nos dois lados) e aumenta o
  trânsito local; base do futuro sistema naval;
- Estradas: possível ligação entre movimento, mercado e administração;
- construções de exploração são liberadas pelos produtos principal e secundário: Fazenda
  para Grãos, Pastagem para Gado, Porto pesqueiro para Peixe, Lagar para Azeite, Vinhedo
  para Vinho, Serraria para Madeira, Mina para Ferro e metais preciosos e Pedreira para
  Mármore.

Construções de alimento somam `+1/+2/+3` comida. As demais melhoram a exploração ou o
comércio sem criar estoque. A Oficina genérica foi substituída por construções locais.
Construir e recrutar continuam custando ouro, slot e população — **nenhuma obra e nenhuma
leva consome mercadoria**. O produto da terra entra como REQUISITO, e não como insumo: onde
há madeira pode-se erguer o acampamento de arqueiro, onde há cavalos o treinamento de
cavaleiros. É a mesma porta das explorações — Mina só onde há ferro — e não abre um estoque
de guerra pela porta dos fundos.

Não criar um atributo genérico de desenvolvimento quando população, economia e construções
já conseguem explicar o resultado.

## Guerra terrestre

- Hostes têm identidade própria e podem dividir parte de seus homens. Uma hoste é uma lista
  de **contingentes** — terra natal, arma e treino de cada grupo —, e a força é a soma deles.
  Baixa, destacamento e dispensa saem proporcionalmente de cada contingente: nunca do
  primeiro da lista.
- **A batalha tem duas fases: choque e perseguição.** No choque os dois lados batem ao mesmo
  tempo, e a linha CEDE quando um deles perde a fração de quebra. Levado até o fim isso é a
  lei quadrada; a diferença é que ele **para na quebra**, e é a parada que salva o perdedor e
  preserva o vencedor — exército antigo não lutava até o último homem. Depois vem a
  perseguição, e é onde morre gente: falange quebrada é chacina.
- **Não existe empate.** Quem ataca precisa vencer; barrar o invasor já é a vitória de quem
  segura o chão, e o desempate vai sempre para o defensor.
- **O atacante também quebra**, e é isso que dá chance ao defensor menor: uma força maior que
  sangra primeiro perde a batalha que a aritmética dizia ser dela.
- **A Muralha não endurece o defensor.** Ela põe mais gente em pé e obriga o cerco antes do
  assalto — e é só. O caminho para um bônus de resistência existe no relatório (`aguento`) e
  está desligado por decisão: no nível I ele era ruído, e no III encarecia demais a guerra.
- **Recuar é a terceira saída, e é decisão de HORA.** Antes de a linha ceder, um lado pode
  sair de campo: paga uma fração pequena e escapa da perseguição. Com uma terra vizinha
  própria, o exército sobrevive inteiro e marcha para lá; na última província não há para
  onde ir, e a hoste se desfaz — mas os homens voltam à população em vez de morrer na fuga.
  Quem já cedeu não recua mais.
- **Quem quebra perde a HOSTE, não a geração:** quem escapa da perseguição volta para a terra
  natal e torna a pagar tributo e a poder ser recrutado.
- **A batalha produz o passo a passo SEMPRE**, inclusive nas que ninguém assiste. A janela do
  jogador reproduz essa lista; quem não assiste a joga fora. É o que impede a tela de mentir:
  não existe uma fórmula para decidir e outra para animar.
- **Não se assalta a muralha com exército inimigo intacto nas costas.** Se o campo não foi
  decidido, senta-se e tenta-se na rodada seguinte.
- **Tomar à força QUEBRA a cidade.** Morre uma fatia dos civis — não só soldado e milícia
  morre em invasão — e uma obra perde um nível: a Muralha, quando há uma, porque foi ela que
  se quebrou para entrar; a mais cara de pé, quando não há. **Cidade que cai sem luta não
  perde nada**, e é essa diferença que dá dois preços à pergunta *sitiar ou assaltar?*:
  sentar demora e entrega a praça inteira, assaltar entrega hoje uma praça ferida. Nada de
  sorteio — a obra que cai sai de uma regra que o jogador consegue prever antes de clicar.
- Recrutamento custa ouro e população e leva tempo de formação. A ARMA é escolhida na leva,
  e o preço é dela: o mesmo tesouro põe em campo mais leves do que hoplitas.

### As quatro armas

**Toda província levanta LEVES, sempre, sem construir nada.** Ele é a régua do jogo inteiro —
ataque 1, aguento 1 — e vale exatamente o que vale um miliciano. As outras três estão ACIMA
dessa linha e cada uma exige uma obra NAQUELA terra: Armaria para o hoplita, Acampamento de
arqueiro (onde há madeira) para o arqueiro, Treinamento de cavaleiros (onde há cavalos) para
a cavalaria. Ninguém fica sem exército por não ter erguido prédio nenhum: quem não gastou
slot joga com massa barata, que é jogar de outro jeito.

**O triângulo é suave e fecha:** o hoplita quebra a cavalaria, a cavalaria atropela o
arqueiro, o arqueiro fura o hoplita. O leve não bate ninguém e não é batido por ninguém. A
vantagem é BÔNUS de quem tem a arma certa, nunca penalidade de quem a sofre — contar as duas
pontas dobraria o efeito e faria cem arqueiros destruírem trezentos hoplitas. E ela vale só
contra a FATIA do inimigo que aquela arma bate: um cavaleiro solto do outro lado não dá ao
hoplita a vantagem inteira.

**Cada arma ganha uma régua diferente, e nenhuma ganha todas.** O leve rende mais por MOEDA —
é a tropa de quem precisa de exército agora. O hoplita e o arqueiro rendem mais por BOCA — são
a tropa do império grande, onde o que falta é comida e não ouro. A cavalaria não vence
nenhuma das duas: ela compra **o depois**. É a única coisa que decide quanto do derrotado
volta para casa, e o bônus dela SATURA — um esquadrão pequeno já entrega a maior parte da
caçada, porque não é preciso um cavalo por fugitivo para caçar fugitivos.

**O cavalo cobra em COMIDA, não em ouro.** A folha de pagamento continua sendo por cabeça;
o que muda é a mesa do reino, onde um cavaleiro pesa por vários homens. Assim a cavalaria é
uma pressão sobre a terra, e um reino faminto não a sustenta nem com o tesouro cheio.

**O treino é carimbado na leva e nunca mais consultado.** Perder a província depois não
transforma veterano em recruta no meio da campanha, e tomar o Quartel do inimigo piora as
reposições dele, não o exército que ele já tem. O treino multiplica o ataque e não o aguento:
se fizesse os dois, o Quartel viraria multiplicador quadrático e a ficha estaria mentindo
sobre o próprio número.

**A milícia é sempre leve comum, e nunca melhora.** Ela não passa por Armaria, Quartel nem
acampamento: é o lavrador com a lança que tinha em casa, o último escudo da cidade e não um
exército de graça. Só a Muralha a fortalece — obra de defesa, não obra de exército.
- **O mapa abre em paz: nenhuma província começa com tropa.** Milícia é a única defesa
  inicial, e o exército de cada poder é escolha do jogador desde o primeiro turno. Tropa
  inicial embutida respondia "quanto exército eu aguento?" antes de o jogador decidir
  qualquer coisa, e cobrava folha das cidades que a autoria fez fortes e pobres.
- **A folha militar depende de onde o homem pisa.** Em província do próprio poder ele é
  cidadão-lavrador e paga a taxa de CASA; em terra alheia — inclusive sitiando — paga a de
  CAMPANHA, várias vezes maior. É sair de casa que custa, e é isso que dá à economia duas
  perguntas em vez de uma: em paz, qual construção e se vale ir atrás de comércio; em
  guerra, quanta tropa se sustenta e se sobra ouro para a próxima leva.
- Consequência: cerco longo drena o cofre, e TOMAR a província faz a mesma tropa virar
  guarnição e o custo cair no mesmo turno. A comida diz quantos homens você pode ter; o
  ouro diz por quanto tempo pode mantê-los fora.
- Ordens são planejadas sobre o mesmo mundo e resolvidas simultaneamente.
- Movimento pode gerar encontros na estrada e múltiplas batalhas na mesma rodada.
- Milícia é defesa automática derivada da população.
- Província vazia pode cair ao primeiro ingresso; cidade defendida exige combate ou cerco.
- Sitiar é ocupar o campo sem engajar automaticamente a guarnição ou conquistar a cidade.
- Assaltar engaja e tenta tomar a praça; Muralha exige preparação prévia.
- O defensor pode fazer surtida e um exército externo pode romper o cerco.
- Cerco corta produção e circulação; alimento fornecido pela província desaparece do saldo
  enquanto ela estiver sitiada. A cidade cercada sai da conta alimentar do reino e vive
  da própria despensa; vencidos os mantimentos, povo e guarnição definham juntos — é isso
  que faz sitiar ESTRANGULAR em vez de só esperar. A cidade sitiada continua cobrando
  imposto e levantando leva.

A matemática básica é provisória. Possíveis aprofundamentos, somente depois da base:

- tipos de tropas, qualidade e equipamento;
- moral, retirada e perseguição;
- aleatoriedade controlada;
- terreno com dados confiáveis;
- generais, líderes e árvore familiar;
- apresentação de batalha com lados, números, barras, velocidade e opção de pular.

O visor de batalha pode inicialmente reproduzir visualmente um resultado já calculado; não
é necessário criar batalha tática ou resolução iterativa apenas para gerar espetáculo.

## Naval

O mar deve ser dividido em zonas navegáveis conectadas, não tratado como teleporte entre
portos. Frotas se movem entre zonas, transportam, protegem rotas e realizam bloqueios.

Portos podem ter função econômica antes disso. Guerra naval completa só faz sentido depois
da base terrestre e da IA mínima estarem estáveis.

## IA e diplomacia

- IA usa as mesmas regras do jogador: tesouro, população, alimento, recrutamento,
  manutenção, movimento, cerco e conquista.
- Ela só entra quando a base necessária estiver estável, para não ser refeita a cada
  mudança estrutural.
- A primeira IA deve ser simples: sobreviver, recrutar, formar hostes, mover, escolher
  alvos, lutar, cercar e conquistar.
- Personalidades, cheats, comportamento histórico e estratégia sofisticada não pertencem à
  primeira versão.
- Diplomacia começa depois da IA mínima e contém apenas o necessário para a campanha
  funcionar; sistemas diplomáticos profundos são evolução posterior.

### Espionagem futura: sabotagem sem personagem no mapa

Espionagem será uma ação abstrata da diplomacia contra um reino, não uma unidade de espião
movida pelo mapa. O jogador escolhe o reino, uma província alcançável e uma construção para
tentar sabotar. O custo em ouro é pago mesmo quando a tentativa falha, e a chance deve ser
mostrada antes da confirmação.

- Sucesso reduz a construção em um nível; uma construção de nível I é destruída. Não se
  apaga uma construção avançada inteira com uma única jogada de sorte.
- A felicidade da província é o primeiro modificador: povo insatisfeito facilita a ação e
  povo feliz dificulta. Outros modificadores só entram se os testes provarem necessidade.
- Se a operação for descoberta, as relações pioram e o alvo pode ganhar justificativa para
  guerra. Tentar repetidamente contra o mesmo reino exige um intervalo entre operações.
- A aleatoriedade usa semente salva no estado da campanha, impedindo que recarregar o jogo
  permita repetir a tentativa até conseguir.
- Sabotar Fazenda, Muralha, Mercado, Porto ou outra construção deve preparar decisões de
  comida, cerco e economia; não cria agentes, experiência, equipamentos ou contraespiões.

Essa camada entra somente depois da diplomacia básica — relações, acordos, comércio, guerra
e paz — estar funcionando. Custos, intervalo e probabilidades ficam para balanceamento
quando a mecânica for implementada.

## Campanha completa

O primeiro grande marco é uma campanha que começa e termina:

- seleção de poder;
- administração básica;
- economia, população e guerra integradas;
- IA mínima e diplomacia necessária;
- save/load;
- condições claras de vitória e derrota.

Isso não significa jogo finalizado. Significa que existe um ciclo completo sobre o qual
novos sistemas podem ser julgados jogando, não apenas imaginando.

## Direção visual

- Mesa de comando helênica contemporânea: pedra escura, bronze, marfim e ornamentação
  grega discreta.
- O mapa é o protagonista; painéis devem informar sem cobri-lo demais.
- Interface usa texto curto, números verificáveis, ícones consistentes e tooltips próprios.
- Batalhas e acontecimentos importantes precisam ser legíveis mesmo sem grande quantidade
  de assets.

⚠️ **As tooltips estão longas demais, e isso é dívida assumida.** Henrique (25/08/2026):
*"nunca vi em jogo nenhum tooltip explicar tudo, HAHAHA — vamos ter que ver isso em algum
patch, mas por enquanto deixa como ajuda para entender."* Elas cresceram porque o jogo não
tem tutorial e cada regra nova precisava caber em algum lugar; enquanto os sistemas ainda
estão sendo desenhados, ensinar vale mais que enxugar. **A limpeza é um patch próprio**, e o
alvo é o padrão do gênero: uma linha do que o número É, e no máximo uma do que ele custa. O
porquê da regra migra para a crônica, para o painel de Governo ou some — não é a tooltip que
tem de carregar o manual.

## Questões abertas

Estas ideias não têm ordem nem garantia de implementação:

- quantidade e desenho das zonas marítimas;
- composição futura das hostes;
- profundidade adequada de moral, retirada e generais;
- quanto da capacidade anual vira comércio automático;
- preços, oferta e demanda regionais;
- danos a construções;
- migração, governadores e revoltas;
- estradas, logística militar e abastecimento por distância;
- expansão autoral das outras 200 províncias;
- duração definitiva de uma rodada e ritmo completo da campanha.

Uma questão deixa esta lista quando Henrique decidir testá-la. Se a ideia não combinar com
o jogo, ela é removida sem obrigação de substituição.
