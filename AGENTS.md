# Age of Grecce — trabalho atual

Este é o único arquivo obrigatório antes de começar uma tarefa. Leia
`ESTADO_DO_JOGO.md` quando precisar entender o que já funciona. Consulte somente a seção
relevante de `GDD.md` quando a tarefa envolver design ou direção futura.

O Git guarda o histórico. Não criar roadmap, backlog, changelog, diário de decisões ou
outro documento de acompanhamento.

## Duas máquinas, um repositório

⚠️ **Henrique trabalha em DUAS máquinas — um notebook e um desktop — e cada uma tem a sua
Claude.** O repositório em `https://github.com/Htoledo30/age-of-grecce` (privado) é o único
ponto de encontro entre elas. Antes dele existir, o projeto viajava numa pasta dentro de um
pendrive, e o resultado foi previsível: duas cópias divergentes e nenhuma forma de saber qual
era a boa.

**Duas obrigações, e as duas são suas, não do Henrique:**

1. **`git pull` ANTES de começar qualquer trabalho.** O que vem de lá não é só código: é o
   `AGENTS.md` e o `ESTADO_DO_JOGO.md` com as decisões que ele tomou na outra máquina. Começar
   sem puxar é trabalhar sobre um mapa velho.
2. **`git commit` e `git push` AO TERMINAR.** ⚠️ **O commit sozinho não basta e é aqui que o
   erro acontece:** commit grava neste disco, push é o que entrega à outra máquina. Trabalho
   commitado e não empurrado é trabalho que a outra Claude não vê — e é assim que nasce a
   segunda versão divergente que este repositório existe para impedir.

Se houver conflito no pull, **não escolha um lado sozinho**: mostre a Henrique o que as duas
máquinas fizeram no mesmo arquivo e pergunte. Ele é quem sabe qual das duas intenções vale.

E avise quando houver trabalho não empurrado ao fim de uma conversa. Ele não tem obrigação de
lembrar; você tem.

## Fontes de verdade

- comportamento atual: código e testes;
- resumo implementado: `ESTADO_DO_JOGO.md`;
- visão do jogo: `GDD.md`;
- trabalho autorizado agora: este arquivo;
- decisão nova ou mudança de direção: Henrique.

Se documento e código discordarem sobre o que existe, o código vence e
`ESTADO_DO_JOGO.md` deve ser corrigido. Se a visão mudar, edite o GDD e remova a versão
antiga da ideia.

## Trabalho atual

A campanha básica, a economia provincial, a alimentação, as construções, o save/load, a
capital, a corrupção, a felicidade, as revoltas, a guerra terrestre, **o mar**, o áudio e a IA
econômica, defensiva e ofensiva já existem. O resumo completo está em `ESTADO_DO_JOGO.md`.

A diplomacia tem relação, presente, pacto, comércio, tributo, **acesso militar** e uma **mesa
de propostas**: o que a IA assinaria com outro reino ela PEDE ao jogador, com aceitar e
recusar. O ritmo dela vive em `dados/ia.json` e é balanço, não código: mexer nele é editar
JSON e rodar `npm run partida`.

⚠️ **NÃO HÁ TRABALHO AUTORIZADO NOVO — a lista de Henrique está riscada.** A
nacionalidade no humor, que era a última, entrou. A peça natural seguinte é a **ASSIMILAÇÃO**:
hoje o povo conquistado nunca deixa de ser quem é, e o preço da conquista é permanente. Ela é
decisão nova — não comece sem ele dizer.

O que ele ainda não julgou com o olho está na seção abaixo. **Perguntar antes de abrir frente
nova** vale mais do que adivinhar a próxima peça.

### A leitura de balanço de hoje, e o alvo que ela ainda não cumpre

`npm run partida 100`, com tudo ligado:

- 25 províncias trocando de dono · **4 poderes eliminados de 18** · maior reino com 6
  (começou com 3) · distância entre maior e menor 10,0× contra 6,2× no turno 1;
- 11% dos poder-turnos em guerra · 28 guerras · 86 pactos · 47 acordos de comércio de pé ·
  39 passagens militares · 47 trechos de travessia pelo mar;
- decretos: baixo 79 · normal 19 · alto 70 · **confisco 19** (a alavanca de emergência dispara,
  e dispara raro, que é o desenho).

⚠️ **O ALVO, decidido por Henrique, continua sendo:** a curva desce até o turno 100 e lá **já
tem de haver alguns impérios APARECENDO — mas não reinos imensos.** Cem turnos são meia hora de
partida; não é um mapa consolidado, é um mapa em que já dá para apontar quem está ganhando.

⚠️ **E a leitura de hoje pode estar plana demais para esse alvo.** O reforço do imposto deixou
a IA mais rica, e mundo rico é mundo estável: a guerra caiu de 18% para 11% dos poder-turnos, as
conquistas de 40 para 25 e os reinos eliminados de 11 para 4. Argos termina com 6 províncias
onde antes terminava com 12. **Não mexer nisso sem Henrique jogar primeiro** — ele pode achar
bom ter vizinhos vivos, e o número que resolve é o olho dele, não a medição.

⚠️ **Cuidado ao mexer nos números da IA sem medir.** A resposta é caótica: uma conquista cedo
vira bola de neve, e andar na mesma direção de um dial já deu 20 conquistas numa configuração e
105 na vizinha. `npm run partida 100` é barato e é o corte.

⚠️ **E cuidado com dial cujo custo é HUMOR.** Desde que o humor multiplica a arrecadação, cada
ponto vale 1% da renda inteira da província — enquanto o fator do imposto incide só sobre a
parcela dele, que é 13% a 48% do total. Foi assim que o imposto alto chegou a ser NEGATIVO no
equilíbrio: um botão que prometia mais dinheiro e entregava menos. Qualquer alavanca nova que
se pague em humor tem de refazer essa conta dos dois lados.

Não começar espionagem, migração, governadores, vassalagem ou suserania sem uma nova decisão
de Henrique. **A IA não EXIGE tributo nem rompe o que recebe** — as duas coisas foram deixadas
de fora de propósito e são decisão nova.

⚠️ **O naval está DE PÉ, e sem frota — decisão de Henrique (28/08/2026).** O exército anda
pelas 48 zonas de mar como anda por terra, embarcar exige Porto, e todo encontro na água é
batalha sem conquista. A IA atravessa. O que continua fora, e é decisão nova: bloqueio naval,
desgaste por FICAR parado na água (hoje só a folha de campanha), e a IA patrulhar ou
interceptar travessia alheia.

⚠️ **Aliança** continua sendo o topo da régua: acima de +45 ainda não há nada a comprar.

## O que depende de Henrique testar

- o aperto alimentar de Atenas e a nova regra de fome;
- economia e ritmo das construções em um poder rico, um médio e um pequeno;
- força prática da corrupção e dos decretos de imposto;
- quatro armas, muralhas, cerco, recuo e folha militar dentro e fora de casa;
- utilidade das abas de Alimentação e Mercado no Governo;
- **os arquipélagos com a água deles**: as manchas se leem como reinos agora, ou o mar
  reivindicado parece território demais para cinco ilhotas?
- **a paleta desempatada**: 75 dos 139 poderes mudaram de tom. Perdeu-se alguma identidade de
  reino no caminho?
- comportamento da IA, especialmente defesa e ataque;
- **o tributo jogando**: a parcela dói o suficiente? o prazo longo é tentador ou é armadilha?
  comprar a saída de uma guerra perdida chega a tempo de salvar a partida?
- **a mesa de diplomacia**: os dois cartões dizem o que precisam dizer? a régua com a linha do
  vizinho dá escala ao número da opinião? a resposta antes do clique tira ou põe graça?
- **a janela de batalha**: o traço do limiar dá a tensão que ele promete? a fita se lê ou se
  varre? o ritmo de 900 ms por round é bom nos dois extremos — batalha de 3 rounds e de 9?
- **o painel da província refeito**: as quatro medidas são as quatro certas? tirar as
  construções do painel e pô-las em janela custa cliques demais em partida longa? o contador
  do portão ("0/4", "2.500 homens") evita abrir a janela à toa?
- **o mar jogando**: a viagem custa o que deve custar? Atenas→Rodes em 7 turnos é espera boa ou
  espera chata? interceptar alguém no meio da água acontece na prática?
- **o imposto refeito**: o CONFISCO é uma decisão de verdade ou uma armadilha óbvia? a previsão
  em moeda no tooltip resolve o "isto rende ou não rende"?
- **a mesa de propostas**: chega proposta o suficiente quando ele joga de verdade? O medido com
  um jogador ativo foi 5 propostas de 5 reinos em 60 turnos — pode ser pouco.
- **o acesso militar**: dá vontade de usar, ou é mais fácil declarar guerra e pronto?
- **o modo de relações no mapa**: as seis cores se distinguem no terreno? trocar o escolhido por
  clique é o gesto certo?
- **os nomes no mapa**: o corpo do texto é o certo? a regra do "só aparece se couber" mostra
  nomes demais ou de menos no zoom em que ele joga? água em itálico se distingue de terra?
- **a nacionalidade pesando**: conquistar a Eubeia jônia sai barato o bastante para valer a
  pena, e o Istmo dório sai caro o bastante para doer? O preço permanente frustra ou dá o
  formato de império que ele quer?

⚠️ **NUNCA use `transform: scale()` no palco.** Ele desliga o antialiasing de subpixel de
toda a interface e deixa o texto fino e lavado. A escala vive em `src/estilo/escala.ts` e usa
`zoom`, que refaz o layout em vez de esticar um bitmap. E ao julgar tipografia, capture com
`npm run capturar -- nome --tela=1920x1000`: a 1920x1080 a escala é 1 e a captura mente.

⚠️ **DEFEITO DE FONTE, não de código**: o glifo **ê** da Cormorant Garamond — a face dos nomes
próprios — desenha o circunflexo alto e deslocado à esquerda. Não é fallback (a largura é a
mesma de `e` e `é`), é o desenho da face nesse peso. Atinge 15 nomes de província, sendo
*Elêusis* o mais visto. Cinzel, Alegreya e Inter escrevem o mesmo `ê` corretamente. Conserto
possível: trocar a face dos nomes, ou empacotar outra versão do Cormorant.

Simulação mede relações e regressões; não substitui a sensação da partida.

## Como trabalhar

- Faça a menor alteração que complete o objetivo atual.
- Preserve mudanças existentes no worktree.
- Claude e Codex não editam simultaneamente os mesmos arquivos. Trabalho paralelo real
  exige áreas separadas ou worktrees.
- Não implemente uma ideia futura apenas porque ela parece relacionada.
- Números ajustáveis ficam nos JSON; testes protegem relações e fórmulas, não valores de
  balanceamento que podem mudar legitimamente.
- Meça economia no poder mais pobre e no mais rico, nunca apenas em Atenas. Rode
  `npm run economia` após alterar qualquer número econômico.
- Rode `npm run armas` após alterar qualquer número de combate. Um duelo isolado não revela
  dominância por ouro, comida e população.
- Ao mexer num dial, compare a largura dele com a dos outros. Um número com faixa curta não
  governa o sistema quando outro varia dez vezes mais.
- Testes de tela são para UI, DOM, CSS e interação. Leia a lista completa de falhas antes de
  corrigir.
- Pesquise referências externas quando Henrique pedir ou quando faltar confiança factual.
- Chame revisão adicional somente sob demanda ou em mudança grande de combate, economia ou
  matemática.

## Coesão do código

Um arquivo deve ter um assunto. Tamanho é apenas um alerta: um catálogo ou arquivo de dados
coeso pode ser grande, enquanto um arquivo pequeno misturando comércio, IA, mapa e combate já
está errado.

Nunca divida apenas para baixar um contador e nunca crie um arquivo por província.
`npm run checar` lista arquivos acima de 300 linhas para inspeção, mas não reprova por
tamanho. `src/main.ts` e `src/campanha/campanha.ts` são fachadas com teto próprio e não
recebem regras novas.

## Entrega

Use os comandos proporcionais ao risco durante o trabalho e encerre com:

1. `npm run verificar`;
2. `npm run teste-tela`;
3. `npm run build`;
4. bancos específicos quando a área exigir: `npm run economia`, `npm run armas`,
   `npm run simular` ou `npm run partida`.

`npm run entregar` reúne verificação, tela e build.

Ao concluir, atualize `ESTADO_DO_JOGO.md`. Altere `GDD.md` somente quando a visão mudar e
este arquivo somente quando o trabalho autorizado mudar. Não registre aqui a história da
implementação: o Git já faz isso.
