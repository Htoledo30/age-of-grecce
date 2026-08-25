# Age of Grecce — trabalho atual

Este é o único arquivo obrigatório antes de começar uma tarefa. Leia
`ESTADO_DO_JOGO.md` quando precisar entender o que já funciona. Consulte somente a seção
relevante de `GDD.md` quando a tarefa envolver design ou direção futura.

O Git guarda o histórico. Não criar roadmap, backlog, changelog ou diário de decisões.

## Fontes de verdade

- comportamento atual: código e testes;
- resumo do jogo implementado: `ESTADO_DO_JOGO.md`;
- visão do jogo: `GDD.md`;
- trabalho autorizado agora: este arquivo;
- decisão nova ou mudança de direção: Henrique.

Se documento e código discordarem sobre o que existe, o código vence e
`ESTADO_DO_JOGO.md` deve ser corrigido. Se a visão mudar, edite o GDD: não acumule versões
antigas da mesma ideia.

## Agora: rumo à campanha completa — sequência autorizada por Henrique

Henrique autorizou (24/08/2026) executar as etapas abaixo EM ORDEM, com calma, uma de
cada vez, cada uma fechada com `npm run verificar` e `npm run teste-tela` verdes e
documentação atualizada antes de abrir a próxima. Balanceamento novo entra em
`dados/*.json` como número inicial, não definitivo.

1. **Manutenção de construção** — todo prédio custa ouro por turno; a renda provincial
   vira líquida e província pode dar saldo negativo (GDD). Fecha o ciclo econômico.
2. **Save/load** — salvar e retomar a campanha. `EstadoCampanha` já é o contrato do
   disco; efêmeros (crônica, fome da rodada) não são salvos.
3. **Capital funcional** — perder a capital obriga a escolher outra; pré-requisito da
   corrupção por distância.
4. **Corrupção** — freio de renda por tamanho e distância da capital (fórmula e tabela de
   calibração no GDD); dá função real a Ágora, Estrada e capital.
5. **Expansão autoral da Grécia central** — Mégara, Corinto, Tebas, Eubeia (~20–30
   províncias com economia) e mais poderes jogáveis além de Atenas.
6. **Felicidade funcional e revoltas; vitória/derrota mínima** — última camada de regras
   antes da IA.

A IA é a última etapa do jogo, decidida por Henrique, e fica fora desta sequência.

### Agora: a guerra tem forma — choque, quebra e perseguição

Item 3 da sequência de Henrique. `√(maior² − menor²)` saiu do jogo: era uma raiz quadrada
sobre dois números, sem decisão dentro dela, sem recuo, e sem nada para o jogador ver.

**A batalha agora tem duas fases.** No choque os dois lados batem ao mesmo tempo até um
perder a fração de quebra e a linha ceder; depois vem a perseguição, e é ali que morre gente.
Levado até o fim, o choque É a lei quadrada — a diferença é que ele **para na quebra**, e é a
parada que salva o perdedor e preserva o vencedor.

| encontro | vence com | custo | perdedor sobra |
|---|---:|---:|---:|
| 1.000 × 1.000 | 375 | −63% | 93 |
| 1.000 × 900 | 520 | −48% | 80 |
| 1.000 × 500 | 840 | −16% | 20 |
| 1.000 × 200 | 970 | −3% | 12 |

Henrique escolheu esta curva entre três, e por dois defeitos que ele apontou na primeira:
*"não pode existir empate"* e *"tá sobrando muito soldado vivo pós batalha, 1000x1000 sobra
500 wtf"*.

- **Não existe empate.** Quem ataca precisa vencer; barrar o invasor é a vitória de quem
  segura o chão, e quem chama passa o defensor como desempate. Com empate, os dois exércitos
  ficavam na província e brigavam de novo toda rodada — o jogo não saía do lugar.
- **O atacante também quebra**, e é isso que dá chance ao defensor menor: 1.000 contra 900 em
  campo aberto é do atacante, e atrás da muralha a linha DELE cede primeiro. Veio de muralha e
  quebra, não de counter de tropa.
- **Quem quebra perde a hoste, não a geração:** quem escapa da perseguição volta à população
  da terra natal.
- **Recuar** é a terceira saída, e é decisão de HORA — quem já cedeu não recua mais. Com
  vizinha própria o exército sai inteiro; na última província ele se desfaz, mas os homens
  voltam à população. Regra de Henrique: *"se for última província ele morre e foda-se, ou
  volta para a população de onde saiu"*. **Ainda desligado**: falta ligar `recuaAos` à ordem
  de marcha e pôr o botão na janela.
- **A janela de batalha** abre só nas do jogador, depois da rodada resolvida, e reproduz a
  lista de rounds que a regra produz SEMPRE. Ela não recalcula nada, e um teste de tela
  confere que o último round bate com o que o mapa ficou. A muralha aparece nela como
  modificador visível — o multiplicador escondido que o Codex removeu não voltou pela porta
  dos fundos.

⚠️ **A troca desenterrou três bugs, e nenhum era do cálculo novo.** Eram buracos que a
aniquilação escondia, porque antes era impossível dois exércitos sobrarem de pé no mesmo
lugar: a rodada entrava em LAÇO (onze batalhas numa província numa rodada só); dois invasores
assaltavam a mesma praça no mesmo turno, um tomando e o outro retomando; e o dono mudava no
meio da varredura, com o ex-dono retomando a cidade que acabara de perder. Viraram uma regra:
**não se assalta a muralha com exército inimigo intacto nas costas**, e a província muda de
mão uma vez por rodada.

⚠️ **Consequência de balanço:** o vencedor sai mais forte do que saía com a lei quadrada, e
por isso cidade SEM Muralha cai mais fácil. O contrapeso é que a Muralha passou a valer muito
mais — ser rechaçado de um assalto destrói o exército atacante, o que dá ao cerco sentido de
alternativa em vez de lentidão.

A disciplina que pagou: **a interface foi fixada num passo separado, com o cálculo velho
atrás dela e a suíte verde.** Quando o miolo mudou, dava para saber que o que quebrava era o
cálculo e não a costura — e o bloco da lei quadrada em `adjudicacao.test.ts` gritou, provando
que a troca aconteceu de verdade em vez de ficar atrás de uma bifurcação esquecida.

### O que veio antes: a economia é sobre a TERRA, não sobre cabeças

Henrique: *"tem algo muito errado em como estamos fazendo o sistema de receber dinheiro. Em
Age of History 2 e Rome Total War 1 tem local que rende muito mais dinheiro e com menos
população, e o mesmo ao contrário. Tem números e matemáticas tudo torta."* Ele estava certo, e
a causa foi medida: **a largura dos dials, não a fórmula.**

| dial | faixa que ele tinha |
|---|---|
| população | 3.000 a 35.000 = 11,7× |
| imposto gerado | 8 a 126 = 15,8× |
| produção | 30 a 100 = 3,3× |
| `valor` do produto | 15 a 28 = **1,87×** |

O número que devia carregar a identidade da terra era o mais curto de todos. **População era
o único dial com faixa larga, então ela mandava em tudo** — sem ninguém ter decidido isso.

Quatro defeitos, todos consertados:

1. **O comércio era filho da produção** (`produção × comercioBase`). Corinto, a potência
   comercial grega com o maior `comercioBase` do mapa, tirava **21% da renda do comércio**.
   Agora comércio é POSIÇÃO: `comercioBase × escala`, e uma vila de porto vive do mar.
2. **O produto secundário não rendia nada.** Toda província tem dois produtos autorais com
   nível, e metade da autoria econômica estava desligada da economia.
3. **A faixa de `valor` era 1,87×.** Alargada para 4× — pelo TOPO, não comprimindo a base,
   porque a validação cruzada exige que o principal renda mais que o secundário.
4. **A corrupção só comia o imposto** e tinha um limiar de 10.000 habitantes. Agora come as
   três parcelas e não existe província com corrupção zero — as duas coisas que Henrique
   pediu explicitamente.

E um quinto, que veio de outra correção dele (*"tem que fazer no lugar mais pobre e no mais
rico, não só em Atenas"*): **o preço da obra passou a acompanhar a riqueza da terra.** Preço
fixo contra renda variável deixava a menor potência esperando 17 turnos por uma decisão que a
maior tomava em 3.

Resultado medido, do pobre ao rico e do começo ao fim (`npm run economia`):

- renda vinda da terra: **49% → 71%**
- província menor rendendo mais que uma maior: **11% → 26% dos pares** (Sunião, com 10.000
  habitantes, rende mais que Tebas com 22.000)
- ritmo de decisão dos 18 jogáveis: **3–17 turnos → 4–8 turnos**
- poderes em déficit: **0**; províncias sem corrupção: **0**
- todo poder jogável tem **pelo menos duas obras que se pagam** — antes o mais pobre tinha uma,
  em 500 turnos

⚠️ **Uma tentativa intermediária escalou o preço da obra por POPULAÇÃO e estava errada:** a
produção de uma terra não cresce com o número de habitantes, então cobrar o dobro de quem tem
o dobro de gente mandou o Lagar de Atenas a 700 turnos de retorno. A escala certa é o peso
econômico autoral.

⚠️ **Outra tentativa baixou `impostoPorHabitante` sem mexer na corrupção**, e isso matou a
Ágora: ela alivia uma fração do que se perde, e com o imposto pequeno não sobrava o que
aliviar. Foi o que forçou a corrupção a morder as três parcelas — e foi a melhor consequência
do erro.

Falta Henrique jogar. Ver "O que depende de Henrique" no fim deste arquivo.

### O que veio antes: o mapa abre em paz, e é sair de casa que custa

Henrique fixou (25/08/2026) a ordem até a **0.1.0**: (1) equilibrar os poderes iniciais,
(2) fechar as construções — todo prédio comprável tem que servir AGORA, e o que não tem
função fica escondido até ter, (3) revisar a guerra básica sem inventar vinte tipos de
tropa, (4) comércio, (5) diplomacia, (6) IA. Este é o trabalho (1).

O desequilíbrio não era o que se supunha. Medido: **três poderes abriam em déficit
permanente** — Tebas −42 por turno, Erétria −16, Tanagra −9 — sangrando até o cofre zerar e
o exército desertar, enquanto **Atenas, sem guarnição nenhuma, abria em +702**, 3,4× o
segundo colocado. E os três que sangravam eram justamente os que a autoria fez fortes
militarmente e pobres comercialmente de propósito ("Tebas começa forte e fechada").

A causa era um andaime com folha de pagamento. `exercitos.json` nasceu em 21/08 para haver
contra quem marchar sem IA (duas cidades, 1.000 homens), e cresceu sozinho para onze
cidades e 6.300 homens dentro da autoria da 0.0.4 — porque o arquivo já estava lá e cada
província nova ganhou a sua linha, exatamente como um arquivo-deus se forma.

- **`guarnicoes` está vazio.** O mapa abre em paz, por decisão de Henrique: a economia se
  pensa primeiro em paz (quanto rendo, que construção, vale ir atrás de comércio) e só
  depois em guerra. Tropa embutida respondia isso antes de o jogador escolher. O mecanismo
  continua de pé para cenários; **não repovoar sem ele pedir.** O mapa vira um passeio até
  existir IA, e isso é aceito — a correção disso é a etapa 6, não andaime nos dados.
- **`manutencaoPorHomem` virou duas taxas: `emCasa` (0,1) e `emCampanha` (0,3).** Vale a de
  casa em província do próprio poder, a de campanha em terra alheia, inclusive sitiando.
  Sitiar drena; tomar a província faz a mesma tropa virar guarnição e o custo cair no mesmo
  turno. A comida diz quantos homens você pode ter, o ouro diz por quanto tempo mantê-los
  fora.
- Resultado: **zero poderes em déficit**, e Tebas saiu de último (sangrando) para 7º com
  +171. Os testes de cerco passaram a PLANTAR o defensor de que falam, em vez de herdá-lo
  de um arquivo de dados — o cenário do teste passou a estar inteiro escrito no teste.
- **Milícia deixou de esconder multiplicadores absurdos.** Continua sendo 1,2% da
  população viva, mas Muralha I/II/III agora melhora em +25%/+50%/+75% (antes ×2/×3/×4).
  O ×2 automático de todo assalto foi apagado: o número da ficha é a força realmente
  combatida. Muralha ainda impede assalto imediato e exige dois turnos de preparação.

⚠️ Uma tentativa anterior baixou `manutencaoPorHomem` para 0,1 sem separar casa de campanha.
Os testes pegaram o erro: o teto alimentar de Atenas é 3.000 soldados, e a 0,1 isso custa
300 contra 702 de renda — **o ouro deixaria de ser restrição de exército para sempre.**
Revertido.

O que NÃO se resolve por economia: a razão de renda entre Atenas (702) e Hermíone (91)
continua em 7,7×, e ela é população — por habitante Atenas é a 9ª de 18 e Tebas é a última,
então não há bônus para tirar de Atenas. O que ainda separa os poderes na prática é o RITMO
de decisão: turnos para juntar a construção mais barata vai de 3 a 17, **sem relação com
tamanho**. Isso é trabalho (2), não (1).

Falta Henrique jogar com Atenas, um poder médio e o menor jogável e dizer se cada um tem
decisão de verdade.

### O que veio antes: as Cíclades deixaram de ser nove reinos microscópicos

Henrique escolheu (25/08/2026) corrigir as ilhas antes do equilíbrio político. A costa não
foi redesenhada: o gerador já permite que uma província tenha várias massas de terra.

- As 12 antigas províncias das Cíclades viraram três arquipélagos: **Cíclades do Norte**
  (Andros, Tinos, Míconos, Ceos e Cítnos), **Cíclades Centrais** (Naxos, Paros, Íos e
  Amorgos) e **Cíclades Ocidentais** (Melos, Sifnos e Tera).
- Todas as ilhas continuam desenhadas e clicáveis; clicar em qualquer parte seleciona o
  arquipélago. Não houve pintura manual nem alteração na costa.
- O mapa passou de 205 províncias/148 poderes para **196 províncias/139 poderes**; as
  províncias sem vizinhança terrestre caíram de 35 para 26.
- A paleta dos 139 poderes sobreviventes foi preservada: os antigos ids insulares continuam
  ocupando seus slots de cor na fonte, sem virarem poderes fantasmas.

Falta Henrique olhar o mapa e aprovar visualmente.

### O que veio antes: a faixa de população — o tamanho da província passou a pesar

Henrique reclamou que as populações pareciam número solto ("10.000, 35.000, 20.000, fica
meio no foda-se"). Não eram — cada uma das 25 tem motivo histórico escrito ao lado. O
problema era outro: **o tamanho não importava para a comida.** A régua era relativa (um
nível a cada 25% acima da própria população inicial), então Atenas com 35.000 e Salamina com
3.000 custavam o mesmo ponto, e Argos produzir o dobro de Atenas era irrelevante.

A proposta que ele trouxe do outro chat era melhor que a minha (que era só cosmética, um
nome ao lado do número) e foi essa que entrou, com os cortes medidos contra os dados:

- **Faixa ABSOLUTA de população** em `ajustes.json`: cinco degraus, `custo` explícito, a
  última sem `ate` para pegar o resto. **Não é upgrade de província** — não se compra faixa,
  não há prédio de governo que a suba, não existe punição por não construir; quem faz a
  província evoluir são as construções. Rome 1 foi recusado pelo motivo dele, que é certo:
  Atenas começaria no topo com mais tudo.
- **O nome da faixa é a régua** que a ficha mostra ao lado dos habitantes, e é a MESMA que
  decide o consumo. Um sistema, um trabalho — a minha ideia de faixa só-visual virou
  desnecessária.
- ⚠️ **Os números dele quebravam o turno 1**: cinco dos dezoito poderes jogáveis abriam em
  fome ou travados, Atenas incluída (−4). Os cortes finais saíram de medição, não de números
  redondos.
- **Atenas abre apertada de propósito** (+1, a menor folga do mapa) contra Argos em +8: é a
  Ática populosa e pobre em cereal que os próprios dados descrevem. Tomar Elêusis passou a
  ser pão, e a Fazenda vale 9 mil habitantes a mais em 100 turnos.
- Dois ajustes acompanharam, medidos: `subsistenciaPorReino` 1 → 2 (sem ela Atenas ficava em
  0 e **não conseguia recrutar um único soldado**) e `soldadosPorPonto` 1.000 → 3.000 — este
  porque a faixa tornou a razão soldado:civil mensurável e ela estava em **9,1 civis por
  soldado** (antes da mudança era 35×, invisível). Em 3.000, um soldado come 3 civis.

Simulação: paz de 500 turnos estabiliza em 94.688 habitantes sem um ano de fome (o freio da
escada funciona), Fazenda I leva a 103.556, e nenhum cenário abre em desastre.

Falta Henrique jogar e dizer se o aperto de Atenas está no ponto. Fica em aberto, e é dele:
**o equilíbrio entre poderes** (Caristo com 1 província e 6.000 contra Atenas com 3 e
63.000) — que se resolve agrupando províncias pequenas ou apertando quem é jogável, não pela
faixa.

### O que veio antes: a rede de trocas — bem comercial é ACESSO, não estoque

Henrique trouxe um GDD de outro jogo (*Hegemonia* v0.3) e perguntou o que valia. Vale uma
coisa, e ela foi implementada: **você alcança o mármore ou não alcança**. Sem inventário,
sem caravana, sem preço.

- **Um bem DISTINTO rende uma vez**, por mais terras que o deem. Duas províncias de azeite
  não dobram nada. É o que faz tomar a terra do vinho valer mais do que tomar a segunda
  terra de grão — conquista com valor não-linear, que o jogo não tinha.
- **Circula quem é seu, não está sitiado e chega à capital por terra própria** (mesmo
  `alcanceDe` que a hoste usa). Reino partido não faz um mercado só; Salamina fica de fora
  até existir Porto e mar; sem capital, a rede inteira para.
- O **produto secundário** finalmente serve para alguma coisa — era dado escrito desde
  sempre, esperando a regra de circulação. Continua fora da renda da terra.
- A renda do reino passou a ser `terras + rede`. ⚠️ A tabela do Governo é província a
  província e **não fecha** com esse total: o rodapé soma as terras, o resumo soma o reino,
  e a aba **Mercado** mostra o detalhe — inclusive a lista do que está FORA do alcance, que
  é o mapa do que há para conquistar.
- Valores de `troca` em `dados/economia.json` são iniciais, não definitivos.

Falta Henrique jogar com isso e dizer se o peso da rede está certo.

Guardado do mesmo documento, para quando houver IA e diplomacia: **acordo de grãos** (romper
o acordo é arma de guerra sem disparar flecha). Recusado por ora, com motivo: **estações**
(o próprio documento mostra que elas criaram um bug crítico de colheita), **importação a
preço global** (exige 139 poderes com economia), **famílias e combate em quatro fases**
(desenhados para 15–25 províncias; o nosso mapa tem 196).

### O que veio antes: a dívida arquitetural, paga

Henrique cobrou (24/08, depois do 0.0.4) a única coisa que ele pediu desde o primeiro dia
para não existir: **um arquivo-deus**. `campanha.ts` tinha chegado a 1.942 linhas e
`main.ts` a 1.259. Está feito, com `npm run entregar` verde:

- **`campanha.ts` virou fachada.** Cada regra mora no módulo que a escreve —
  `campanha/turno/`, `alimentacao/`, `sociedade/`, `governo/`, `guerra/`, `provincia/`,
  `estado/` — e recebe um `NucleoDaCampanha` (atlas, economia, catálogo, ajustes, estado,
  territórios, mobilização). As PERGUNTAS ficam em três camadas de `campanha/fachada/`
  (reino, província, guerra) e os COMANDOS em `campanha.ts`. **Só a fachada chama
  `aoMudar`.**
- **`main.ts` virou o ponto de entrada e nada mais** (16 linhas). O boot está em
  `src/aplicacao/`: `iniciar-jogo`, `montar-tela`, `ligar-acoes`, `atualizar-interface`,
  `vistas/`, `cronica-da-rodada`, `salvamento-local`, `inspecao-de-desenvolvimento`.
  O estado de tela (fase, seleção, marcha em composição) virou `SelecaoDaTela`, em vez de
  variáveis livres compartilhadas por acidente de escopo.
- **Mais nove arquivos grandes divididos**: `resolucao.ts`, `esquema.ts`, `mobilizacao.ts`,
  `exercito-ficha.ts`, `provincias-mapa.ts`, `checar.ts`, `pintar-terreno.ts`,
  `hidrologia.ts`, `gerar-mapa.ts`, `gerar-provincias.ts` — e as cinco maiores suítes de
  teste, que agora compartilham `testes/apoio/mundo.ts` em vez de recarregar os dados cada
  uma.
- **A trava é automática** — e foi corrigida depois de reprovar coisa boa. Ela nasceu
  reprovando qualquer arquivo acima de 400 linhas, e chegou a exigir que `ficha-provincia.ts`
  fosse dividido por ter passado de 400 com um campo novo. Henrique cortou a regra pela raiz:
  o defeito é misturar assunto, não acumular linha, e um contador não distingue os dois.
  Hoje `npm run checar` LISTA os arquivos acima de 300 linhas e não reprova nenhum por
  tamanho; a única cerca dura é a das fachadas `main.ts` e `campanha.ts`. Nenhum
  comportamento mudou: os mesmos 301 testes unitários e 32 de tela.
- Único código removido: `Mobilizacao.mover()`, que nenhuma regra chamava — a classe o
  escondia do `knip`, que não olha membro de classe.

### O que veio antes

As três frentes do teste manual de Henrique (24/08) estão CONCLUÍDAS e verdes:

1. **O cerco estrangula.** Cidade sitiada está cortada da mesa: fome local incondicional
   (−1% população, −5% tropas de dentro, por turno) e crescimento zero, independentemente
   do saldo do reino — o caso das 90 rodadas em Mégara (Salamina pagava a conta) tem
   teste de regressão próprio. Fome estrutural continua condicionada ao reino não se
   sustentar nem com as sitiadas livres, e pula as sitiadas.
2. **Balanço bruto por província.** O Governo ganhou colunas de tropa (custo da tropa
   NASCIDA na terra, por origem rastreada) e saldo final; linha no vermelho é marcada
   pelo SALDO. A ficha mostra a tropa de origem no tooltip da renda.
3. **Imposto por níveis no lugar do investimento.** Decreto por província — baixo ×0,8
   (+6 humor), normal, alto ×1,35 (−8 humor) — com efeito imediato na renda e gradual no
   humor; conquista zera o decreto. O investimento foi REMOVIDO (redundante com
   construções, retorno ilegível); referência de régua: Rome: Total War.

A REVISÃO DA ALIMENTAÇÃO (Plano 2 da auditoria, com as 4 correções de Henrique) está
CONCLUÍDA com `npm run entregar` completamente verde (301 testes unitários, 32 de tela,
dados, build):

- duas contas legíveis: saldo civil (povo come primeiro) e saldo final (− exército);
- 4 categorias: Fome (civil<0), Exército sem mantimentos (civil ok, final<0), No limite,
  Abastecido — sem multiplicadores de crescimento por fartura;
- fome civil mata só as províncias DEPENDENTES; sustentadoras nunca morrem; déficit só
  de exército nunca mata civil;
- cidade sitiada FORA da circulação inteira (não contribui, não pesa, não come), com UM
  contador de mantimentos (base + comida da terra); vencido, povo −1% e guarnição −5%
  juntos; cerco não fabrica fome nacional;
- crescimento com trava preventiva tudo-ou-nada ("limitado pela alimentação"): Fazenda
  nunca causa fome (o cenário de 11 anos de fome/10.403 mortos virou regressão com 0/0);
- felicidade alimentar 100% provincial: só quem passa fome é penalizado;
- simulações examinadas (`npm run simular`): Fazenda 0 fome e +15k habitantes; pressão
  militar 0 mortes civis; cerco pune só a cercada, sitiante intacto.

Falta Henrique jogar a regra nova.

### Regras atuais

- comida é um saldo anual inteiro do reino, sem estoque ou deterioração;
- a conta soma subsistência, níveis de alimentos e construções alimentares, e desconta
  níveis populacionais e o exército mobilizado;
- saldo negativo causa fome; zero trava o crescimento; sobras maiores aceleram o
  crescimento;
- cada província tem quatro slots de construção e cada edifício pode chegar ao nível III;
- construções universais convivem com construções liberadas pelo produto local ou por
  ancoradouro;
- recrutamento é uma ação básica; Quartel não é requisito e seu bônus de qualidade fica
  para um trabalho futuro;
- falta de ouro causa deserção e devolve homens às origens;
- fome causa mortes e não devolve população; quando o déficit é obra de cercos (a conta
  fecharia com as terras sitiadas livres), a fome mata dentro da cidade sitiada — o resto
  do reino só para de crescer;
- valores de balanceamento vivem em `dados/ajustes.json`.

### Estado do trabalho

- as seis etapas da sequência estão CONCLUÍDAS e entregues na 0.0.4; a dívida arquitetural
  que elas acumularam foi paga logo depois, sem mudar comportamento nenhum;
- o código está dividido: 259 arquivos, o maior com 367 linhas, nenhum arquivo-deus;
- pendências de Henrique: jogar a regra alimentar nova, o ritmo do cerco, o decreto de
  imposto e as colunas do Governo;
- custos e efeitos das construções são números iniciais, não balanceamento definitivo;
- a revisão das tooltips do jogo inteiro continua pendente, anunciada por Henrique.

### Fora deste trabalho

Não implementar agora mercado por conexões, comércio internacional, preços regionais,
nacionalidade funcional, migração, bônus real de qualidade do Quartel, IA ou naval.

## O que depende de Henrique testar

Nenhum número abaixo foi jogado — todos foram medidos por simulação, e simulação não sente.

1. **A economia nova, com três poderes de tamanhos diferentes.** Atenas (732/turno, 3
   províncias), Tanagra (144, média e pobre de comércio) e Hermíone (135, a menor). A pergunta
   é se cada uma tem decisão de verdade nos primeiros vinte turnos, não se o número fecha.
2. **Se a corrupção morde forte demais.** Ela passou a comer as três parcelas, e Atenas perde
   32% de tudo. É freio de império, mas pode estar apertado.
3. **Se o ritmo de 4 a 8 turnos por decisão é bom de jogar.** Pode estar rápido demais para o
   rico ou lento demais para todos.
4. **O tesouro inicial em 3.500.** Ele subiu de 3.000 porque Atenas não conseguia erguer a
   própria Ágora no turno 1 e o jogo abria com uma espera. Para os pequenos, 3.500 são três
   obras de uma vez — pode ser cedo demais.
5. **O Quartel escondido.** Ele volta com o combate; até lá o catálogo tem um prédio a menos.
6. **A folha militar casa/campanha** e o mapa que abre em paz — pendências da sessão anterior
   que continuam de pé.

## Como trabalhar

- Faça a menor alteração que complete o objetivo atual.
- **Um arquivo, um assunto — e assunto não se mede em linhas.** Arquivo-deus é MISTURA DE
  RESPONSABILIDADES: um `comercio.ts` com comércio, IA, mapa e combate está errado com 200
  linhas, enquanto `provincias.json` com 196 províncias está certo com milhares. Divida
  quando o arquivo reunir assuntos independentes, ou quando um pedaço puder existir, ser
  testado e evoluir sozinho. **Nunca divida para baixar um contador** — e nunca crie um
  arquivo por província. Dados, catálogos, esquemas, suítes de teste e componentes coesos
  podem ser grandes.
- `npm run checar` lista os arquivos acima de 300 linhas como AVISO, para você olhar; ele não
  reprova por tamanho. As duas exceções são `main.ts` e `campanha.ts`, que têm teto próprio e
  **não recebem regra nova**: são fachadas, e ali crescer é o defeito. Mecânica nova nasce em
  módulo próprio; levantar o teto deles não é a correção, mover a regra é.
- Não implemente uma ideia futura só porque ela parece relacionada.
- Preserve mudanças existentes no worktree.
- Claude e Codex não editam simultaneamente os mesmos arquivos. Trabalho paralelo real
  exige áreas separadas ou worktrees.
- Números ajustáveis ficam nos JSON; testes protegem relações e fórmulas, não valores de
  balanceamento que podem mudar legitimamente.
- **Meça no lugar mais pobre E no mais rico, nunca só em Atenas.** Regra de Henrique, e ela
  nasceu de um erro real: a Ágora foi consertada medindo em Atenas e continuava armadilha em
  metade do mapa. `npm run economia` faz esse corte sozinho — do poder mais pobre ao mais
  rico, cedo, meio e fim de jogo. Rode depois de mexer em QUALQUER número de economia.
- **Ao mexer num dial, confira a largura dele contra os outros.** Um número que varia 1,87×
  no mapa não decide nada quando outro varia 11,7× — foi assim que população passou a mandar
  na economia inteira sem ninguém escolher isso.
- Testes de tela são para UI, DOM, CSS e interação. Ao falharem, leia a lista completa
  antes de corrigir.
- Refatore apenas quando a tarefa exigir, quando houver risco concreto, ou quando a trava de
  tamanho apontar um arquivo crescendo demais.
- Chame revisor somente leitura apenas quando Henrique pedir uma revisão sob demanda;
  implementação e correções continuam com o agente principal.
- Pesquise referências externas somente quando Henrique pedir ou quando faltar confiança
  factual; decisão estrutural continua pertencendo a Henrique.
- Ao concluir, atualize este arquivo e `ESTADO_DO_JOGO.md`. Altere `GDD.md` somente quando a
  visão do jogo mudar.

## Conclusão do trabalho atual

O trabalho termina quando o comportamento funciona, testes relevantes passam, não há
regressão bloqueante conhecida, Henrique testa manualmente e aprova. Depois disso, pare e
espere Henrique escolher o próximo objetivo.
