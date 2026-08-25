# Plano de combate — Age of Grecce

Revisão do plano trazido por Henrique. **A arquitetura dele foi mantida quase inteira**; o
que mudou foi o conteúdo (o pedra-papel-tesoura simétrico), duas suposições erradas sobre
o código, e a divisão em duas etapas para o item 3 continuar sendo o item 3.

Não é código. É o que construir e por quê.

---

## 1. O que foi mantido do plano original

**A lista de rounds produzida SEMPRE, inclusive nas batalhas da IA.** É a melhor ideia do
documento e não se mexe nela. A regra é função pura que devolve `{ vencedor, sobreviventes
por lado, lista de rounds }`. A IA joga a lista fora e usa o resultado; o jogador assiste a
lista. **A janela não consegue mentir porque ela reproduz a matemática que já decidiu** — não
há uma fórmula para o resultado e outra para a animação.

**Os dois botões de letalidade separados**, choque baixo e perseguição alta. É o que dá
sentido ao recuo: sem os dois, recuar seria covardia; com eles, é decisão.

**Determinismo.** Nada de `Math.random()`. Se entrar sorte, sai de semente guardada no
estado — a mesma regra que `batalha.ts` já carrega escrita no cabeçalho.

**Todo número em `ajustes.json`**, nunca no código.

---

## 2. O que mudou: as armas não são iguais para todo mundo

> ⚠️ **Esta seção foi superada pelo que se construiu.** O gancho acabou sendo a
> CONSTRUÇÃO, não a rede de trocas — ver a seção 5, item 3½. O texto fica porque a
> conclusão dele continua valendo: composição de exército é pergunta de MAPA, e um poder sem
> acesso a cavalo não fica sem jogo, fica com um exército de forma diferente.

O plano original dava hoplita, cavalaria e arqueiro a toda pólis, em pedra-papel-tesoura
simétrico. **O pedra-papel-tesoura fica; a simetria sai.**

O motivo não é história — é planura. Se toda pólis monta as três armas, **escolher com quem
jogar para de importar**, que é exatamente a reclamação que já matou o sistema de população
relativa ("fica meio no foda-se") e a conquista de soma sempre igual.

**Hoplita é a espinha de todo mundo. Cavalaria e tropa leve são regionais e escassas.**

O gancho já existe e está construído: a **rede de trocas**. Um poder só levanta cavalaria se
alcançar um bem de cavalo pela rede — o mesmo `alcanceDe` que já decide quais bens circulam.
Isso transforma composição de exército numa pergunta de MAPA:

> "Tomo a Tessália porque quero cavalo."

é uma decisão melhor que

> "construo o prédio de cavalaria."

E ela dá à conquista um motivo que não é renda — que é o buraco que a rede de trocas abriu e
ainda não fechou por completo.

**Consequência de desenho:** um poder sem acesso a cavalo não fica sem jogo, fica com um
exército de forma diferente — e a resposta dele contra cavalaria é terreno, muralha e
número, não uma aba que ele também tem.

---

## 3. Duas suposições do plano original que estão erradas

Ambas escondem trabalho, e as duas foram conferidas no código.

**"Entra por trás da mesma interface; marcha, cerco, estrada e surtida não precisam mudar."**
Não. `resolverChoque(a: number, b: number)` recebe **dois números**, não dois exércitos. Um
resolvedor com composição muda a assinatura. É contido — três chamadores
(`movimento/resolucao/travar-lados.ts`, `movimento/resolucao/assalto.ts`, e quem consumir a
lista de rounds) — mas não é zero.

**"Reaproveitar o dado de defesa por terreno que já existe."** Não existe. Não há terreno
nenhum nas províncias em tempo de execução: a grade de biomas vive no `gerador/` e nunca
chega ao jogo. Terreno por província teria que ser gerado e gravado antes — é um trabalho
inteiro escondido numa linha de modificador.

---

## 4. Duas ausências que quebram coisa

**A milícia.** O plano não a menciona, e ela é hoje a **única** defesa do mapa, que abre em
paz. Ela também é fraca de propósito: 111 dos 139 poderes têm uma província só, e milícia
forte tornaria a primeira conquista impossível. Combate com composição precisa dizer o que a
milícia é — a proposta aqui é que ela seja **infantaria crua**, sem qualidade e sem tipo:
ela existe para não ser ignorada, não para segurar invasão.

**O custo do exército.** Composição precisa caber em `custoPorHomem`, na folha
`manutencaoPorHomem.emCasa`/`.emCampanha` e em `alimento.soldadosPorPonto`. **Cavalo come, e
come muito** — é aí que a escassez da cavalaria vira número em vez de discurso.

---

## 5. A divisão: item 3 e item 3½

O plano original faz o item 3 inteiro e mais um sistema junto. Henrique definiu o item 3
assim:

> "Não criar vinte tipos de tropa ainda. Apenas garantir que força, defesa, muralha, cerco e
> baixas sejam compreensíveis e que um defensor menor tenha alguma chance."

E o counter de 1.4 **não entrega isso** — pelo próprio texto do plano, ele não vence número
grande. Quem dá chance ao defensor menor é terreno, muralha e limiar de quebra, que o plano
lista como modificadores e como opcional.

### Item 3 — a batalha, sem tipo de tropa nenhum

Troca `√(maior² − menor²)` por:

- **Fase de choque**, 3 a 5 rounds, letalidade moderada;
- **Limiar de quebra** (fração de baixas, ou moral simples);
- **Fase de perseguição**, letalidade alta — é onde morre gente;
- **Muralha** como bônus de aguento do defensor no assalto (o conceito de assalto vs cerco
  já existe na resolução);
- **Recuo ordenado** como decisão do jogador antes da quebra: perde uma fração pequena e
  fixa, não entra na perseguição;
- **A lista de rounds**, que sai daqui.

**A janela do Brasfoot sai deste item.** Ela vem da estrutura de fases, não dos tipos — o
jogador ganha a tela de batalha animada no item 3, sem uma única arma nova.

Isto sozinho entrega as duas coisas que Henrique pediu: baixas compreensíveis (choque baixo,
fuga alta) e chance ao defensor menor (muralha, terreno, quebra, recuo).

### Item 3½ — as armas — FEITO, e diferente do que esta seção planejava

O plano previa três armas liberadas pela **rede de trocas**, depois do comércio. O que se
construiu foram **quatro armas liberadas por CONSTRUÇÃO**, antes do comércio. Henrique
mudou as duas coisas, e as duas mudanças melhoraram o desenho.

**Por que quatro e não três.** O plano fazia do hoplita "a espinha de todo mundo" — mas ele
custa uma obra, e uma obra é um slot. Um poder que gastou os quatro slots em economia ficaria
sem exército nenhum. Henrique fechou isso: *"podemos fazer o seu soldado leve voltar, quartel
continua melhorando os soldados, porém adiciona outra construção que seja para ter o hoplita;
todos os lugares vão ter acesso, mas todos vão querer fazer hoplita — e aí vira mais uma
decisão."* O **leve** é a linha de base: toda província levanta, sempre, sem construir nada.
Ele é fraco e barato, e aguenta por QUANTIDADE. Assim ninguém fica sem exército, e a Armaria
deixa de ser um pedágio para participar do jogo.

**Por que construção e não rede de trocas.** A rede entrega um bem ao REINO inteiro; a
construção pergunta *qual das minhas terras é a militar?*, que é a especialização que os
quatro slots existem para forçar. Foi ideia do próprio Henrique, e ele juntou as duas: o
prédio é a porta, e o PRODUTO da terra é o requisito do prédio — acampamento de arqueiro só
onde há madeira, treinamento de cavaleiros só onde há cavalos. A conquista continua ganhando
um motivo que não é renda ("tomo Argos porque quero cavalo"), e nada disso abriu um estoque
de guerra: o produto é requisito, nunca insumo.

**O que ficou de pé do plano original**: o counter suave em 1,4, o carimbo da qualidade no
recrutamento, a milícia como infantaria crua, e o cavalo comendo muito.

**A milícia é sempre leve de qualidade 1** e nunca melhora — decisão de Henrique: *"milícia é
um último escudo, não é para ser treinada nem nada"*. É o que a seção 4 pedia, com um nome
melhor: ela não é "sem tipo", ela É a linha de base, e vale exatamente o que vale um leve.

**O cavalo cobra em COMIDA, não em ouro.** O balanço alimentar do reino passou a somar BOCAS
em vez de homens; a folha de pagamento continua por cabeça. Cavalaria virou pressão sobre a
TERRA — um reino faminto não a sustenta nem com o tesouro cheio.

⚠️ **A lição de calibragem, que o plano não previa.** A força de um lado é
`homens² × ataque × aguento`: os modificadores entram lineares e as CABEÇAS entram ao
quadrado. Logo **toda tropa cara perde a corrida de números**, e a cavalaria nasceu armadilha
em todas as réguas. O conserto não foi baixar o preço dela — foi fazer o bônus de perseguição
**saturar**: 10% de cavalaria já compram a maior parte da caçada, porque não é preciso um
cavalo por fugitivo para caçar fugitivos. `npm run armas` é o banco de provas que mostrou
isso, e o critério dele é *toda arma tem que ganhar alguma coluna*.

## 6. O Quartel

Ele esteve **escondido** desde a revisão das construções: `efeito.tipo === 'futuro'` não
entra em catálogo nenhum. Vendia 1.500 moedas de promessa — o jogador pagava, não via
diferença, e passava a duvidar do resto do catálogo.

**VOLTOU no item 3½, com a função que Henrique desenhou:**

> Quartel é melhoria geral de qualidade para toda tropa recrutada naquela província.

Duas notas de desenho sobre ela:

**A qualidade é carimbada no recrutamento, não consultada na batalha.** O caminho preguiçoso
seria olhar `origem` na hora do choque e perguntar se aquela província tem Quartel. Parece
de graça, mas cria uma coisa errada: **perder a província transformaria veteranos em
recrutas no meio da campanha.** O soldado é treinado uma vez. Carimbando, tomar o Quartel do
inimigo **não piora o exército que ele tem — piora os que virão**, e isso é uma pressão de
campanha muito melhor que um truque que apaga o exército alheio.

**O teto fica abaixo do número.** Mesmo princípio do counter: Quartel III em torno de +30%,
não +200%. Construído assim — `1,1/1,2/1,3` —, e o treino multiplica o **ataque e não o
aguento**: se multiplicasse os dois, o nível III renderia 1,69 e a ficha continuaria dizendo
1,3. Senão um poder pequeno com Quartel III fica intocável, e a gente quebra o
"defensor menor tem chance" pelo outro lado.

E o que impede o Quartel de virar obrigatório em toda província — o defeito clássico do
prédio-bônus — é uma coisa que o jogo já tem: **são 4 slots.** Quartel em Atenas é Atenas sem
Fazenda, ou sem Ágora, ou sem Muralha. A pergunta vira "qual das minhas terras é a militar?",
que é a especialização que o GDD diz que os slots existem para forçar.

---

## 7. Ordem de implementação

**Item 3 — FEITO, menos a última linha.**

1. ✅ **Interface fixada antes do miolo**, com o cálculo velho atrás dela e a suíte inteira
   verde. Pagou-se sozinha: quando o miolo mudou, foi possível saber que o que quebrou era o
   cálculo e não a costura.
2. ✅ **Choque + perseguição** como função pura, com quatro botões em `ajustes.json`.
3. ✅ **Trocado nos três chamadores.** `movimento/adjudicacao.test.ts` perdeu o bloco da lei
   quadrada — e era o ponto: foram os testes dela que gritaram, provando que a troca aconteceu
   de verdade em vez de ficar atrás de uma bifurcação esquecida.
4. ✅ **Sem empate**, e o desempate vai para quem segura o chão.
5. ✅ **Recuo**, com `refugio`: vizinha própria salva o exército, última província devolve os
   homens à população.
6. ✅ **A janela**, reproduzindo a lista de rounds, só nas batalhas do jogador.
7. ✅ **O recuo ligado**: `recuarAos` na ordem de marcha, e o botão "Recuar se virar" na
   ficha da hoste.
8. ⬜ Moral, se valer a pena.

### Três bugs que a troca desenterrou

Nenhum era do cálculo novo — eram buracos que a aniquilação escondia, porque **antes era
impossível dois exércitos sobrarem de pé no mesmo lugar**:

- a rodada entrava em LAÇO: onze batalhas na mesma província numa rodada só;
- dois invasores assaltavam a mesma praça no mesmo turno, um tomando e o outro retomando;
- o dono mudava no meio da varredura e o ex-dono retomava a cidade que acabara de perder.

Os três viraram uma regra: **não se assalta a muralha com exército inimigo intacto nas
costas**, e a província muda de mão uma vez por rodada.

### Item 3½ — FEITO

1. ✅ **A hoste virou lista de contingentes** (terra, arma, treino), com baixa e destacamento
   proporcionais a cada um.
2. ✅ **Quatro armas** em `ajustes.json`, com o leve como régua (ataque 1, aguento 1).
3. ✅ **Três construções** liberando hoplita, arqueiro e cavalaria, província por província.
4. ✅ **O Quartel de volta**, multiplicando o treino carimbado na leva.
5. ✅ **A batalha lê composição** (`combate/composicao.ts`), com o triângulo e a perseguição
   da cavalaria; `batalha.ts` continua sem conhecer arma nenhuma.
6. ✅ **Comida por BOCAS**; folha de pagamento segue por cabeça.
7. ✅ **Interface**: recrutar por arma (as quatro sempre visíveis, as trancadas com o motivo)
   e uma faixa por arma na janela de batalha.
8. ✅ **`npm run armas`**, o banco de provas — por gente, por moeda, por boca, o triângulo, a
   tabela cruzada de exércitos e o que sobra do derrotado.
9. ⬜ Falta Henrique JOGAR: régua não é partida.

---

## 8. O que vai para `ajustes.json`

Item 3: letalidade do choque, letalidade da perseguição, número de rounds (ou limiar de
quebra), bônus de aguento por nível de muralha, fração perdida no recuo ordenado, e — se
houver moral — limiar e efeito do general.

Item 3½ — está lá: ataque, aguento, custo e comida por arma; `counter` (1,4);
`perseguicaoPorCavalaria` e `meiaCavalaria` (a saturação); e os fatores de qualidade do
Quartel em `dados/construcoes.json`.

---

## 9. Em uma frase

Item 3 deu ao jogo uma batalha que se entende — mata pouco no choque, muito na fuga, deixa
recuar, e produz a lista de rounds que a janela reproduz sem poder mentir. Item 3½ deu a ela
quatro armas que o **mapa** distribui por construção, com o leve garantindo que ninguém fique
sem exército — para que escolher com quem jogar, e o que erguer em cada terra, continue
importando.
