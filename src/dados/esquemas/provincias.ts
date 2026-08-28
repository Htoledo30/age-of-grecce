/**
 * O recorte político do mundo, assado por `npm run gerar-provincias`.
 *
 * Este arquivo é SAÍDA de ferramenta, não conteúdo escrito à mão — o conteúdo é
 * `dados/provincias.json`, com as sementes. Aqui chegam os índices, as áreas medidas e a
 * vizinhança, que é o que exército vai usar pra andar de província em província.
 */

import { z } from 'zod';

export const Provincias = z.object({
  versao: z.literal(1),
  epoca: z.string().min(1),
  resolucao: z.object({ largura: z.number().positive(), altura: z.number().positive() }),
  dimensoes: z.object({ largura: z.number().positive(), altura: z.number().positive() }),
  poderes: z
    .array(
      z.object({
        id: z.string().min(1),
        nome: z.string().min(1),
        povo: z.string().min(1),
        cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor deve ser #rrggbb'),
      }),
    )
    .min(1),
  provincias: z
    .array(
      z
        .object({
          /** Índice gravado em provincias.png. 0 é o que não pertence a ninguém. */
          indice: z.number().int().positive(),
          id: z.string().min(1),
          nome: z.string().min(1),
          regiao: z.string().min(1),
          /** Quem governava isto em 700 a.C. **Vazio só no mar**, que não tem dono. */
          dono: z.string(),
          areaKm2: z.number().nonnegative(),
          centro: z.object({ x: z.number(), y: z.number() }),
          /**
           * Onde escrever o NOME dela no mapa, e quanto espaço ele tem.
           *
           * ⚠️ **Não é o `centro`, e a diferença não é sutil.** O centro é o centroide — a
           * média das coordenadas —, e numa forma torta ele cai fora dela: medido, **15 das
           * 244 províncias têm o centroide no vizinho ou no mar**, entre elas Ítaca, Melos e
           * o Estreito de Salamina. Escrever o nome ali põe "Mégara" em cima de Corinto.
           *
           * Isto é o PÓLO DE INACESSIBILIDADE: o ponto mais distante da borda, centro do
           * maior círculo que cabe dentro da forma. Sempre está dentro, mesmo num C. É o que
           * a cartografia digital usa para rotular área (`polylabel`, da Mapbox), e aqui sai
           * exato porque o mapa é raster: é o pixel de maior distância até a borda.
           *
           * O `raio` é a metade útil da resposta: **rótulo de área só se desenha se couber
           * dentro dela naquele zoom**, e é ele que deixa a tela responder isso. Zoom baixo,
           * só as grandes têm nome; zoom alto, todas cabem — nível de detalhe automático,
           * sem um limiar escrito à mão. Ausente em mapa assado antes de `gerar-rotulos`.
           */
          rotulo: z
            .object({ x: z.number(), y: z.number(), raio: z.number().nonnegative() })
            .optional(),
          vizinhas: z.array(z.string().min(1)),
          /**
           * Esta é uma ZONA MARÍTIMA, e não um pedaço de chão.
           *
           * ⚠️ **Ela não tem dono, não se conquista, não produz e não tem milícia** — existe
           * para ser atravessada e disputada. Ausente nas 196 terras, para um mapa antigo
           * continuar carregando sem mudar uma linha.
           */
          mar: z.boolean().optional(),
        })
        .superRefine((p, ctx) => {
          // Terra sem dono seria uma província órfã que ninguém governa; mar COM dono seria
          // um pedaço de água conquistável. As duas coisas quebram regras diferentes, e é
          // aqui que elas param.
          if (p.mar === true && p.dono !== '') {
            ctx.addIssue({ code: 'custom', message: `zona de mar não tem dono: ${p.id}` });
          }
          if (p.mar !== true && p.dono === '') {
            ctx.addIssue({ code: 'custom', message: `província sem dono: ${p.id}` });
          }
        }),
    )
    .min(1),
});

export type Provincias = z.infer<typeof Provincias>;
