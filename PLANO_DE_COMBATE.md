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

### Item 3½ — as armas, depois do comércio

Hoplita, cavalaria e tropa leve, com counter suave (alvo 1.4), **liberadas pela rede de
trocas**. Vem depois do item 4 porque é o comércio que dá sentido à escassez: sem a rede
madura, "acesso a cavalo" é uma regra solta.

Aqui entra a mudança estrutural de base: a leva passa a saber **que arma é**, além de
de que província veio.

---

## 6. O Quartel

Ele está **escondido** desde a revisão das construções: `efeito.tipo === 'futuro'` não entra
em catálogo nenhum. Vendia 1.500 moedas de promessa — o jogador pagava, não via diferença, e
passava a duvidar do resto do catálogo.

**Ele volta no item 3½, com a função que Henrique desenhou:**

> Quartel é melhoria geral de qualidade para toda tropa recrutada naquela província.

Duas notas de desenho sobre ela:

**A qualidade é carimbada no recrutamento, não consultada na batalha.** O caminho preguiçoso
seria olhar `origem` na hora do choque e perguntar se aquela província tem Quartel. Parece
de graça, mas cria uma coisa errada: **perder a província transformaria veteranos em
recrutas no meio da campanha.** O soldado é treinado uma vez. Carimbando, tomar o Quartel do
inimigo **não piora o exército que ele tem — piora os que virão**, e isso é uma pressão de
campanha muito melhor que um truque que apaga o exército alheio.

**O teto fica abaixo do número.** Mesmo princípio do counter: Quartel III em torno de +30%,
não +200%. Senão um poder pequeno com Quartel III fica intocável, e a gente quebra o
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
   homens à população. **Ainda desligado** — falta quem decida.
6. ✅ **A janela**, reproduzindo a lista de rounds, só nas batalhas do jogador.
7. ⬜ **Ligar o recuo**: `recuaAos` na ordem de marcha, e o botão na janela.
8. ⬜ Moral, se valer a pena.

### Três bugs que a troca desenterrou

Nenhum era do cálculo novo — eram buracos que a aniquilação escondia, porque **antes era
impossível dois exércitos sobrarem de pé no mesmo lugar**:

- a rodada entrava em LAÇO: onze batalhas na mesma província numa rodada só;
- dois invasores assaltavam a mesma praça no mesmo turno, um tomando e o outro retomando;
- o dono mudava no meio da varredura e o ex-dono retomava a cidade que acabara de perder.

Os três viraram uma regra: **não se assalta a muralha com exército inimigo intacto nas
costas**, e a província muda de mão uma vez por rodada.

**Item 3½:** armas pela rede de trocas, custo/folha/comida por arma, e o Quartel de volta.

---

## 8. O que vai para `ajustes.json`

Item 3: letalidade do choque, letalidade da perseguição, número de rounds (ou limiar de
quebra), bônus de aguento por nível de muralha, fração perdida no recuo ordenado, e — se
houver moral — limiar e efeito do general.

Item 3½: ataque e aguento por arma, fator de counter (alvo 1.4), multiplicador de
perseguição da cavalaria, custo/folha/comida por arma, e o teto de qualidade do Quartel.

---

## 9. Em uma frase

Item 3 dá ao jogo uma batalha que se entende — mata pouco no choque, muito na fuga, deixa
recuar, e produz a lista de rounds que a janela reproduz sem poder mentir. Item 3½ dá a ela
armas que o **mapa** distribui, para que escolher com quem jogar continue importando.
