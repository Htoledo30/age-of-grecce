# Histórico de versões

Todas as mudanças relevantes do Age of Grecce serão registradas aqui. O projeto ainda está
em pré-alpha; portanto, sistemas e dados podem mudar bastante entre versões.

O processo completo está em [documentacao/versionamento.md](documentacao/versionamento.md).

## Não lançado

### Alterado

- o friso grego deixou de aparecer somente no topo e passou a contornar os quatro lados
  dos principais painéis da interface, com traço fino e baixo contraste para não competir
  com o conteúdo;
- o Quartel recebeu um símbolo próprio de escudo e lança, legível no tamanho compacto do
  menu de construções.
- hostes passaram a possuir identidade e posição próprias, permitindo que a estrutura
  represente mais de uma força na mesma província quando uma regra futura exigir.

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
