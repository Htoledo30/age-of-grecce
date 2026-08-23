# PATCH_ATUAL.md

# Age of Grecce — 0.0.3

## Nome

**Economia física básica**

## Objetivo

Fazer as cinco províncias da região de teste produzirem recursos físicos por turno e
adicionarem essa produção ao estoque provincial.

Este patch NÃO refaz ainda dinheiro, comércio, alimentação ou construções.

A economia monetária antiga continua funcionando temporariamente até os patches próprios
de dinheiro/mercado.

---

# Decisão fechada para este patch

## Recurso secundário entra agora

Sim.

Tanto o recurso principal quanto o secundário produzem unidades físicas no `0.0.3`.

Motivo:

- os dois já existem nos dados;
- ambos representam potencial natural da província;
- ativar somente o principal deixaria metade da ficha sem função;
- a mesma regra genérica deve calcular os dois, então não é necessário criar outro sistema.

O secundário continua naturalmente menor porque possui nível/potencial inferior.

---

# Regra de produção

Seguir `DECISOES.md`:

`produção = potencial natural × população produtiva × modificadores`

Para este patch:

- potencial natural = `nivel` do recurso;
- população produtiva = derivada da população atual da província, sem classes de trabalhadores;
- modificadores = somente os que já fizerem sentido sem puxar sistemas futuros;
- perda de população deve reduzir produção;
- potencial natural nunca aumenta por investimento;
- produção deve ser determinística.

A escala numérica usada para converter população × nível em unidades físicas deve ficar em
dados/ajustes, e não espalhada como número mágico no TypeScript.

Não tentar balancear alimentação neste patch. O `0.0.4` fará consumo, fome e ajuste fino da
relação entre produção e necessidade.

---

# Tarefas

## 1. Representar produção física

- [x] criar uma forma clara de obter a produção física de uma província por recurso;
- [x] usar a população ATUAL do estado, não somente a população inicial do JSON;
- [x] calcular o recurso principal;
- [x] calcular o recurso secundário;
- [x] retornar quantidades inteiras e não negativas;
- [x] província sem ficha econômica continua sem produção física.

## 2. Produzir ao passar o turno

- [x] a cada virada de turno, cada uma das cinco províncias configuradas produz seus recursos;
- [x] produção do principal é adicionada ao estoque provincial;
- [x] produção do secundário é adicionada ao estoque provincial;
- [x] estoques permanecem provinciais;
- [x] não criar estoque global do poder;
- [x] não consumir nada ainda;
- [x] não deteriorar nada ainda.

## 3. População influencia produção

- [x] reduzir população deve reduzir a produção física;
- [x] recrutamento, mortes ou outras mudanças demográficas já existentes devem refletir na produção seguinte;
- [x] não criar sistema de trabalhadores;
- [x] não criar alocação manual de população.

## 4. Preservar a economia monetária atual

- [x] não remover a renda atual;
- [x] não transformar estoque em dinheiro;
- [x] não vender automaticamente os recursos físicos;
- [x] não alterar impostos;
- [x] não alterar comércio;
- [x] não refazer investimento além do estritamente necessário para manter compatibilidade.

A camada física nasce ao lado da economia monetária antiga por enquanto.

A substituição/integração da renda será feita nos patches próprios do roadmap.

## 5. Exposição mínima para teste

- [x] permitir verificar quanto cada recurso da província produz por turno;
- [x] a ficha pode mostrar essa informação de forma simples se isso for necessário para o teste manual;
- [x] não redesenhar a interface;
- [x] não criar novos painéis econômicos grandes.

A prioridade é conseguir observar:

`estoque antes → passar turno → produção → estoque depois`

---

# Região de teste

Validar somente:

- Atenas;
- Maratona;
- Sunião;
- Elêusis;
- Tanagra.

Não preencher nem simular economicamente as outras 200 províncias neste patch.

---

# Fora de escopo

NÃO implementar no `0.0.3`:

- consumo de alimento;
- fome;
- bônus por excedente alimentar;
- deterioração;
- mercado interno;
- transferência de recursos entre províncias;
- comércio internacional;
- preços dinâmicos;
- novos impostos;
- felicidade funcional;
- nacionalidade funcional;
- capital funcional;
- construções 2.0;
- Porto funcional;
- cerco afetando estoque/produção;
- logística militar;
- IA.

Se alguma dessas coisas parecer necessária, parar e reportar antes de ampliar o patch.

---

# Testes mínimos

Criar ou adaptar testes para garantir:

- [x] principal produz;
- [x] secundário produz;
- [x] produção entra no estoque correto;
- [x] dois turnos acumulam duas produções;
- [x] população menor gera produção menor;
- [x] potencial maior gera produção maior em condições comparáveis;
- [x] potencial natural do dado não é alterado;
- [x] província sem ficha não passa a produzir;
- [x] produção não cria/retira dinheiro por si só;
- [x] economia monetária atual continua funcionando;
- [x] testes unitários existentes continuam verdes;
- [x] tipos e lint verdes;
- [x] testes de tela verdes se a UI for tocada.

Não cravar em teste números de balanceamento que vêm de `dados/*.json`.
Testar fórmulas e relações.

---

# Teste manual de Henrique

Antes de fechar o patch:

1. iniciar campanha;
2. abrir uma das cinco províncias;
3. anotar estoque e produção dos dois recursos;
4. passar um turno;
5. conferir que ambos aumentaram corretamente;
6. recrutar homens de uma província;
7. após a formação/mudança populacional, conferir que sua produção caiu;
8. confirmar que dinheiro/renda antiga ainda funciona;
9. jogar alguns turnos e procurar crescimento absurdo ou comportamento quebrado.

---

# Definition of Done

O `0.0.3` fecha quando:

- [x] produção física existe;
- [x] principal e secundário produzem;
- [x] estoque provincial recebe a produção;
- [x] população atual influencia a produção;
- [x] nenhuma mecânica de consumo foi antecipada;
- [x] nenhuma economia monetária futura foi antecipada;
- [x] testes automatizados relevantes passam;
- [x] Henrique testou manualmente;
- [x] Henrique aprovou.

Depois:

1. [x] atualizar `CHANGELOG.md`;
2. [x] fechar `0.0.3` — versão `0.0.3` em `package.json` e `package-lock.json`;
3. [x] parar;
4. [ ] não iniciar `0.0.4` sem novo `PATCH_ATUAL.md`.

---

# Encerrado em 2026-08-23

Os números que este patch deixou medidos, para o `0.0.4` não calibrar no escuro:

- `unidades = população × nível × 0,009` (`0,3` de fatia produtiva × `0,03` por produtor
  por nível). Uma unidade de alimento = ração anual de **50 pessoas**;
- **autossuficiência = soma dos níveis de alimento × 0,45.** A província se alimenta a
  partir de soma ≈ 2,3, e o tamanho da população não muda nada;
- na região de teste: Atenas 90%, Tanagra 90%, Maratona 135%, Elêusis 135%, Sunião 0%. A
  Ática inteira fecha em 96,5% do que come.
