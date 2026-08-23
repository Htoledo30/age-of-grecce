# Histórico de versões

Todas as mudanças relevantes do Age of Grecce serão registradas aqui. O projeto ainda está
em pré-alpha; portanto, sistemas e dados podem mudar bastante entre versões.

O processo completo está em [documentacao/versionamento.md](documentacao/versionamento.md).

## Não lançado

## 0.0.3 — 2026-08-23 — Economia física básica

Os produtos deixaram de ser só uma parcela de dinheiro: a terra passou a dar coisa, e a
coisa fica guardada na província que a produziu.

### Adicionado

- **a terra passou a dar coisa, e não só dinheiro**: cada província da região de teste
  colhe por turno unidades do seu recurso principal **e** do secundário, e elas entram no
  estoque da própria província. O quanto sai depende do potencial natural da terra e de
  quanta gente mora ali — recrutar mil homens hoje faz a colheita do ano que vem encolher;
- a ficha da província mostra o que ela colhe por turno, e a dica de tela abre o
  detalhamento: quanto de cada produto sai por ano e quanto já está guardado.

### Alterado

- o recurso secundário deixou de ser decorativo: ele não entra na renda em moeda, mas
  produz unidades como o principal;
- a economia em moeda continua intacta ao lado da física — nada do que é colhido vira
  dinheiro, comida ou pedra ainda. Consumo, mercado e dinheiro têm patches próprios.

## 0.0.2 — 2026-08-23 — Fechamento da guerra básica

O ciclo de guerra terrestre fecha: sitiar deixou de ser um assalto lento, o sitiado passou
a ter resposta, a muralha passou a valer por duas coisas e a rodada passou a contar o que
aconteceu.

### Adicionado

- **crônica da rodada**: passar o turno agora conta o que aconteceu — quem lutou onde,
  quem venceu, quantos ficaram de pé, que milícia caiu, que província trocou de dono e que
  cerco começou ou acabou. Antes a guerra era resolvida em silêncio: a hoste derrotada
  simplesmente sumia do mapa e o jogador tinha que deduzir o resto. A nota some sozinha nas
  rodadas em que nada acontece;
- **surtida**: a cidade sitiada agora pode sair para atacar quem a cerca. Sentar-se diante
  dos muros deixou de ser uma decisão só do atacante — vencendo, o defensor levanta o
  cerco; perdendo, fica sem a hoste que saiu e continua cercado. A milícia não sai junto:
  ela defende a cidade, não vai a campo;
- exército de socorro que entra numa província sitiada já entra lutando. Antes ele
  acampava ao lado do inimigo sem tocá-lo, e um cerco não podia ser quebrado de fora;
- **a Muralha passou a valer por duas coisas**: além de dobrar a milícia, ela impede o
  assalto imediato. Cidade aberta cai no primeiro golpe; cidade murada obriga o inimigo a
  ficar duas rodadas acampado na frente dela antes de poder subir os muros — e a contagem
  zera se ele sair;
- Tanagra começa com Muralha e Elêusis não: os dois vizinhos de Atenas passaram a ser o
  mesmo problema em duas versões, a praça que se toma no impulso e a que exige paciência;
- as cinco províncias da região de teste ganharam ficha completa: de que povo é a
  população, como ela se sente, o segundo produto da terra, o que está guardado no
  celeiro, o que já está de pé em 700 a.C. e se a costa abriga navio;
- Elêusis e Tanagra começam com Quartel — elas já mantinham 500 homens em armas, e tropa
  de pé sem lugar de treinar não se sustentava;
- a ficha da província passou a mostrar o povo que mora ali (e não só o povo de quem
  governa), o humor em palavras, o recurso secundário e quantos turnos de comida a
  despensa aguenta;
- Elêusis e Tanagra começam com população de povo misturado — 15% ateniense em cada uma —
  para que a tensão entre governante e governados tenha de onde nascer quando Atenas
  tomar uma delas.

### Alterado

- marchar para o próprio território deixou de declarar postura de ataque: mandar uma hoste
  para a cidade sitiada rebaixava o assalto do inimigo a cerco, sem nada ter sido lutado;
- sitiar deixou de provocar batalha: o exército que senta diante de uma cidade acampa ao
  lado da guarnição dela sem engajá-la, e as duas forças convivem na mesma província.
  Antes, escolher sitiar significava lutar com o exército inimigo e só então acampar, o
  que tornava o cerco um assalto com um passo a mais;
- o cerco passou a ser levantado pela saída do sitiante, e não pela presença do dono —
  senão o defensor quebraria o cerco de graça, bastando ter uma hoste em casa;
- província despovoada deixou de cair quando há exército do dono nela: sem milícia, é o
  exército que fecha o portão;
- o friso grego deixou de aparecer somente no topo e passou a contornar os quatro lados
  dos principais painéis da interface, com traço fino e baixo contraste para não competir
  com o conteúdo;
- o Quartel recebeu um símbolo próprio de escudo e lança, legível no tamanho compacto do
  menu de construções.
- hostes passaram a possuir identidade e posição próprias, permitindo que a estrutura
  represente mais de uma força na mesma província quando uma regra futura exigir;
- o mapa passou a desenhar uma peça por exército, e não uma por província: numa cidade
  sitiada o jogador vê as duas forças e comanda a sua clicando nela. Antes, o marcador do
  sitiante ficava escondido atrás do da guarnição inimiga e o painel dele era
  inalcançável — dava para mandar sitiar, mas não para mandar assaltar depois.

## 0.0.1 — 2026-08-21

Primeiro retrato jogável do projeto.

### Adicionado

- mapa fixo inspirado na Grécia antiga, com 205 províncias, 53 regiões e 148 poderes
  iniciais;
- menu **Iniciar jogo** e seleção de Atenas como primeira campanha testável;
- seleção de província, propriedade mutável e eliminação de poderes sem território;
- economia autoral para as cinco províncias do primeiro recorte de teste: Atenas, Maratona,
  Sunião, Elêusis e Tânagra;
- arrecadação por impostos, produção e comércio, com população, investimento temporário e
  crescimento demográfico;
- seis construções: Ágora, Oficina, Mercado, Celeiro público, Quartel e Muralha;
- recrutamento por controle deslizante, pagamento em ouro e população, uma rodada de
  formação, manutenção, deserção e dispensa;
- hostes no mapa, destacamentos parciais, ordens de marcha de uma fronteira e resolução
  simultânea ao passar a rodada;
- batalha terrestre determinística, milícia, muralha, assalto, cerco, conquista e exílio;
- feedback visual de movimento, destinos, rotas, ordens e resolução;
- interface de estratégia com linguagem visual inspirada na Grécia antiga, painéis
  contextuais e ícones próprios;
- testes unitários, testes de tela e ferramentas de validação dos dados e do mapa.

### Limites conhecidos

- somente Atenas pode ser escolhida pelo jogador;
- a economia autoral cobre apenas cinco províncias;
- ainda não existem IA estratégica, diplomacia, guerra naval, zonas marítimas, salvamento,
  condições finais de vitória ou derrota e realce de todo o reino selecionado.
