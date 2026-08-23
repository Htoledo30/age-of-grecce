# ROADMAP.md

# Age of Grecce — Roadmap

Este arquivo organiza o que já foi decidido em versões pequenas.

Regra central:

> **um patch por vez → implementar → testar → jogar → aprovar → fechar → só então abrir o próximo.**

O roadmap define direção. O trabalho autorizado no momento fica somente em `PATCH_ATUAL.md`.

---

# 0.0.1 — Primeiro checkpoint

**Status:** lançado

Primeiro marco histórico já registrado no `CHANGELOG.md`.

Não reabrir nem reutilizar esse número.

---

# 0.0.2 — Fechamento da guerra básica

**Status:** lançado em 2026-08-23

Entregou surtida (com socorro que chega de fora), a regra de Muralha e assalto, a crônica
da rodada e a estabilização do núcleo militar. Registrado no `CHANGELOG.md`.

Não reabrir nem reutilizar esse número.

---

# 0.0.3 — Economia física básica

**Status:** lançado em 2026-08-23

Entregou a produção física do recurso principal **e** do secundário, entrando no estoque da
própria província a cada turno, com a escala em `dados/ajustes.json` e a colheita visível na
ficha. A economia em moeda continua ao lado, intacta. Registrado no `CHANGELOG.md`.

Não reabrir nem reutilizar esse número.

Objetivo original:

Transformar produtos em recursos físicos quantificáveis.

Escopo:

- aproveitar os dados e o estado já preparados para recurso principal, recurso secundário
  e estoque;
- transformar esses recursos em unidades físicas usadas pela simulação;
- produção física;
- potencial natural fixo;
- produção influenciada pela população;
- fazer o estoque provincial já existente receber a produção;
- validar primeiro nas cinco províncias da região de teste.

Não inclui ainda:

- consumo de alimento;
- fome;
- mercado interno;
- comércio internacional;
- construções refeitas.

Fechar e testar antes de abrir o próximo patch.

---

# 0.0.4 — Alimentação e população

Objetivo:

Dar função ao alimento e ligar alimento à população.

Escopo:

- toda população consome alimento;
- alimentos continuam recursos individuais;
- interface pode exibir total agregado de alimento;
- excedente dá pequeno benefício;
- escassez reduz crescimento;
- déficit pode causar perda populacional;
- deterioração de alimento estocado;
- preservar a ausência do antigo limite artificial `população inicial × 2`.

Não inclui mercado interno.

## ⚠️ A pergunta que este patch precisa responder

Levantada por Henrique ao ver a economia física do `0.0.3` funcionando, e medida antes de
virar escopo. **Do jeito que a matemática está, ligar o consumo criaria uma mecânica
morta** — e o motivo não é o valor dos números:

- produção e consumo são os DOIS proporcionais à população, então a razão entre eles é uma
  constante da terra. Atenas produz 90% da própria comida com zero soldados, com 5.000 e
  com 20.000 em armas: **exatamente 90% nos três casos**;
- o soldado sai da população e, por isso, **para de comer** ao pegar a lança. Um exército
  gigante é neutro em alimento. Nenhum ajuste de rendimento muda isso;
- a 90%, a despensa de 5 turnos dura ~50 turnos. Simulando o consumo com os números de
  hoje: Sunião passa fome no turno 6, Tanagra no 47, Atenas no 50, Elêusis e Maratona
  nunca.

O que faz a comida virar pergunta de verdade é a **decisão #94 — exércitos consumindo
alimento**, hoje registrada como direção futura. Com ela, um soldado custa de 1,9× (terra
nível 2) a 2,8× (nível 4) o que custa um camponês, porque ele come e não colhe; 5.000
homens levam o déficit de Atenas de 70 para 160 por turno, e a sobra inteira de Elêusis
paga menos de 3.000 soldados permanentes.

Recomendação registrada: **puxar #94 para este patch** e NÃO subir o rendimento da terra
para tirar a Ática do déficit — a região ser pobre de pão é dado autoral, é o que dá valor
ao celeiro de Elêusis e ao mar, e é o problema histórico de Atenas. A condição é o jogador
ter como responder ao déficit: conquistar já existe, e o mercado interno é o patch
seguinte. Fome sem resposta possível é relógio de condenação, não decisão.

## O que já custa hoje, medido antes de somar mais uma trava

Henrique: *"tem que custar chamar tropa e custar para manter."* Já custa, e o número
precisa estar aqui para que a trava de alimento não seja calibrada no escuro. Contra a
renda real de Atenas (**617 por turno**, três províncias, sem gancho de desenvolvimento):

| exército | recrutar | manter |
| --- | --- | --- |
| 1.000 | 3.000 moedas — o tesouro inicial inteiro (4,9 turnos de renda) | 300/turno = 49% da renda |
| 2.000 | 6.000 (9,7 turnos) | 600/turno = 97% da renda |
| 5.000 | 15.000 (24,3 turnos) | 1.500/turno = 243% da renda |

**Teto absoluto: 2.056 homens** gastando 100% da renda em soldo. Quem não paga sofre
deserção proporcional. Recrutar também tira população na hora — e, desde o `0.0.3`, tira
produção junto.

⚠️ **As duas travas mordem no MESMO ponto.** Com o soldado comendo, 1.000 homens custam
38 unidades por turno numa região que já está em −66; 3.000 levam a −180. Ou seja: ouro e
comida apertariam os dois entre 1.000 e 2.000 homens, e duas travas duras no mesmo número
não criam decisão — criam "não faça exército", e uma das duas vira decoração.

Direção registrada para quando este patch for escrito:

- **ouro limita o TAMANHO** do exército — quantos homens ficam em pé agora. Já calibrado,
  já com consequência própria (deserção);
- **alimento limita a DURAÇÃO e a DISTÂNCIA** — por quantos anos aquela gente se sustenta
  em campo e quão longe de casa. Não deve ser um segundo imposto por turno cobrado igual
  ao soldo: o exército come do ESTOQUE da província onde está, o que faz cerco longo virar
  aposta de quem tem mais comida e campanha longe de casa ficar cara de um jeito que ouro
  nenhum resolve;
- **as duas falhas precisam ser diferentes.** Falta de ouro já manda o homem para casa
  (deserção); falta de comida deveria fazer outra coisa — baixas, ou perda de força — senão
  uma das travas é redundante;
- **o soldo em ouro FICA.** Ele sai do tesouro do poder (#63) e a comida sairia do celeiro
  da província (#49): bolsos diferentes, um central e abstrato, outro local e físico — é
  essa diferença que faz as duas mecânicas não serem a mesma coisa com dois nomes. Além
  disso, o teto de ouro **cresce com o império** (Atenas sustenta 2.056 homens; tomando
  Elêusis e Tanagra, ~2.930), o que já dá a resposta certa para "como faço um exército
  maior?". E a região de teste conta essa história sozinha: Sunião é prata pura e **zero
  alimento**, Elêusis é o grão — uma paga o soldo, a outra alimenta, e nenhuma faz o
  serviço da outra;
- **não afrouxar a manutenção por precaução.** Se as duas travas ficarem apertadas demais
  juntas, baixar `manutencaoPorHomem` de 0,3 para ~0,15 abriria espaço para ~4.000 homens e
  deixaria a comida ser a trava real. Mas isso é decisão de quem jogou: afrouxar depois é
  mudar um número, apertar depois é frustrar quem já se acostumou.

Fechar e testar antes do próximo patch.

---

# 0.0.5 — Mercado interno

Objetivo:

Fazer recursos circularem automaticamente dentro de um mesmo poder.

Escopo:

- consumo/necessidade local primeiro;
- cobrir déficits de províncias conectadas;
- distribuição proporcional em escassez;
- prioridade da capital em escassez;
- conexão física obrigatória;
- nada de movimentação manual de recurso pelo jogador.

Nesta etapa, validar a circulação terrestre da região de teste. A conexão econômica marítima só deve ser ativada quando a construção Porto estiver funcional no patch de construções.

Não inclui comércio internacional.

Fechar e testar antes do próximo patch.

---

# 0.0.6 — Dinheiro e impostos

Objetivo:

Integrar tesouro e arrecadação à economia que já existe.

Escopo:

- usar e integrar o tesouro por poder já existente;
- atividade econômica gerando dinheiro;
- impostos ligados a população/atividade/eficiência;
- três níveis de imposto: baixo, normal e alto;
- receita entrando no tesouro do poder;
- conquista dando saque monetário simples e capturando estoque com perdas.

Não inclui comércio internacional dinâmico.

Fechar e testar antes do próximo patch.

---

# 0.0.7 — Felicidade provincial

Objetivo:

Dar estado social básico às províncias.

Escopo:

- usar o estado inicial de felicidade 0–100 e as categorias visuais que já existem;
- fazer a felicidade mudar ao longo da campanha;
- imposto afetando felicidade;
- comida/fome afetando felicidade;
- conquista recente causando penalidade temporária e recuperação gradual.

Outros fatores só entram quando seus próprios sistemas existirem.

Não inclui ainda revoltas completas.

Fechar e testar antes do próximo patch.

---

# 0.0.8 — Nacionalidade

Objetivo:

Fazer a composição populacional ter consequência básica.

Escopo:

- usar a composição populacional e as nacionalidades misturadas que já existem nos dados
  e no estado da campanha;
- composição muda lentamente;
- nacionalidade diferente da do poder governante gera pressão de felicidade;
- não criar grupos culturais intermediários;
- território recém-conquistado usa população normalmente, sem trava especial de recrutamento.

Fechar e testar antes do próximo patch.

---

# 0.0.9 — Capital

Objetivo:

Transformar a capital em centro administrativo real do poder.

Escopo:

- usar o estado de capital por poder que já existe;
- se a capital for perdida, o jogador precisa escolher outra;
- escolha acontece no início do próximo turno antes de continuar.

Este patch NÃO implementa distância da capital, corrupção ou ineficiência administrativa. Esses efeitos ficam para aprofundamento futuro.

Fechar e testar antes do próximo patch.

---

# 0.0.10 — Estrutura de construções

Objetivo:

Preparar o sistema de construções para escolhas reais de especialização.

Escopo:

- 4 slots por província;
- níveis I, II e III;
- estrutura de upgrade;
- preservar construções existentes durante a migração quando possível.

Este patch cria a estrutura. Os efeitos econômicos revisados entram no patch seguinte.

Fechar e testar antes do próximo patch.

---

# 0.0.11 — Construções adaptadas

Objetivo:

Adaptar as construções existentes aos sistemas já implementados.

Escopo:

- Ágora: economia/administração;
- Mercado: circulação/comércio;
- Oficina: produção;
- Celeiro: alimento, armazenamento e deterioração;
- Quartel: melhora tropas recrutadas, não desbloqueia recrutamento;
- Muralha: defesa e regra de assalto;
- Porto: requisito para conexão econômica marítima e para poder ter acesso ao mar.

Não criar construção sem função de gameplay clara.

Fechar e testar antes do próximo patch.

---

# 0.0.12 — Cerco integrado à economia

Objetivo:

Fazer o cerco conversar com os sistemas econômicos já prontos.

Escopo:

- circulação externa cortada;
- produção fortemente reduzida;
- estoque consumido;
- falta de alimento podendo causar fome;
- manter surtida, muralha e assalto funcionando com essas regras.

Fechar e testar antes do próximo patch.

---

# 0.0.13 — Apresentação básica de batalha

Objetivo:

Permitir acompanhar visualmente uma batalha sem redesenhar ainda a matemática de combate.

⚠️ **A parte informativa já saiu no `0.0.2`.** A crônica da rodada — texto do que
aconteceu, sem barra nem playback — foi feita lá porque a guerra estava sendo resolvida em
silêncio, e um patch de guerra precisa ser verificável à mão. O que sobra aqui é o
espetáculo: ver a batalha acontecer. Ele paga de verdade quando a IA atacar sem avisar,
que é por isso que continua depois dela e não antes.

Escopo:

- local/nome da batalha;
- lados;
- números de soldados;
- barras;
- playback visual das perdas já calculadas;
- velocidade;
- pular.

Não inclui:

- resolução iterativa real;
- moral funcional;
- retirada manual;
- decisões durante batalha;
- tipos de tropa.

Fechar e testar antes do marco seguinte.

---

# Depois do 0.0.13 — continuar em patches 0.0.x pequenos

Os números abaixo podem mudar se novos patches intermediários forem necessários.

A regra é continuar usando `0.0.x` pelo tempo que for preciso, sempre com um objetivo pequeno e testável.

## IA mínima — patch próprio

Objetivo:

- IA usar as mesmas regras básicas do jogador;
- administrar tesouro/população necessários às ações básicas;
- recrutar;
- formar hostes;
- mover;
- escolher alvos simples;
- lutar;
- cercar;
- conquistar.

Não inclui personalidade sofisticada, cheats econômicos ou estratégia histórica complexa.

## Diplomacia mínima — patch próprio

Objetivo:

Implementar somente o necessário para a campanha básica funcionar entre jogador e IA.

Começar pelo mínimo indispensável, sem sistema diplomático avançado.

## Save / Load — patch próprio

Objetivo:

- salvar campanha;
- carregar campanha;
- preservar corretamente o estado do jogo.

## Vitória, derrota e fluxo de campanha — patch próprio

Objetivo:

- início/seleção de poder funcionando;
- condição básica de derrota;
- condição básica de vitória;
- campanha podendo chegar a um fim.

Outros patches `0.0.x` podem ser inseridos antes, entre ou depois desses se testes mostrarem necessidade.

---

# 0.1.0 — Primeira campanha básica completa

**Marco, não mega-patch de features.**

O `0.1.0` é lançado quando os patches `0.0.x` anteriores já entregaram, de forma integrada, a primeira campanha básica completa.

O jogador deve conseguir:

- iniciar campanha;
- escolher um poder;
- administrar províncias;
- produzir e consumir recursos;
- armazenar;
- arrecadar;
- construir;
- recrutar;
- mover hostes;
- lutar;
- cercar;
- conquistar e perder território;
- enfrentar poderes controlados pela IA;
- usar a diplomacia mínima necessária;
- salvar;
- carregar;
- vencer;
- perder.

`0.1.0` não significa jogo finalizado ou profundo. Significa que o loop básico de campanha existe do começo ao fim.

Não é necessário encaixar tudo em poucos patches. O projeto pode chegar a `0.0.20`, `0.0.50` ou mais antes do `0.1.0`.

Sistemas como naval completo, tipos de tropas aprofundados, generais/family tree, comércio internacional avançado e outros aprofundamentos não são requisito automático do `0.1.0`, salvo decisão futura explícita.

---

# Regra de planejamento

Não transformar relação entre sistemas em justificativa para colocar tudo no mesmo patch.

Se uma ideia nova não for indispensável ao objetivo do patch atual:

1. registrar no `BACKLOG.md`;
2. não implementar;
3. continuar o patch atual.

Os números futuros do roadmap podem ser reorganizados antes de seus patches começarem. Uma vez que um patch vira `PATCH_ATUAL.md`, seu escopo deve permanecer controlado.
