# Age of Grecce — GDD vivo

Este documento descreve a visão atual do jogo, não uma promessa nem uma ordem de
implementação. Ele pode ser alterado, reduzido ou ampliado conforme os testes mostrarem o
que combina com Age of Grecce. O Git guarda as ideias antigas.

**Versão de desenvolvimento atual: `0.2.0`.** A `0.1.0` provou o ciclo mínimo de campanha.
A `0.2.0` já é um jogo sistêmico: economia, alimentação, construções, guerra terrestre, mar,
diplomacia, comércio, alianças, ligas e IA funcionam juntos. O trabalho atual é aprofundar,
equilibrar e preencher esse jogo — não terminar um protótipo mínimo.

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
3. produzir, consumir e fazer recursos circularem sem estoque manual;
4. arrecadar, construir e sustentar forças militares;
5. planejar ordens e resolver uma rodada anual;
6. lutar, cercar, conquistar e perder território;
7. reagir a fome, insatisfação e diferenças populacionais;
8. enfrentar poderes controlados por IA sob as mesmas regras;
9. negociar quando diplomacia for necessária;
10. salvar, carregar, vencer e perder uma campanha.

Esse ciclo já existe de ponta a ponta. A régua agora é outra: cada sistema precisa criar uma
decisão própria, comunicar suas consequências e continuar relevante do início ao fim da
campanha. Complexidade nova só entra quando acrescenta uma decisão que os sistemas atuais não
conseguem produzir.

## Mundo e tempo

- Mapa fixo por províncias, com dados autorais e relações plausíveis entre regiões.
- Ilhas pequenas próximas podem formar uma única província de arquipélago: continuam
  desenhadas e clicáveis, mas não fingem ser vários reinos microscópicos ilegíveis.
- ⚠️ **E o arquipélago reivindica a ÁGUA entre as ilhas dele.** Agrupar resolveu a contagem e
  não a leitura: as Cíclades Ocidentais são sete cacos que preenchem 3,3% da caixa em que
  vivem, contra 40,8% de Atenas — Henrique, olhando: *"parecem mais fragmentos do que
  reinos"*. Com um anel de água em volta, o grupo vira uma mancha só, com borda própria. **A
  costa continua verdadeira**: o terreno desenha água ali; o que muda é de quem ela é.
  Sempre sobra um canal de mar aberto entre dois territórios, e é ele que garante que isto
  seja desenho e não regra — nenhuma vizinhança nova por terra nasce daqui.
- **Dois reinos que se veem na mesma tela nunca têm a mesma cor.** Eram 139 poderes para 70
  cores: Tebas, Platéias e Téspias eram o mesmo verde, Atenas e Elêusis o mesmo azul. A régua
  é a cor LAVADA — a que sobra depois da opacidade do mapa político —, e a distância mínima
  vale entre vizinhos e entre quaisquer dois poderes a menos de 120 km.
- Um turno/rodada representa aproximadamente um ano.
- O mapa tem 196 províncias de terra, 48 zonas marítimas, 53 regiões e 139 poderes. A simulação
  autoral cobre hoje 25 províncias e 18 poderes jogáveis da Grécia central; as outras 171 terras
  permanecem desenhadas, mas sem economia e população, até receberem autoria completa.
- **Ritmo da campanha:** início até o turno 79; meio entre 80 e 150; fim depois de 150. No turno
  100 já devem existir alguns impérios aparecendo, mas nenhum reino imenso ou mapa consolidado.
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
renda provincial = (imposto + produção + trânsito) × (1 − corrupção) × humor
                   − folha das construções
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

São **duas coisas implementadas e deliberadamente separadas**. A rede interna responde quais
bens o reino alcança; os acordos externos respondem quanto dois mercados conseguem ganhar em
conjunto. Assinar um acordo nunca transfere o bem do parceiro para a sua rede.

**Interno.** A rede de trocas: cada bem DISTINTO que o reino alcança rende uma
vez por turno. Ele circula se a terra é sua, não está sitiada e chega à capital — por terra
própria **ou por mar, entre dois Portos seus**. Tem risco de verdade: sitiar a terra que dá o
bem, partir o reino ao meio ou tomar a capital cortam a rede.

**A parcela se chama TRÂNSITO, e o nome é honesto.** `transitoBase` é o pedágio da posição, e a
ficha de Corinto diz isso na cara ("tudo que cruza da Itália ao Egeu paga passagem aqui").
COMÉRCIO é o acordo entre dois reinos; TRÂNSITO é o valor de uma encruzilhada mesmo antes de
qualquer assinatura. As duas rendas se somam sem fingir que são a mesma coisa.

**E ela ganhou risco.** Era um valor fixo que só o cerco reduzia — Corinto rendia o mesmo em
paz com toda a Grécia ou em guerra com toda ela. Agora o trânsito **exige rota até a
capital**: terra cortada do resto do reino não manda o pedágio ao tesouro. É a única parcela
em que isso vale, porque é a única que existe por causa de um caminho — imposto e produção
continuam, que o lavrador colhe e o coletor cobra mesmo com o reino partido ao meio.

⚠️ **Partir um império ao meio passa a custar caro a ele**, e um segundo Porto costura a
ferida. É consequência econômica de guerra sem precisar de diplomacia nenhuma.

**Externo.** Um acordo de comércio acrescenta renda aos dois lados. O valor bruto parte de uma
fração da renda do menor mercado; a carteira inteira tem retorno decrescente, mas acrescentar
um parceiro rentável nunca reduz o total. A rota é conferida todo turno: os reinos precisam se
tocar por terra ou possuir Portos abertos nos dois lados. Guerra desfaz o acordo; fronteira
perdida, Porto destruído ou bloqueio naval suspendem a renda enquanto a rota não existir.

O acordo não compartilha produtos nem comida. Quem quer o mármore do outro ainda precisa tomar
a terra; um acordo compra renda e paz, não a capacidade estratégica da província.

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
  (`dados/ajustes.json`) e come os pontos dela. Não é upgrade — não se compra faixa, não há prédio
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
- ⚠️ **Mercadoria e exército embarcam pela MESMA porta, e por rotas diferentes.** A
  mercadoria é abstrata — sem inventário, sem caravana, sem navio no mapa —, então a rota dela
  é abstrata: Porto nas duas pontas e pronto. A hoste é peça concreta, com posição e batalha,
  e por isso ela ANDA — zona de mar por zona de mar, um salto por rodada, podendo ser
  interceptada no caminho. Ver **Naval**.
- O produto SECUNDÁRIO entra tanto na produção da terra, com peso menor, quanto na rede de
  bens distintos. Ele não é decoração nem estoque.
- Recursos só devem circular por conexões válidas; conexão marítima completa exige Porto.
- Comércio internacional depende de tratado e transforma o encontro entre dois mercados em
  renda, sem inventário ou troca manual. Alimento não atravessa o acordo hoje.
- Preços-base simples bastam; oferta, demanda e preços regionais só entram se
  trouxerem decisões melhores.
- O mesmo produto pode sustentar o reino e gerar comércio porque ambos representam fluxos
  anuais; não existe venda de estoque acumulado.

## População, sociedade e governo

- População é provincial e fornece contribuintes, recrutas e milícia.
- Soldados preservam origem provincial; desmobilização devolve cada homem à sua terra.
- Felicidade é provincial, guardada numericamente e mostrada em categorias compreensíveis. Ela
  caminha para um alvo formado por imposto, fome, cerco, guerra, isolamento, tamanho,
  nacionalidade, guarnição e Templo; também multiplica a renda inteira da província.
- Nacionalidade pertence à população e pode ser misturada. Ela não muda hoje.
- ⚠️ **E ela tem DUAS camadas, e é o degrau entre elas que dá direção à expansão.** A
  nacionalidade é a cidade — ateniense, megarense, tebano —, com fração da população em cada
  uma; o **povo** é a tribo grega dela: jônio, dório, beócio, lócrio. Mandar no próprio povo
  não custa nada; mandar em outra cidade da mesma tribo incomoda; mandar em outra tribo é o
  preço de império. Unificar os seus é barato, atravessar o Istmo é caro.
- ⚠️ **A conta é proporcional à FATIA do povo, nunca um carimbo na província.** A mesma terra
  mista cobra preços diferentes de donos diferentes, e é isso que faz uma cidade dividida ser
  uma coisa e não um rótulo.
- Diferença entre governante e população cria tensão, não uma trava artificial de uso da
  província conquistada.
- ⚠️ **A ASSIMILAÇÃO ainda não existe e não entra sem nova decisão.** Hoje o povo conquistado
  não deixa de ser quem é: o preço é permanente e se paga com Templo, imposto baixo e
  guarnição. Se a nacionalidade um dia caminhar, será devagar e nunca sumirá de todo.
- Insatisfação persistente gera greve fiscal e, sob dono estrangeiro, pode levantar uma hoste
  rebelde. Migração continua fora e exige decisão própria antes de entrar.
- Cada poder possui uma capital. O jogador que a perde escolhe outra antes de continuar; a IA
  reassenta automaticamente. Mudança voluntária custa ouro e terra sitiada não pode virar sede.
- Distância da capital e tamanho da província viram **corrupção**: o que se perde entre o
  campo e o tesouro. Ver a seção de dinheiro.

## Dinheiro e impostos

⚠️ **O nível de imposto tem QUATRO degraus, e o último tem prazo.** Baixo, normal, alto e
**confisco**. O confisco não é "alto, porém mais": ele triplica a arrecadação e derruba a
província para a faixa do levante em poucas viradas. É a alavanca de quem precisa pagar a
guerra de hoje e aceita a conta de amanhã — e é a única do jogo que se cobra sozinha.

⚠️ **A régua do imposto tem de contar com o humor, porque os dois se cruzam.** O fator incide
sobre a PARCELA do imposto; o humor multiplica a renda INTEIRA. Um decreto cujo custo social
seja maior que o ganho fiscal é um botão que mente, e o jogo já teve um: mexer nestes números
sem refazer a conta dos dois lados o traz de volta.

- Tesouro pertence ao poder, nunca à província.
- Impostos possuem quatro níveis: baixo, normal, alto e confisco. O último é uma alavanca de
  emergência com prazo social curto, não apenas um degrau maior.
- Receita considera população, atividade e **corrupção**.
- Atividade econômica pode gerar dinheiro automaticamente; não exigir venda manual de toda
  colheita.
- Batalha por si só não gera saque; **tomar a cidade à força, sim** — e o saque é destruição,
  não lucro: o vencedor herda menos gente e uma obra quebrada, não um baú. Não há ouro nem
  estoque de produtos para capturar.

### Corrupção

O imposto não pode crescer para sempre em linha reta com a população: uma província de
100.000 habitantes renderia o dobro de uma de 50.000 e o dinheiro deixaria de ser
decisão. A corrupção é o freio, e ela é o mesmo canal por onde a distância da capital
entra na economia.

Dois fatores a alimentam, e o segundo é o que dá sentido geográfico ao mapa:

- **tamanho**: quanto mais gente, mais se perde no caminho, desde a menor província, numa curva
  que satura sozinha;
- **distância da capital**, em saltos pelo território: a província no fim do mundo é
  fodida duas vezes — é pobre e ainda entrega menos do pouco que arrecada.

Compõem-se de modo que cada uma coma uma fatia do que a outra deixou, e o total nunca
passe de 100% sem precisar de teto artificial:

```
corrupção = 1 − (1 − por tamanho) × (1 − por distância)
renda líquida antes das folhas = (imposto + produção + trânsito) × (1 − corrupção) × humor
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

**As três obras que liberam armas são a exceção: têm somente o nível I.** Liberar uma
arma é uma capacidade binária, e vender níveis II e III sem efeito adicional seria uma
armadilha. Armaria, Acampamento de arqueiro e Treinamento de cavaleiros custam 8.000 moedas e
mantêm o mesmo preço e a mesma folha de 25 moedas por turno em qualquer província: Atenas não
compra nem sustenta a mesma arma mais barato erguendo o prédio numa vila conquistada.

**Todo prédio comprável tem que servir AGORA.** O que só promete fica escondido do catálogo
até ter função. Vender promessa é pior que não vender nada: o jogador paga, não vê diferença,
e passa a duvidar do resto do catálogo. O Quartel já esteve escondido por esse motivo e
voltou quando passou a carimbar treino na leva — a regra é essa: some enquanto não entrega,
volta quando entregar.

**O preço de uma obra acompanha a riqueza da terra que a ergue**, e a folha dela junto. Preço
fixo contra renda variável tira as obras da mesa das províncias pequenas. A escala sai do dado
AUTORAL, nunca do estado vivo, senão mobilizar baratearia as obras.

Cada prédio ataca uma pergunta diferente, e nenhum é o outro com números trocados: a Ágora
corta a corrupção de TAMANHO (engolir população) e, assim, recupera imposto que se perderia;
a Estrada corta a de DISTÂNCIA e barateia um pouco a tropa parada naquela terra; o Porto abre
a rota de MAR; e o Mercado é a praça — ele multiplica a rede do REINO e o trânsito da própria
terra. Na capital a Estrada não tem distância para encurtar, mas ainda serve à guarnição.

⚠️ **O Mercado tem duas pernas de propósito, e cada uma sozinha já foi armadilha.** Só local,
ele não pagava onde o trânsito é pequeno; só nacional, ele não pagava na encruzilhada rica de
uma província só — o preço da obra escala pelo peso da terra, e Corinto pagava o preço mais
alto do catálogo por um ganho que dependia de quantas províncias ela tinha. **A perna local
paga a encruzilhada; a nacional paga o império.**

- Ágora: economia, administração e redução da corrupção por tamanho;
- Mercado: a praça — multiplica a rede de trocas do REINO e o trânsito desta terra;
- Quartel: não é requisito para recrutar — multiplica o TREINO da tropa levantada naquela
  província, e o treino é carimbado na leva;
- Armaria: construção de nível único que libera o hoplita naquela província, e não pede
  produto nenhum — é escolha de slot, não permissão do mapa;
- Acampamento de arqueiro: construção de nível único que libera o arqueiro, e só nasce onde
  há madeira;
- Treinamento de cavaleiros: construção de nível único que libera a cavalaria, e só nasce
  onde há cavalos;
- Muralha: fortalece a milícia e exige 2/3/4 rodadas completas de cerco antes do assalto nos
  níveis I/II/III;
- Templo: eleva o alvo da felicidade e acelera em +1/+2/+3 o passo de RECUPERAÇÃO da ordem.
  Não mascara fome, cerco nem imposto abusivo: quando o alvo cai, o humor cai no passo normal;
- Porto: **a porta do mar do reino** — liga esta terra ao reino por mar (precisa de porto nos
  dois lados), põe a mercadoria ao alcance de quem não faz fronteira, deixa o exército
  embarcar daqui, e aumenta o trânsito local;
- Estradas: reduzem a corrupção por distância e cortam 3%/5%/7% da folha da tropa parada
  NESTA província própria. Não barateiam campanha em terra alheia;
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

**A falta de manutenção já tem direção fechada, mas ainda não está implementada:** obra que o
reino não conseguir sustentar fica INATIVA naquele turno, sem ser destruída. O jogador deve ver
a folha total e quais obras pararam; a IA não deve erguer uma obra cuja folha coloque o reino
em risco; e conquistar uma província transfere tanto o prédio quanto a conta. Se uma folha fixa
virar troco no late game, o ajuste deve entrar no USO da capacidade — por exemplo, no custo de
levantar a arma — e nunca baratear ou encarecer a mesma obra conforme a riqueza atual do reino.

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
  CAMPANHA, maior. É sair de casa que custa, e é isso que dá à economia duas
  perguntas em vez de uma: em paz, qual construção e se vale ir atrás de comércio; em
  guerra, quanta tropa se sustenta e se sobra ouro para a próxima leva.
- Consequência: cerco longo drena o cofre, e TOMAR a província faz a mesma tropa virar
  guarnição e o custo cair no mesmo turno. A comida diz quantos homens você pode ter; o
  ouro diz por quanto tempo pode mantê-los fora.
- Ordens são planejadas sobre o mesmo mundo e resolvidas simultaneamente.
- **O jogador escolhe o destino final, não a próxima fronteira.** A rota mais curta fica
  desenhada e a hoste anda sozinha a cada virada, respeitando o limite de movimento, até
  chegar. É possível cancelar durante qualquer parada; batalha, recuo ou perda de um caminho
  permitido interrompem a viagem. A IA continua refazendo a própria decisão a cada turno.
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

O núcleo militar já está fechado de ponta a ponta: quatro armas, treino, linha de quebra,
recuo, perseguição, muralha, cerco, surtida, saque e uma janela que reproduz os mesmos rounds
que resolveram o mapa. Não há batalha tática separada.

Terreno com dados confiáveis, generais, líderes, árvore familiar e equipamento mais profundo
são expansões possíveis, não buracos da versão atual. Nenhuma entra apenas para aumentar a
quantidade de modificadores.

## Naval

O mar é dividido em **zonas navegáveis com nome**, e não tratado como teleporte entre portos.

⚠️ **NÃO existe frota, e a decisão é de Henrique (28/08/2026):** *"não precisa criar frota, o
exército anda pela água (pelas zonas) como um exército normal; caso se encontre no mar com
outro exército em alguma zona, se for inimigo eles batalham sem conquistar nada, só se matam;
se for amigo ou neutro eles ficam na mesma zona"*. É o modelo do Age of History 2, e ele é
muito mais barato do que frota **porque o jogo já sabe quase tudo**: a marcha anda por
vizinhança, a batalha acontece sozinha quando duas forças se encontram, e a conquista é um
passo separado que a zona de mar simplesmente não tem.

As regras da água:

- **zona de mar não tem dono, não se conquista, não produz e não tem milícia.** Ela existe
  para ser atravessada e disputada;
- **embarcar exige Porto**: o exército só entra no mar a partir de uma província SUA com
  Porto. Desembarcar é livre, em qualquer costa. É a terceira razão de existir do Porto —
  depois do trânsito e do alcance comercial — e o que impede exército nascendo no meio do
  Egeu;
- **48 zonas**, pequenas o bastante para a posição importar: atravessar de Atenas a Rodes
  custa vários turnos, e o caminho pode ser interceptado.

**A IA atravessa pela mesma porta.** Ela não tinha como: a percepção dela lista o que ENCOSTA
no reino, e nada encosta em ninguém através da água — a ilha fica a três saltos e a lista de
vizinhos nunca a conteria. Duas peças resolvem, e as duas são pequenas:

- **a rota longa** (`rotasLongasDaHoste`) responde *"por onde eu chegaria lá, um dia?"* com as
  mesmas regras da marcha, e a expedição anda o primeiro trecho dela por virada;
- **o preço da porta** (`valorDoMar` no estilo): o Porto tem preço-base de 2.500 e paga em
  trânsito, uma parcela pequena da renda. A IA dá valor estratégico somente ao PRIMEIRO Porto;
  do segundo em diante a porta já está aberta e cada novo cais precisa justificar o próprio
  lugar.

O mar deve abrir uma segunda frente para vários poderes, não entregar crescimento automático a
quem ergueu o primeiro cais.

### O BLOQUEIO — a razão de FICAR numa água

> **Hoste inimiga parada na água que banha o teu Porto fecha aquele Porto.**

Sem ele a água era estrada, e estrada não se ocupa: uma zona de mar não tem dono e não se
conquista, então segurar uma não comprava nada. O bloqueio dá a ela a única coisa que ela pode
ter sem ter dono — **o que passa por ela**.

Fechar o cais é tudo o que ele faz. Não toma, não saqueia, não mata. Mas apaga duas das três
razões de existir do Porto:

- **a ligação por mar**: a terra que só chegava à capital embarcando fica cortada e perde o
  trânsito. Salamina volta a ser uma ilha;
- **o alcance do comércio**: reino com todos os cais fechados não põe mercadoria no mar, e os
  acordos que só existiam por água param de render.

⚠️ **EMBARCAR continua livre, e é deliberado.** Um bloqueio que trancasse o cais seria
inquebrável — o bloqueado não teria como sair para atacar quem o bloqueia, e a única defesa
contra uma força no mar seria não ter porto. Do jeito que está, **sair é atacar**: a água que se
precisa cruzar é justamente a ocupada, e o encontro no mar já é batalha.

⚠️ **É o mesmo desenho do cerco em terra.** Sitiar não toma a cidade: corta a produção e o
comércio dela e espera. Bloquear não toma a água: corta o que passa por ela.

⚠️ **Uma zona banha meia dúzia de províncias**, então uma hoste fecha vários cais de uma vez. É
a geografia falando — e é o que faz o Golfo Sarônico valer uma guerra e o Mar de Rodes não.

**A IA disputa o mar**: ela intercepta expedição inimiga parada na água que encosta no chão
dela, e vai buscar a água que fecha mais cais inimigos. Quem não tem Porto não disputa — a
mesma porta serve às duas coisas.

**O que continua fora:** o **desgaste por FICAR** na água (hoje o embarcado paga só a folha
maior de campanha) e a **proteção de rota escoltada** — o que existe é o bloqueio
do CAIS, e não da rota no meio do mar.

## IA e diplomacia

- IA usa as mesmas regras do jogador: tesouro, população, alimento, recrutamento,
  manutenção, movimento, cerco, conquista, mar e diplomacia. Ela constrói, decreta imposto,
  planeja comida, recruta, defende, ataca, sitia, faz surtida, desembarca, intercepta e bloqueia.
- Os estilos guerreiro, mercador, cauteloso e equilibrado mudam prioridades e tolerância a
  risco. Eles ainda não mudam o que cada personalidade admira ou despreza diplomaticamente;
  esse gosto por estilo é aprofundamento pendente.
- Não há bônus secretos de IA. A diferença entre jogador e IA é a decisão automática, não a
  regra econômica ou militar.
- Relação é simétrica por par e caminha para um alvo legível. Além dos atos bilaterais, pesam
  tribo comum, inimigo em comum, paz longa, diferença de porte e amizade com inimigos.
- A régua diplomática está fechada de ponta a ponta: presente, pacto, comércio, tributo,
  acesso militar, aliança e liga. Guerra, paz e quebra de acordos alteram opinião e reputação.
- ⚠️ **A TRIBO é a razão de aproximação que a Grécia tinha no lugar de nação.** Jônio, dório,
  beócio e lócrio já decidiam a felicidade de quem é governado por estranho; eles decidem também
  quem reconhece quem na mesa. Ser de outra tribo não afasta — a tribo dá razão para gostar, e a
  falta dela é indiferença. É o que permite dois reinos separados pelo Egeu terem opinião um
  sobre o outro sem nunca terem assinado nada.
- ⚠️ **O inimigo em comum aproxima enquanto durar.** É a única aproximação viva da mesa: nasce
  com a guerra de terceiros e morre com ela, e é por isso que ela produz aliança de conveniência
  e não amizade. A paz longa cicatriza a fronteira pelo mesmo motivo inverso — vizinhança é
  atrito, e atrito que nunca vira sangue deixa de doer.
- ⚠️ **O ACESSO MILITAR existe, e é o único acordo com LADO.** Guerra, trégua, pacto e comércio
  valem igual para os dois; deixar alguém atravessar a sua terra não deixa você atravessar a
  dele. Ele dá passagem e só passagem — nada de conquista, cerco ou saque, que não existem sem
  guerra. A guerra rasga a licença nos dois sentidos. Sem ele, num istmo cheio de vizinhos, a
  única maneira de chegar ao inimigo do outro lado era declarar guerra a quem estava no meio.
- ⚠️ **Abrir a própria estrada é decisão de quem a abre; conseguir a do outro pede confiança.**
  A regra e a vontade são coisas separadas em toda a mesa, e aqui também: o jogo não trava o
  jogador de tomar uma decisão que é dele — inclusive a ruim.
- ⚠️ **A LIGA é o terceiro estado de um vizinho**, entre independente e conquistado, e é a
  forma grega de império: o chefe manda, o membro continua sendo ele mesmo — governo, terra,
  exército e tesouro dele. O que passa ao chefe é tributo, as guerras e a paz entre os dois. O
  que segura o membro é o **desejo de sair**, que sobe com tributo pesado e com as guerras do
  chefe e desce com costume, tribo comum e a sombra dele. Cheio, o membro se revolta e pega em
  armas.
- ⚠️ **E ANEXAR um membro exige o SIM dele.** Nunca à força: recusado, o único caminho é romper
  a liga e invadir. **Ninguém perde um reino por diplomacia neste jogo** — a regra existe porque
  o contrário significaria o jogador perder a campanha por um botão que outro apertou, e porque
  abrir exceção para o jogador seria dar-lhe regra própria. Também não se anexa quem entrou
  ontem: converter um membro é investimento de décadas, como a Liga de Delos foi.
- ⚠️ **A ALIANÇA é o topo da escada dos ACORDOS, e o único que obriga a FAZER.** Guerra, trégua,
  pacto, comércio e passagem são todos promessas de não fazer; a aliança põe a guerra de um nas
  costas do outro, automaticamente e sem perguntar. A agência é assinar, e depois romper —
  abandonar quem contava com você custa mais que voltar atrás num pacto. Só o aliado direto é
  convocado, e promessa que já existe com o inimigo segura a convocação: nenhuma aliança faz
  alguém quebrar de graça um papel que já tinha assinado.
- ⚠️ **A IA PEDE ao jogador o que não pode decidir por ele.** Pacto, comércio, passagem,
  aliança, entrada em liga e anexação chegam como proposta na aba de Diplomacia, com Aceitar e
  Recusar, e **recusar não custa nada** — um "não" que abalasse a opinião faria a resposta certa
  ser nunca abrir a aba. A mesa é do turno: a virada a esvazia, para o jogador nunca responder
  a um mundo que já mudou.
- A IA não exige tributo e não rompe o tributo que recebe. Essas duas ações continuam fora por
  decisão, não por esquecimento.
- Arestas ainda abertas: aliança defensiva, recusar convocação pagando reputação, fazer o custo
  de romper acordo cair com a idade e guardar memória longa de trégua violada.

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

Relações, acordos, comércio, guerra e paz já funcionam, mas espionagem não entra
automaticamente por causa disso. Ela continua uma direção futura que exige nova autorização;
custos, intervalo e probabilidades só serão definidos se a mecânica for escolhida.

## Campanha atual

A fundação da campanha está completa: seleção de poder, administração, economia, população,
construções, guerra, mar, diplomacia, IA, salvamento e condições claras de vitória e derrota.
O jogador pode continuar observando o mundo depois do encerramento.

Isso não significa jogo finalizado. Significa que qualquer sistema novo agora precisa provar
seu valor dentro de uma partida real, especialmente nas três fases: início até 79, meio entre
80 e 150 e fim depois de 150.

## Direção visual

- Mesa de comando helênica contemporânea: pedra escura, bronze, marfim e ornamentação
  grega discreta.
- **O nome da província vive NO MAPA, dentro dela, e SEMPRE.** Ele encolhe onde a terra é
  pequena e nunca desaparece: num atlas o nome é enfeite, num jogo de estratégia ele é como se
  sabe onde se está. O tamanho vem do espaço disponível, o que dá nível de detalhe sem limiar
  de zoom escrito à mão. O ponto é o pólo de inacessibilidade, nunca o centroide, que cai fora
  da forma em 15 das 244. Água se rotula em itálico. Desligar é possível, mas só nas opções.
- **O mapa tem MODOS.** Ele responde "de quem é esta terra" por padrão e "o que acham deste
  reino" no modo de relações — mesma textura, mesma fronteira, só o significado da cor muda.
  Modo de dados pinta mais forte que o político: ali a cor é a resposta, e não enfeite sobre o
  relevo. Modo de mapa é estado de TELA e nunca vai para o disco.
- O mapa é o protagonista; painéis devem informar sem cobri-lo demais. **Janela que abre
  não troca de cena**: véu leve, sem desfoque, e tamanho proporcional ao que ela mostra — o
  mundo continua atrás dela.
- **Painel de decisão não rola.** Rolagem só onde há texto corrido ou lista longa de
  consulta; o que se lê a cada clique cabe inteiro na tela.
- Interface usa texto curto, números verificáveis, ícones consistentes e tooltips próprios.
- Batalhas e acontecimentos importantes precisam ser legíveis mesmo sem grande quantidade
  de assets.

### ⚠️ Menos tutorial — princípio de interface

Decisão de Henrique (27/08/2026), olhando o painel da província refeito: *"parece que ta
fazendo jogo para uma criança explicando tudo, ajudando em tudo — isso é péssimo, polui
muito as coisas."*

**A interface mostra números e estados; ela não ensina o jogo.** As regras, em ordem:

- **nada de definição ao lado do número.** "MILÍCIA 420" não leva "só ela defende", nem
  "POVO" leva "podem pegar em armas". Quem lê o rótulo já sabe o que ele é;
- **nada de fazer a conta do jogador.** Um botão nunca diz "faltam 2.065 moedas": o preço
  está no cartão e o tesouro está no alto da janela. O botão só apaga;
- **nada de anunciar teto antes de ele ser pedido.** "Recrutar · 2.500 homens" respondia uma
  pergunta que só se faz com a barra na mão, dentro da janela;
- **nada de instrução de manuseio.** "Arraste a barra ou escolha uma porcentagem" ao lado de
  uma barra é o jogo duvidando de quem joga;
- **quando algo é impossível, bloqueie e diga o motivo em poucas palavras** — "falta
  Armaria" —, em vez de explicar a mecânica inteira em cada lugar onde ela aparece;
- **prosa descritiva vira número.** Os cartões de arma traziam um parágrafo sobre o papel de
  cada tropa; hoje trazem custo, ataque, aguento e comida. O papel escrito ficou no tooltip.

⚠️ **As tooltips ainda estão longas demais, e isso é dívida assumida.** Henrique
(25/08/2026): *"nunca vi em jogo nenhum tooltip explicar tudo, HAHAHA — vamos ter que ver
isso em algum patch, mas por enquanto deixa como ajuda para entender."* Elas cresceram
porque o jogo não tem tutorial e cada regra nova precisava caber em algum lugar. **A limpeza
é um patch próprio**, e o alvo é o padrão do gênero: uma linha do que o número É, e no
máximo uma do que ele custa. Nem a tooltip carrega o manual — ela também não pode
over-explicar. O porquê da regra migra para a crônica, para o painel de Governo ou some.

## Direção sonora

- A música da campanha é ambiente e discreta: acompanha decisões longas sem disputar atenção.
- Faixas precisam aceitar loop ou transição limpa. Uma playlist maior pode substituir a faixa
  provisória sem mudar o motor.
- Efeitos são curtos e táteis: pedra, madeira e bronze, com respostas diferentes para
  selecionar, abrir, fechar, confirmar, recusar e passar o turno.
- Não sonorizar hover nem repetir efeitos em avalanche. Som informa ação e consequência, não
  cada movimento do cursor.
- Música e efeitos têm volumes separados no menu de pausa. Zero cumpre o papel de mute sem
  acrescentar outro botão para representar o mesmo estado.

## Direções futuras

Sem ordem de implementação. Uma direção decidida não autoriza abrir a frente sem o pedido de
Henrique; uma possibilidade pode ser removida se não combinar com o jogo.

**Direções fechadas, ainda não implementadas:**

- obra cuja manutenção não cabe no tesouro fica inativa naquele turno, sem ser destruída;
- expansão autoral gradual das outras 171 províncias de terra;
- limpeza das tooltips para que nenhuma carregue o manual inteiro.

**Possibilidades que ainda exigem decisão:**

- desgaste por permanecer no mar e proteção de rota escoltada;
- generais, líderes e o papel de terreno confiável no combate;
- gosto diplomático próprio de cada estilo de IA;
- arestas da aliança e memória longa de trégua violada;
- assimilação, migração, governadores e espionagem;
- preços, oferta e demanda regionais;
- extensão dos danos a construções além da perda atual de um nível na conquista;
- abastecimento militar por distância além do desconto local já dado pela Estrada;
- duração definitiva de uma rodada e ritmo completo da campanha.
