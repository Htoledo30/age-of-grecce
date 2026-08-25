/**
 * Economia autoral por província: o que é permanente e vive nos dados.
 *
 * Produto e nível são fixos — construir compra exploração, não muda o que a terra tem. O
 * valor de cada produto mora no CATÁLOGO e não se repete nas províncias: assim balancear
 * todos os territórios de um produto é mudar um número só.
 *
 * **Província que não está aqui não tem economia configurada.** Ela não arrecada e não é
 * simulada, e a interface diz isso com todas as letras. Não existe fórmula de reserva: duas
 * economias diferentes escondidas no mesmo jogo seria pior que uma economia incompleta.
 */

import { z } from 'zod';

export const Economia = z
  .object({
    versao: z.literal(1),
    comentario: z.string().min(1),
    produtos: z.record(
      z.string().min(1),
      z.object({
        nome: z.string().min(1),
        /** Moedas por nível. Grão e prata não valem o mesmo. */
        valor: z.number().positive(),
        /**
         * Se este produto alimenta gente.
         *
         * O nível de cada produto alimentar soma pontos à capacidade anual do reino.
         * Mármore e prata nunca entram nessa conta por mais valiosos que sejam.
         */
        alimento: z.boolean(),
        /**
         * O que este bem rende por turno à REDE DE TROCAS do reino, **uma vez só**.
         *
         * ⚠️ Não é o `valor`, e a diferença é o ponto: `valor` é o que a terra produz e se
         * multiplica pelo nível dela; `troca` é o que a variedade acrescenta. Duas
         * províncias de azeite não rendem troca duas vezes — quem paga é o bem DISTINTO
         * que circula, não a quantidade. Ver `campanha/comercio/rede-de-trocas.ts`.
         *
         * Básico circula barato e luxo circula caro: o grão sustenta, a prata enriquece.
         */
        troca: z.number().int().nonnegative(),
      }),
    ),
    /**
     * Catálogo dos povos. Só nome: nacionalidade não tem número próprio.
     *
     * Nacionalidade pertence à POPULAÇÃO, não à província nem ao
     * poder, e uma província tem várias ao mesmo tempo. Manter um catálogo aqui é o que
     * impede "eleusina" e "eleusino" virarem dois povos por causa de um erro de digitação.
     */
    nacionalidades: z.record(z.string().min(1), z.object({ nome: z.string().min(1) })),
    provincias: z.record(
      z.string().min(1),
      z.object({
        populacao: z.number().int().positive(),
        /** Id de uma entrada do catálogo de produtos. */
        produto: z.string().min(1),
        /**
         * Quanto a terra dá daquele produto, de 1 a 5. **Fixo.**
         *
         * Chamava-se "potencial", e o nome foi trocado porque prometia o que o sistema não
         * faz: potencial soa como coisa que se desenvolve. Nível é grau, é identidade da
         * terra — investir paga mais gente pra explorar o que já existe, e nunca sobe isto.
         */
        nivel: z.number().int().min(1).max(5),
        /**
         * O quanto passa por aqui. É posição, porto e rota — é o que deixa uma província
         * enriquecer pelo que atravessa o chão dela, e não só pelo que ela produz.
         *
         * ⚠️ **Chamava-se `comercioBase`, e o nome mentia.** Comércio pressupõe alguém do
         * outro lado; isto é o pedágio da POSIÇÃO, cobrado sem parceiro nenhum. Enquanto não
         * houver diplomacia para dar a contraparte, a palavra "comércio" fica reservada para
         * o que ela significa de verdade — e a tela para de insinuar um parceiro que não
         * existe. Ver `GDD.md`, "Comércio interno e externo".
         */
        transitoBase: z.number().nonnegative(),
        /**
         * O segundo produto da terra, sempre mais fraco que o principal.
         *
         * ⚠️ **Mais fraco em RENDIMENTO, não em nível** — o cruzamento é conferido embaixo.
         * "Nível menor" seria a regra errada: grão nível 3 rende menos que prata nível 2, e
         * o que faz o principal ser o principal é o que ele entrega, não o algarismo.
         *
         * Ele não entra na renda atual de propósito: somar mais uma parcela sem a regra de
         * circulação pronta seria balancear duas vezes. O dado já existe porque a região de
         * teste deve estar completa antes dos sistemas que a consomem.
         */
        secundario: z.object({
          produto: z.string().min(1),
          nivel: z.number().int().min(1).max(5),
        }),
        /**
         * De que povo é a população, em frações que somam 1.
         *
         * Enquanto cada cidade se governa isto não pesa em nada. Ele existe pro dia em que
         * Atenas tomar Elêusis e passar a mandar em 85% de gente que não é dela. A tensão é
         * consequência de conquista, e por isso o dado tem
         * que estar escrito antes da conquista, não depois.
         */
        nacionalidades: z.record(z.string().min(1), z.number().gt(0).max(1)),
        /** Humor inicial, de 0 a 100. As faixas com nome estão em `ajustes.json`. */
        felicidade: z.number().int().min(0).max(100),
        /** O que já está de pé em 700 a.C.: id do catálogo para nível I, II ou III. */
        construcoes: z.record(z.string().min(1), z.number().int().min(1).max(3)),
        /**
         * Se a costa daqui abriga navio.
         *
         * **Não é um porto construído** — é a terra permitir um. Este campo é a pergunta
         * que os futuros sistemas naval e de construção de portos vão fazer. Maratona é o
         * caso que justifica o campo existir: ela é
         * litorânea e não tem abrigo nenhum, então estar no mar não vale de nada.
         */
        ancoradouro: z.boolean(),
        /** Por que esta província é assim. Documentação junto do dado, não longe dele. */
        motivo: z.string().min(1),
        /** Por que ela COMEÇA assim: povo, humor e o que já está de pé. */
        motivoDaFicha: z.string().min(1),
      }),
    ),
  })
  .superRefine((economia, ctx) => {
    // ⚠️ Cruzamentos que o Zod não faz sozinho. Um id de produto errado numa província
    // passaria como string válida e viraria produção zero em silêncio meses depois — o
    // tipo de bug que aparece como "por que Tanagra não rende nada?" muito longe daqui.
    for (const [id, ficha] of Object.entries(economia.provincias)) {
      const onde = ['provincias', id];
      const principal = economia.produtos[ficha.produto];
      const segundo = economia.produtos[ficha.secundario.produto];

      if (!principal) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'produto'],
          message: `produto desconhecido: ${ficha.produto}`,
        });
      }
      if (!segundo) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'secundario'],
          message: `produto desconhecido: ${ficha.secundario.produto}`,
        });
      }
      // ⚠️ A terra dá duas coisas DIFERENTES. Repetir o produto passaria pela regra de
      // rendimento (basta o nível ser menor) e chegaria aos sistemas como duas fontes do
      // mesmo item — uma soma que ninguém entenderia ao ler o dado.
      if (ficha.secundario.produto === ficha.produto) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'secundario'],
          message: `o secundário não pode ser o próprio principal: ${ficha.produto}`,
        });
      }
      if (
        principal &&
        segundo &&
        segundo.valor * ficha.secundario.nivel >= principal.valor * ficha.nivel
      ) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'secundario'],
          message: 'o secundário tem que render menos que o principal',
        });
      }

      const soma = Object.values(ficha.nacionalidades).reduce((total, f) => total + f, 0);
      if (Math.abs(soma - 1) > 0.001) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'nacionalidades'],
          message: `as frações somam ${soma}, e têm que somar 1`,
        });
      }
      for (const povo of Object.keys(ficha.nacionalidades)) {
        if (!economia.nacionalidades[povo]) {
          ctx.addIssue({
            code: 'custom',
            path: [...onde, 'nacionalidades'],
            message: `povo desconhecido: ${povo}`,
          });
        }
      }
    }
  });

export type Economia = z.infer<typeof Economia>;
