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

A relação, o presente, o pacto, o acordo de comércio e o **tributo** já existem — a lista de
vizinhos virou mesa de negociação.

**O trabalho autorizado agora é FECHAR O BALANÇO DO TRIBUTO**, e ele está aberto de propósito.
A mecânica funciona e está medida, mas o número que decide se ela fica como está é de Henrique:

- sem tributo: 12 províncias trocando de dono em 100 turnos, 6 poderes eliminados de 18;
- com tributo, hoje: 25 e 7, com a desigualdade final em 3,2× contra 12,4× da linha de base.

⚠️ **Uma configuração não é uma medição.** Rodar `npm run partida 100` com `turnosDePremio`
(hoje 6) e `fracaoDaRenda` dos prazos em valores vizinhos antes de concluir qualquer coisa — este
mesmo dial já deu 41 conquistas em 20 e 25 em 6, e a resposta é caótica.

A pergunta de desenho que sobra, e é de Henrique: **o mapa no turno 100 deve ter poucos impérios
grandes ou vários reinos ainda de pé?** O tributo empurra para o primeiro.

Depois disso, a próxima peça natural é a **aliança**, que é o topo da régua: acima de +45 ainda
não há nada a comprar.

⚠️ **Cuidado ao mexer nos números da IA sem medir.** A resposta é caótica: uma conquista cedo
vira bola de neve, e andar na mesma direção de um dial já deu 20 conquistas numa configuração e
105 na vizinha. `npm run partida 100` é barato e é o corte.

Não começar espionagem, naval, migração, governadores, vassalagem ou suserania sem uma nova
decisão de Henrique. **A IA não EXIGE tributo nem rompe o que recebe** — as duas coisas foram
deixadas de fora de propósito e são decisão nova.

## O que depende de Henrique testar

- o aperto alimentar de Atenas e a nova regra de fome;
- economia e ritmo das construções em um poder rico, um médio e um pequeno;
- força prática da corrupção e dos decretos de imposto;
- quatro armas, muralhas, cerco, recuo e folha militar dentro e fora de casa;
- utilidade das abas de Alimentação e Mercado no Governo;
- aparência dos três arquipélagos das Cíclades;
- comportamento da IA, especialmente defesa e ataque;
- **o tributo jogando**: a parcela dói o suficiente? o prazo longo é tentador ou é armadilha?
  comprar a saída de uma guerra perdida chega a tempo de salvar a partida?
- **a mesa de diplomacia**: os dois cartões dizem o que precisam dizer? a régua com a linha do
  vizinho dá escala ao número da opinião? a resposta antes do clique tira ou põe graça?

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
