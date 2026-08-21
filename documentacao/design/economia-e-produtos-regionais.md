# Economia e produtos regionais

## Decisão de escopo

O sistema econômico será inspirado no primeiro _Rome: Total War_: ao conquistar uma
província, o jogador passa a controlar o produto comercial característico daquele
território.

O objetivo não é simular dezenas de matérias-primas ou construir uma cadeia econômica
complexa. A economia deve ser legível diretamente no mapa e servir a três funções:

1. diferenciar as províncias;
2. gerar renda comercial;
3. criar motivos estratégicos para expansão e guerra.

O cenário parte aproximadamente de 700 a.C., mas pode combinar identidades econômicas
de diferentes momentos da Grécia arcaica e clássica. A personalidade regional importa
mais do que a precisão cronológica absoluta.

## Ideia guardada: domínio regional

Quando um único poder controlar todas as províncias de uma região, poderá receber algum
tipo de bônus regional. A regra deverá valer igualmente para jogador e IA, e o benefício
deixará de existir se o poder perder o domínio completo. A natureza, o valor e o momento
de implementação desse bônus ainda não foram decididos.

## Regra principal

Cada província possui:

- exatamente **um produto comercial principal**;
- um **nível natural de produção**, de 1 a 5;
- uma população inicial;
- acesso comercial terrestre e/ou marítimo;
- opcionalmente, uma característica especial, como cavalos ou um grande porto.

Produtos iguais podem existir em várias províncias. O objetivo não é dar um produto
exclusivo a cada território, mas fazer cada conquista ter valor econômico compreensível.

### Identidade fixa, exploração temporária

**O produto e o nível natural de cada província são fixos.** Uma ilha pesqueira não
passa a produzir ferro por investimento, e uma costa com pesca de nível 2 não se
transforma permanentemente numa costa de nível 5. Duas províncias podem viver do
mesmo produto e ainda assim ter forças econômicas muito diferentes:

```text
Ilha A — pesca, nível 5
Ilha B — pesca, nível 2
```

O jogador melhora a **exploração temporária**, não a existência do recurso. Investir na
Ilha A pode pagar mais pescadores, barcos e jornadas de pesca durante alguns turnos; ao
fim do incentivo, a produção volta ao nível normal. O mesmo raciocínio vale para contratar
mais mineiros, mobilizar trabalhadores para a colheita ou intensificar a extração de
madeira.

Direção inicial do incentivo:

- o jogador escolhe livremente qualquer valor inteiro entre zero e o máximo configurado;
- o valor investido determina o tamanho do bônus por uma regra de três transparente;
- o bônus dura **20 arrecadações** na configuração atual;
- o teto normal do incentivo é **+25% de produção**; 50% fica reservado para possíveis
  tecnologias, leis, personagens ou eventos futuros;
- só existe um incentivo de produção ativo por província, sem empilhar bônus infinitos;
- renovar ou substituir o incentivo volta a exigir pagamento;
- guerra, saque ou bloqueio podem reduzir ou cancelar o benefício no futuro.

#### Fórmula atual do investimento livre

A primeira proposta usava raiz quadrada e um limite calculado individualmente por
província. O teste revelou que quantias minúsculas compravam bônus grandes demais e que
a curva era difícil de explicar. A implementação atual usa uma regra de três contra o
máximo global configurado:

```text
proporção investida = mínimo(investimento / investimento máximo, 1)
bônus = teto do bônus × proporção investida ^ expoente
```

Com os valores atuais — máximo 500, teto de 25% e expoente 1 — a fórmula é linear:

| investimento | bônus de produção |
| -----------: | ----------------: |
|           50 |             +2,5% |
|          100 |               +5% |
|          250 |            +12,5% |
|          400 |              +20% |
|          500 |              +25% |

O expoente continua nos dados de ajuste para permitir calibrar a curva sem reescrever a
lógica, mas o valor 1 é a regra vigente. Valores acima de 500 são recusados, em vez de
serem aceitos sem comprar bônus adicional.

Antes de confirmar, a interface mostra investimento, bônus percentual, ganho adicional
por turno, ganho total durante as 20 arrecadações e em quantos turnos o gasto se paga.
O cálculo compara a renda real com e sem incentivo, incluindo os arredondamentos usados
na arrecadação.

O incentivo modifica diretamente a produção. O comércio é calculado depois, sobre a
produção já incentivada, portanto uma província com bom escoamento também vende parte do
volume adicional:

```text
produção normal = valor do produto × nível natural
produção incentivada = produção normal × (1 + bônus do investimento)
comércio = produção incentivada × comércio-base
```

O máximo, a duração, o expoente e a possibilidade de renovar antes do vencimento ainda
podem ser calibrados jogando. O teto normal de 25% e a separação estrutural continuam
decididos:

| natureza   | dado                                        | onde vive                     |
| ---------- | ------------------------------------------- | ----------------------------- |
| permanente | produto e nível natural                     | dados autorais da província   |
| permanente | valor econômico básico de cada produto      | catálogo central de produtos  |
| mutável    | investimento, percentual e turnos restantes | estado da campanha/salvamento |

Assim uma província valiosa continua sendo um objetivo territorial, enquanto o jogador
ganha uma decisão recorrente sobre onde concentrar o dinheiro disponível.

### Composição da renda e escala monetária

A renda provincial será composta por três parcelas legíveis:

```text
renda da província = impostos da população + produção do produto + comércio
```

- **Impostos** vêm da população, não da extensão territorial sozinha.
- **Produção** usa o valor próprio do produto e o nível natural da província.
- **Comércio** representa posição, porto, rotas e acesso ao mercado.
- **Área não gera dinheiro diretamente.** Ela pode ajudar a estimar população, capacidade
  agrícola e movimentação, mas uma província enorme e montanhosa não é rica só por ser
  grande.

Cada tipo de produto terá uma força econômica própria num catálogo central. Grãos comuns,
vinho, ferro, mármore e metais preciosos não rendem o mesmo por nível. O valor não fica
repetido nas 205 províncias: a província aponta para o produto, e o produto define seu
valor básico. Isso também permite balancear todos os territórios daquele produto mudando
um único dado.

A escala anterior de 3 a 17 moedas por província é pequena demais para a fantasia de
construir um império. A direção de escala para o primeiro teste econômico é:

- província pobre: aproximadamente **100–180** por turno;
- província comum: aproximadamente **200–400** por turno;
- província rica: aproximadamente **500–900** por turno;
- Atenas inicial: aproximadamente **700** por turno;
- tesouro inicial de Atenas: aproximadamente **3.000**.

Esses números são alvos de sensação e ainda precisam de balanço. A decisão importante é
usar centenas e milhares, deixando pequenos reinos crescerem para dezenas de milhares,
em vez de apresentar a renda de uma potência como `+15`.

**Dinheiro não possui centavos nem arredondamento estético.** Valores como `472` e `12038`
são mantidos exatamente; não viram `470` ou `12000` só para parecerem limpos. Cada parcela
monetária é arredondada para um inteiro antes da soma, de modo que impostos + produção +
comércio − salários − manutenção sempre batam exatamente com o saldo mostrado. Gastos
futuros naturalmente produzirão números irregulares, e isso é desejável. Percentuais
explicativos podem ter uma casa decimal (`+19,2%`), mas nenhuma quantia aparece como
`472,54 moedas`. Um separador visual pode mostrar `12038` como `12.038` sem alterar o valor.

## Produtos da primeira versão

| Produto          | Identidade                                   | Regiões típicas                                         |
| ---------------- | -------------------------------------------- | ------------------------------------------------------- |
| Grãos            | alimento e sustentação de grandes populações | Tessália, Baixa Macedônia, Beócia, Messênia             |
| Gado             | animais, lã, couro e alimentos               | Epiro, Arcádia, Trácia, Alta Macedônia                  |
| Madeira          | construção, fortificações e tradição naval   | Macedônia, Calcídica, Epiro, Trácia, Mísia              |
| Ferro            | ferramentas, armamentos e oficinas           | Macedônia, Eubeia, ilhas minerais, interior da Anatólia |
| Vinho            | produto agrícola valioso para exportação     | Lesbos, Chios, Rodes, Creta e ilhas do Egeu             |
| Azeite           | alimento, iluminação e exportação            | Ática, Creta, Peloponeso e Jônia                        |
| Mármore          | monumentos, templos e prestígio              | Naxos, Paros, Thasos e Ática                            |
| Metais preciosos | riqueza, tesouro e posteriormente moeda      | Láurion, Pangeu, Thasos, Siphnos e Sardes               |

Esta lista é o limite planejado para a primeira versão. Sal, cobre, púrpura, cerâmica,
tecidos e outros produtos só deverão ser adicionados se o jogo provar que precisa deles.

## O que não será produto do mapa

Cerâmica, tecidos, armas e navios serão resultados de construções e oficinas urbanas,
não recursos naturais separados.

Exemplos:

- uma oficina de cerâmica melhora o valor comercial de vinho ou azeite;
- uma ferraria aproveita uma província com ferro;
- um estaleiro aproveita madeira e acesso ao mar;
- um mercado aumenta o valor de qualquer produto provincial.

Isso cria alguma relação entre território e cidade sem introduzir um sistema de
fabricação complexo.

## Cavalos

Cavalos não serão um nono produto comercial. Serão uma característica provincial rara:

> Cavalos disponíveis: permite recrutar cavalaria melhor ou mais barata.

Regiões candidatas:

- Tessália;
- Macedônia;
- Trácia;
- Argólida;
- Lídia.

## Comércio

Comércio não é um recurso. É o resultado da combinação entre produto, infraestrutura,
posição e segurança.

Uma fórmula inicial pode seguir esta lógica:

`renda comercial = valor do produto × produção × acesso ao mercado × estabilidade`

Modificadores principais:

- estradas melhoram o comércio terrestre (construção — ver "Infraestrutura é construção");
- portos melhoram o comércio marítimo e dão acesso ao mar (construção);
- mercados aumentam o valor vendido;
- bloqueios navais reduzem ou interrompem rotas marítimas;
- cercos e devastação reduzem a produção;
- revoltas e baixa estabilidade diminuem a eficiência;
- uma província recém-conquistada leva algum tempo para voltar à produção total.

Portos comerciais como Corinto, Egina e Rodes podem enriquecer mesmo sem possuir o
produto mais valioso. A posição e a infraestrutura devem importar tanto quanto a
matéria-prima local.

## Infraestrutura é construção, não dado da província

Porto, estrada e torre **não são campos do arquivo de província**. São construções que o
jogador paga, e cada uma existe por um motivo próprio.

A distinção que organiza isso:

| natureza | exemplo | onde vive |
| --- | --- | --- |
| vantagem natural do sítio | comércio-base: o Pireu é enseada boa antes de qualquer obra | dados autorais, fixo |
| capacidade construída | porto, estrada, torre | estado da campanha, comprado |

O comércio-base continua sendo terreno, igual ao nível de produção: Maratona é costa
aberta e o Pireu não é, e nenhuma obra troca uma coisa pela outra. A construção entra
**por cima** disso.

### A regra que faz o menu de construções ser uma decisão

**Nenhuma construção deve pagar somente em ouro.** Se todas pagarem, escolher vira
aritmética — basta pegar a de maior retorno, e a lista deixa de ser uma escolha.

Cada construção paga numa moeda diferente, e é justamente por não serem comparáveis que
o jogador precisa decidir do que sente falta:

| construção | paga em |
| --- | --- |
| Porto | alcance marítimo — tropas e comércio pelo mar |
| Estrada | comércio terrestre e velocidade de marcha |
| Torre de vigia | informação: força inimiga nas províncias vizinhas |
| Arsenal (futuro) | recrutamento mais barato |
| Mercado (futuro) | valor do que é vendido |

A torre tem um pré-requisito que a torna um sistema, e não um item de lista:
**informação precisa ser escassa primeiro.** Hoje o mapa mostra tudo — dono, fronteira,
tudo o tempo todo. Revelar força inimiga só significa alguma coisa se, por padrão, ela
não estiver visível. Torre não entra antes de existir aquilo que ela revela.

### Porto e o mar

O porto é o que dá acesso ao mar, para mover tropas e para o comércio marítimo. Isso
resolve, sem regra inventada, o problema das ilhas: **45 das 205 províncias estão fora do
componente de terra continental, e 43 dos 148 poderes não têm nenhuma província no
continente** — Egina, Córcira, Rodes, Quios, Samos, Ítaca, as sete cidades de Creta, as
duas de Lesbos, entre outros.

⚠️ **A alternativa de derivar adjacência marítima por proximidade está DESCARTADA.** O mar
passou a ser recortado em zonas, como a terra é recortada em províncias, e a frota navega
de zona em zona. Ver [Combate, exército e o mar](combate-e-mar.md).

Com porto, a regra passa a ser do jogo: navio sai de onde há porto. A ilha deixa de ser
exceção que o motor contorna e passa a ser o que uma ilha é — um lugar que depende de
porto. De quebra, o porto vira alvo militar: tomar o porto de alguém tranca a ilha dele.

**Decisão: todo poder marítimo começa com porto.** Sem isso os 43 poderes insulares
nasceriam congelados — sem porto não saem da ilha, e sem sair da ilha não conquistam nada
para pagar o porto. A regra vale igualmente para jogador e IA.

### A decisão que bloqueava o porto já foi tomada

**A tropa salta de província vizinha em província vizinha**, sem peça com pontos de
movimento — o modelo mais simples e o mais próximo do mapa que já existe. E **o mar é
recortado em zonas**, por onde a frota navega. Com isso, o porto tem forma: é o lugar onde
a tropa embarca, e a ponte entre o grafo de terra e o grafo de mar.

O porto continua sem entrar, mas agora por ordem de fatias e não por indecisão: movimento
em terra vem antes de movimento no mar. Ver
[Combate, exército e o mar](combate-e-mar.md).

### O que ainda falta para o porto existir

1. **Assar o dado de província costeira.** Já foi medido — **151 costeiras e 54
   interiores** —, mas ainda não está em `assets/mundo/provincias.json`. O gerador tem a
   máscara de terra e uma varredura resolve.

   ⚠️ **A varredura tem que cortar 26 px ao norte e a leste da moldura.** Aquela faixa é
   100% água e é borda, não mar: contando a água crua dão 161 costeiras, e as dez a mais
   incluem Górdio e Pessinunte, que estão a 200 km de qualquer mar.
2. **Recortar o mar em zonas** e derivar as duas adjacências: zona↔zona e
   zona↔província costeira. Medido: a máquina que recorta a terra recorta a água em
   **1,1 s**, deixando 0,01% sem dono.

## Efeitos estratégicos possíveis

Os produtos devem oferecer principalmente renda. Efeitos adicionais precisam ser
pequenos e fáceis de explicar:

| Produto          | Possível efeito secundário                                |
| ---------------- | --------------------------------------------------------- |
| Grãos            | maior abastecimento ou crescimento                        |
| Gado             | menor custo de manutenção ou melhor recuperação           |
| Madeira          | navios e construções de madeira ligeiramente mais baratos |
| Ferro            | armas, ferrarias ou infantaria melhorada                  |
| Vinho            | comércio e satisfação da população                        |
| Azeite           | comércio e abastecimento                                  |
| Mármore          | monumentos e templos mais baratos                         |
| Metais preciosos | maior receita, diplomacia e contratação de mercenários    |

Esses efeitos não precisam existir na primeira implementação. A versão mínima pode usar
somente renda comercial e adicionar bônus depois, caso sejam necessários.

## Exemplos de província

### Naxos

- Produto: mármore.
- Valor comercial: alto.
- Porto: sim.
- Possível bônus futuro: monumentos mais baratos.

### Tessália

- Produto: grãos.
- Valor comercial: médio ou alto.
- Característica: cavalos.
- Possível bônus futuro: abastecimento e acesso à cavalaria tessália.

### Corinto

- Produto sugerido: azeite ou vinho.
- Valor natural: comum.
- Diferencial: dois acessos marítimos, mercado e grande capacidade comercial.

Corinto demonstra uma regra importante: uma província não precisa ter ouro para ser
rica. Ela pode enriquecer transportando e vendendo produtos de outras regiões.

## Referência econômica por macrorregião

Esta seção preserva possibilidades históricas para quando as províncias forem
finalizadas. Na distribuição definitiva, cada província receberá somente um dos oito
produtos da primeira versão.

### Norte e centro do continente grego

| Região                    | Vocação histórica utilizável                             |
| ------------------------- | -------------------------------------------------------- |
| Sul da Ilíria e Caônia    | madeira, gado, couro e rotas do Adriático                |
| Epiro                     | gado, lã, queijo, couro, madeira e resina                |
| Corcira e ilhas Jônicas   | vinho, azeite, pesca e comércio com o oeste              |
| Alta Macedônia            | madeira, ferro, cobre, gado e cavalos                    |
| Baixa Macedônia           | grãos, cavalos, gado, madeira e portos                   |
| Calcídica                 | madeira naval, resina, vinho e minérios                  |
| Trácia ocidental          | grãos, cavalos, madeira e vinho                          |
| Pangeu e vale do Estrimão | ouro, prata, madeira e comércio fluvial                  |
| Quersoneso Trácio         | grãos, portos e controle do Helesponto                   |
| Tessália                  | grãos, cavalos, gado e lã                                |
| Magnésia e monte Pélion   | madeira naval, vinho e portos                            |
| Etólia                    | gado, madeira, mel, caça e couro                         |
| Acarnânia                 | gado, madeira, pesca e comércio costeiro                 |
| Lócrida, Dórida e Fócida  | gado, madeira, mel, pedra e passos montanhosos           |
| Beócia                    | grãos, gado, lã e vinho                                  |
| Eubeia                    | grãos, gado, ferro, metalurgia, madeira naval e comércio |
| Ática                     | azeite, prata, chumbo, cerâmica, mel e mármore           |
| Megárida                  | lã, tecidos, gado e comércio entre dois mares            |
| Egina                     | navegação, cerâmica, perfumes, pesca e transporte        |
| Salamina                  | pesca, porto militar e controle do golfo Sarônico        |

### Peloponeso

| Região   | Vocação histórica utilizável                          |
| -------- | ----------------------------------------------------- |
| Coríntia | cerâmica, perfumes, azeite, portos e construção naval |
| Argólida | grãos, azeite, cavalos, bronze e cerâmica             |
| Acaia    | vinho, grãos, gado e comércio pelo golfo de Corinto   |
| Arcádia  | gado, lã, queijo, madeira e caça                      |
| Élida    | grãos, gado, cavalos e peregrinação para Olímpia      |
| Messênia | grãos, azeite, vinho, frutas e animais                |
| Lacônia  | grãos, azeite, ferro, bronze e cerâmica               |

### Ilhas do Egeu

| Região             | Vocação histórica utilizável                             |
| ------------------ | -------------------------------------------------------- |
| Thasos             | ouro, prata, madeira, mármore e vinho                    |
| Lemnos             | grãos, animais e cerâmica                                |
| Imbros             | grãos, animais e controle do Helesponto                  |
| Samotrácia         | madeira, santuário e comércio                            |
| Lesbos             | vinho, azeite, madeira e cerâmica                        |
| Chios              | vinho, cerâmica e navegação                              |
| Samos              | azeite, vinho, cerâmica, navios e comércio oriental      |
| Andros e Tinos     | vinho, animais, mármore e portos                         |
| Naxos              | mármore, esmeril, vinho e grãos                          |
| Paros              | mármore, escultores, vinho e navegação                   |
| Siphnos            | prata, ouro e joalheria                                  |
| Seriphos e Kythnos | ferro, cobre, chumbo e pesca                             |
| Melos              | obsidiana, pesca e cerâmica                              |
| Delos              | peregrinação, mercado e porto neutro                     |
| Creta              | grãos, azeite, vinho, lã, madeira, cerâmica e metalurgia |
| Rodes              | vinho, comércio, cerâmica e construção naval             |
| Cós e Dodecaneso   | vinho, agricultura, pesca e comércio                     |

### Anatólia ocidental

| Região                  | Vocação histórica utilizável                           |
| ----------------------- | ------------------------------------------------------ |
| Trôade                  | grãos, cavalos, madeira, lã e portos dos estreitos     |
| Mísia                   | madeira, gado, grãos e ferro                           |
| Eólida                  | vinho, azeite, lã e cerâmica                           |
| Esmirna                 | porto comercial, cerâmica, azeite e mercadorias lídias |
| Éfeso e vale do Caístro | grãos, azeite, madeira, mármore e porto                |
| Jônia central           | cerâmica, azeite, vinho e oficinas                     |
| Mileto                  | tecidos, lã, cerâmica, colonização e navegação         |
| Lídia e Sardes          | ouro, electro, tecidos, lã, cavalos e caravanas        |
| Vale do Hermo           | grãos, cavalos, lã e ligação com Sardes                |
| Cária                   | madeira, vinho, figos, azeite e marinheiros            |
| Frígia ocidental        | lã, grãos, cavalos, madeira e rotas terrestres         |
| Bitínia                 | madeira, grãos, gado, pesca e acesso ao Bósforo        |

## Distribuição rara recomendada

Alguns recursos devem aparecer em poucos locais para criar objetivos militares claros:

- metais preciosos: Láurion, Siphnos, Thasos/Pangeu e Sardes;
- mármore: Naxos, Paros, Thasos e Ática;
- madeira: concentrada no norte continental e na Anatólia;
- ferro: Macedônia, Eubeia e interior da Anatólia;
- cavalos: característica concentrada na Tessália, Macedônia, Trácia e Lídia.

## Próximo passo quando as províncias estiverem prontas

Criar uma tabela definitiva com uma linha por província contendo:

| Campo             | Conteúdo                              |
| ----------------- | ------------------------------------- |
| identificador     | nome interno estável                  |
| nome              | nome mostrado ao jogador              |
| produto           | um dos oito produtos comerciais       |
| nível de produção | grau natural fixo de 1 a 5            |
| população         | estimativa inicial usada nos impostos |
| costeira          | sim ou não — condição para construir porto |
| comércio-base     | vantagem natural de posição e escoamento |
| característica    | cavalos ou outra exceção rara         |

A distribuição deve ser feita depois que o recorte provincial estiver estabilizado para
evitar retrabalho.

## Referências históricas consultadas

- [Cambridge Ancient History — comércio arcaico](https://www.cambridge.org/core/books/abs/cambridge-ancient-history/trade/CBE3C08165A543DB641B5A4D4E480CBA)
- [Metropolitan Museum — colonização e comércio gregos](https://www.metmuseum.org/essays/ancient-greek-colonization-and-trade-and-their-influence-on-greek-art)
- [Oxford Classical Dictionary — Tessália](https://academic.oup.com/edited-volume/61673/chapter-abstract/548206248)
- [Foundation of the Hellenic World — comércio e Eubeia](https://www.ime.gr/chronos/03/en/economy/antallages/420trade.html)
- [American School of Classical Studies — ânforas e comércio coríntio](https://www.ascsa.edu.gr/uploads/media/hesperia/147883.pdf)
- [Oxford Classical Dictionary — Thasos](https://academic.oup.com/edited-volume/61673/chapter-abstract/548214728)
- [Antiquity — mármore e esmeril de Naxos](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/D8D956CB810B30AFE42426FA50CF9B62/S0003598X25102123a.pdf/an-interdisciplinary-workflow-for-the-comprehensive-study-of-ancient-quarried-landscapes.pdf)
- [Archaeological Exploration of Sardis — ouro, prata e electro](https://www.sardisexpedition.org/en/essays/latw-greenewalt-gold-silver-refining)
