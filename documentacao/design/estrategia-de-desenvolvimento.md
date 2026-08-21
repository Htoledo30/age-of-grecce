# Estratégia de desenvolvimento

## Princípio central

O projeto será construído em duas etapas conceituais:

1. criar um esqueleto completamente jogável;
2. aprofundar um sistema de cada vez, escolhendo a prioridade conforme o estado real do
   jogo.

Não existe uma ordem fixa para os patches posteriores. Batalha, comércio, diplomacia,
política, personagens ou qualquer outro sistema só receberão prioridade depois que o
esqueleto estiver funcionando e for possível jogar e avaliar o que realmente faz falta.

Exemplo: depois de terminar o esqueleto, pode ficar evidente que o combate é a parte mais
fraca ou mais interessante. Nesse caso, o primeiro grande ciclo de expansão será focado
em batalha. Se o comércio parecer mais urgente, ele poderá vir primeiro. A decisão será
tomada jogando, não seguindo antecipadamente um roadmap rígido.

## O que significa esqueleto jogável

O esqueleto deve formar um ciclo completo de campanha, mesmo usando regras provisórias,
interface simples e pouca variedade de conteúdo.

O jogador precisa conseguir:

- iniciar uma campanha;
- escolher um dos poderes disponíveis;
- navegar pelo mapa;
- selecionar e inspecionar províncias;
- entender quem controla cada território;
- passar o turno;
- possuir algum recurso genérico para tomar decisões;
- criar ou controlar uma força militar simples;
- mover essa força entre províncias válidas;
- entrar em guerra;
- resolver uma batalha por um método provisório;
- conquistar e perder províncias;
- eliminar poderes e também ser eliminado;
- enfrentar poderes controlados por uma IA básica;
- salvar e continuar a campanha.

Quando esse ciclo existir, haverá um jogo funcional. Ele ainda poderá ser simples, feio
ou desbalanceado, mas será possível jogar uma campanha e descobrir quais sistemas
merecem profundidade.

### Situação no patch 0.0.1

| parte do ciclo                                   | situação                                    |
| ------------------------------------------------ | ------------------------------------------- |
| iniciar campanha e escolher Atenas               | feito                                       |
| navegar, selecionar e inspecionar o mapa         | feito                                       |
| turno, economia, construções e população         | feito na primeira fatia de cinco províncias |
| recrutar, mover, combater, sitiar e conquistar   | feito com regras terrestres provisórias     |
| propriedade mutável, perda de terra e eliminação | feito                                       |
| escolher qualquer um dos 148 poderes             | a fazer                                     |
| IA sob as mesmas regras                          | a fazer                                     |
| guerra, paz e diplomacia mínimas                 | a fazer                                     |
| derrota, domínio e fim da campanha               | a fazer                                     |
| salvar e continuar                               | a fazer                                     |

O esqueleto, portanto, já possui um **ciclo local testável**, mas ainda não uma campanha
completa. O próximo trabalho deve fechar as linhas ausentes, sem aprofundar todos os
sistemas que já funcionam ao mesmo tempo.

## Sistemas provisórios são permitidos

Durante a construção do esqueleto, uma solução simples é preferível a um sistema grande
e incompleto.

Exemplos que orientaram a construção — alguns já foram substituídos por sistemas reais:

- renda pode começar em poucas províncias autoradas;
- exércitos podem ser representados apenas por quantidade de homens;
- combate pode usar uma conta determinística simples, sem terreno enquanto o relevo for
  apenas visual;
- guerra e paz podem usar regras mínimas;
- IA pode avaliar somente vizinhos, força relativa e oportunidades;
- produtos comerciais podem ser preenchidos região por região;
- tecnologias e personagens podem não existir.

Essas soluções não representam necessariamente o design final. Elas existem para fechar
o ciclo jogável e permitir testes reais.

## Sem melhorias específicas prematuras

Não serão criadas antecipadamente árvores separadas de melhorias para cada produto,
unidade, cultura ou região.

Na economia, por exemplo, madeira, ferro, vinho, azeite, mármore e outros produtos podem
começar apenas com valores comerciais diferentes. Serrarias, minas avançadas, vinhedos,
oficinas e cadeias produtivas só serão considerados quando o comércio ou a economia se
tornarem uma prioridade escolhida.

O mesmo princípio vale para todos os sistemas:

- não criar dezenas de unidades antes de o movimento militar funcionar;
- não criar diplomacia complexa antes de guerra e paz básicas existirem;
- não criar eventos de personagens antes de haver uma campanha persistente;
- não criar combate naval antes de o combate terrestre básico ser testável;
- não criar conteúdo exclusivo para 148 poderes antes de os sistemas compartilhados
  funcionarem.

## Como escolher a expansão seguinte

Depois que o esqueleto estiver pronto, a próxima prioridade será escolhida por perguntas
práticas:

- Qual parte está impedindo a campanha de ser divertida?
- Qual sistema produz mais decisões interessantes para o jogador?
- O que está repetitivo ou superficial?
- O que o mapa e os 148 poderes estão pedindo naturalmente?
- Qual melhoria pode ser concluída e testada sem exigir cinco outros sistemas?
- O que o desenvolvedor está mais motivado a aprofundar naquele momento?

Motivação também é um critério válido. Um projeto independente precisa continuar
interessante de desenvolver.

## Possíveis focos posteriores, sem ordem definida

- batalha e variedade militar;
- comércio e produtos provinciais;
- diplomacia, alianças e tratados;
- formação de ligas e reinos;
- estabilidade e integração territorial;
- marinhas, bloqueios e desembarques;
- líderes, personagens e sucessões;
- construções e desenvolvimento provincial;
- tecnologias;
- culturas, religiões e santuários;
- eventos e conteúdo regional;
- interface, apresentação e qualidade de vida.

Esta lista é um conjunto de possibilidades, não um cronograma.

## Regras de controle de escopo

1. Primeiro fechar o ciclo jogável.
2. Não aprofundar um sistema que ainda não é necessário ao ciclo.
3. Usar soluções provisórias substituíveis quando elas permitirem testar o jogo antes.
4. Escolher apenas um grande foco de expansão por vez.
5. Não comprometer agora a ordem dos patches posteriores.
6. Reavaliar prioridades jogando a versão atual.
7. Preservar os dados e sistemas compartilhados para evitar trabalho repetido.
8. Uma ideia documentada não é automaticamente uma funcionalidade prometida.

## Critério para considerar o esqueleto concluído

O esqueleto estará pronto quando for possível começar com qualquer poder, disputar
territórios contra a IA, ver potências crescerem ou desaparecerem, chegar a uma condição
de derrota ou domínio e salvar a campanha para continuar depois.

Somente então será decidido qual será o foco do primeiro grande patch de expansão.
