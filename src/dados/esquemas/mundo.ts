/** A moldura do mundo: nome e dimensões. Precisa bater com o que o gerador assou. */

import { z } from 'zod';

export const Mundo = z.object({
  versao: z.literal(1),
  nome: z.string().min(1),
  /** Precisa bater com assets/mundo/mapa.json — quem manda nos números é o gerador. */
  dimensoes: z.object({
    largura: z.number().positive(),
    altura: z.number().positive(),
  }),
});

export type Mundo = z.infer<typeof Mundo>;
