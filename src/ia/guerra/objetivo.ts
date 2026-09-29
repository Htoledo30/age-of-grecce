import type { Campanha } from '@/campanha/campanha';
import type { ObjetivoMilitar } from '@/campanha/estado-campanha';
import type { EstiloDeIa } from '@/dados/esquema';
import { oportunidadesAlcancaveis } from '../percepcao/oportunidade';

/** Mantém a campanha até a conquista, a paz ou a perda do caminho. Vai junto com o save. */
export function objetivoEscolhido(
  campanha: Campanha,
  poder: string,
  estilo: EstiloDeIa,
): ObjetivoMilitar | null {
  const hostes = campanha.hostes().filter((h) => h.poder === poder);
  const rotas = new Map(hostes.map((h) => [h.id, campanha.rotasLongasDaHoste(h.id)]));
  const alvos = oportunidadesAlcancaveis(campanha, poder).filter((alvo) => {
    if (!campanha.emGuerra(poder, alvo.dono)) return false;
    const sitiante = campanha.cercoEm(alvo.provincia)?.sitiante;
    return sitiante === undefined || sitiante === poder || campanha.emGuerra(poder, sitiante);
  });
  const atual = campanha.objetivoMilitarDe(poder);
  if (atual && campanha.donoDe(atual.ponto) === poder &&
      alvos.some((a) => a.provincia === atual.alvo) &&
      hostes.some((h) => h.posicao === atual.alvo || rotas.get(h.id)?.has(atual.alvo))) {
    return { ...atual };
  }

  let melhor: { objetivo: ObjetivoMilitar; valor: number } | null = null;
  for (const alvo of alvos) {
    for (const hoste of hostes) {
      const rota = rotas.get(hoste.id)?.get(alvo.provincia);
      if (!rota) continue;
      // Última terra própria no caminho: fronteira terrestre ou porto de embarque.
      const ponto = [hoste.posicao, ...rota].filter((id) => campanha.donoDe(id) === poder).at(-1);
      if (!ponto) continue;
      const valor = (alvo.renda + alvo.bemNovo + (alvo.capital ? estilo.valorDaCapital : 0)) /
        Math.max(1, rota.length);
      if (!melhor || valor > melhor.valor) melhor = { objetivo: { alvo: alvo.provincia, ponto }, valor };
    }
  }
  return melhor?.objetivo ?? null;
}
