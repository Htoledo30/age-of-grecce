# Estratégia de desenvolvimento

## Autoridade deste documento

Este texto explica a filosofia de desenvolvimento. Ele não define o patch autorizado nem
substitui as fontes de verdade da raiz:

- `PATCH_ATUAL.md` define o que pode ser implementado agora;
- `ROADMAP.md` define a sequência planejada;
- `DECISOES.md` registra decisões oficiais;
- `BACKLOG.md` guarda ideias sem autorização atual;
- `CLAUDE.md` descreve o jogo implementado.

Em caso de divergência, prevalece a fonte responsável pelo assunto, conforme `AGENTS.md`.

## Princípio central

O jogo será construído em patches `0.0.x` pequenos, jogáveis e testáveis. Cada patch deve
fechar um objetivo principal antes de o seguinte começar.

O projeto não precisa comprimir sua fundação em poucas versões. Pode haver quantos patches
`0.0.x` forem necessários até que a primeira campanha básica completa esteja pronta.

## O que significa esqueleto jogável

O esqueleto deve formar um ciclo completo de campanha, mesmo usando regras provisórias,
interface simples e pouca variedade de conteúdo.

Ao chegar ao marco `0.1.0`, o jogador precisa conseguir:

- iniciar uma campanha e escolher um poder;
- navegar, selecionar e compreender o mapa;
- administrar recursos e população;
- recrutar e mover forças;
- guerrear, sitiar, conquistar e perder territórios;
- enfrentar poderes controlados por IA sob as mesmas regras;
- chegar a uma condição de vitória ou derrota;
- salvar e continuar a campanha.

O `0.1.0` é o marco produzido pela soma dos patches anteriores, não um mega-patch separado.

## Sistemas provisórios são permitidos

Durante a fundação, uma solução simples é preferível a um sistema grande e incompleto.
Sistemas provisórios devem possuir contratos claros e ser substituídos apenas no patch que
autoriza essa mudança.

Exemplos:

- tropas podem continuar representadas por quantidade de homens antes dos tipos militares;
- combate pode permanecer determinístico antes de moral, terreno e generais;
- economia monetária atual permanece até o patch da economia física;
- conteúdo pode ser validado primeiro na região de teste oficial.

Uma solução provisória não autoriza aprofundamento antecipado.

## Ordem de trabalho

A sequência vigente está em `ROADMAP.md`. Ela existe para impedir que um sistema dependa de
outro ainda instável e para tornar cada mudança testável separadamente.

Ideias novas não interrompem automaticamente essa sequência:

1. verificar se são indispensáveis ao `PATCH_ATUAL.md`;
2. se forem, discutir e integrar conscientemente;
3. se não forem, registrar em `BACKLOG.md`;
4. continuar o patch atual.

Depois dos patches já ordenados no roadmap, as prioridades futuras ainda podem ser
reavaliadas jogando. Essa liberdade não cancela o patch em execução nem permite iniciar o
seguinte sem aprovação.

## Sem aprofundamento prematuro

Não criar antecipadamente árvores ou subsistemas separados para cada produto, unidade,
cultura ou região. Primeiro fechar o contrato comum; depois aprofundar onde o jogo demonstrar
necessidade real.

O mesmo princípio vale para todos os sistemas:

- não criar variedade militar antes de a base de guerra estar estável;
- não criar diplomacia complexa antes da IA e da guerra mínima;
- não criar eventos de personagens antes de haver campanha persistente;
- não criar combate naval antes da fundação terrestre e da IA mínima;
- não criar conteúdo exclusivo para todos os poderes antes dos sistemas compartilhados.

## Controle de escopo

1. Trabalhar somente no objetivo do patch atual.
2. Não aprofundar um sistema apenas porque ele é relacionado.
3. Preferir soluções substituíveis e testáveis.
4. Não juntar vários sistemas grandes em um patch.
5. Reavaliar prioridades nos pontos previstos pelo roadmap.
6. Preservar dados e contratos compartilhados para evitar retrabalho.
7. Tratar ideia documentada como direção, não como autorização de implementação.
8. Parar após o fechamento do patch e aguardar aprovação humana.

## Situação atual

O checkpoint `0.0.1` já foi lançado. O patch ativo é o `0.0.2 — Fechamento da guerra
básica`, cujo escopo completo está em `PATCH_ATUAL.md`.

A economia física, a alimentação, o mercado interno, a tributação, a felicidade funcional,
a nacionalidade funcional, a capital funcional e as construções serão tratados em patches
posteriores separados. A IA permanece como próximo patch provável depois que a base
necessária estiver estável, ainda sem número definitivo.
