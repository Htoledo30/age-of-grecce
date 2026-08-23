# Documentação do Age of Grecce

Esta pasta concentra a documentação de design, decisões de projeto e créditos de
recursos externos.

**A divisão de trabalho entre os dois lugares, para não procurar no errado:**

| onde, na raiz               | autoridade                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| código, testes, `CLAUDE.md` | retrato técnico do jogo implementado agora                               |
| `DECISOES.md`               | decisões oficiais de design e arquitetura                                |
| `PATCH_ATUAL.md`            | único escopo autorizado para implementação agora                         |
| `ROADMAP.md`                | sequência planejada de patches                                           |
| `BACKLOG.md`                | ideias futuras ainda fora de escopo                                      |
| `AGENTS.md`                 | regras de trabalho para Claude, Codex e outros agentes                   |
| `CHANGELOG.md`              | histórico lançado e alterações ainda não lançadas                        |
| esta pasta                  | referências, explicações e especificações subordinadas às fontes da raiz |

Nenhum texto desta pasta autoriza implementação por conta própria. Se uma referência antiga
divergir das fontes da raiz, a fonte responsável pelo assunto prevalece e o documento antigo
deve ser corrigido ou marcado como histórico.

## Design

- [Combate, exército e o mar](design/combate-e-mar.md) — o que está decidido sobre guerra,
  movimento e o recorte do mar em zonas; o que já está no jogo; o que foi medido no mapa
  real; e o que ainda é proposta. As quatro coisas separadas de propósito.
- [Resolução da rodada](design/resolucao-da-rodada.md) — regra **implementada** de resolução
  simultânea: princípio dos passos, quem defende, encontros e determinismo.
- [Economia e produtos regionais](design/economia-e-produtos-regionais.md) — especificação
  do sistema econômico, vocações do mapa e referência regional para a distribuição por
  província.
- [Referências econômicas de design](design/referencias-economicas.md) — o que aproveitar
  de _Age of History II_, _Rome: Total War_ e _Crusader Kings III_, com os limites que
  preservam a identidade e o escopo do nosso jogo.
- [Recursos materiais e estoques](design/recursos-materiais-e-estoques.md) — proposta
  futura para transformar produtos provinciais em unidades físicas, conectá-los a
  investimento, comércio, construções e exércitos sem bloquear os pequenos poderes.
- [Fragmentação política e potências emergentes](design/fragmentacao-politica-e-potencias-emergentes.md)
  — decisão de manter 205 províncias e 148 poderes para que cada campanha produza uma
  história política diferente.
- [Estratégia de desenvolvimento](design/estrategia-de-desenvolvimento.md) — construção
  incremental do esqueleto jogável seguindo o patch ativo e a sequência do roadmap.
- [Desempenho futuro da simulação](design/desempenho-da-simulacao.md) — diretrizes para
  fases de rodada, cortes de alcance, dados orientados à simulação, cache de rotas e Web
  Workers, adotadas somente depois de medir um gargalo real.
- [Versionamento](versionamento.md) — como manter `Não lançado`, fechar um patch e avançar
  de `0.0.1` para `0.0.2` sem perder mudanças.

## Créditos

- [Kenney Medieval RTS](creditos/kenney-medieval-rts.md) — origem e licença dos
  placeholders visuais de cidades e aldeias.

## Tarefas e análises

- [Salvamento e realce de reino](tarefas/salvamento-e-realce-de-reino.md) — as duas peças
  pequenas que sobraram do plano do esqueleto de campanha. **A fazer.**

## Arquivo mantido na raiz

`CLAUDE.md` permanece na raiz porque é um arquivo operacional lido automaticamente
pela Claude. Ele não deve ser movido para esta pasta.

`CHANGELOG.md` também permanece na raiz para que a versão atual e as mudanças não lançadas
fiquem visíveis logo ao abrir o projeto.
