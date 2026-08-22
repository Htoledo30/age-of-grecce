# ROADMAP.md

# Age of Grecce — Roadmap de Desenvolvimento

Este documento define a direção macro do projeto.

Ele não substitui:

- `PATCH_ATUAL.md` — trabalho atual;
- `DECISOES.md` — decisões oficiais;
- `BACKLOG.md` — ideias futuras;
- `CLAUDE.md` — estado técnico atual;
- `AGENTS.md` — processo de trabalho.

---

# Visão do projeto

Age of Grecce é um grand strategy ambientado no mundo grego antigo.

A direção é construir um jogo:

- simples de entender;
- profundo nas consequências;
- baseado em províncias;
- com economia, população, guerra e política conectadas;
- sem transformar cada sistema em microgerenciamento excessivo.

A prioridade atual é construir uma base estável antes de aprofundar os sistemas.

---

# Fase atual — Fundação

## Série de versões

`0.0.x`

Objetivo:

Construir o esqueleto funcional do jogo.

Durante esta fase, sistemas podem ser simples.

O importante é que:

- existam;
- sejam coerentes;
- conversem entre si;
- tenham contratos suficientemente estáveis.

---

# Marco atual — 0.0.2

## 0.0.2 — Fundação do Mundo

Objetivo:

Fechar três pilares antes de iniciar IA:

1. **Mundo**
2. **Economia**
3. **Guerra terrestre**

O patch atual é detalhado em `PATCH_ATUAL.md`.

## Mundo

Base necessária:

- províncias;
- poderes;
- propriedade;
- população;
- nacionalidade;
- felicidade;
- capitais;
- conexões;
- região de teste jogável.

## Economia

Base necessária:

- tesouro por poder, não apenas para o jogador;
- recursos físicos na região de teste atual;
- produção;
- estoque;
- alimentação;
- deterioração;
- mercado interno automático;
- dinheiro;
- impostos;
- construções coerentes;
- integração com conquista e cerco.

## Guerra terrestre

Base necessária:

- recrutamento;
- formação;
- hostes;
- movimento;
- encontros;
- combate;
- milícia;
- cerco;
- assalto;
- conquista;
- rastreabilidade populacional.

## Critério macro

O `0.0.2` termina quando uma região de teste puder funcionar de ponta a ponta usando esses
três pilares.

Não é necessário preencher todas as 205 províncias antes de fechar esta versão.

A região de validação já existente usa as cinco províncias atualmente configuradas
economicamente: Atenas, Maratona, Sunião, Elêusis e Tanagra. As outras 200 ainda não
possuem economia/recurso configurado e serão expandidas depois que o modelo for validado.

---

# Próximo marco provável — IA mínima

## IA mínima

A IA só deve começar depois que o `0.0.2` estiver formalmente fechado.

Objetivo provável:

Permitir que poderes controlados pelo computador consigam jogar usando as mesmas regras
básicas do jogador.

Primeira IA deve conseguir:

- ler território;
- entender recursos básicos;
- recrutar;
- formar hostes;
- movimentar;
- escolher alvos simples;
- atacar;
- cercar;
- conquistar;
- sobreviver durante a campanha.

Não aprofundar inicialmente:

- personalidade;
- comportamento histórico;
- diplomacia avançada;
- estratégia sofisticada;
- cheats.

O número e o escopo definitivos do patch de IA só serão definidos depois do fechamento do
`0.0.2`.

---

# Caminho até 0.1.0

## 0.1.0 — Esqueleto completo de campanha

Esse será o primeiro grande marco do projeto.

O jogo deve conseguir:

1. iniciar campanha;
2. escolher um poder;
3. administrar território;
4. produzir e consumir recursos;
5. arrecadar;
6. construir;
7. recrutar;
8. mover hostes;
9. enfrentar poderes controlados pela IA;
10. guerrear;
11. conquistar e perder território;
12. salvar;
13. carregar;
14. chegar a uma condição de vitória ou derrota.

Os sistemas ainda podem ser básicos.

`0.1.0` significa:

> existe uma campanha completa do começo ao fim.

Não significa:

> o jogo está profundo ou finalizado.

---

# Sistemas necessários antes de 0.1.0

A ordem abaixo é indicativa, não uma sequência rígida de patches.

## Fundação

- mundo;
- economia;
- guerra terrestre.

## IA

- comportamento mínimo autônomo.

## Save / Load

- salvar campanha;
- carregar;
- validação;
- compatibilidade de versão.

## Diplomacia mínima

- hostilidade;
- guerra;
- paz;
- relações mínimas necessárias.

## Fluxo de campanha

- escolha de poder;
- derrota;
- vitória;
- mensagens importantes;
- funcionamento contínuo.

## Expansão dos dados

- aplicar modelo validado a regiões maiores;
- expandir economia para mais províncias;
- adicionar capitais e nacionalidades;
- aumentar cobertura do mapa conforme necessário.

---

# Depois de 0.1.0 — Aprofundamento

Quando o esqueleto estiver completo, o foco muda.

Deixa de ser:

> "isso existe?"

e passa a ser:

> "isso é divertido, interessante e profundo o suficiente?"

---

# Combate aprofundado

Direções futuras:

- batalha visual estilo Brasfoot;
- moral;
- retirada;
- tipos de tropa;
- infantaria;
- cavalaria;
- arqueiros;
- siege;
- qualidade;
- terreno;
- líderes;
- generais;
- decisões simples durante batalha.

Não transformar em batalha tática estilo Total War.

---

# Economia aprofundada

Direções futuras:

- comércio internacional automático;
- tratados;
- oferta e demanda;
- preços dinâmicos;
- logística;
- bloqueios;
- armazenamento limitado;
- recursos em construções;
- abastecimento militar.

---

# Naval

Direções futuras:

- portos;
- zonas marítimas;
- frotas;
- transporte;
- bloqueios;
- comércio marítimo;
- guerra naval.

---

# Administração e política interna

Direções futuras:

- distância da capital;
- ineficiência;
- tamanho do império;
- governadores;
- revoltas;
- nacionalidades;
- assimilação;
- decisões internas.

---

# Personagens e liderança

Direção desejada, ainda não especificada:

- líderes;
- generais;
- sucessão;
- personagens;
- possível family tree inspirado em Rome: Total War 1.

Só transformar em sistema depois de especificação própria.

---

# Regra de planejamento

Não definir dezenas de patches antecipadamente.

Sempre trabalhar com:

## Patch atual

Detalhado.

## Próximo patch

Provável.

## Futuro

Backlog sem numeração rígida.

Motivo:

O projeto ainda está sendo descoberto durante o desenvolvimento.

---

# Regra para dependências

Antes de construir um sistema dependente, estabilizar o contrato do sistema-base.

Exemplos:

- IA depende de economia e guerra;
- comércio depende de recursos físicos;
- fome depende de alimento e estoque;
- cerco depende de economia;
- naval depende de portos e conexão marítima.

Não aprofundar tudo antes da hora, mas evitar construir sobre uma fundação que ainda muda
constantemente.

---

# Regra de simplicidade

A direção do Age of Grecce é:

> máxima consequência de gameplay com a menor complexidade necessária.

Evitar:

- microgerenciamento excessivo;
- sistemas que exigem muitas ações repetitivas;
- fórmulas impossíveis de entender;
- dezenas de recursos sem função;
- features que existem apenas por realismo.

Realismo deve servir ao jogo.

---

# Regra de aprovação

Nenhum patch é encerrado automaticamente.

Fluxo:

1. implementação;
2. testes;
3. revisão;
4. teste manual;
5. aprovação de Henrique;
6. changelog;
7. fechamento da versão;
8. definição do próximo patch.

---

# Estado atual resumido

## Agora

`0.0.2 — Fundação do Mundo`

Foco:

- mundo;
- economia;
- guerra terrestre.

## Depois

Provável:

`IA mínima — versão ainda não definida`

## Primeiro grande alvo

`0.1.0 — Esqueleto completo de campanha`

## Depois de 0.1.0

Aprofundar sistemas, melhorar apresentação, aumentar variedade e expandir o mundo.
