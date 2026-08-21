# Revisão das ilhas e províncias insulares

## Situação: aplicada em 2026-08-20

Feito, com os critérios de aceitação conferidos:

| antes | depois |
|---|---|
| 208 províncias, 150 poderes | 205 províncias, 148 poderes |
| 46 componentes sem dono (1.249 km²) | **zero** — 47 ilhas anexadas por marcador |
| Rodes em 3 províncias e 3 poderes | Rodes em 1 |
| menor província 31 km² (Tenedos) | 31 km² (Tenedos, mantida de propósito) |

Verificado por contagem de pixels, não por olho: **zero pixels de terra com índice 0**,
205 índices distintos no mapa, nenhum índice vazando pra água, malha continental intacta
(Atenas continua com 469 km² e 4 vizinhas). Capturas em `capturas/ilhas-mundo.png` e
`capturas/ilhas-egeu.png`.

**Duas decisões divergiram da recomendação, de propósito:**

- **Lesbos continua com duas províncias.** A régua de tamanho pediria uma, mas cada
  metade tem 775 e 864 km² — maiores que a maioria das províncias cicládicas e fáceis de
  clicar — e o corte Mitilene/Metimna é o que pesou na história da ilha. Fácil de
  reverter: é uma linha em `ferramentas/montar-provincias.py`.
- **Egina, Tenedos, Míconos, Ítaca e Tera continuam sozinhas** apesar de estarem abaixo
  de 100 km². São as exceções por peso histórico que o próprio documento prevê: potência
  naval arcaica, guarda da boca do Helesponto, dona de Delos, casa de Odisseu e mãe de
  Cirene.

O resto do documento é o raciocínio original e fica como está.

---

## Para a Claude

Leia este documento antes de alterar as ilhas ou regenerar as províncias. O objetivo é
corrigir a legibilidade e a atribuição política das ilhas sem esvaziar visualmente o
Egeu e sem redesenhar desnecessariamente a malha continental.

Não trate esta tarefa como uma exigência de fidelidade histórica absoluta. O jogo começa
em 700 a.C., mas prioriza clareza, jogabilidade e escopo controlado.

## Problema observado

O mapa atual possui **208 províncias e 150 poderes**, mas a camada insular apresenta dois
problemas diferentes:

1. **Ilhotas sem província ou dono:** 46 componentes de terra, somando aproximadamente
   1.249 km², não receberam nenhuma semente. Na camada política aparecem como pequenas
   manchas da cor original do terreno, parecendo erro ou território esquecido.
2. **Províncias pequenas demais para leitura confortável:** algumas ilhas muito pequenas
   são poderes independentes, e algumas ilhas médias foram divididas em várias
   províncias. No mapa afastado é difícil perceber que são territórios selecionáveis e,
   em alguns casos, distinguir suas fronteiras.

Exemplos das menores províncias atuais:

| Província | Área aproximada |
|---|---:|
| Tenedos | 31 km² |
| Escíatos | 42 km² |
| Serifos | 63 km² |
| Tera | 69 km² |
| Egina | 70 km² |
| Sifnos | 73 km² |
| Míconos | 81 km² |
| Ítaca | 82 km² |
| Astipaleia | 86 km² |
| Escópelos | 88 km² |

Rodes, com cerca de 1.384 km² representados no mapa, está dividida atualmente em:

- Lindos: aproximadamente 650 km²;
- Camiro: aproximadamente 492 km²;
- Ialiso: aproximadamente 242 km².

A divisão possui justificativa histórica, mas não é obrigatória para o design do jogo e
gera três fronteiras e três poderes num espaço visual relativamente pequeno.

## Decisão de design recomendada

Separar três conceitos que hoje estão misturados:

1. **ilha desenhada:** forma geográfica que continua aparecendo no mapa;
2. **ilha jogável:** território grande ou importante o suficiente para ser selecionado;
3. **província:** unidade administrativa, que pode conter uma ilha inteira ou um
   arquipélago de várias ilhas desconectadas.

Uma ilha pequena não precisa desaparecer do mapa apenas porque não merece uma província
própria. Ela pode continuar visível e pertencer politicamente à província de uma ilha
maior próxima.

### Regra prática inicial

- Ilhas grandes, acima de aproximadamente 2.000 km², podem ser divididas em várias
  províncias se os cortes forem legíveis e úteis.
- Ilhas médias, entre aproximadamente 100 e 2.000 km², devem normalmente formar uma
  única província por ilha.
- Ilhas pequenas, abaixo de aproximadamente 100 km², devem normalmente ser anexadas a
  uma província insular próxima ou agrupadas em um arquipélago.
- Exceções históricas ou estratégicas podem existir, mas precisam ser deliberadas e
  continuar fáceis de selecionar.

Esses valores servem para auditoria, não como corte automático absoluto. Área sozinha
não mede legibilidade: formato estreito, distância dos vizinhos e tamanho em pixels no
zoom de jogo também importam.

## Tratamento recomendado por categoria

### Ilhas grandes

Manter múltiplas províncias onde a divisão é visualmente clara e cria decisões úteis.

- Creta com oito províncias: manter por enquanto.
- Eubeia com quatro províncias: manter por enquanto.

### Ilhas médias

Preferir uma província por ilha durante a construção do esqueleto.

- Rodes: consolidar em uma província chamada **Rodes**.
- Lesbos: revisar as duas divisões; preferir uma só se a fronteira não acrescentar uma
  decisão importante.
- Chios, Samos, Cós, Naxos, Paros, Thasos e ilhas semelhantes: uma província por ilha.

No caso de Rodes, preservar **Lindos, Ialiso e Camiro** como nomes disponíveis para
futuras cidades, assentamentos ou conteúdo regional. Eles não precisam continuar como
províncias independentes no esqueleto.

Unificar Rodes reduz dois poderes iniciais. O número 150 não é uma meta rígida; a decisão
central é preservar alta fragmentação e história emergente, não conservar uma contagem
exata quando ela prejudica a leitura.

### Ilhas pequenas

- Manter a forma geográfica no terreno.
- Não criar automaticamente uma facção para cada ilha.
- Agrupar ilhas próximas sob uma província de arquipélago ou anexá-las à ilha principal
  mais coerente.
- Exemplos possíveis de agrupamento: Espórades, Cíclades Menores e ilhas menores do
  Dodecaneso.
- Manter uma ilha pequena independente apenas quando houver uma razão clara de gameplay
  e um método confortável de seleção.

### Ilhotas decorativas

Ilhotas insignificantes podem permanecer apenas como geografia. Mesmo assim, na camada
política elas não devem parecer buracos acidentais entre territórios coloridos.

Preferência: atribuir seu índice político à província insular mais próxima e coerente,
sem transformá-las em novas províncias e sem criar adjacência terrestre através do mar.

Remover completamente uma ilha da costa deve ser o último recurso, reservado a ruído
cartográfico ou formas pequenas demais para aparecer de maneira estável. Não aumentar o
limite global de área sem uma lista de exceções, pois isso poderia apagar ilhas pequenas
mas visual ou historicamente importantes.

## Orientação técnica

O gerador atual espalha cada semente somente pelo componente terrestre em que ela está.
Isso é correto e impede províncias de atravessarem o mar, mas deixa qualquer componente
sem semente com índice zero.

### Não permitir crescimento normal através da água

Não altere o Dijkstra para atravessar água procurando a ilha mais próxima. Isso poderia
criar anexações imprevisíveis, falsas vizinhanças e mudanças globais na malha.

### Trabalhar por componente terrestre

Depois do crescimento das sementes:

1. identificar todos os componentes terrestres conectados;
2. calcular para cada componente área, centro e províncias presentes;
3. detectar componentes sem nenhuma semente ou índice político;
4. atribuir o componente inteiro a uma província explicitamente escolhida;
5. manter essa atribuição separada da lista de vizinhas terrestres.

Uma mesma província pode ocupar polígonos desconectados por água. No formato atual isso
é possível: basta gravar o mesmo índice da província em todas as ilhas anexas. Como a
vizinhança é calculada por contato entre pixels terrestres, a ilha anexa não deve criar
uma falsa fronteira terrestre com sua ilha principal.

### Dados explícitos, não decisões invisíveis

Registrar as anexações insulares em dados de autoria. Uma possibilidade é permitir que
uma província declare marcadores de componentes anexos:

```json
{
  "id": "naxos",
  "nome": "Naxos",
  "anexosInsulares": [
    { "lon": 25.62, "lat": 36.92 }
  ]
}
```

Cada marcador aponta para uma ilha sem semente; o gerador encontra o componente de terra
na coordenada e atribui todo o componente ao índice daquela província.

O nome do campo e o formato podem ser ajustados à arquitetura existente, mas a decisão
precisa permanecer legível e versionada. Não depender apenas da ilha mais próxima, pois
proximidade geográfica nem sempre corresponde ao agrupamento desejado.

Uma ferramenta automática pode sugerir a província mais próxima para as 46 ilhotas, mas
o resultado deve gerar um relatório para revisão antes de ser aceito.

### Consolidação de Rodes

Para transformar Rodes em uma província:

1. substituir as três sementes provinciais por uma semente `rodes`;
2. criar ou consolidar um único poder inicial para a ilha;
3. manter os nomes Lindos, Ialiso e Camiro documentados para assentamentos futuros;
4. regenerar o mapa de índices e a lista de vizinhas;
5. confirmar que toda a ilha possui um único índice;
6. remover referências órfãs aos poderes ou províncias antigos nos dados gerados e
   testes.

Não é necessário preservar compatibilidade com saves neste momento, porque ainda não há
campanhas persistentes.

## Seleção e interface futura

Mesmo após os agrupamentos, algumas províncias insulares continuarão pequenas no mapa
afastado. A seleção futura deve considerar:

- área mínima de clique maior que a silhueta visível da ilha;
- marcador ou rótulo que apareça com o zoom adequado;
- destaque claro da ilha ou do arquipélago inteiro;
- possibilidade de uma província destacar várias ilhas desconectadas;
- nenhuma obrigação de selecionar microilhas quando o mapa estiver totalmente afastado.

O jogador pode precisar aproximar a câmera para selecionar territórios pequenos. Isso é
aceitável; exigir precisão de um ou dois pixels não é.

## Critérios de aceitação

Após a revisão:

- nenhuma ilha visível deve parecer acidentalmente esquecida pela camada política;
- todo componente terrestre deve estar atribuído ou explicitamente classificado como
  decorativo;
- não deve existir uma facção minúscula impossível de identificar ou selecionar;
- Rodes deve aparecer como uma única província, salvo nova decisão explícita do usuário;
- Creta e Eubeia devem manter suas subdivisões atuais nesta etapa;
- ilhas pequenas agrupadas devem receber a mesma cor e o mesmo índice de sua província;
- anexos insulares não devem criar adjacências terrestres falsas;
- a malha continental não deve mudar como efeito colateral;
- o gerador deve relatar zero componentes sem tratamento;
- devem ser geradas capturas do mapa inteiro e do Egeu aproximado para comparação.

## Verificação recomendada

1. Registrar antes e depois: quantidade de províncias, poderes, componentes sem dono e
   área não atribuída.
2. Rodar o gerador de províncias.
3. Validar os JSON gerados e a lista de vizinhas.
4. Gerar uma prévia do mundo inteiro.
5. Gerar uma prévia aproximada das Cíclades, do Dodecaneso e de Rodes.
6. Confirmar visualmente que não existem pontos de terra sem cor política.
7. Rodar `npm run verificar`.

## Resumo da abordagem

Não apagar o Egeu e não transformar toda ilha em país.

> Ilhas grandes podem ter várias províncias; ilhas médias normalmente têm uma; ilhas
> pequenas são agrupadas; ilhotas continuam visíveis, mas pertencem politicamente a uma
> província maior.

Essa solução preserva a geografia, reduz ruído visual, melhora a seleção e mantém a alta
fragmentação onde ela realmente produz gameplay.
