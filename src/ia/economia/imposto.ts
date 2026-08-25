/**
 * A IA decretando imposto — uma decisão só, e a que importa.
 *
 * O estilo diz o que ela prefere cobrar. A província diz se aguenta.
 *
 * ⚠️ **Aliviar é a única inteligência desta etapa, e é a que paga.** Província que entra na
 * faixa revoltosa faz greve fiscal: o imposto alto passou a render **zero**, e ainda deixa um
 * levante armado a alguns turnos de distância. Uma IA que cobrasse alto sem olhar o humor
 * cobraria alto exatamente até parar de arrecadar.
 *
 * Nada de meio-termo por enquanto: ou o preferido do estilo, ou o alívio. Um degrau
 * intermediário só faz sentido quando houver mais coisa puxando o humor — e aí a decisão
 * vira comparação, não regra.
 */

import type { Campanha } from '@/campanha/campanha';
import type { NivelDeImposto } from '@/campanha/economia';
import type { EstiloDeIa } from '@/dados/esquema';

/** O que este poder decretaria em cada terra dele AGORA. Só o que muda entra na lista. */
export function decretosEscolhidos(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
): readonly { provincia: string; nivel: NivelDeImposto }[] {
  const decretos: { provincia: string; nivel: NivelDeImposto }[] = [];
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    if (!campanha.podeDefinirImposto(provincia, idPoder).pode) continue;
    const apertado = campanha.felicidadeEm(provincia) < estilo.humorParaAliviar;
    const alvo: NivelDeImposto = apertado ? 'baixo' : estilo.imposto;
    // Só o que MUDA entra: repetir o decreto vigente encheria a crônica de nada e faria a
    // partida parecer que a IA mexe em tudo todo turno.
    if (campanha.nivelDeImpostoEm(provincia) === alvo) continue;
    decretos.push({ provincia, nivel: alvo });
  }
  return decretos;
}
