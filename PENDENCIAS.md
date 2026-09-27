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

## Feito (25–27/09/2026)

| assunto | o que mudou | commit |
|---|---|---|
| Fazenda igual à Pastagem | Fazenda +1/+3/+5 por nível (Pastagem e Porto pesqueiro seguem +1/+2/+3), escolha de Henrique; no nível I nada muda, então o mapa da IA fica igual | ver `git log` |
| Mina e pedreira sem custo social | Mina e Pedreira tiram 2/3/4 do humor da província; Serraria 1/2/3. Medido: o mapa no turno 100 não mudou | ver `git log` |
| Janela de Diplomacia | textos curtos ("Propõe uma ALIANÇA.", "Reputação: limpa", "Pedido"/"Propostas"); letra da lista, da sanfona e das opções em 14px; opinião em verde/vermelho, nunca bronze; a sanfona cabe inteira; em guerra a paz não fica sozinha no pé; "Você paga" trocado para "Ele paga" na liga que você lidera | ver `git log` |
| Aliança com prazo | aliança não vence mais: dura até romper ou a opinião cair abaixo de −10; a crônica avisa quando ela se desfaz | ver `git log` |
| Proposta chegava sem aviso | cartão embaixo da crônica para cada pedido recebido; clicar abre a mesa com quem pediu | ver `git log` |
| Pedidos demais | o mesmo reino só repete o mesmo pedido 10 turnos depois de recusado ou ignorado | ver `git log` |
| Exército preso depois da paz | a paz manda cada hoste para a terra própria mais próxima | `5a7df0b` |
| Exército do membro anexado | passa para o chefe da liga | `5a7df0b` |
| Recrutar "falta Acampamento" | diz "exige Madeira" / "exige Cavalos" quando a terra não tem o recurso | `5a7df0b` |
| Golfo Sarônico comprido demais | separado do Mar de Sunião na ponta da Ática; alcançar a costa oriental exige outra zona | ver `git log` |
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

- **Aliança que se desfaz sozinha:** o piso de opinião (−10) e os 10 turnos de espera entre
  pedidos repetidos foram escolha minha para atender "até algo dar errado" e "pedidos demais".
  Henrique pode ajustar os dois no F2 (`alianca.desfazAbaixoDe`, `esfriamentoDoPedido`).
- **Tamanho do mapa:** só 25 das 196 províncias têm economia e população. "Um reino enorme" e
  "200 mil de ouro só com ~100 províncias" dependem de simular mais terra (trabalho de dados).
- **Preço das construções escala com a riqueza da província** (Mercado 3.065 em Atenas, 942 em
  Hermíone). É proposital; Henrique ainda não disse se gosta.
- **Quanto cortar da renda:** esperar Henrique jogar com o grão e a IA gastando o cofre.

## Valores do F2 esperando confirmação (27/09, só nesta máquina, sem commit)

Henrique mexeu pelo editor no fim da sessão. Com eles, 6 testes ficam vermelhos, por isso não
foram enviados ao GitHub. Conferir com ele antes de acertar testes ou valores:

- `combate.manutencaoPorHomem.emCasa` 0,15 → **0,20** — o AGENTS registra 0,15 como decisão dele
  e mede que o soldo em casa é o valor que mais mexe no mapa (imposto sobre o fraco).
- `batalha.limiarDeQuebra` 0,70 → **0,75** — medido antes: a cavalaria derrotada passa a ser
  aniquilada até o último homem (quebra o teste "só a cavalaria do vencedor conta").
- hoplita `custo` 1,29 → **1,25** — a infantaria leve só existia por 0,85% com 1,29; a IA agora
  escolhe outra arma no teste de estilo.
- `rodadasDeChoque` 10 → 12; arqueiro `aguento` 0,70 → 0,65; `comida` hoplita e arqueiro 1 → 1,1,
  cavalaria 1,8 → 1,4; `milicia.fracaoMorta` 0,5 → 0,8.
- Testes que só têm o número antigo escrito (milícia 50%, bocas 200/3) devem passar a ler os
  ajustes; os de cavalaria e de escolha de arma mostram mudança real de comportamento.
- `dados/construcoes.json` só teve chaves reordenadas pelo editor; nenhum valor mudou.

## Frentes grandes em aberto (ordem sugerida)

0. **Agressividade com cautela, sem caos** (Henrique, 27/09): o mapa de hoje é parado demais
   (31 trocas de dono em 100 turnos, e nenhuma depois do 100). Fazenda I dando 2 leva a 58
   trocas, 13 eliminados e maior reino com 9 — ele gostou da direção, não do exagero. Procurar o
   meio-termo medindo com `npm run partida 100` e 150 (comida do nível I, acordos que travam o
   mapa depois do 100). Diagnóstico de 27/09: o mapa congela já no turno 60, com 8 sobreviventes
   de 18; entre eles quase todo par está travado por aliança (agora sem prazo), tributo de 50–70
   turnos, trégua ou liga, e os pares livres param em "gosta dele" ou "não tem força igual".
   Mégara (4.882 homens) ficou 40+ turnos em guerra com Sícion (1 província) sem tomá-la.
   ⚠️ A aliança sem prazo (27/09) piora o congelamento: antes ela vencia e soltava o par; agora
   só acaba rompida ou com a opinião abaixo de −10, que entre aliados quase nunca acontece.
   Próximo passo: medir como soltar o mapa depois da primeira onda sem virar caos.
1. **Jogar uma partida** com tudo o que mudou e anotar em `revisoes feitas por henrique.txt`.
2. **Renda menor** — "com 20 províncias em 200 rodadas já tem dinheiro demais".
3. **Diplomacia** — hoje é "um checklist do que cumprir, não uma negociação".
4. **Construções** — "bufar ou servir para outra coisa além de ouro". Parcial: crescimento e
   grão já entraram; a maior parte ainda só rende ouro.
5. **Textos e notificações** — "ainda existem muitas frases de efeito ridículas". Proposta:
   levantar todas as frases da tela num arquivo para Henrique riscar.
6. **Interface** em geral. Moldura de bronze aplicada somente em Construções para Henrique
   avaliar: cantos de 28 px, bordas de 4 px e sem ornamento central. Peças recortadas em
   `assets/interface/molduras/bronze-v1/`. Detalhe com arte maior e mais clara, efeitos em
   linhas com ícones, Manutenção e retorno no tooltip do custo; espaços com fundação ou
   miniatura e nível, lista com seleção lateral. Alterações visuais feitas sem testes,
   medições ou build, a pedido de Henrique.
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
- **Visual ainda por fazer:** Alegreya Sans parece menor que os números em Inter no mesmo tamanho — a saída de
  fundo é `font-size-adjust` na fonte de corpo, com uma passada do `medir-tamanho`; a cor da
  província selecionada no mapa fica marrom e apagada.
- **Notas antigas não conferidas:** o travamento ao abrir o movimento com Porto e o cálculo de
  todas as rotas possíveis (de `revisoes feitas por henrique.txt`, antes de setembro).
