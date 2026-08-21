# Recursos materiais e estoques

## Estado da ideia

**Proposta guardada para desenvolvimento futuro. Não está implementada e ainda não
substitui a economia atual.**

Esta ideia transforma os produtos provinciais em mercadorias físicas. Em vez de o
produto existir somente como uma parcela abstrata de dinheiro, cada província gera uma
quantidade de unidades do produto que pode ser armazenada, utilizada ou vendida.

A implementação deverá acontecer somente quando o combate básico mostrar quais recursos
e consumos realmente fazem sentido.

## Objetivo

O sistema deve conectar economia, território e guerra:

- províncias produzem excedentes concretos;
- investimentos aumentam temporariamente a produção;
- exércitos e construções podem consumir determinados materiais;
- territórios com recursos úteis tornam-se objetivos estratégicos;
- poderes sem determinado recurso podem obtê-lo pelo comércio;
- guerra, cerco e bloqueio podem futuramente interromper abastecimento.

O objetivo não é criar uma cadeia industrial complexa. O jogador precisa compreender
facilmente o que produz, o que consome e o que está faltando.

## Mudança conceitual da produção

Hoje, o valor econômico do produto multiplicado pelo nível provincial gera diretamente
uma parcela monetária. Na proposta futura, quantidade física e valor comercial passam a
ser conceitos diferentes.

Cada produto teria pelo menos:

- **quantidade-base:** quantas unidades são produzidas por nível;
- **valor unitário:** quanto vale vender uma unidade.

Cada província continuaria tendo:

- exatamente um produto principal;
- um nível natural fixo de 1 a 5;
- um modificador comercial;
- um possível incentivo temporário.

A fórmula conceitual seria:

```text
produção física =
    quantidade-base do produto
  × nível provincial
  × (1 + bônus do investimento)
```

O nível representa a abundância e a eficiência natural daquela produção. Investir não
muda o produto nem eleva permanentemente o nível; apenas aumenta a quantidade extraída
durante determinado número de arrecadações.

## Exemplos conceituais

### Maratona

```text
Produto: Grãos
Quantidade-base: 8
Nível: 3
Produção normal: 24 unidades de alimento
Produção com +25%: 30 unidades de alimento
```

### Sunião

```text
Produto: Metais preciosos
Quantidade-base: 1
Nível: 5
Produção normal: 5 unidades
Valor unitário: alto
```

Esses exemplos não são valores de balanceamento aprovados. Eles demonstram por que
quantidade e preço precisam ser separados: grãos podem existir em grande volume e valer
pouco por unidade, enquanto metais preciosos aparecem em pequeno volume e valem muito.

## Produtos estratégicos e comerciais

Nem todo produto precisa possuir uma mecânica própria imediatamente.

### Primeiros recursos estratégicos candidatos

| recurso | uso inicial possível                           |
| ------- | ---------------------------------------------- |
| comida  | abastecimento e manutenção de forças militares |
| madeira | construções e, futuramente, navios             |
| ferro   | equipamentos, melhorias e tropas avançadas     |

### Produtos inicialmente comerciais

- vinho;
- azeite;
- mármore;
- metais preciosos.

Esses produtos podem ser vendidos principalmente por dinheiro. Mármore e metais
preciosos poderão adquirir usos adicionais quando monumentos, prestígio ou construções
especiais existirem.

Grãos e gado podem alimentar a categoria estratégica **comida**, mesmo continuando como
produtos provinciais diferentes. Madeira e ferro já correspondem diretamente a recursos
estratégicos.

## Tecidos e produtos fabricados

Tecidos não deverão ser adicionados como recurso natural nesta primeira etapa. Criá-los
corretamente exigiria matéria-prima, oficina, transformação e possivelmente mão de obra:
uma cadeia produtiva inteira.

Enquanto esse sistema não existir, melhorias de tropas poderão usar ferro, dinheiro e
outros requisitos simples. Tecidos, armas prontas, cerâmica e navios continuam como
possíveis resultados futuros de oficinas e construções, não como produtos naturais
soltos no mapa.

## Estoque nacional primeiro

Na primeira versão, os recursos devem entrar em um **estoque do poder**, e não permanecer
em depósitos individuais por província.

Isso reduz microgerenciamento e evita implementar transporte e logística antes do
combate. Rotas, distância, portos, cercos e bloqueios podem futuramente limitar o acesso
ao estoque ou interromper a chegada da produção.

O painel nacional deverá mostrar, para cada recurso acompanhado:

```text
estoque anterior
+ produção do turno
+ compras
- consumo
- vendas
= estoque atual
```

Toda quantidade deve continuar sendo inteira e explicável.

## Proteção dos pequenos poderes

O início da campanha possui muitos poderes com somente uma província. Como cada
província tem um único produto principal, exigir vários recursos de todas as ações
quebraria grande parte das facções antes de o comércio existir.

Regras de proteção necessárias:

1. **Subsistência implícita.** O produto principal representa o excedente estratégico ou
   comercial da província. A população local não sobrevive exclusivamente daquele único
   produto mostrado na ficha.
2. **Ações básicas sempre disponíveis.** Tropas básicas e construções essenciais devem
   exigir dinheiro e população, sem depender de uma combinação rara de materiais.
3. **Recursos fortalecem ações avançadas.** Ferro pode ser necessário para equipamento
   melhor, e madeira para grandes obras ou navios, sem bloquear o começo da campanha.
4. **Compra de faltantes.** Um poder pode comprar recursos que não produz, inicialmente
   por uma regra simples e preço previsível.
5. **Mesmas regras para jogador e IA.** A IA também produz, consome, compra e vende sem
   receber recursos secretos.

Assim, uma cidade produtora de vinho vende seu excedente e compra ferro. Uma cidade com
ferro possui vantagem militar potencial, mas ainda precisa conseguir dinheiro e
alimento. Especialização cria dependência e estratégia, não paralisia.

## Relação com a economia monetária

Recursos físicos não podem gerar dinheiro duas vezes sem explicação. Antes da
implementação, será preciso escolher uma regra clara para produção, consumo e venda.

Uma direção possível:

1. a província produz unidades físicas;
2. necessidades estratégicas consomem parte dessas unidades;
3. o excedente pode ser armazenado ou vendido;
4. unidades vendidas geram renda conforme valor unitário e capacidade comercial.

```text
excedente vendável = produção - consumo - quantidade reservada
renda da venda = excedente vendido × valor unitário × eficiência comercial
```

Essa direção é coerente, mas exige interface e comportamento de IA. Não deve substituir
a fórmula monetária atual até existir uma fatia funcional que permita testar todo o
ciclo.

Uma alternativa provisória seria manter a renda monetária atual e introduzir somente um
pequeno excedente estratégico paralelo. Essa solução é mais simples, porém precisará
explicar por que a mesma produção entrega dinheiro e material ao mesmo tempo.

## Compra e venda

Um comércio mínimo precisa existir antes de materiais virarem requisitos rígidos.

Primeira versão possível:

- preços-base fixos por produto;
- compra imediata por preço superior ao valor normal;
- venda automática ou manual do excedente;
- nenhuma simulação global de oferta e demanda;
- nenhuma rota individual entre comerciantes.

Posteriormente, posição, portos, tratados, distância, guerra e bloqueios podem modificar
preços e disponibilidade.

## Relação com o investimento atual

O sistema de investimento permanece. Sua função muda de bônus monetário direto para
aumento temporário da produção física:

```text
antes: investimento -> mais renda produtiva
depois: investimento -> mais unidades produzidas
```

Exemplos de decisões futuras:

- incentivar Maratona antes de uma guerra para acumular comida;
- intensificar madeira antes de iniciar grandes construções;
- aumentar temporariamente a extração de ferro para equipar novas forças;
- incentivar azeite ou metais preciosos para vender mais excedente.

O bônus máximo, custo, duração e apresentação do retorno poderão continuar usando o
sistema atual como ponto de partida, mas precisarão ser recalibrados depois que cada
unidade de recurso possuir preço e uso reais.

## Escassez sem espiral de morte

Faltar um recurso deve criar dificuldade, não destruir automaticamente uma campanha.

No caso da comida, uma escassez militar pode produzir efeitos graduais, como:

- menor recuperação;
- menor movimento;
- queda de moral;
- aumento do custo de manutenção;
- impossibilidade de reforçar determinadas forças.

Tropas não devem desaparecer instantaneamente porque o estoque chegou a zero. O efeito
exato dependerá do futuro sistema de combate e abastecimento.

## Riscos

### Complexidade de balanceamento

Cada recurso adiciona produção, estoque, preço, consumo, compra, venda, interface e
comportamento de IA. Por isso a primeira versão deve acompanhar poucos recursos
estratégicos.

### Bloqueio de facções

Requisitos rígidos sem mercado favorecem aleatoriamente quem começou com ferro, madeira
ou grãos. Recursos devem abrir opções ou barateá-las antes de se tornarem exigências
absolutas.

### Microgerenciamento

Controlar manualmente estoque e venda em dezenas de províncias seria cansativo. O estoque
nacional e regras automáticas devem resolver a maior parte da rotina.

### Efeito bola de neve

Uma potência com vários recursos pode crescer mais rapidamente e adquirir ainda mais
território. Manutenção, integração, diplomacia, comércio e custos militares deverão
conter esse ciclo.

### Duplicação de valor

Produção física e renda monetária precisam pertencer à mesma conta. O jogador deve
conseguir verificar de onde vieram tanto as moedas quanto os materiais.

## Ordem segura de implementação

1. concluir o combate básico usando dinheiro e população;
2. separar nos dados a quantidade-base e o valor unitário dos produtos;
3. criar o estoque nacional;
4. fazer o investimento aumentar a quantidade produzida;
5. implementar compra e venda simples para evitar bloqueios;
6. conectar somente comida ao exército e testar;
7. adicionar madeira às construções quando elas existirem;
8. adicionar ferro a equipamentos e tropas avançadas;
9. avaliar comércio por rotas, bloqueios e estoques locais apenas depois.

Cada etapa precisa ser jogável e testável isoladamente. A existência deste documento não
torna todas as etapas funcionalidades prometidas.

## Decisões em aberto

- quais produtos geram a categoria comida;
- quanto de cada produção entra no estoque ou é vendido;
- se a venda será automática, manual ou configurável;
- como um poder compra recursos ausentes;
- quais ações básicas ignoram materiais;
- quais unidades ou melhorias exigem ferro;
- quando madeira passa a ser necessária;
- como escassez de comida afeta exércitos;
- capacidade máxima dos estoques e necessidade de armazéns;
- efeitos de distância, rotas, cercos e bloqueios;
- como a IA escolhe reservas, compras, vendas e investimentos.

Essas decisões devem esperar o desenho do combate, das construções e do comércio.
