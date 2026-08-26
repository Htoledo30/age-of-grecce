# Age of Grecce — trabalho atual

Este é o único arquivo obrigatório antes de começar uma tarefa. Leia
`ESTADO_DO_JOGO.md` quando precisar entender o que já funciona. Consulte somente a seção
relevante de `GDD.md` quando a tarefa envolver design ou direção futura.

O Git guarda o histórico. Não criar roadmap, backlog, changelog, diário de decisões ou
outro documento de acompanhamento.

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
capital, a corrupção, a felicidade, as revoltas, a guerra terrestre e a IA econômica,
defensiva e **ofensiva** já existem. O resumo completo está em `ESTADO_DO_JOGO.md`.

A IA ataca, reage e desiste; a diplomacia básica existe. O ritmo dela vive em `dados/ia.json`
(`fracaoQueMarcha`, `sobraMinima`, `valorDaCapital`, `vantagemParaDeclarar`, `guerraLonga`,
`defesaAmeacada`) e é balanço, não código: mexer nele é editar JSON e rodar `npm run partida`.

**O trabalho autorizado agora é a RELAÇÃO entre os reinos**, decidida por Henrique: um número
de −100 a +100 por par de poderes, que sobe e desce com o que cada um faz, e que passa a decidir
o que hoje é decidido por uma conta militar seca — se a paz é aceita, se a guerra é declarada e,
depois, se uma aliança ou um tributo fazem sentido. É o que transforma a lista de vizinhos numa
mesa de negociação.

⚠️ **Cuidado ao mexer nos números da IA sem medir.** A resposta é caótica: uma conquista cedo
vira bola de neve, e andar na mesma direção de um dial já deu 20 conquistas numa configuração e
105 na vizinha. `npm run partida 100` é barato e é o corte.

Não começar comércio internacional, diplomacia, espionagem, naval, migração ou governadores
sem uma nova decisão de Henrique.

## O que depende de Henrique testar

- o aperto alimentar de Atenas e a nova regra de fome;
- economia e ritmo das construções em um poder rico, um médio e um pequeno;
- força prática da corrupção e dos decretos de imposto;
- quatro armas, muralhas, cerco, recuo e folha militar dentro e fora de casa;
- utilidade das abas de Alimentação e Mercado no Governo;
- aparência dos três arquipélagos das Cíclades;
- comportamento da IA, especialmente defesa e ataque.

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
