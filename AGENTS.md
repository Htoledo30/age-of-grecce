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

### Objetivo da etapa atual

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

- alimentação e construções estão implementadas, auditadas e verdes (260 testes unitários,
  29 de tela); a fome tem dois regimes (a do cerco mata dentro da cidade sitiada; a
  estrutural cobra o reino inteiro) e a cidade sitiada recruta normalmente;
- a sequência acima está começando pela etapa 1;
- pendências de Henrique acumuladas para quando acordar: retestar o ritmo novo do cerco e
  revisar o que as etapas produzirem;
- custos e efeitos das construções são números iniciais, não balanceamento definitivo.

### Fora deste trabalho

Não implementar agora mercado por conexões, comércio internacional, preços regionais,
nacionalidade funcional, migração, bônus real de qualidade do Quartel, IA ou naval.

## Como trabalhar

- Faça a menor alteração que complete o objetivo atual.
- Não implemente uma ideia futura só porque ela parece relacionada.
- Preserve mudanças existentes no worktree.
- Claude e Codex não editam simultaneamente os mesmos arquivos. Trabalho paralelo real
  exige áreas separadas ou worktrees.
- Números ajustáveis ficam nos JSON; testes protegem relações e fórmulas, não valores de
  balanceamento que podem mudar legitimamente.
- Testes de tela são para UI, DOM, CSS e interação. Ao falharem, leia a lista completa
  antes de corrigir.
- Refatore apenas quando a tarefa exigir ou quando houver risco concreto.
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
