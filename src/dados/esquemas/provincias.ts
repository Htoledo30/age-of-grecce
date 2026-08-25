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
      z.object({
        /** Índice gravado em provincias.png. 0 é reservado pro mar. */
        indice: z.number().int().positive(),
        id: z.string().min(1),
        nome: z.string().min(1),
        regiao: z.string().min(1),
        dono: z.string().min(1),
        areaKm2: z.number().nonnegative(),
        centro: z.object({ x: z.number(), y: z.number() }),
        vizinhas: z.array(z.string().min(1)),
      }),
    )
    .min(1),
});

export type Provincias = z.infer<typeof Provincias>;
