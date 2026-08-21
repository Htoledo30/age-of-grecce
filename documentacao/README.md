# Documentação do Age of Grecce

Esta pasta concentra a documentação de design, decisões de projeto e créditos de
recursos externos.

**A divisão de trabalho entre os dois lugares, para não procurar no errado:**

| onde | o que é | quando confiar |
| --- | --- | --- |
| `CLAUDE.md`, na raiz | **o retrato do jogo agora** — o que existe, como funciona, e as armadilhas já pagas | sempre; é a memória operacional |
| esta pasta | **o desenho e o porquê** — especificações, referências, propostas e o raciocínio por trás das decisões | para entender *por que* algo é assim, ou para desenhar o que ainda não existe |

Regra que mantém os dois honestos: **documento de tarefa cumprido é apagado**, e o que
sobrou de vivo dele migra. O resultado e o motivo vão para o `CLAUDE.md`; a orientação
técnica vira comentário no código que a executa. Documento que descreve um jogo que não
existe mais é pior que documento nenhum, porque parece verdade.

## Design

- [Combate, exército e o mar](design/combate-e-mar.md) — o que está decidido sobre guerra,
  movimento e o recorte do mar em zonas; o que já está no jogo; o que foi medido no mapa
  real; e o que ainda é proposta. As quatro coisas separadas de propósito.
- [Resolução da rodada](design/resolucao-da-rodada.md) — **proposta, para revisão.** As
  regras de adjudicação da resolução simultânea: o princípio dos passos, quem defende, os
  seis casos de encontro e os testes que os provam.
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

## Créditos

- [Kenney Medieval RTS](creditos/kenney-medieval-rts.md) — origem e licença dos
  placeholders visuais de cidades e aldeias.

## Tarefas e análises

- [Salvamento e realce de reino](tarefas/salvamento-e-realce-de-reino.md) — as duas peças
  pequenas que sobraram do plano do esqueleto de campanha. **A fazer.**

Dois documentos de tarefa foram **removidos** por já não descreverem o jogo:

- *Esqueleto: estado de partida e o turno* — o turno, a economia, a propriedade mutável e a
  eliminação de poderes foram implementados; a adjacência marítima derivada que ele propunha
  foi descartada pelo recorte do mar em zonas; e os nomes de módulo que ele usava
  (`src/jogo/`) nunca existiram. O que sobrou de vivo virou *Salvamento e realce de reino*.
- *Revisão das ilhas e províncias insulares* — aplicada. O resultado e o raciocínio vivem na
  seção "Ilhas" do `CLAUDE.md`, e a orientação técnica virou comentário em
  `gerador/gerar-provincias.ts`.

## Arquivo mantido na raiz

`CLAUDE.md` permanece na raiz porque é um arquivo operacional lido automaticamente
pela Claude. Ele não deve ser movido para esta pasta.
