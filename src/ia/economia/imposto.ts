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
 *
 * ⚠️ **O CONFISCO é a exceção, e ela tem uma condição só: a guerra não estar paga.** ×3 no
 * imposto e −25 de humor não é "alto, porém mais" — é hipotecar a província para pagar o
 * exército de hoje. A IA o puxa quando está em guerra e a renda não cobre a folha militar, e
 * larga assim que a conta fecha, porque o decreto é refeito toda virada. Sem esta linha, o
 * jogador teria uma alavanca que a IA não tem — e a regra da casa é que as duas jogam o mesmo
 * jogo.
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
  // A guerra não está paga: a renda do reino não cobre a folha militar dele. É a única
  // situação em que hipotecar uma província compra alguma coisa.
  const guerraNoVermelho =
    campanha.guerrasDe(idPoder).length > 0 &&
    campanha.rendaDe(idPoder) < campanha.manutencaoDe(idPoder);

  const decretos: { provincia: string; nivel: NivelDeImposto }[] = [];
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    if (!campanha.podeDefinirImposto(provincia, idPoder).pode) continue;
    const apertado = campanha.felicidadeEm(provincia) < estilo.humorParaAliviar;
    // ⚠️ **Nem na emergência se confisca terra que já ferve.** A província revoltosa não paga
    // imposto nenhum: confiscar nela seria trocar o humor que resta por moeda que não vem.
    const alvo: NivelDeImposto = apertado
      ? 'baixo'
      : guerraNoVermelho
        ? 'confisco'
        : estilo.imposto;
    // Só o que MUDA entra: repetir o decreto vigente encheria a crônica de nada e faria a
    // partida parecer que a IA mexe em tudo todo turno.
    if (campanha.nivelDeImpostoEm(provincia) === alvo) continue;
    decretos.push({ provincia, nivel: alvo });
  }
  return decretos;
}
