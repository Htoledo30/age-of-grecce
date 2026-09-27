# Pendências — o que Henrique pediu, o que já foi feito e o que falta

Arquivo pedido por Henrique em 26/09/2026 para as próximas conversas não se perderem. Ele é a
exceção à regra do `AGENTS.md` sobre documentos de acompanhamento: mantenha-o curto e atual —
risque o que for resolvido, acrescente o que Henrique pedir. Bugs novos que ele encontrar
jogando entram em `revisoes feitas por henrique.txt`; daqui para lá não se copia nada.

## O norte do jogo

> "Nosso jogo tem que ser nada mais e nada menos que um jogo de CONQUISTA, o resto são bônus
> que ajudam nesse objetivo! O foco máximo deve ser em trazer ao player o tesão de querer ter
> um reino enorme!" — Henrique

Sem complexidade de Victoria 3 ou Crusader Kings 3. Revolta, diplomacia e economia existem
para servir à conquista, não para ocupar o jogador.

## Feito (25–26/09/2026)

| assunto | o que mudou | commit |
|---|---|---|
| Ícone de comida | espigas de trigo douradas na barra, no mesmo estilo da moeda | ver `git log` |
| Trabalho de setembro só nesta máquina | salvo no GitHub | `752fc3f` |
| População | cresce pela PROSPERIDADE de cada província: taxa base 0,1%/turno, cada obra de riqueza ou civil soma 0,05/0,10/0,15 p.p. | `3642ce9` |
| Comida | 1.000 soldados por ponto (mudança de Henrique no F2) | `752fc3f` |
| Ouro compra comida | grão importado na aba Alimentação; Porto e Mercado abrem a porta; o ponto n custa n × 50/turno; bloqueio corta | `37207db` |
| Cofre da IA parado | a IA transforma cofre cheio (acima de 20 turnos de renda) em exército | `dbb165e` |
| Soldo em casa | fica 0,15 por decisão de Henrique | `dbb165e` |
| IA desistia da guerra no turno em que declarava | paz agora pergunta "ainda há o que tomar?", não "posso começar?" | `710d84f` |
| Atacante entrava na província sem conquistar | ordem de marcha reconferida na virada; aliados não tomam cidade um do outro; reforço distante não cancela assalto | `d44ebc6` |
| Todo mundo ataca o jogador | a IA pede paz ao jogador na mesa quando a assinaria com outro computador | `d44ebc6` |
| Revoltas eternas | fase crítica de 20 turnos após a conquista; depois, revolta só no fundo da régua (fome, cofre vazio, povo conquistado demais, cerco, confisco) | `cbe9565` |
| Etnia | assimilação: 1%/turno (2% na mesma tribo) da população estrangeira vira do dono, se a terra estiver em paz e contente | `cbe9565` |
| Atenas voltou depois da derrota | derrota do jogador é definitiva; a revolta na terra dele cria um reino novo | `cbe9565` |
| Visual do cerco | sitiante sempre na divisa, borda tracejada cor de fogo e chama no canto | `99fca85` |
| Diplomacia sem resposta antecipada | decisão de Henrique (A): a resposta só vem depois da proposta; a recusa diz o que faltou; mensagens curtas | ver `git log` |
| Painel da província e cores | sem texto explicativo; dinheiro sempre ouro, humor bom verde, perda vermelho sangue | ver `git log` |
| Status das armas | lanças cruzadas (ataque), hóplon espartano (defesa) e trigo (comida), inteiros com o leve = 10 | ver `git log` |
| Janela de Recrutar | só quantos e quanto: cartões com a arte da casa de cada arma, número grande, custo com a dracma; comida só quando falta | ver `git log` |
| Cores foscas | ouro velho, pátina e óxido no lugar de amarelo, menta e salmão; dracma da barra em toda tela de ouro | ver `git log` |
| Catálogo de Construções | agrupado por família, com a vinheta de cada obra, efeito numa frase e preço com moeda | ver `git log` |
| Retoque visual | convenção de cores (ouro amarelo, ganho verde, perda vermelha, rótulo em marfim) na barra, no painel, no Governo, em Construções e em Recrutar; textos pequenos subiram (11/12/14px); tamanhos soltos de Construções viraram régua; Guerra deixou de ser vermelha; custo da leva sempre visível | ver `git log` |

## Decisões esperando Henrique

- **(a)** Exército acampado em terra do inimigo quando a paz é assinada: proposta — volta para
  casa sozinho. Hoje pode ficar preso para sempre.
- **(b)** Exército de um reino anexado pela liga: proposta — passa para o chefe da liga. Hoje
  fica abandonado dentro da antiga capital, morrendo aos poucos.
- **Tamanho do mapa:** só 25 das 196 províncias têm economia e população. "Um reino enorme" e
  "200 mil de ouro só com ~100 províncias" dependem de simular mais terra (trabalho de dados).
- **Preço das construções escala com a riqueza da província** (Mercado 3.065 em Atenas, 942 em
  Hermíone). É proposital; Henrique ainda não disse se gosta.
- **Quanto cortar da renda:** esperar Henrique jogar com o grão e a IA gastando o cofre.

## Frentes grandes em aberto (ordem sugerida)

1. **Jogar uma partida** com tudo o que mudou e anotar em `revisoes feitas por henrique.txt`.
2. **Renda menor** — "com 20 províncias em 200 rodadas já tem dinheiro demais".
3. **Diplomacia** — hoje é "um checklist do que cumprir, não uma negociação".
4. **Construções** — "bufar ou servir para outra coisa além de ouro". Parcial: crescimento e
   grão já entraram; a maior parte ainda só rende ouro.
5. **Textos e notificações** — "ainda existem muitas frases de efeito ridículas". Proposta:
   levantar todas as frases da tela num arquivo para Henrique riscar.
6. **Interface** em geral.
7. **Combate** — "está legal, mas dá para ficar foda".
8. **Rejogabilidade** — forma de governo, ou bônus e personalidade por reino (hoje só há os
   estilos guerreiro, mercador, cauteloso e equilibrado).

## Problemas conhecidos, medidos e ainda não tratados

- **Atenas é o alvo mais valioso do mapa e começa sem exército.** Os quatro vizinhos guerreiros
  declaram guerra com empate de forças (`vantagemParaDeclarar` 1,0) e quase qualquer opinião
  (`relacaoParaDeclarar` 16). Cada declaração arrasta os aliados de quem declara.
- **Acordos travam o mapa:** depois do turno 100, em mais da metade dos turnos em paz de um reino
  todos os vizinhos estão cobertos por trégua, pacto, tributo, aliança ou liga.
- **Um cerco só por província:** dois co-beligerantes sobre a mesma cidade — o segundo fica sem
  cerco. A postura continua compartilhada por destino (`posturas.ts`).
- **Visual ainda por fazer:** a janela de Diplomacia (letras pequenas e textos que explicam
  demais); Alegreya Sans parece menor que os números em Inter no mesmo tamanho — a saída de
  fundo é `font-size-adjust` na fonte de corpo, com uma passada do `medir-tamanho`; a cor da
  província selecionada no mapa fica marrom e apagada.
- **Recrutar diz "falta Acampamento de arqueiro"** onde a obra nem existe no catálogo (exige
  Madeira ou Cavalos): o motivo devia dizer o requisito da terra.
- **Notas antigas não conferidas:** o travamento ao abrir o movimento com Porto e o cálculo de
  todas as rotas possíveis (de `revisoes feitas por henrique.txt`, antes de setembro).
