# Referências econômicas de design

## Finalidade deste documento

Este documento registra **o que vale aprender com outros jogos**, não uma obrigação de
copiá-los. A especificação da economia do _Age of Grecce_ continua em
[Economia e produtos regionais](economia-e-produtos-regionais.md).

As referências possuem pesos diferentes:

1. **Age of History II** — referência principal de escala, leitura e controle por
   províncias;
2. **Rome: Total War** — referência secundária para identidade econômica territorial e
   relação entre riqueza, infraestrutura e guerra;
3. **Crusader Kings III** — referência pontual para controle de território conquistado.

O _Age of Grecce_ não pretende reproduzir a campanha militar de _Total War_ nem a
simulação feudal e de personagens de _Crusader Kings_. O combate terrestre básico já é
funcional, mas seguirá um desenho próprio e ainda poderá mudar quais despesas e
consequências econômicas realmente fazem sentido.

## Síntese para o Age of Grecce

A direção econômica é:

- a província é a unidade territorial e econômica básica;
- cada província possui população, um produto principal, nível natural de produção e
  capacidade comercial;
- a renda é formada por **impostos + produção + comércio**;
- produto e nível natural são permanentes, enquanto o investimento melhora
  temporariamente a exploração;
- valores e resultados devem ser inteiros e explicáveis ao jogador;
- jogador e IA obedecem às mesmas regras;
- guerra deverá afetar a economia, mas a forma exata dependerá do nosso combate;
- complexidade só entra quando produzir uma decisão interessante e testável.

Em uma frase: **a clareza provincial de Age of History II, a personalidade territorial
de Rome: Total War e somente a ideia de integração pós-conquista de CK3**.

## Referência principal — Age of History II

### O que interessa

_Age of History II_ trata a província como a peça básica do mapa. População, economia,
desenvolvimento, construções e investimento são apresentados nesse nível. O jogador
consegue olhar para o território, selecionar uma província e agir diretamente sobre
ela, enquanto tesouro, tributação, investimento e manutenção militar formam o quadro
nacional.

Essa estrutura serve ao nosso mapa fragmentado porque:

- continua legível com centenas de províncias e muitos poderes pequenos;
- faz conquista e perda territorial alterarem imediatamente a capacidade do poder;
- permite testar uma economia completa em Atenas antes de preencher o mundo inteiro;
- favorece modos de mapa e comparações rápidas entre províncias;
- não exige personagens, famílias, cadeias produtivas ou mercados simulados para
  funcionar.

### Anatomia do sistema observado

Em _Age of History II_, economia local e economia nacional se conectam sem deixar de ser
camadas diferentes:

| escala            | elementos principais                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| província         | população, economia, desenvolvimento, crescimento, estabilidade, felicidade, terreno e construções     |
| receitas do poder | tributação, produção e tributos de vassalos                                                            |
| despesas do poder | administração, manutenção militar e orçamento                                                          |
| orçamento         | forças militares, bens, pesquisa e investimentos                                                       |
| leitura do mapa   | modos de renda, população, economia, desenvolvimento, estabilidade, distância da capital e construções |

A tributação depende principalmente da população e pode afetar felicidade. A produção
depende da economia e do desenvolvimento provincial. O custo administrativo cria atrito
para Estados extensos, especialmente conforme o território se afasta da capital, e a
manutenção militar transforma tropas paradas em despesa recorrente.

Esse desenho cria três perguntas diferentes para o jogador:

1. **Qual província merece atenção?** — decisão local.
2. **Como dividir o tesouro do Estado?** — decisão nacional.
3. **Onde estão riqueza, custo e fragilidade?** — leitura pelos modos de mapa.

É essa separação, mais do que qualquer fórmula específica, que merece ser nossa
referência principal.

### Investimento local e orçamento nacional

O jogo oferece dois caminhos que se sobrepõem parcialmente:

- uma ação direta permite investir na economia ou no desenvolvimento de uma província;
- o orçamento nacional distribui investimento gradualmente pelo território inteiro.

O primeiro dá controle preciso, mas exige muitos cliques. O segundo reduz o trabalho,
mas espalha recursos inclusive por províncias que o jogador não priorizaria. Relatos de
testes da comunidade também encontraram retornos muito longos — em alguns casos por volta
de 150 a 200 turnos — e relações pouco claras entre economia, desenvolvimento e
população. Esses valores não são adotados como fórmulas oficiais; são evidência de um
problema de experiência: **o jogador tem dificuldade para avaliar o investimento**.

O nosso incentivo temporário preserva a boa parte — escolher uma província — e corrige a
parte opaca mostrando custo, ganho, duração e retorno antes da confirmação. Se o volume
de territórios transformar isso em trabalho repetitivo, a solução futura deve ser
automação ou política econômica, não esconder os cálculos.

### Construções como especialização curta

As construções de _Age of History II_ são poucas e possuem funções diretas: oficina
melhora produção, fazenda melhora crescimento, porto permite acesso ao mar e ajuda a
produção, arsenal reduz recrutamento e acampamento reduz manutenção local. Essa
organização é interessante porque cada construção responde a uma pergunta clara.

Para nós, isso recomenda no futuro uma lista pequena de melhorias compartilhadas, com
dupla utilidade quando natural. Não recomenda criar uma construção própria para cada
produto antes de existir necessidade demonstrada pelo jogo.

### Economia, expansão e guerra

O jogo conecta população e força militar: tropas são recrutadas da população provincial,
custam para ser reunidas e continuam gerando manutenção. Saquear uma província inimiga
troca destruição econômica e populacional por dinheiro imediato. Somado à administração
de territórios distantes, isso impede que guerra e economia sejam telas independentes.

Essa relação não foi copiada literalmente, mas a primeira decisão já foi tomada:
**soldados saem da população atual, custam para ser reunidos e geram manutenção.** Quem
é dispensado volta à província de origem; quem não recebe deserta. A batalha atual já
mata soldados e, na defesa, parte da milícia populacional; saque ainda não existe. A regra
preservada é: **mobilizar, manter e perder forças precisa ter consequência econômica
compreensível**.

### O que devemos aproveitar

1. **Província como centro da decisão.** Selecionar uma província deve revelar sua
   população, renda, produto e ações econômicas disponíveis.
2. **Investimento direto.** O jogador escolhe onde aplicar seu tesouro em vez de depender
   apenas de crescimento automático.
3. **Visão nacional simples.** Tesouro, renda total e despesas precisam ser compreendidos
   sem abrir várias telas.
4. **Modos de mapa.** Futuramente, população, produção, comércio e renda podem ter
   visualizações próprias.
5. **Escala compatível com muitos Estados.** As mesmas regras devem servir a Atenas, a
   uma ilha de uma província e a uma potência formada durante a campanha.
6. **Livro-caixa por origem.** Renda tributária, produtiva e despesas administrativas ou
   militares devem poder ser examinadas separadamente.
7. **Atrito da expansão.** Controlar mais províncias aumenta a riqueza, mas também deve
   criar algum custo ou período de integração para evitar crescimento automático sem
   resistência.

### O que não devemos copiar

- um número genérico de “economia” que permita transformar todas as províncias no mesmo
  território;
- investimento com retorno escondido ou difícil de calcular;
- cliques obrigatórios repetidos em dezenas de províncias;
- sistemas em que manter uma barra sempre cheia seja uma falsa escolha;
- fórmulas que o jogador só entende consultando documentação externa.
- crescimento permanente ilimitado que apague as diferenças iniciais do mapa;
- permitir que população, “economia” e desenvolvimento sejam três números parecidos sem
  papéis visualmente distintos.

### Lição principal

A força de _Age of History II_ é a **clareza estrutural**, não necessariamente a
profundidade da fórmula. O nosso jogo deve preservar a interação direta com a província,
mas dar a cada território uma identidade econômica que não desapareça depois de vários
investimentos.

## Referência secundária — Rome: Total War

### O que interessa

No primeiro _Rome: Total War_, a renda de um assentamento é separada em fontes como
tributação, agricultura, mineração e comércio. Recursos, fertilidade e posição pertencem
ao território; estradas, mercados, minas e portos permitem explorá-los melhor. As mesmas
estradas que transportam mercadorias também aceleram exércitos, e bloqueios ou guerras
podem prejudicar rotas.

Não precisamos copiar suas construções nem sua contabilidade. O valor da referência está
na relação de causa e efeito:

```text
território -> vocação econômica -> exploração -> renda -> capacidade militar
guerra -> ocupação, cerco ou bloqueio -> perda econômica
```

### O que devemos aproveitar

1. **Vocação fixa do território.** Sunião continua valiosa por seus metais preciosos
   independentemente de quem a governe.
2. **Fontes de renda separadas.** Impostos, produção e comércio aparecem individualmente
   e sempre fecham com o total.
3. **Infraestrutura com mais de uma utilidade.** Uma futura estrada pode ajudar comércio
   e movimento; um porto pode ajudar renda e operações navais.
4. **Economia vulnerável à guerra.** Cerco, saque, ocupação e bloqueio podem reduzir
   renda no futuro.
5. **Manutenção militar.** Exército não deve ser apenas um número acumulado; sua
   existência precisa disputar o tesouro com desenvolvimento e investimento.
6. **Comércio ligado à posição.** Uma província bem situada pode ser rica sem possuir o
   produto natural mais valioso.

### O que fica para depois

- rotas comerciais calculadas entre províncias;
- estradas, mercados e portos melhoráveis;
- bloqueios marítimos e interrupção de rotas;
- devastação, saque e recuperação econômica;
- uso estratégico de produtos por unidades ou construções;
- detalhamento de salários e manutenção militar.

Esses elementos só devem ser definidos depois que movimento, guerra e combate mostrarem
quais relações realmente existem no nosso jogo.

### O que não devemos copiar

- árvores extensas de construções antes do esqueleto jogável;
- crescimento populacional, miséria urbana e ordem pública como um pacote obrigatório;
- contabilidade difícil de prever;
- bônus econômicos secretos para a IA;
- regras criadas para sustentar batalhas em tempo real que não combinem com nosso
  combate.

### Lição principal

A economia fica interessante quando **produz motivos para guerrear e alvos para
proteger**. Um recurso não deve existir apenas para colorir a ficha; sua localização
precisa tornar aquela província desejável.

## Referência pontual — Crusader Kings III

### O que interessa

CK3 distingue a capacidade de longo prazo de um condado do controle que o governante
possui sobre ele. Depois de uma conquista, controlar nominalmente o território não
significa extrair imediatamente todo o seu valor.

Para o _Age of Grecce_, isso pode futuramente virar uma regra simples:

- uma província recém-conquistada arrecada apenas parte de sua renda;
- a integração recupera a arrecadação ao longo dos turnos;
- guerra, saque ou revolta podem atrasar essa recuperação;
- a regra vale igualmente para jogador e IA.

### O que não devemos copiar

- domínio pessoal e limites de propriedades;
- contratos feudais e várias camadas de vassalagem;
- economia dependente de atributos de personagens;
- múltiplos tipos de propriedades e árvores extensas de edifícios;
- simulação demográfica e dinástica como condição para a economia funcionar.

### Lição principal

**Conquistar não é o mesmo que integrar.** Essa única distinção pode frear expansão
descontrolada e criar consequências econômicas para a guerra sem trazer a complexidade
do restante de CK3.

## Decisões já preservadas no nosso jogo

### O sistema de investimento permanece

O investimento é parte da identidade econômica do projeto. Ele representa ampliar
temporariamente a exploração do produto provincial, não mudar o produto ou elevar para
sempre o nível natural.

Sua apresentação deve informar antes da confirmação:

- valor investido;
- bônus obtido;
- renda adicional por turno;
- duração;
- retorno total previsto;
- quantidade de turnos necessária para recuperar o gasto.

Coeficientes, duração e limites pertencem à especificação e aos dados de balanceamento,
não a este documento de referências.

### Transparência é regra

Toda movimentação de dinheiro precisa fechar em números inteiros:

```text
saldo anterior
+ impostos
+ produção
+ comércio
- investimentos
- despesas militares futuras
= novo saldo
```

Percentuais podem ser mostrados com uma casa decimal, mas dinheiro não possui centavos.
Se o jogador não conseguir explicar por que seu tesouro mudou, a interface ou a regra
estão incompletas.

### A economia não será balanceada isoladamente

Uma renda como 708 ou 12.038 só ganha significado diante dos gastos disponíveis. O
combate ajudará a definir:

- custo para reunir ou recrutar forças;
- manutenção por turno;
- custo de movimentação, se houver;
- consequências de derrota, cerco, ocupação e saque;
- valor econômico de controlar mar, estradas e passagens.

Até essas regras existirem, a economia de Atenas é uma fatia funcional para testar
interface, cálculos e investimento, não o balanço definitivo da campanha.

## Riscos que devem ser observados nos testes

1. **Investimento virar obrigação.** Se sempre houver lucro e nenhum gasto concorrente,
   investir deixa de ser decisão.
2. **Microgerenciamento.** Uma ação agradável com três províncias pode ficar cansativa
   com cinquenta; automação ou limites poderão ser necessários.
3. **Efeito bola de neve.** Mais território gera mais renda, que gera mais exército e
   novas conquistas. Manutenção, integração e reação diplomática poderão conter isso.
4. **Províncias iguais.** Produtos, níveis, comércio e posição precisam manter diferenças
   territoriais relevantes.
5. **Comércio sem interação.** O comércio-base serve ao protótipo, mas futuramente pode
   precisar responder ao mapa e à guerra.
6. **Complexidade prematura.** Produto adicional, construção ou modificador só entra se
   criar uma decisão que os sistemas atuais consigam sustentar.

## Critério para adotar uma ideia externa

Uma mecânica inspirada em outro jogo só deverá entrar se:

1. combinar com o mapa por províncias;
2. criar uma escolha compreensível;
3. funcionar para jogador e IA;
4. possuir dados e cálculos transparentes;
5. puder ser implementada e testada sem exigir vários sistemas inacabados;
6. respeitar o combate e o ritmo próprios do _Age of Grecce_.

## Referências consultadas

### Age of History II

- [Fórum oficial — investimento nas províncias](https://www.ageofcivilizationsgame.com/topic/318-investing-in-your-provinces/)
- [Fórum oficial — discussão sobre desenvolvimento](https://www.ageofcivilizationsgame.com/topic/436-what-does-development-actuallydo/)
- [Fórum oficial — parâmetros econômicos de governos](https://www.ageofcivilizationsgame.com/topic/238165-how-to-create-your-own-ideology/)
- [Wiki comunitária — províncias](https://age-of-civilizations.fandom.com/wiki/Provinces)
- [Wiki comunitária — interface econômica](https://age-of-civilizations.fandom.com/wiki/Economy_Interface)
- [Wiki comunitária — construções](https://age-of-civilizations.fandom.com/wiki/Buildings)
- [Wiki comunitária — modos de mapa](https://age-of-civilizations.fandom.com/wiki/Map_Modes)
- [Guia comunitário — economia e investimento](https://gameplay.tips/guides/3472-age-of-civilizations-ii.html)

A documentação pública de _Age of History II_ é fragmentada. Por isso ele é usado aqui
como referência de estrutura e experiência do jogador, não como fonte de coeficientes
exatos para reprodução.

### Rome: Total War

- [Manual oficial de Rome: Total War](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4760/manuals/manual_en.pdf?t=1741017727)
- [Feral Interactive — fórmulas de campanha e comércio de Rome Remastered](https://github.com/FeralInteractive/romeremastered/blob/main/documentation/feature_guides/Battle_and_Campaign_Formulae.md)

### Crusader Kings III

- [Referência comunitária — construções econômicas](https://ck3wiki.popush.cloud/index.php/Economic_buildings)
- [Referência sobre controle e desenvolvimento de condados](https://notesread.com/crusader-kings-3-county-control-and-development-guide/)
