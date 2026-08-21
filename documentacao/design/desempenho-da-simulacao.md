# Desempenho futuro da simulação

## Situação: diretriz futura, não implementação autorizada

Estas ideias devem orientar a expansão da IA, da diplomacia e da resolução de rodadas.
Elas **não justificam otimizar o esqueleto atual antes de medir**: 205 províncias e 148
poderes ainda são uma escala pequena para operações simples. Primeiro se implementa a
regra corretamente e de forma determinística; depois um perfil identifica onde o tempo é
realmente gasto.

No patch `0.0.1`, a resolução terrestre é síncrona e ainda não existe IA. Isso é adequado
enquanto passar o turno permanece imediato; Web Worker não é requisito preventivo.

## Objetivo

Ao clicar em **Passar o turno**, a simulação pode demorar sem congelar a interface. O mapa,
uma animação de processamento e o cancelamento seguro da operação devem continuar
responsivos enquanto economia, IA, diplomacia e ordens são resolvidas.

## 1. Resolução em fases

A passagem da rodada deve ser uma sequência explícita, com entradas e saídas bem definidas:

1. fechar e validar as ordens recebidas;
2. atualizar economia e população;
3. decidir ordens da IA;
4. resolver movimentos e batalhas;
5. atualizar diplomacia e demais sistemas;
6. aplicar os resultados ao estado e abrir a rodada seguinte.

Dividir em fases melhora organização, teste, medição e exibição de progresso. Isso não
significa distribuir sistemas por intervalos artificiais de milissegundos: cada fase leva
o tempo necessário e informa quanto do trabalho foi concluído.

⚠️ **Determinismo continua obrigatório.** Mesma campanha, mesmas ordens e mesma semente
devem produzir o mesmo resultado, independentemente de a fase rodar na thread principal
ou em outro núcleo.

## 2. Corte de decisões inúteis

Uma IA não deve avaliar todos os poderes e todas as províncias quando a maioria não pode
interagir com ela. Cada sistema define o seu próprio alcance:

- movimento consulta províncias alcançáveis;
- ameaça militar considera fronteiras, rotas e forças próximas;
- comércio considera parceiros conectados por uma rota válida;
- diplomacia considera poderes conhecidos ou dentro do alcance diplomático;
- decisões raras podem ser avaliadas em intervalos maiores que um turno.

O filtro deve eliminar candidatos impossíveis **antes** de pontuá-los. Distância não pode
ser o único critério: uma potência distante ligada por mar pode importar mais que uma
vizinha terrestre bloqueada.

## 3. Dados separados da apresentação

O estado usado pela simulação deve conter dados serializáveis — ids, números, enumerações
e pequenos registros — sem DOM, Pixi, callbacks ou métodos visuais. A interface apenas lê
uma vista desse estado.

Para cálculos realmente quentes, estruturas orientadas a dados podem ser úteis:

```ts
// índice numérico da província -> índice numérico do poder
const donoPorProvincia = new Uint16Array(quantidadeDeProvincias);
```

Isso não significa substituir preventivamente todo objeto e toda classe por arrays.
Registros legíveis são adequados para a escala atual. Arrays tipados entram quando um
perfil mostrar que um laço volumoso ou a transferência para um Worker se beneficia deles.

## 4. Grafo e cache de rotas

A vizinhança entre províncias já deve ser carregada uma vez como grafo. Busca terrestre
sem pesos usa fila/BFS; A* só é necessário quando distância, terreno ou custo tornam as
arestas diferentes.

Podem ser pré-calculados:

- vizinhos e componentes geográficos estáticos;
- distância topológica entre províncias;
- caminhos que dependam somente da geografia imutável.

Não se deve guardar eternamente uma rota cuja validade depende de fronteiras, guerra,
acesso militar, bloqueio ou construções. Esses resultados precisam de chave completa e
invalidação, ou devem ser recalculados. Um cache errado é pior que uma busca rápida.

Com 205 províncias, uma tabela de distâncias de todos para todos possui apenas 42.025
entradas e é viável se um sistema real precisar dela.

## 5. Web Workers

Um Web Worker será adotado quando a medição mostrar que uma fase pesada bloqueia a
interface. O candidato natural é o cálculo de decisões da IA e, depois, a resolução pura
da rodada.

Contrato recomendado:

```text
thread principal -> snapshot serializável + ordens + semente
worker           -> decisões/resultados serializáveis + progresso
thread principal -> valida e aplica o resultado ao estado da campanha
```

O Worker não toca no DOM, no mapa nem no estado vivo. Ele trabalha sobre um snapshot e
devolve resultado. Isso evita duas threads alterando a campanha ao mesmo tempo e permite
testar a mesma função sem navegador.

Custos que devem ser medidos antes da adoção:

- criação e manutenção do Worker;
- serialização ou cópia do snapshot;
- protocolo de mensagens, progresso, erro e cancelamento;
- versionamento do formato enviado;
- depuração e repetibilidade dos resultados.

Workers mantêm a interface responsiva; eles não tornam automaticamente um algoritmo ruim
mais rápido.

## Ordem de adoção

1. implementar regras puras, determinísticas e testadas;
2. medir tempo por fase com campanhas representativas;
3. eliminar candidatos impossíveis e trabalho repetido;
4. melhorar grafos, índices e caches comprovadamente úteis;
5. mover para Worker somente a fase que ainda bloquear a interface;
6. comparar o resultado e o tempo antes/depois.

## Critério prático

Não existe problema enquanto a interface permanece responsiva e a passagem de turno tem
latência aceitável. Antes de uma campanha justificar Web Workers, o projeto deve possuir
uma medição reproduzível mostrando qual fase custa quanto. A arquitetura deve estar pronta
para separar a simulação da tela, mas não pagar hoje a complexidade de um gargalo que ainda
não existe.
