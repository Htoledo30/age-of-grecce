# PATCH_ATUAL.md

> ## ⚠️ NÃO HÁ PATCH EM ANDAMENTO
>
> O `0.0.2` foi testado por Henrique, aprovado e **fechado em 2026-08-23**. A versão está
> em `package.json` e o histórico em `CHANGELOG.md`.
>
> **Nenhum agente tem trabalho autorizado neste momento.** O próximo da fila é o
> `0.0.3 — Economia física básica` do `ROADMAP.md`, e ele só começa quando Henrique
> reescrever este arquivo com o escopo dele. O que está abaixo é o registro do patch
> encerrado, mantido como memória do que foi feito e por quê.

# Age of Grecce — 0.0.2 (ENCERRADO)

## Nome

**Fechamento da guerra básica**

## Objetivo

Fechar e testar o núcleo de guerra que já existe, sem iniciar economia nova nem outro sistema grande.

Este patch deve terminar pequeno, jogável e verificável manualmente.

---

## Trabalho já existente e que deve ser preservado

O núcleo militar atual já possui, segundo código/testes e revisão da Claude:

- hostes com identidade própria;
- destacamentos;
- origem dos soldados preservada;
- recrutamento com 1 rodada de formação;
- movimento e ordens simultâneas;
- encontros na estrada;
- múltiplas batalhas no mesmo turno;
- baixas e sobreviventes;
- milícia;
- cerco persistente;
- postura decide se há choque: sitiar não engaja o exército de dentro, assaltar engaja;
- assalto;
- conquista;
- exílio de poderes que ainda possuam hostes.

Não reimplementar esses sistemas sem bug concreto.

---

## Trabalho que caiu antecipadamente no repositório

Durante o escopo anterior, maior do que deveria, foram preparados também:

- tesouro por poder;
- região de teste com Atenas, Maratona, Sunião, Elêusis e Tanagra;
- nacionalidade inicial;
- felicidade inicial;
- recurso secundário;
- estoque inicial;
- capitais;
- conexões;
- ancoradouro;
- crescimento populacional sem teto artificial;
- testes correspondentes.

Esses dados e estruturas podem permanecer se estiverem estáveis.

**Eles não autorizam implementar os sistemas futuros que irão usá-los.**

---

# Tarefas do 0.0.2

## 1. Surtida

Pré-requisito já feito: sitiar deixou de engajar, então sitiante e defensor convivem na
mesma província. Sem isso não havia a quem dar a escolha — o choque já tinha resolvido
tudo.

**Surtida é o sitiado sair para atacar quem o cerca.** É o único ato que obriga o sitiante
a lutar: ele declarou que não quer choque, e a surtida ignora essa recusa.

- [x] defensor sitiado pode escolher atacar o exército sitiador;
- [x] reutilizar o combate básico já existente;
- [x] vitória do defensor quebra o cerco;
- [x] derrota mantém o cerco e aplica as baixas de forma coerente;
- [x] a milícia NÃO sai junto: quem surte é a hoste, a milícia continua sendo da cidade;
- [x] surtir é a ordem daquela hoste na rodada — quem surte não marcha no mesmo turno;
- [x] **socorro que chega de fora engaja o sitiante** ao entrar, sem declarar nada
      (`DECISOES.md` #33A);
- [x] não criar sistema tático separado.

Achado durante a tarefa, corrigido junto porque a chegada do socorro o tornava comum:
a postura é compartilhada por província de DESTINO, e uma marcha do defensor para a
própria cidade escrevia "sitiar" na entrada dela — bastava mandar qualquer hoste para lá
e o assalto do sitiante virava cerco sem nada ter sido lutado. Marcha para terra própria
deixou de declarar postura.

## 2. Muralha e assalto

- [x] muralha continua fortalecendo a defesa/milícia;
- [x] província sem muralha pode sofrer assalto imediato;
- [x] província com muralha exige inicialmente 2 turnos de cerco antes do assalto;
- [x] manter o número de 2 turnos como valor inicial de teste, não como valor final de balanceamento;
- [x] o número vive em `dados/ajustes.json`; quem diz que a obra exige cerco é o catálogo
      de construções, por campo próprio — não o id `muralha` escrito na regra;
- [x] a contagem começa em zero na rodada em que o exército senta e zera se o sitiante
      sair, morrer ou for substituído;
- [x] o botão de assaltar só aparece depois das duas rodadas, dizendo o motivo antes disso;
- [x] **Tanagra começa com Muralha e Elêusis não** — os dois alvos vizinhos de Atenas, um
      de cada tipo, para o teste manual comparar assalto imediato e assalto barrado.

A regra mora na resolução, e não só na interface: a postura também chega pela ordem de
marcha, e uma ordem que a tela não deixaria dar continuaria podendo vir da IA, de um
salvamento antigo ou do gancho de inspeção. Assalto barrado vira cerco em vez de erro.

## 3. Crônica da rodada

Achado ao revisar o patch antes de fechar: **a guerra estava sendo resolvida em silêncio.**
A resolução já devolvia batalhas, conquistas, cercos e milicianos perdidos, e ninguém lia
esse relatório — o jogador mandava a surtida, passava o turno, e a peça de 700 homens sumia
do mapa sem uma palavra.

Não é ampliação de escopo: o patch promete terminar "pequeno, jogável e **verificável
manualmente**", e guerra que só se adivinha não é verificável à mão.

- [x] uma nota por rodada com o que aconteceu: batalhas, milícia, conquistas, cercos
      começados e cercos levantados;
- [x] some sozinha quando a rodada não tem notícia — mundo parado não escreve linha;
- [x] o tom (ganho/perda) é do ponto de vista do jogador;
- [x] separar o choque de campo do assalto: um assalto produz duas batalhas na mesma
      província, e duas linhas iguais leem como repetição;
- [x] **não é o visor de batalha.** Sem barra, sem playback, sem velocidade, sem pular —
      isso continua sendo o `0.0.13` do `ROADMAP.md`, e passa a valer de verdade quando a
      IA atacar sem avisar.

## 4. Estabilização

- [x] **levar o id da hoste até a interface.** `Campanha.exercitoEm` saiu e deu lugar a
      `hoste(id)` e `hostesEm(provincia)`; o mapa desenha um marcador por HOSTE; a ficha do
      exército e as ordens endereçam por id; o sitiante é desenhado na divisa e a bandeira
      de cerco ganhou camada própria;
- [x] terminar o rastro desse refactor: 7 testes unitários e 1 de tela endereçavam hoste
      por província (`forcaEm` agora responde pelo dono da terra, e `podeOrdenarMarcha`
      recebe id de hoste);
- [x] trocar o `test.fixme` de `testes/tela/cerco.spec.ts` por um teste real de operar o
      cerco pelo marcador;
- [x] corrigir regressões causadas pelas mudanças deste patch;
- [x] manter o núcleo militar existente funcionando;
- [x] testes unitários verdes;
- [x] testes de tela verdes;
- [x] tipos e lint verdes.

---

# Fora de escopo do 0.0.2

Não implementar neste patch:

- nova economia física;
- produção física nova;
- consumo de alimento;
- deterioração;
- mercado interno;
- nova tributação;
- felicidade funcional;
- nacionalidade funcional;
- efeitos funcionais de capital;
- construções 2.0;
- cerco econômico;
- visor de batalha;
- moral;
- retirada avançada;
- tipos de tropas;
- generais;
- terreno de combate;
- naval;
- diplomacia;
- IA.

---

# Critério de fechamento

O `0.0.2` fecha somente quando:

- [x] as tarefas do patch funcionarem;
- [x] testes automatizados relevantes estiverem verdes — 237 unitários e 26 de tela, com
      tipos, lint, código morto e validação de dados;
- [x] não houver regressão bloqueante conhecida;
- [x] Henrique testar manualmente o jogo;
- [x] Henrique aprovar o patch.

Depois da aprovação:

1. [x] atualizar `CHANGELOG.md`;
2. [x] marcar/registrar a versão — `0.0.2` em `package.json` e `package-lock.json`;
3. [x] encerrar o patch;
4. [x] parar.

**Nenhum agente inicia o `0.0.3` automaticamente.**

## Limites conhecidos que este patch NÃO resolveu

Ficam registrados para quem abrir o próximo patch, e nenhum deles é alcançável pelo
jogador hoje:

- **dois sitiantes na mesma província**: `estado.cercos` guarda um sitiante por província,
  então o segundo sobrescreve o registro do primeiro — e os dois acampam sem se tocar,
  porque nenhum quer lutar. Vira problema real no patch da IA;
- **postura compartilhada por província de destino**: dois poderes marchando sobre a mesma
  cidade alheia compartilham a entrada, e o segundo herda a postura do primeiro. Também só
  aparece em guerra de três lados;
- **a matemática do combate continua provisória** (`DECISOES.md` #20), e moral, retirada e
  tipos de tropa continuam no backlog;
- **sem IA, ninguém ataca o jogador**: exercitar surtida e socorro à mão exige o gancho de
  inspeção.
