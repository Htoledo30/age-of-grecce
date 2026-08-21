# Resolução da rodada — as regras de adjudicação

## Situação: aprovada pelo dono, com uma correção no caso 1

Este documento não decide nada sozinho. Ele existe porque
[Combate, exército e o mar](combate-e-mar.md) decidiu que **as ordens são registradas
durante o turno e resolvidas juntas ao passar**, e essa decisão está certa — mas ela abre
uma família de casos que precisa de resposta **escrita antes da primeira linha de código**.

O motivo de escrever antes: em resolução simultânea os bugs não estão no código, estão nas
**interações**. Cada caso não previsto vira uma partida em que o jogador viu algo
impossível e não tem como saber se foi regra ou defeito. O *Diplomacy* levou décadas para
formalizar a sua adjudicação, e a comunidade mantém uma suíte de testes só para isso.
Não é motivo para recuar — é motivo para escrever a tabela primeiro.

---

## 1. O princípio, e ele responde quase tudo sozinho

> **A rodada resolve em PASSOS. Dentro de cada passo, nesta ordem:
> primeiro todos PARTEM, depois todos CHEGAM, e só então se resolve quem ficou junto de
> quem.**

Três fases por passo — **partida, chegada, choque** — e dois passos por rodada, porque a
hoste tem dois pontos de movimento.

É essa separação que faz a resolução ser simultânea de verdade. Se a partida e a chegada
acontecessem hoste por hoste, quem fosse processado primeiro veria um mundo que os outros
ainda não tinham mexido — que é exatamente o defeito que a resolução simultânea existe
para consertar.

### Por que passos, e não tudo de uma vez

Com dois pontos, uma rota tem até dois trechos. Resolver "a rota inteira de A, depois a
rota inteira de B" traria de volta a vantagem de quem é processado primeiro. **Só há um
jeito coerente: o passo 1 de todo mundo, depois o passo 2 de todo mundo.**

Uma hoste com rota de um trecho simplesmente não participa do passo 2.

### O destacamento é um objeto com posição

Enquanto marcha, o destacamento **não está na origem nem no destino**: ele está onde o
passo o deixou. Sem isso, "interceptar no meio do caminho" não tem onde acontecer.

- antes do passo 1, ele está na origem;
- depois do passo 1, está em `rota[0]`;
- depois do passo 2, está em `rota[1]`.

⚠️ **A origem fica vazia já no passo 1**, mesmo que o destino esteja a dois trechos. Quem
manda a guarnição inteira embora deixa a casa aberta desde o primeiro instante da rodada —
e isso é a mecânica funcionando, não um efeito colateral.

---

## 2. Quem defende

> **Defende quem é dono da província onde o choque acontece.**
> Se ninguém ali é dono — os dois chegaram de fora, numa província de terceiro ou vazia —
> **não há defensor: é um encontro.**

Uma regra, sem exceção, e ela não depende de quem se moveu ou de quem chegou primeiro
(ninguém chega primeiro: chegam juntos).

---

## 3. Os casos

| # | situação | resultado | por quê |
|---|---|---|---|
| 1 | **A** vai X→Y, **B** vai Y→X | **batalha no encontro; quem vence SEGUE e toma o destino** | dois exércitos que marcham um contra o outro na mesma estrada se encontram. Ver §5 |
| 2 | **A** vai X→Y, **B** vai Z→Y, Y vazia | **batalha em Y, sem defensor (encontro)** | os dois chegam juntos; nenhum é dono de Y. O vencedor fica em Y |
| 3 | **A** sai de X, **B** entra em X | **B toma X sem batalha** | na fase de partida X esvazia; na chegada B encontra terra livre. Fronteira desprotegida é risco real, e é o que dá peso a decidir |
| 4 | **A** vai X→W→Y, **B** entra em W | **batalha em W no passo 1; a rota de A é cancelada** | os dois chegam a W no mesmo passo. Quem sobreviver **fica em W** — nenhum dos dois continua |
| 5 | três ou mais hostes no mesmo destino | **batalhas aos pares, da maior força para a menor** | a maior enfrenta a segunda; quem sobrar enfrenta a terceira, e assim por diante. Determinístico e sem regra de "aliança temporária" |
| 6 | **A** reforça a própria Y; **B** ataca Y | **o reforço CHEGA a tempo; A defende com guarnição + reforço** | é exatamente a justiça que a resolução simultânea existe para dar. Sem isso, atacar seria sempre melhor que defender |

### Notas que decorrem da tabela

**Caso 3 não é injustiça.** Ele parece punir quem se move, mas é simétrico: B também
esvaziou a província de onde saiu, e alguém pode estar entrando nela no mesmo passo.

**Caso 4 cancela a rota dos DOIS.** Se B também estava só de passagem, os dois param. A
alternativa — deixar o vencedor continuar — daria um segundo choque no mesmo passo e
quebraria a regra de "todos chegam antes de qualquer choque".

**Caso 5 é provisório e está marcado como tal.** Combate de três lados de verdade
(alianças, quem ataca quem) é assunto de diplomacia, e diplomacia não existe. Pares em
ordem de força é o mínimo defensável e é determinístico.

---

## 4. Determinismo — a exigência que não é opcional

A mesma rodada, com as mesmas ordens, tem que produzir **exatamente** o mesmo resultado.
Sem isso não há salvamento confiável, não há teste de regressão, e um dia o jogador vê
dois resultados diferentes para a mesma jogada.

Três regras que garantem isso:

1. **Nenhuma fase pode depender da ordem de inserção.** `Object.entries(estado.exercitos)`
   devolve as chaves na ordem em que foram criadas — se a resolução percorrer esse
   registro cru, o resultado passa a depender de quem foi recrutado antes. **Ordenar por id
   de província antes de percorrer**, sempre.
2. **Empate se desempata por id**, nunca por posição na lista. No caso 5, forças iguais
   ordenam pelo id da província de origem.
3. **Aleatoriedade, quando existir na batalha, sai de uma semente guardada no estado.**
   `Math.random()` torna o salvamento uma mentira: recarregar e repetir a mesma rodada daria
   outro resultado.

---

## 5. O encontro na estrada — a correção do dono

A proposta original deixava as duas hostes **passarem uma pela outra** e trocarem de
território sem se tocar. O dono recusou, e com razão:

> "se eu tô em Atenas e meu inimigo em uma cidade fazendo fronteira, e eu mando atacar a
> cidade dele e ele manda atacar a minha, a gente batalhar no meio e quem ganhar meio que
> passa e conquista o local"

**É a regra melhor, e por dois motivos.** O primeiro é que passar-pelo-outro abria uma
esquiva: adivinhando de onde vem o ataque, bastava marchar para lá e **nunca ser pego**. O
segundo é que dois exércitos marchando um contra o outro na mesma estrada **se encontram**
— é o que aconteceria.

### A regra, escrita

> **Quando duas forças hostis atravessam a MESMA aresta em sentidos opostos no mesmo
> passo, elas se encontram na estrada e batalham.** Não há defensor: o encontro não
> acontece em província nenhuma. Quem vence **continua a rota**; quem perde some do passo.

⚠️ **O encontro na estrada não tem terreno, e é a única batalha do jogo sem lugar.** Hoje
isso não custa nada, porque bônus de terreno está proibido enquanto o relevo do mapa for
ruído procedural. No dia em que houver terreno de verdade, esta é a linha que precisa de
resposta.

### O vencedor continua — e pode ter uma segunda batalha no mesmo passo

Seguir a rota não garante o prêmio. Se A mandou **500 dos seus 1.000** e deixou 500 em
casa, e B mandou tudo:

1. os destacamentos se encontram na estrada; B vence;
2. os sobreviventes de B continuam até Atenas;
3. **em Atenas há os 500 que ficaram, e A é dono** — segunda batalha, agora com defensor.

É o argumento que justifica destacamento parcial existir: mandar tudo é apostar a casa.

### O que isso NÃO muda

O caso 4 continua valendo e é diferente: lá as duas hostes chegam **à mesma província**, e
quem vence **fica** nela — porque existe um lugar onde estar. Aqui não existe, e por isso o
vencedor segue.

## 6. O que isso exige do estado

```ts
/** Uma ordem de marcha registrada, ainda não executada. */
export interface OrdemDeMarcha {
  /** De onde sai. É a chave: uma ordem por hoste por rodada. */
  origem: string;
  /** Os trechos, na ordem. Um ou dois — nunca mais que os pontos da hoste. */
  rota: readonly string[];
  /** Quantos homens marcham. O resto fica defendendo a origem. */
  homens: number;
}

interface EstadoCampanha {
  // …o que já existe…
  /** Ordens da rodada corrente, por província de origem. Zeradas na virada. */
  ordens: Record<string, OrdemDeMarcha>;
}
```

**A ordem guarda a rota, não só o destino.** Sem ela, "interceptar no passo 1" não teria
como saber por onde a hoste passou.

⚠️ **`ordens` é da RODADA, não da partida.** Ela é esvaziada no fim da resolução. Se
sobrevivesse à virada, uma ordem esquecida executaria de novo — e o sintoma seria uma
tropa andando sozinha.

---

## 7. Os testes que provam a tabela

Um por linha, mais os de determinismo. **É esta lista, e não o código, que faz a
adjudicação existir** — cada um afirma uma linha da tabela acima, e o dia em que alguém
mexer na resolução por outro motivo, é ela que avisa.

| teste | afirma |
|---|---|
| `duas hostes que se cruzam na mesma aresta batalham na estrada` | caso 1 |
| `quem vence o encontro na estrada continua e chega ao destino` | caso 1 |
| `o vencedor da estrada enfrenta quem ficou defendendo o destino` | caso 1 |
| `dois que chegam na mesma província vazia se enfrentam sem defensor` | caso 2 |
| `província esvaziada na partida cai sem batalha` | caso 3 |
| `encontro no meio da rota cancela os dois percursos` | caso 4 |
| `três no mesmo destino resolvem aos pares, da maior força pra menor` | caso 5 |
| `o reforço chega a tempo de defender` | caso 6 |
| `a mesma rodada resolvida duas vezes dá o mesmo resultado` | determinismo |
| `a ordem de recrutamento não muda o resultado da rodada` | determinismo (§4.1) |
| `nenhuma ordem sobrevive à virada` | §6 |
| `a origem fica vazia já no passo 1 de uma rota de dois trechos` | §1 |

---

## 8. O que este documento NÃO decide

- **Como a batalha se resolve.** Aqui só se decide *onde* e *entre quem* ela acontece.
  A conta é da fatia 5.
- **Cerco e conquista.** Chegar numa província inimiga sem defensor entrega o chão; com
  cidade, muralha ou guarnição, não. Fica para a mesma fatia.
- **O mar.** Zonas marítimas e frota são outro grafo, com os mesmos princípios e casos
  próprios (bloqueio, tempestade, transporte afundado com a carga dentro).
- **Se os pontos de movimento continuam sendo dois.** O dono já decidiu o rumo do tempo:
  **no futuro o turno vira meia estação — verão e inverno, duas jogadas por ano.** Não é o
  foco agora. Quando for, vale reabrir os dois pontos: com o turno mais curto, **um salto
  por rodada** fica mais simples *e* mais fiel, e a resolução perde a máquina de passos
  inteira.
