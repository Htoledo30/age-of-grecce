# Age of Grecce — instruções de trabalho

Este é o único arquivo obrigatório antes de começar uma tarefa. Leia `ESTADO_DO_JOGO.md` para
entender o que funciona e consulte somente a seção relevante de `GDD.md` quando a tarefa mexer
na visão ou em direção futura.

O projeto está na versão de desenvolvimento `0.2.0`. A campanha mínima ficou para trás; trate o
jogo como um conjunto de sistemas já integrados, não como protótipo descartável.

O Git guarda a história. Não crie roadmap, backlog, changelog, diário de decisões ou outro
documento de acompanhamento.

## Duas máquinas, um repositório

Henrique trabalha num notebook e num desktop. O repositório privado
`https://github.com/Htoledo30/age-of-grecce` é o ponto de encontro entre as duas máquinas.

### Agente principal

Estas obrigações pertencem somente ao agente principal da sessão — Claude Code principal ou Codex quando ele recebeu diretamente a tarefa.

O agente principal deve:

1. rodar `git pull` antes de começar;
2. preservar alterações locais que não pertençam à tarefa;
3. trabalhar somente nos arquivos necessários;
4. executar as verificações exigidas pelo projeto;
5. fazer commit e `git push` ao terminar;
6. avisar se restar trabalho próprio não enviado.

Se houver conflito no `git pull`, não escolha um lado sozinho.

Mostre o que cada máquina alterou no mesmo arquivo e peça a decisão de Henrique quando o conflito não puder ser resolvido de forma puramente técnica e segura.

### Subagents do Claude Code

Subagents trabalham subordinados ao Claude principal e não controlam o repositório.

Subagents nunca devem:

* executar `git pull`;
* executar `git commit`;
* executar `git push`;
* trocar branch;
* executar `git checkout`;
* executar `git switch`;
* executar `git reset`;
* executar `git rebase`;
* executar `git merge`;
* resolver conflitos;
* editar código, dados ou outros arquivos versionados do projeto.

Subagents podem:

* ler arquivos;
* usar `git status`, `git diff`, `git log` e outros comandos Git somente de leitura;
* executar testes;
* executar medições;
* executar simulações;
* gerar artefatos temporários necessários para testes;
* devolver diagnósticos e recomendações ao Claude principal.

Quando um subagent possuir acesso a Bash, Bash deve ser usado somente para investigação, testes, medições, simulações e comandos de leitura.

Subagents não devem usar Bash para modificar arquivos versionados, incluindo redirecionamentos para arquivos, `sed -i`, scripts de reescrita ou mecanismos equivalentes.

O Claude principal é responsável por decidir e executar a alteração final.

## Fontes de verdade

- comportamento atual: código e testes;
- fotografia implementada: `ESTADO_DO_JOGO.md`;
- visão e decisões futuras: `GDD.md`;
- trabalho autorizado agora: pedido de Henrique e este arquivo;
- mudança de direção: Henrique.

Se documento e código discordarem sobre o que existe, o código vence e o Estado deve ser
corrigido. Se a visão mudar, atualize o GDD e remova a versão antiga da ideia. Não acrescente a
história da alteração aos documentos: o Git já a guarda.

## Quando perguntar

Quando faltar uma decisão que muda o jogo, não adivinhe. Faça uma pergunta por vez e explique
o efeito de cada resposta.

- Use palavras que aparecem no jogo. Diga “chefe da liga”, não jargão inventado.
- Explique a consequência concreta: “dominar vira conquista mais barata” comunica melhor que
  uma descrição de arquitetura.
- Use Atenas, Mégara, Argos e números reais quando ajudarem. `npm run partida`,
  `npm run economia` e pequenos scripts de medição são baratos.
- Não pergunte sobre convenções óbvias ou fatos que o código responde.

## Estado de trabalho

Economia provincial, alimentação, construções, capital, corrupção, felicidade, revoltas,
guerra terrestre, mar, diplomacia, comércio, tributo, acesso militar, aliança, liga, save/load,
áudio e IA econômica, defensiva, ofensiva, naval e diplomática já existem. O resumo fica em
`ESTADO_DO_JOGO.md`.

Não trate sistemas implementados como planos futuros. Em especial:

- a campanha já tem seleção, vitória, derrota e continuação;
- comércio externo já rende aos dois lados e confere a rota todo turno;
- a IA já constrói, planeja comida, recruta, ataca, defende, navega e negocia;
- diplomacia já tem presente, pacto, comércio, tributo, acesso, aliança e liga;
- o mar tem 48 zonas, embarque por Porto, desembarque, interceptação e bloqueio;
- a Muralha exige 2/3/4 rodadas, o Templo recupera ordem e a Estrada reduz a folha local;
- terra do próprio povo no fundo da régua de humor declara INDEPENDÊNCIA: nasce um reino com o
  nome da província, cor no mapa e opinião própria. `Atlas.poderes` é lista viva e o estado
  carrega `poderesNascidos`; o salvamento os registra antes de validar.

Não comece espionagem, migração, governadores, desgaste naval ou escolta de rota
sem nova decisão de Henrique. A IA não exige tributo e não rompe o tributo que recebe por
decisão atual.

## Balanço atual

As fases da campanha são:

- início: turnos 1–79;
- meio: 80–150;
- fim: depois de 150.

O alvo é que no turno 100 alguns impérios já estejam aparecendo, sem reino imenso nem mapa
consolidado. Simulação mede regressão e relação entre sistemas; não substitui a sensação da
partida.

Não grave resultados de uma simulação como se fossem permanentes. Depois de qualquer alteração
de balanço, rode a ferramenta correspondente e use a saída atual:

- economia ou construções: `npm run economia`, do poder mais pobre ao mais rico;
- combate: `npm run armas`, que inclui ouro, comida e população;
- IA e campanha: `npm run partida 100` ou várias sementes quando o assunto for naval;
- diplomacia: `npm run medir-diplomacia` para a tela e `npm run medir-balanca` para contar os
  pares que passam por cada acordo e prazo.

A resposta da IA a um dial é caótica: uma conquista cedo vira bola de neve. Compare cenários e
nunca conclua por uma única partida quando a área tiver grande variância.

`alimento.subsistenciaPorReino` é 1 por decisão de Henrique, e isso faz da Fazenda a primeira
obra da partida: Atenas abre com saldo alimentar ZERO, não cresce um habitante sem comida nova e
não sustenta um soldado — um ponto alimenta 1.000 homens e não há ponto sobrando. Testes que só
precisam de tropa usam `ajustesFartos`, que neutraliza a comida pelos dois lados.

A infantaria leve sobrevive por 0,85%: o estilo `barata` compara `ataque × aguento ÷ custo²`, e
leve dá 1,0000 contra 0,9915 do hoplita com ataque 1,1 e custo 1,29. Subir o ataque do hoplita
sem encarecer o soldado mata a leve, e encarecer o QUARTEL não resolve — a conta olha o preço do
soldado. `limiarDeQuebra` fica em 0,70: em 0,75 a linha aguenta uma rodada a mais e a cavalaria
derrotada é aniquilada até o último homem, sozinha entre as armas.

`combate.manutencaoPorHomem.emCasa` fica em 0,15 por decisão de Henrique, com a comida a 1.000
soldados por ponto. A medição antiga, com a comida a 500, mostra o peso deste valor: em 0,15
o mapa ia a 9 poderes eliminados de 18, maior reino com 8 províncias e desigualdade 11,8×; em
0,10, a 5, 5 e 7,2×. O soldo em casa é um imposto sobre o fraco — quem
tem pouca renda deixa de bancar defensor e é comido. Foi o ÚNICO dos cinco valores de combate
que mexeu no resultado: hoplita, cavalaria e rodadas de choque não mudaram nada, e a letalidade
da perseguição só mexe na desigualdade quando o soldo já está em 0,10.

⚠️ Ao isolar balanço, varie um grupo por vez em `dados/*.json` e compare com `npm run partida
100`: ele é determinístico, então duas variantes são comparáveis sem repetição. E as
interações dominam — as construções novas MELHORAM o mapa quando o soldo está alto e o pioram
quando ele está baixo, então nunca conclua por um grupo isolado sem conferir a combinação.

Só a faixa mais baixa de humor arma o próprio povo. Medido em Maratona: alvo 53, Confisco leva a
33, a guerra do reino a 27, e só o cerco cruza para 12. Confisco sozinho não custa província a
ninguém.

Humor multiplica a renda inteira da província; imposto incide apenas sobre a parcela fiscal.
Qualquer alavanca paga em humor precisa comparar os dois lados, senão pode prometer mais imposto
e entregar menos renda.

## O que ainda depende do olho de Henrique

- aperto alimentar de Atenas e o valor de 1.000 soldados por ponto;
- economia e construções em poder rico, médio e pequeno;
- corrupção, impostos, confisco, felicidade e revoltas jogando;
- quatro armas, muralhas, cerco, recuo e manutenção em casa e campanha;
- utilidade das abas Alimentação e Mercado;
- arquipélagos, cores, nomes e modos do mapa;
- tamanhos de interface 90%, 100%, 115% e 130%;
- comportamento da IA, especialmente ataque, defesa e guerra naval;
- tributo, acesso, alianças, propostas e ligas dos dois lados da mesa;
- viagem, desembarque, interceptação e bloqueio no mar;
- painel da província, recrutamento, construções e janela de batalha;
- nacionalidade conquistada em terra da mesma tribo e de outra tribo;
- editor F2 gravando os dados durante uma sessão real.

Não abra uma frente nova só porque ela aparece nesta lista. Pergunte antes quando a resposta do
jogador for necessária para escolher a direção.

## Interface e escala

`Opções > Tamanho da interface` usa 90%, 100%, 115% e 130%. O palco muda de tamanho lógico e o
`zoom` redesenha o layout; nunca use `transform: scale()`.

Regras permanentes para UI:

- quem precisa do tamanho pergunta `larguraDoPalco()` e `alturaDoPalco()` em
  `src/estilo/escala.ts`; não espalhe a dimensão-base pelo código;
- dentro do palco, não use `100vw` nem `100vh`; use `var(--palco-largura)` e
  `var(--palco-altura)`;
- recuos de painel usam `@container palco (...)`, não `@media` baseado na janela;
- uma consulta de contenedor composta usa `((A) or (B))`, sem lista separada por vírgula;
- depois de mexer em janela ou painel, rode `npm run medir-tamanho`;
- ao julgar tipografia, capture numa janela cuja altura útil não esconda o efeito da escala.

A interface mostra números e estados; não ensina o jogo em cada painel. Evite definição ao lado
do rótulo, conta pronta do jogador e instrução de manuseio. Quando algo for impossível, bloqueie
e diga o motivo em poucas palavras.

O glifo `ê` da Cormorant Garamond tem circunflexo deslocado nessa face. É defeito da fonte, não
fallback nem erro de posicionamento.

## Dados e editor

Números ajustáveis vivem em `dados/*.json`. O editor F2 grava nesses arquivos durante
`npm run dev` por `ferramentas/vite-gravar-balanco.ts`. Alterações salvas aparecem no Git como
qualquer outra edição.

Testes protegem relações e fórmulas, não valores de balanceamento que podem mudar. Ao mexer num
dial, compare a largura dele com a dos outros; um número de faixa curta não governa o sistema se
outro varia dez vezes mais.

Teste que não é sobre alimentação usa `novaCampanhaFarta`, de `testes/apoio/mundo.ts`. Teste de
comida usa `novaCampanha` e os números reais. Isso impede que uma mudança alimentar transforme
testes de cerco, diplomacia ou movimento em testes de fome acidentalmente.

## Como trabalhar

- Faça a menor alteração que complete o objetivo atual.
- Preserve mudanças existentes no worktree.
- Claude e Codex não editam simultaneamente os mesmos arquivos; trabalho paralelo real exige
  áreas separadas ou worktrees.
- Não implemente ideia futura apenas porque ela parece relacionada.
- Use `rg` ou `rg --files` para procurar texto e arquivos.
- Testes de tela servem a UI, DOM, CSS e interação. Leia a lista completa de falhas antes de
  corrigir.
- Pesquise referências externas quando Henrique pedir ou quando faltar confiança factual.
- Peça revisão adicional somente sob demanda ou em mudança grande de combate, economia ou
  matemática.

## Coesão do código

Um arquivo deve ter um assunto. Tamanho é alerta, não regra: catálogo coeso pode ser grande;
arquivo pequeno que mistura comércio, IA, mapa e combate já está errado.

Nunca divida apenas para baixar contador e nunca crie um arquivo por província. `npm run checar`
lista arquivos acima de 300 linhas para inspeção, mas não reprova por tamanho. `src/main.ts` e
`src/campanha/campanha.ts` são fachadas e não recebem regras novas.

## Entrega

Use verificações proporcionais durante o trabalho e encerre com:

1. `npm run verificar`;
2. `npm run teste-tela`;
3. `npm run build`;
4. bancos específicos quando a área exigir: `npm run economia`, `npm run armas`,
   `npm run simular`, `npm run partida`, `npm run medir-diplomacia`, `npm run medir-balanca` ou
   `npm run medir-tamanho`.

`npm run entregar` reúne verificação, tela e build.

Ao concluir, atualize `ESTADO_DO_JOGO.md` somente se o comportamento mudou. Altere `GDD.md`
somente quando a visão mudar e este arquivo somente quando as instruções de trabalho mudarem.
