# Combate, exército e o mar

## Finalidade deste documento

Registrar **o que já foi decidido** sobre guerra e movimento, **o que já está no jogo**, e
**o que ainda é proposta**. As três coisas ficam separadas de propósito: misturar decisão
com ideia é o que faz um documento envelhecer sem ninguém perceber.

A especificação da economia continua em
[Economia e produtos regionais](economia-e-produtos-regionais.md).

## A régua de escopo, nas palavras do dono do projeto

> "o ponto mais fraco talvez do jogo seja o combate por questões de falta de assets […]
> decidi que seria melhor não ter batalhas estilo Total War ou CK3, mas algo mais simples,
> com mais mecânicas que Age of History 2"

Isso é o critério de aceitação de qualquer proposta daqui: **mais simples que Total War e
CK3, mais rico que Age of History 2, e sem exigir arte que o projeto não tem.** O orçamento
visual é o mapa, HTML, CSS, texto, tabela, número e tooltip.

---

## Decisões tomadas

### O mar é recortado em zonas, como a terra é recortada em províncias

Decisão do dono, nestas palavras:

> "vai precisar criar áreas no mar também igual em terra para poder mover unidades entre
> nós/quadrados/territórios"

Zona de mar é **território de primeira classe**: tem nome, tem vizinhas, dá para estar
nela, disputá-la e bloqueá-la. A frota navega de zona em zona adjacente.

⚠️ **Isso descarta duas ideias anteriores do projeto**, e as duas estão mortas:

| ideia descartada                                      | onde estava escrita                              | por que morreu                                                          |
| ----------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| alcance naval a partir do porto, em dias de navegação | proposta de design                               | o mar deixa de ser lugar e vira raio; não dá para bloquear um raio      |
| adjacência marítima derivada por proximidade mútua    | `tarefas/esqueleto-estado-e-turno.md` (removido) | funcionava e era artificial: inventava vizinhança onde não há travessia |

### A rodada tem planejamento e resolução

**Mover não altera o mapa no instante do clique.** Durante o turno, jogador e IA registram
ordens sobre o mesmo estado do mundo; ao passar o turno, começa a fase de resolução. É ela
que executa marchas, encontros, batalhas e conquistas. Assim quem age primeiro não pode
tomar uma fronteira vazia antes que o outro lado tenha oportunidade de mandar reforço.

O fluxo visível é:

1. selecionar a hoste e clicar em **Mover**;
2. destacar destinos e mostrar a rota;
3. escolher quantos homens marcham;
4. gravar uma seta com a quantidade, sem deslocar o marcador ainda;
5. permitir revisar ou cancelar a ordem antes de passar o turno;
6. receber as ordens da IA e resolver a rodada;
7. começar a rodada seguinte com o mundo resultante.

Província inimiga realmente vazia continua caindo sem batalha: isso é fronteira
desprotegida, não vantagem de interface. Se o defensor também mandar reforço, as ordens se
encontram durante a resolução.

### Cada hoste atravessa uma fronteira por rodada

Cada hoste planeja **um salto entre províncias vizinhas por rodada**. Não existe
limite global de cliques ou ações do poder: dinheiro limita economia; população, teto de
leva e manutenção limitam exércitos; os pontos da própria hoste limitam operações.

- cada travessia terrestre custa inicialmente 1 ponto;
- a rota-base tem exatamente um trecho;
- encontrar inimigo inicia batalha e cancela o restante da rota;
- os pontos voltam no começo da rodada seguinte;
- não há limite artificial de quantidade de hostes;
- custo por relevo está proibido enquanto o mapa não tiver dado geográfico confiável.

Entrar no mar continua impossível até existirem zonas marítimas e frota.

### A hoste pode mandar somente parte dos homens

Hoste é uma quantidade divisível, não uma peça indivisível. Uma hoste de 1.000 em Atenas
pode ordenar que 500 marchem e deixar 500 defendendo. A ordem guarda **origem, destino,
quantidade, rota e custo de movimento**.

- cada hoste emite somente **uma ordem de movimento por rodada**;
- não existe quantidade mínima: pode marchar um homem e pode ficar um homem na origem;
- mover a hoste inteira também é permitido com qualquer quantidade;
- os homens comprometidos ficam indicados como "em marcha", mas só saem na resolução;
- a parte que ficou não recebe outra ordem de movimento naquela rodada, mas defende a origem;
- se chegar a uma hoste aliada, o destacamento se incorpora a ela;
- se chegar a inimigo, só o destacamento enviado participa da batalha.

**A origem populacional continua preservada.** Ao separar uma hoste que mistura homens de
várias províncias, o destacamento leva uma parcela proporcional de cada origem. Dispensar
depois continua devolvendo cada homem à terra correta.

### Ordem e pagamento agora; preparo físico depois

A regra temporal geral é: **a decisão compromete recursos imediatamente, mas o que exige
preparação física leva rodadas.**

| ação                  | quando o custo/ordem entra          | quando o efeito fica disponível        |
| --------------------- | ----------------------------------- | -------------------------------------- |
| investimento          | imediatamente                       | na próxima arrecadação                 |
| dispensar soldados    | imediatamente                       | população volta imediatamente à origem |
| recrutar              | ouro e população saem imediatamente | leva fica pronta na rodada seguinte    |
| construir             | ouro sai imediatamente              | depois dos turnos de obra do catálogo  |
| mover                 | ordem e pontos ficam comprometidos  | durante a resolução da rodada          |
| combater e conquistar | consequência da ordem de marcha     | durante a mesma resolução              |

Cada província prepara somente **uma leva por vez**. Quando pronta, ela cria uma hoste ou
se incorpora à aliada que estiver ali, e entra na rodada seguinte apta a atravessar uma
movimento. Se a província for conquistada durante o preparo, a formação é interrompida:
o ouro não volta e os homens retornam à população daquela terra, agora sob o novo dono.

Por enquanto toda leva leva uma rodada, independentemente do tamanho. Fazer o prazo variar
com a quantidade só entra se o ciclo jogável provar que essa profundidade faz falta.

### Só se recruta onde há Quartel, e a leva custa ouro **e população**

Decisão do dono. Implementado. Ver `CLAUDE.md`, seção "O exército".

O que isso comprou, e que nenhuma regra precisou dizer: **o ouro sozinho faria exército
brotar de tesouro grande.** O limite real é a população da província, e por isso uma
cidade despovoada não vira exército por mais rico que o reino seja — e tomar uma cidade
grande passa a valer por gente, não só por renda.

### A ordem das fatias, escolhida pelo dono

1. marcador e seleção — **feito**
2. recrutamento com uma rodada de preparo
3. ordens de movimento entre províncias amigas, com divisão e reunião
4. resolução simultânea das ordens e entrada em território inimigo
5. batalha provisória e conquista

**Batalha é a última.** Antes dela é preciso olhar para Atenas e ver que mil homens estão
ali.

---

## O que já está no jogo

| peça                                                                               | onde                                                            | estado     |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------- |
| Quartel destrava recrutar                                                          | `dados/construcoes.json`                                        | feito      |
| leva custa ouro e população e fica uma rodada em formação                          | `src/combate/formacao-de-leva.ts`, `src/combate/mobilizacao.ts` | feito      |
| qualquer quantidade inteira de 1 até a população atual, sem fração nem lote mínimo | `src/combate/recrutamento.ts`                                   | feito      |
| manutenção por turno, e deserção proporcional quando não se paga                   | `src/combate/mobilizacao.ts`                                    | feito      |
| dispensar devolve cada homem à terra dele                                          | `src/combate/mobilizacao.ts`                                    | feito      |
| marcador da hoste no mapa, seleção e ficha                                         | `src/ui/hostes-mapa.ts`, `src/ui/exercito-ficha.ts`             | feito      |
| propriedade mutável e eliminação de poder                                          | `src/campanha/territorios.ts`                                   | feito      |
| movimento, batalha, cerco, IA militar, naval                                       | —                                                               | não existe |

O balanço que a estrutura produziu sozinha, e que um teste fixa: **Atenas mobilizada ao
teto põe 3.500 homens em campo, que custam 700 por turno contra 691 de renda** — porque os
mesmos 3.500 deixaram de ser tributados. Guerra total é insustentável por construção, sem
nenhuma regra dizendo isso.

---

## O que foi medido no mapa real

Estes números são para não se inventar regra sobre dado que não existe. Todos foram
conferidos contra o raster e o assado de produção.

| medida                                          |                                           valor |
| ----------------------------------------------- | ----------------------------------------------: |
| províncias / poderes / regiões                  |                                  205 / 148 / 53 |
| poderes com **uma única** província             |                                         **120** |
| componentes de terra                            |          38, e o continental tem 160 províncias |
| províncias fora do componente continental       |             45, e **todas as 45 são costeiras** |
| **poderes sem nenhuma província no continente** |                                          **43** |
| províncias costeiras / interiores               |                                    **151 / 54** |
| água no mapa                                    | 14.194.381 px = 549.269 km², **56% da moldura** |
| recorte do mar por Dijkstra multiorigem         |               **1,1 s, 216 MB, 0,01% sem dono** |

⚠️ **Os 43 e os 34 são medidas diferentes, e as duas são verdade.** 34 é o número de
poderes cujo componente de terra não contém mais ninguém. Mas Creta é um componente de 8
províncias com 7 poderes, e Lesbos um de 2 com 2: esses nove se alcançam entre si e não
alcançam mais ninguém no mundo. **O número que importa para "quem nasce trancado sem
porto" é 43.**

⚠️ **A moldura tem um canal de água de 26 px ao norte e a leste**, e ele não é mar: é
borda. Contando a água crua dão 161 províncias costeiras; cortando a faixa dão **151**. As
dez que caem são Agrianes, Astas, Derríopo, Górdio, Licaônia, Medos, Odrisas, Penestas,
Peônia e Pessinunte — e Górdio e Pessinunte estão a 200 km de qualquer mar. **Quem gerar o
mar corta 26 px ao norte e a leste**; sem isso o Ponto Euxino fica soldado ao Egeu pelo
Bósforo e cidades do planalto anatólio viram candidatas a porto.

⚠️ **Relevo e bioma são ruído procedural e não sustentam mecânica.** A única fonte
geográfica real do gerador é a costa (Natural Earth 1:10m). Medido: Larissa, a planície da
Tessália, sai como 55% terreno alto; Mantineia e Tegeia, planaltos pelados da Arcádia, saem
100% floresta. **Bônus de terreno em batalha e custo de marcha por bioma estão proibidos
até existir altimetria real ou dado autoral por província.**

---

## Propostas, ainda não decididas

Nada abaixo é lei. São ideias com desenho suficiente para serem avaliadas quando a fatia
correspondente chegar.

### O recorte do mar

Sementes autorais com nome grego antigo e lon/lat reais, crescidas por Dijkstra multiorigem
sobre a água — a mesma máquina que recorta a terra. Uma proposta detalhada sugere **45
zonas** (Mar Egeu, Mar de Mirtos, Mar Icário, Mar de Creta, Mar Cárpatho, Mar da Trácia,
golfos Sarônico, Argólico, Lacônico, Messênio, de Corinto, Pagasético, Termaico, Euripo,
Helesponto, Propôntida, Bósforo, Mar Jônio, Adriático, Mar da Lícia…).

⚠️ **O número de zonas é a decisão de design de verdade aqui, não o algoritmo.** Um teste
com 18 sementes produziu zonas de 115.542 km² (Mar Jônio) contra 1.007 km² (Euripo) — 115
para 1 —, porque as bordas do mapa não tinham semente perto e foram engolidas pela vizinha.
Distribuição, não contagem.

### A composição da hoste

Hoplitas (a linha), psiloi (escaramuça) e cavaleiros (envolvimento e perseguição), como
registro fechado de três campos. Cavalaria só onde a semente disser que há cavalos.

### A milícia

Defesa de província derivada da população, calculada na hora e nunca guardada. Três
propriedades que valem o preço: manancial humano **um só**; perder uma batalha em casa
custa imposto e custa leva; e **mobilizar esvazia a muralha** — recrutar 2.000 em Atenas
derruba a milícia junto. Nasce da estrutura, sem regra escrita.

### A batalha

Resolução por conta transparente, saindo como **relatório em HTML** — tabela do que cada
lado tinha, do que pesou e do que morreu. Nunca renderizada: o projeto não tem arte de
unidade nenhuma, e é essa restrição que torna o relatório a mecânica em vez de um consolo.

---

## Perguntas em aberto que precisam de resposta do dono

1. **Ordem de resolução dos conflitos.** Falta decidir hostes que cruzam em sentidos
   opostos, dois atacantes chegando ao mesmo destino e qual atributo desempata iniciativa.
   A regra precisa ser determinística e visível, nunca sorteio escondido.
2. **Quantas zonas de mar**, e onde ficam as sementes.
3. **`jogo.anosPorTurno`** continua em aberto, e decide o ritmo da campanha inteira.

## Dívida conhecida que a guerra vai cobrar

⚠️ **`estado.tesouro` é um número só, o do jogador.** `Mobilizacao.pagarManutencao` é
chamada só para ele, o que hoje é inofensivo porque não há IA — e no dia em que houver vira
**bônus secreto para a IA**, que viola a regra da casa de jogador e máquina sob as mesmas
regras. O conserto é `tesouro: Record<string, number>`, e ele precisa entrar **antes** da
primeira IA militar, não depois.
