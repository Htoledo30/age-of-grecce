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

### Agora: a rede de trocas — bem comercial é ACESSO, não estoque

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
preço global** (exige 148 poderes com economia), **famílias e combate em quatro fases**
(desenhados para 15–25 províncias; o nosso mapa tem 205).

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
- **A trava é automática.** `npm run checar` reprova qualquer arquivo `.ts`/`.css` acima de
  400 linhas e avisa a partir de 300; `campanha.ts` e `main.ts` têm teto próprio, mais
  apertado. Nenhum comportamento mudou: os mesmos 301 testes unitários e 32 de tela.
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
- o código está dividido: 251 arquivos, o maior com 387 linhas, nenhum arquivo-deus;
- pendências de Henrique: jogar a regra alimentar nova, o ritmo do cerco, o decreto de
  imposto e as colunas do Governo;
- custos e efeitos das construções são números iniciais, não balanceamento definitivo;
- a revisão das tooltips do jogo inteiro continua pendente, anunciada por Henrique.

### Fora deste trabalho

Não implementar agora mercado por conexões, comércio internacional, preços regionais,
nacionalidade funcional, migração, bônus real de qualidade do Quartel, IA ou naval.

## Como trabalhar

- Faça a menor alteração que complete o objetivo atual.
- **Um arquivo, um assunto.** Nenhum arquivo passa de 400 linhas — `npm run checar` reprova.
  Arquivo com muitas utilidades vira uma PASTA com o nome dele, e cada função no seu
  arquivo. `campanha.ts` e `main.ts` têm teto próprio e **não recebem regra nova**: mecânica
  nova nasce em módulo próprio. Levantar o número não é a correção; mover a regra é.
- Não implemente uma ideia futura só porque ela parece relacionada.
- Preserve mudanças existentes no worktree.
- Claude e Codex não editam simultaneamente os mesmos arquivos. Trabalho paralelo real
  exige áreas separadas ou worktrees.
- Números ajustáveis ficam nos JSON; testes protegem relações e fórmulas, não valores de
  balanceamento que podem mudar legitimamente.
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
