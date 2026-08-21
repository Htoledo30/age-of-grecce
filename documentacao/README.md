# Documentação do Age of Grecce

Esta pasta concentra a documentação de design, decisões de projeto e créditos de
recursos externos.

**A divisão de trabalho entre os dois lugares, para não procurar no errado:**

| onde | o que é | quando confiar |
| --- | --- | --- |
| `CLAUDE.md`, na raiz | **o retrato técnico do jogo agora** — o que existe, como funciona e as armadilhas já pagas | para trabalhar no código atual |
| `CHANGELOG.md`, na raiz | **o histórico de versões** — o que entrou em cada patch e o que ainda não foi lançado | para acompanhar a evolução do jogo |
| esta pasta | **o desenho e o porquê** — decisões, especificações, referências e propostas futuras | para entender uma regra ou planejar o que ainda não existe |

Regra que mantém os dois honestos: **documento de tarefa cumprido é apagado**, e o que
sobrou de vivo dele migra. O resultado e o motivo vão para o `CLAUDE.md`; a orientação
técnica vira comentário no código que a executa. Documento que descreve um jogo que não
existe mais é pior que documento nenhum, porque parece verdade.

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
  inicial do esqueleto jogável e evolução posterior sem uma ordem rígida de patches.
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
