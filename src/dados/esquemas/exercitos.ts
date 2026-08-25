/**
 * A tropa que já estava em pé em 700 a.C.
 *
 * Arquivo separado da economia de propósito: economia é o que a terra dá, isto é a situação
 * militar em que o mapa abre. Enquanto não há IA, é o que faz existir alguém armado do outro
 * lado da fronteira.
 */

import { z } from 'zod';

export const Exercitos = z.object({
  versao: z.literal(1),
  comentario: z.string().optional(),
  /**
   * Homens em pé por província. A hoste é do dono dela no começo da partida.
   *
   * ⚠️ Eles **saem da população** escrita em `economia.json`. Ver
   * `src/combate/guarnicao-inicial.ts` — o manancial humano é um só.
   */
  guarnicoes: z.record(z.string(), z.number().int().positive()),
});

export type Exercitos = z.infer<typeof Exercitos>;
