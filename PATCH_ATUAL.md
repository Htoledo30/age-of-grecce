# PATCH_ATUAL.md

# Age of Grecce — Patch 0.0.1

## Nome do patch

**0.0.1 — Fundação do Mundo**

## Estado

**EM DESENVOLVIMENTO**

Este patch ainda não está fechado.

O foco atual é estabilizar os três pilares que servirão de base para a IA:

1. Mundo
2. Economia
3. Guerra terrestre

A IA NÃO deve ser iniciada antes do fechamento deste patch.

---

# Objetivo do patch

Ao final do `0.0.1`, deve existir pelo menos uma região de teste jogável onde seja
possível:

- possuir e conquistar províncias;
- ter população funcional;
- produzir e consumir recursos;
- armazenar recursos;
- movimentar recursos dentro do poder;
- arrecadar dinheiro;
- construir;
- recrutar;
- formar hostes;
- mover hostes;
- entrar em combate;
- sofrer baixas;
- usar milícia;
- cercar;
- assaltar;
- conquistar;
- alterar o estado do mundo de forma consistente.

O objetivo NÃO é profundidade.

O objetivo é fechar contratos estáveis o suficiente para que a IA possa ser construída
depois sem exigir refatorações constantes da base.

---

# Regra central deste patch

Antes de adicionar profundidade, terminar a estrutura.

Se uma ideia nova não for necessária para o fechamento do `0.0.1`, ela deve ser registrada
no backlog e NÃO deve interromper a tarefa atual.

---

# Estado atual conhecido

O projeto já possui, em diferentes níveis de maturidade:

- mapa;
- províncias;
- poderes;
- propriedade territorial mutável;
- população;
- economia básica;
- construções;
- recrutamento;
- formação de leva;
- hostes;
- origem provincial dos soldados;
- manutenção;
- deserção;
- ordens de marcha;
- divisão de hostes;
- resolução simultânea;
- encontros na estrada;
- combate numérico provisório;
- milícia;
- cerco;
- assalto;
- conquista;
- exílio.

O núcleo militar básico foi estabilizado no estado atual do projeto.

Estado confirmado:

- hostes possuem identidade própria;
- destacamentos funcionam;
- origem dos soldados é preservada;
- encontros na estrada funcionam;
- múltiplas batalhas no mesmo turno funcionam;
- milícia, cerco, assalto, conquista e exílio estão implementados;
- testes atuais passam.

O próximo trabalho do 0.0.1 deve partir dessa base, sem reimplementar o que já está
concluído.

---

# Prioridade imediata

## Etapa 1 — Consolidar contratos antes da economia nova

O núcleo militar básico já está funcional e testado.

Não reimplementar hostes, destacamentos, encontros, milícia, cerco, assalto, conquista ou
exílio sem bug concreto.

### Pendências estruturais antes da IA

- [ ] tesouro deve existir por poder, não apenas para o jogador;
- [ ] manutenção deve ser cobrada de todos os poderes usando a mesma regra;
- [ ] recrutamento futuro da IA deve consumir o tesouro do próprio poder;
- [ ] remover a dependência de "economia configurada" como trava conceitual de
      recrutamento;
- [ ] manter população e demais requisitos reais como regras do recrutamento;
- [ ] remover `fatorCapacidade: 2` e a capacidade populacional artificial;
- [ ] preparar o estado para capitais por poder;
- [ ] manter testes atuais passando após essas mudanças.

### Combate

A matemática atual continua sendo provisória.

Não adicionar agora:

- tipos de tropas;
- moral completa;
- generais;
- terreno;
- combate tático.

O objetivo é preservar a base funcional enquanto mundo e economia são fechados.

---

# Etapa 2 — Completar a região de teste existente

A região de teste já está escolhida e configurada parcialmente.

Ela é formada pelas cinco províncias econômicas atuais:

- Atenas;
- Maratona;
- Sunião;
- Elêusis;
- Tanagra.

Essa região foi escolhida porque permite testar Atenas e dois poderes vizinhos de uma
província, além de guerra, conquista e economia sem depender do mapa inteiro.

Não escolher outra região agora.

### Completar nessa região

- [ ] população plausível;
- [ ] nacionalidades;
- [ ] felicidade inicial;
- [ ] recurso principal de cada uma;
- [ ] recurso secundário;
- [ ] estoque inicial;
- [ ] construções iniciais;
- [ ] capital dos poderes;
- [ ] conexões terrestres;
- [ ] portos quando necessários.

As outras 200 províncias NÃO possuem recurso/economia configurados hoje e continuam fora
do escopo desta validação.

---

# Etapa 3 — Refazer a economia para recursos físicos

A economia atual baseada em produto como fonte direta de dinheiro deve ser substituída
gradualmente por uma economia em que produtos existam como recursos físicos.

## Estrutura mínima

Cada província da região de teste deve possuir:

- população;
- recursos naturais;
- produção;
- estoque;
- consumo;
- felicidade;
- construções;
- conexão com outras províncias.

## Recursos

Cada província terá inicialmente:

- 1 recurso principal;
- 1 recurso secundário mais fraco.

O nível natural do recurso é fixo.

Construções e população podem melhorar exploração, mas NÃO podem aumentar o potencial
natural.

### Implementar

- [ ] estrutura de recurso físico;
- [ ] quantidade produzida por turno;
- [ ] estoque por província;
- [ ] agregação de estoque por poder;
- [ ] deterioração de alimentos;
- [ ] captura de estoque em conquista;
- [ ] perda parcial de estoque em conquista/assalto.

---

# Etapa 4 — Alimentação

Toda população consome alimento a cada turno.

Produtos alimentares continuam individuais, mas a interface pode mostrar uma categoria
agregada.

Exemplo:

**Alimento: 500**

Tooltip:

- 300 grãos
- 120 peixe
- 80 carne

### Implementar

- [ ] consumo de alimento por população;
- [ ] cálculo agregado da disponibilidade de alimento;
- [ ] crescimento normal com alimentação suficiente;
- [ ] bônus pequeno com excedente confortável;
- [ ] redução de crescimento com escassez;
- [ ] perda populacional com déficit;
- [ ] perda forte com déficit severo;
- [ ] valores iniciais simples para aproximadamente 5 turnos de sobrevivência na região de
      teste.

Não buscar balanceamento perfeito agora.

---

# Etapa 5 — Produção e população produtiva

Direção:

`produção = potencial natural × população produtiva × modificadores`

Não haverá distribuição manual de trabalhadores.

Uma porcentagem da população total representa implicitamente a população produtiva.

### Implementar

- [ ] fórmula simples de produção;
- [ ] produção reduzida quando população cai;
- [ ] modificadores de construções;
- [ ] testes com províncias de tamanhos e potenciais diferentes.

Os valores exatos são balanceamento e podem mudar.

---

# Etapa 6 — Mercado interno automático

O jogador não movimenta recursos manualmente entre províncias do mesmo poder.

Fluxo:

1. consumo local;
2. cobrir déficit de outras províncias conectadas;
3. estoque.

A capital recebe prioridade em situação de escassez.

O restante é distribuído proporcionalmente à necessidade.

### Regras

Recursos só circulam com conexão válida:

- terrestre;
- marítima quando houver Porto.

### Implementar

- [ ] detectar províncias conectadas;
- [ ] calcular excedente;
- [ ] calcular déficit;
- [ ] distribuir automaticamente;
- [ ] priorizar capital;
- [ ] distribuir restante proporcionalmente;
- [ ] impedir transferência para província isolada.

Não implementar comércio internacional ainda.

---

# Etapa 7 — Dinheiro e impostos

O tesouro continua sendo do poder.

A economia física não deve eliminar o dinheiro.

Direção conceitual:

`receita fiscal = população × atividade econômica × taxa × eficiência`

Não é necessário expor essa fórmula ao jogador.

## Imposto

Três níveis:

- Baixo
- Normal
- Alto

### Efeitos

**Baixo**

- menos arrecadação;
- melhora felicidade.

**Normal**

- equilíbrio.

**Alto**

- mais arrecadação;
- piora felicidade;
- aumenta pressão de revolta.

### Implementar

- [ ] nova base de imposto;
- [ ] três taxas;
- [ ] interação com felicidade;
- [ ] receita de atividade econômica interna;
- [ ] saque de conquista equivalente aproximadamente a uma renda da província.

---

# Etapa 8 — Felicidade e nacionalidade

## Felicidade

Internamente:

`0–100`

Na interface:

- Muito feliz
- Satisfeita
- Neutra
- Insatisfeita
- Revoltosa

### Fatores previstos

- imposto;
- alimentação;
- fome;
- conquista recente;
- nacionalidade diferente;
- distância da capital;
- ineficiência administrativa;
- presença militar;
- construções;
- guerra longa;
- prosperidade.

Não é necessário implementar todos com profundidade agora.

### Implementar no mínimo

- [ ] estrutura de felicidade;
- [ ] categoria visual;
- [ ] imposto afeta felicidade;
- [ ] falta de alimento afeta felicidade;
- [ ] conquista recente afeta felicidade;
- [ ] nacionalidade diferente afeta felicidade.

## Nacionalidade

Uma província pode possuir múltiplas nacionalidades.

### Implementar

- [ ] composição populacional por nacionalidade;
- [ ] nacionalidade dominante;
- [ ] mudança lenta ao longo do tempo;
- [ ] efeito básico sobre felicidade.

Migração fica fora do patch.

---

# Etapa 9 — Capital

Cada poder deve possuir uma capital.

### Implementar

- [ ] capital inicial nos dados;
- [ ] identificação da capital atual;
- [ ] conquista da capital gera estado de "capital perdida";
- [ ] mensagem no início do próximo turno;
- [ ] jogador é obrigado a escolher nova capital antes de continuar;
- [ ] nova capital passa a ser o centro administrativo.

Ineficiência administrativa avançada pode ser simplificada inicialmente.

---

# Etapa 10 — Construções

As construções atuais precisam ser adaptadas para a nova economia.

Cada província terá:

- 4 slots;
- construções com níveis I, II e III.

Não implementar um atributo genérico de desenvolvimento.

## Ágora

Direção:

- atividade econômica;
- administração;
- receita fiscal;
- possível efeito em felicidade.

## Mercado

Direção:

- eficiência do mercado interno;
- comércio futuro;
- renda comercial.

## Oficina

Direção:

- bônus geral de produção.

## Celeiro

Direção:

- armazenamento de alimento;
- redução de deterioração;
- resistência à escassez.

## Quartel

Mudança importante:

Quartel NÃO será mais requisito para recrutamento.

Uma província própria com população suficiente deve poder recrutar mesmo sem Quartel.

A ausência de economia configurada não deve existir como uma trava conceitual do
recrutamento; ela é apenas uma limitação temporária dos dados atuais.

Quartel melhora a qualidade/força dos soldados recrutados naquela província.

## Muralha

Direção:

- defesa;
- milícia;
- assalto;
- cerco.

## Porto

Necessário para conexão marítima econômica.

## Estradas

Devem existir futuramente como construção.

Não precisam estar completas no 0.0.1.

### Implementar neste patch

- [ ] sistema de 4 slots;
- [ ] níveis I/II/III;
- [ ] adaptar construções existentes;
- [ ] Quartel deixa de bloquear recrutamento;
- [ ] Porto mínimo para conexão marítima;
- [ ] chance futura/estrutura para dano ou destruição de construção em conquista.

---

# Etapa 11 — Integrar economia e cerco

O cerco deve usar a economia real.

Durante cerco:

- circulação externa é cortada;
- produção cai fortemente;
- consumo continua;
- estoque é consumido;
- fome pode começar.

### Implementar

- [ ] corte de abastecimento;
- [ ] queda de produção;
- [ ] consumo de estoque;
- [ ] efeitos da fome;
- [ ] persistência entre turnos.

## Muralhas

A Muralha terá duas funções defensivas complementares:

1. melhorar a força defensiva/milícia no assalto;
2. impedir assalto imediato, exigindo período mínimo de cerco.

Direção inicial:

- sem muralha: assalto imediato possível;
- com muralha: pelo menos 2 turnos de cerco antes de assalto;
- muralha continua fortalecendo a defesa quando o assalto acontecer.

O número de turnos e os bônus exatos podem mudar em teste.

## Surtida

O defensor sitiado deve poder escolher atacar o exército sitiador.

Implementar de forma simples no 0.0.1:

- [ ] opção de surtida durante cerco;
- [ ] usar o mesmo sistema básico de combate;
- [ ] se defensor vencer, cerco é quebrado;
- [ ] se defensor perder, sobreviventes retornam à defesa quando coerente com a resolução;
- [ ] não criar regras táticas especiais ainda.

---

# Etapa 12 — Apresentação visual mínima de batalha

A batalha final não será tática em campo aberto.

A referência conceitual é Brasfoot:

- simulação numérica;
- jogador consegue acompanhar;
- resultado não aparece instantaneamente.

Para o `0.0.1`, basta um protótipo simples se ele não atrasar excessivamente o fechamento
da base.

A matemática atual resolve a batalha em um único cálculo. Portanto o protótipo visual do
0.0.1 NÃO exige transformar o combate em resolução iterativa.

A interface pode apresentar progressivamente um resultado já calculado, apenas como
playback visual.

Uma resolução realmente iterativa, necessária para moral e decisões durante a batalha,
fica para um patch futuro de combate.

### Protótipo desejado

- [ ] nome/local da batalha;
- [ ] dois lados;
- [ ] homens de cada lado;
- [ ] playback visual das perdas;
- [ ] barras;
- [ ] velocidade;
- [ ] botão de pular.

Não implementar ainda:

- postura;
- retirada manual;
- moral completa;
- tipos de tropas;
- ordens táticas.

---

# Fora do escopo do 0.0.1

NÃO implementar neste patch:

- IA estratégica;
- infantaria/cavalaria/arqueiros/siege;
- generais;
- family tree;
- terreno afetando combate;
- sistema naval;
- comércio internacional completo;
- tratados comerciais;
- oferta e demanda;
- preços dinâmicos;
- preços regionais;
- governadores;
- migração;
- grupos culturais;
- religião;
- logística militar completa;
- recursos obrigatórios para recrutar tropas;
- combate tático;
- estradas completas;
- sistema avançado de corrupção.

Registrar ideias relacionadas no backlog.

---

# Critério de conclusão

O `0.0.1` só pode ser fechado quando:

## Mundo

- [ ] região de teste configurada;
- [ ] população funcionando;
- [ ] nacionalidade funcionando;
- [ ] felicidade funcionando;
- [ ] capitais funcionando;
- [ ] posse e conquista funcionando.

## Economia

- [ ] recursos físicos funcionando;
- [ ] produção funcionando;
- [ ] alimentação funcionando;
- [ ] estoque funcionando;
- [ ] deterioração funcionando;
- [ ] mercado interno funcionando;
- [ ] conexões funcionando;
- [ ] impostos funcionando;
- [ ] construções adaptadas;
- [ ] conquista captura recursos.

## Guerra

- [ ] recrutamento funcionando;
- [ ] formação funcionando;
- [ ] hostes estáveis;
- [ ] movimento funcionando;
- [ ] encontros funcionando;
- [ ] combate básico coerente;
- [ ] milícia funcionando;
- [ ] cerco funcionando;
- [ ] assalto funcionando;
- [ ] conquista funcionando;
- [ ] integração cerco/economia funcionando;
- [ ] rastreabilidade populacional preservada.

## Qualidade

- [ ] testes atuais passam;
- [ ] comportamentos novos importantes possuem testes;
- [ ] documentação afetada foi atualizada;
- [ ] CHANGELOG atualizado;
- [ ] fluxo principal testado manualmente;
- [ ] Henrique aprovou o patch.

---

# O que acontece depois

Quando o `0.0.1` for aprovado e fechado:

**parar.**

Não iniciar automaticamente o próximo patch.

O próximo patch provável é:

**0.0.2 — IA mínima**

Mas seu escopo só deve ser definido depois da aprovação formal do `0.0.1`.

---

# Instrução para o agente principal

Ao trabalhar neste patch:

1. leia este arquivo;
2. trabalhe somente no escopo atual;
3. não implemente itens de "Fora do escopo";
4. não comece IA;
5. quando encontrar uma ideia futura, registre-a para backlog;
6. mantenha testes atualizados;
7. não altere decisões estruturais importantes sem avisar;
8. marque tarefas concluídas somente quando código e testes confirmarem;
9. ao considerar o patch tecnicamente pronto, pare e apresente o estado para revisão
   humana;
10. não altere a versão para o próximo patch sem aprovação.
