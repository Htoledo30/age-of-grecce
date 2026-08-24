# Age of Grecce — GDD vivo

Este documento descreve a visão atual do jogo, não uma promessa nem uma ordem de
implementação. Ele pode ser alterado, reduzido ou ampliado conforme os testes mostrarem o
que combina com Age of Grecce. O Git guarda as ideias antigas.

## Proposta

Age of Grecce é um grand strategy ambientado no mundo grego por volta de 700 a.C. O
jogador governa um poder através de províncias, população, recursos, construções, guerra e
política.

A meta é obter profundidade por consequências entre sistemas, não por excesso de botões.
Realismo e plausibilidade histórica servem ao gameplay; não justificam microgerenciamento,
falsa precisão ou fórmulas impossíveis de compreender.

O combate deve ser mais rico que uma simples comparação de números, mas não virar uma
batalha tática no estilo Total War. O orçamento visual principal é mapa, interface, texto,
números, barras, ícones e animações simples.

## Experiência desejada

O jogador deve conseguir:

1. escolher um poder e entender suas forças e carências;
2. administrar províncias sem repetir ações cansativas;
3. produzir, consumir, armazenar e fazer recursos circularem;
4. arrecadar, construir e sustentar forças militares;
5. planejar ordens e resolver uma rodada anual;
6. lutar, cercar, conquistar e perder território;
7. reagir a fome, insatisfação e diferenças populacionais;
8. enfrentar poderes controlados por IA sob as mesmas regras;
9. negociar quando diplomacia for necessária;
10. salvar, carregar, vencer e perder uma campanha.

A primeira campanha completa pode ser simples. Profundidade militar, política, naval e
comercial vem depois que esse ciclo existir de ponta a ponta.

## Mundo e tempo

- Mapa fixo por províncias, com dados autorais e relações plausíveis entre regiões.
- Um turno/rodada representa aproximadamente um ano.
- A validação começa em Atenas, Maratona, Sunião, Elêusis e Tanagra; o restante do mundo é
  preenchido gradualmente depois que as regras provarem seu valor.
- Classificações só existem quando produzem consequência de gameplay.
- Poder sem território pode sobreviver no exílio enquanto possuir hostes.

## Economia e recursos

- Produtos representam a capacidade anual e a identidade econômica da terra, não um
  inventário de unidades acumuladas.
- Cada província pode ter um recurso principal forte e um secundário mais fraco.
- O nível natural é fixo; população e construções alteram exploração, não a natureza.
- Não existe alocação manual de trabalhadores.
- Recursos precisam ter função: alimento, matéria-prima, luxo/comércio ou outra consequência
  real. Não criar categorias decorativas.

### Alimentação

- Comida é saldo anual em pontos, sem estoque nem deterioração, em DUAS contas que se
  leem de cabeça: `saldo civil = subsistência + alimentos − população` e
  `saldo final = saldo civil − exército`. **O povo come primeiro.**
- Produtos alimentares somam seus níveis principal e secundário; construções alimentares
  somam por cima.
- Toda província começa em População I (`−1`) e sobe um nível a cada 25% acima da
  população inicial; se a população cair, o nível também cai. O saldo local
  (`produção − nível`) dá o papel dela: Sustentadora, Equilibrada ou Dependente.
- O exército do poder, hostes e levas em formação, custa `−1` por mil homens ou fração —
  exceto as tropas presas em cidades sitiadas do próprio poder, que comem da despensa da
  cidade.
- Consequências: saldo civil negativo é **Fome** — as províncias DEPENDENTES perdem `−1%`
  (sustentadoras nunca morrem pelas outras) e o exército `−5%`. Saldo civil fechado com
  final negativo é **Exército sem mantimentos** — só a tropa perde `−5%`, nenhum civil
  morre. Final `0` é No limite; positivo, Abastecido. Não há bônus de crescimento por
  fartura.
- **Cidade sitiada sai da circulação inteira** — não contribui, não pesa, não come da
  mesa — e vive de UM contador de mantimentos (`base + comida da própria terra` turnos; a
  Fazenda é resistência de cerco). Enquanto ele dura, ninguém morre e a cidade não
  cresce; vencido, povo (`−1%`) e guarnição (`−5%`) definham juntos, todo turno, com o
  sitiante intacto. Cerco não fabrica fome nacional.
- **Crescimento com trava preventiva**: o povo só cresce com saldo final positivo, e o
  crescimento é simulado antes de aplicado — se fosse empurrar o saldo pro negativo, ele
  não acontece ("limitado pela alimentação"), tudo-ou-nada por poder. Uma Fazenda amplia
  capacidade e nunca pode causar fome.
- Não existe capacidade populacional artificial; alimento, felicidade e outros sistemas
  reais limitam o crescimento.

### Circulação e comércio

- O mercado interno é abstrato e automático; não existe transporte manual de unidades.
- Escassez é distribuída de forma compreensível, com prioridade limitada da capital.
- Recursos só devem circular por conexões válidas; conexão marítima completa exige Porto.
- Comércio internacional depende de tratado e transforma capacidade produtiva em renda,
  sem inventário ou barter manual. Um acordo futuro pode cobrir no máximo `+1` comida de
  um parceiro que preserve pelo menos `+2` para si.
- Preços-base simples bastam inicialmente; oferta, demanda e preços regionais só entram se
  trouxerem decisões melhores.
- O mesmo produto pode sustentar o reino e gerar comércio porque ambos representam fluxos
  anuais; não existe venda de estoque acumulado.

## População, sociedade e governo

- População é provincial e fornece trabalhadores, contribuintes, recrutas e milícia.
- Soldados preservam origem provincial; desmobilização devolve cada homem à sua terra.
- Felicidade é provincial, guardada numericamente e mostrada em categorias compreensíveis.
- Impostos, alimento, conquista, nacionalidade, prosperidade, guerra e presença militar
  podem afetar felicidade quando seus sistemas existirem.
- Nacionalidade pertence à população, pode ser misturada e muda lentamente.
- Diferença entre governante e população cria tensão, não uma trava artificial de uso da
  província conquistada.
- Insatisfação persistente pode gerar revoltas; migração pode responder a fome,
  prosperidade, guerra e segurança no futuro.
- Cada poder possui uma capital. Perdê-la deve obrigar a escolher outra antes de continuar.
- Distância da capital e tamanho da província viram **corrupção**: o que se perde entre o
  campo e o tesouro. Ver a seção de dinheiro.

## Dinheiro e impostos

- Tesouro pertence ao poder, nunca à província.
- Impostos devem possuir níveis baixo, normal e alto, trocando receita por pressão social.
- Receita considera população, atividade e **corrupção**.
- Atividade econômica pode gerar dinheiro automaticamente; não exigir venda manual de toda
  colheita.
- Batalha por si só não gera saque. Conquista poderá dar dinheiro com perdas quando o
  saque existir; não há estoque de produtos para capturar.

### Corrupção

O imposto não pode crescer para sempre em linha reta com a população: uma província de
100.000 habitantes renderia o dobro de uma de 50.000 e o dinheiro deixaria de ser
decisão. A corrupção é o freio, e ela é o mesmo canal por onde a distância da capital
entra na economia.

Dois fatores a alimentam, e o segundo é o que dá sentido geográfico ao mapa:

- **tamanho**: quanto mais gente, mais se perde no caminho. Nada abaixo de um limiar,
  crescendo depois numa curva que satura sozinha;
- **distância da capital**, em saltos pelo território: a província no fim do mundo é
  fodida duas vezes — é pobre e ainda entrega menos do pouco que arrecada.

Compõem-se de modo que cada uma coma uma fatia do que a outra deixou, e o total nunca
passe de 100% sem precisar de teto artificial:

```
corrupção = 1 − (1 − por tamanho) × (1 − por distância)
imposto   = população × taxa × (1 − corrupção)
```

Ordem de grandeza pretendida, com o mapa atual (Elêusis a 1 salto de Atenas, Corinto a 3,
Esparta a 7, o canto mais distante a 26):

| habitantes | na capital | 3 saltos | 12 saltos |
| ---------- | ---------- | -------- | --------- |
| 10.000     | 50         | 40       | 30        |
| 35.000     | 165        | 132      | 99        |
| 100.000    | 341        | 273      | 205       |

⚠️ **Corrupção é consequência, nunca recurso.** Ela é derivada e mostrada, e o jogador não
tem barra para administrar nem número para comprar de volta. Quem a reduz são decisões do
mundo — mudar a capital, erguer Ágora, abrir estrada —, e cada sistema novo entra nesta
mesma conta em vez de inventar o próprio modificador.

### Província pode dar saldo negativo

Referência declarada: Rome: Total War, onde o império tem cidades que sustentam e cidades
que pesam. **Província no vermelho não é defeito de balanceamento** — é o que faz território
ser escolha em vez de sempre-mais. O saldo que precisa fechar é o do REINO, nunca o de cada
província.

Isso muda como a conquista se lê: tomar uma terra distante e pobre pode custar dinheiro
todo turno, e valer assim mesmo por outro motivo — o grão que ela planta, a prata que ela
tem, o caminho que ela abre, o inimigo que ela nega.

Para existir de verdade, a província precisa ter **custos próprios** e não só receita:
corrupção sozinha apenas empurra o imposto na direção de zero, nunca abaixo dele. Os
candidatos naturais são guarnição, manutenção de construção e abastecimento — e cada um
entra no seu patch, não neste.

## Construções

A base usa quatro slots por província e níveis I, II e III, forçando especialização.
Upgrades não consomem outro slot, pagam somente o nível novo e levam prazo próprio.
Construções normalmente sobrevivem à conquista.

- Ágora: economia, administração e futura redução de corrupção;
- Mercado: circulação e comércio;
- Quartel: não é requisito para recrutar; dará qualidade ou bônus futuro às tropas
  formadas naquela província;
- Muralha: fortalece milícia e impede assalto imediato;
- Templo: felicidade, cultura ou estabilidade futura;
- Porto: conexão econômica marítima e base do sistema naval;
- Estradas: possível ligação entre movimento, mercado e administração;
- construções de exploração são liberadas pelos produtos principal e secundário: Fazenda
  para Grãos, Pastagem para Gado, Porto pesqueiro para Peixe, Lagar para Azeite, Vinhedo
  para Vinho, Serraria para Madeira, Mina para Ferro e metais preciosos e Pedreira para
  Mármore.

Construções de alimento somam `+1/+2/+3` comida. As demais melhoram a exploração ou o
comércio sem criar estoque. A Oficina genérica foi substituída por construções locais.
Não exigir madeira, ferro ou outra mercadoria para construir ou
recrutar enquanto isso não trouxer uma decisão melhor que o custo em ouro e slots.

Não criar um atributo genérico de desenvolvimento quando população, economia e construções
já conseguem explicar o resultado.

## Guerra terrestre

- Hostes têm identidade própria e podem dividir parte de seus homens.
- Recrutamento custa ouro e população e leva tempo de formação.
- Ordens são planejadas sobre o mesmo mundo e resolvidas simultaneamente.
- Movimento pode gerar encontros na estrada e múltiplas batalhas na mesma rodada.
- Milícia é defesa automática derivada da população.
- Província vazia pode cair ao primeiro ingresso; cidade defendida exige combate ou cerco.
- Sitiar é ocupar o campo sem engajar automaticamente a guarnição ou conquistar a cidade.
- Assaltar engaja e tenta tomar a praça; Muralha exige preparação prévia.
- O defensor pode fazer surtida e um exército externo pode romper o cerco.
- Cerco corta produção e circulação; alimento fornecido pela província desaparece do saldo
  enquanto ela estiver sitiada. A cidade cercada sai da conta alimentar do reino e vive
  da própria despensa; vencidos os mantimentos, povo e guarnição definham juntos — é isso
  que faz sitiar ESTRANGULAR em vez de só esperar. A cidade sitiada continua cobrando
  imposto e levantando leva.

A matemática básica é provisória. Possíveis aprofundamentos, somente depois da base:

- tipos de tropas, qualidade e equipamento;
- moral, retirada e perseguição;
- aleatoriedade controlada;
- terreno com dados confiáveis;
- generais, líderes e árvore familiar;
- apresentação de batalha com lados, números, barras, velocidade e opção de pular.

O visor de batalha pode inicialmente reproduzir visualmente um resultado já calculado; não
é necessário criar batalha tática ou resolução iterativa apenas para gerar espetáculo.

## Naval

O mar deve ser dividido em zonas navegáveis conectadas, não tratado como teleporte entre
portos. Frotas se movem entre zonas, transportam, protegem rotas e realizam bloqueios.

Portos podem ter função econômica antes disso. Guerra naval completa só faz sentido depois
da base terrestre e da IA mínima estarem estáveis.

## IA e diplomacia

- IA usa as mesmas regras do jogador: tesouro, população, alimento, recrutamento,
  manutenção, movimento, cerco e conquista.
- Ela só entra quando a base necessária estiver estável, para não ser refeita a cada
  mudança estrutural.
- A primeira IA deve ser simples: sobreviver, recrutar, formar hostes, mover, escolher
  alvos, lutar, cercar e conquistar.
- Personalidades, cheats, comportamento histórico e estratégia sofisticada não pertencem à
  primeira versão.
- Diplomacia começa depois da IA mínima e contém apenas o necessário para a campanha
  funcionar; sistemas diplomáticos profundos são evolução posterior.

## Campanha completa

O primeiro grande marco é uma campanha que começa e termina:

- seleção de poder;
- administração básica;
- economia, população e guerra integradas;
- IA mínima e diplomacia necessária;
- save/load;
- condições claras de vitória e derrota.

Isso não significa jogo finalizado. Significa que existe um ciclo completo sobre o qual
novos sistemas podem ser julgados jogando, não apenas imaginando.

## Direção visual

- Mesa de comando helênica contemporânea: pedra escura, bronze, marfim e ornamentação
  grega discreta.
- O mapa é o protagonista; painéis devem informar sem cobri-lo demais.
- Interface usa texto curto, números verificáveis, ícones consistentes e tooltips próprios.
- Batalhas e acontecimentos importantes precisam ser legíveis mesmo sem grande quantidade
  de assets.

## Questões abertas

Estas ideias não têm ordem nem garantia de implementação:

- quantidade e desenho das zonas marítimas;
- composição futura das hostes;
- profundidade adequada de moral, retirada e generais;
- quanto da capacidade anual vira comércio automático;
- preços, oferta e demanda regionais;
- danos a construções;
- migração, governadores e revoltas;
- estradas, logística militar e abastecimento por distância;
- expansão autoral das outras 200 províncias;
- duração definitiva de uma rodada e ritmo completo da campanha.

Uma questão deixa esta lista quando Henrique decidir testá-la. Se a ideia não combinar com
o jogo, ela é removida sem obrigação de substituição.
