/** Recrutamento respeita ouro, folha, população e a capacidade alimentar exata. */
import type { Campanha } from '@/campanha/campanha';
import type { Arma } from '@/combate/exercito';
import { valorEmCampo } from '@/combate/composicao';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { despensaApertada, folgaDaFolha } from '../percepcao/sustento';

export interface LevaCotada {
  provincia: string;
  arma: Arma;
  homens: number;
}

export function levaEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: Ajustes['jogo'],
): LevaCotada | null {
  const combate = ajustes.combate;
  const folga = folgaDaFolha(campanha, idPoder, estilo);
  const balanco = campanha.balancoAlimentarDe(idPoder);
  if (folga <= 0 || balanco.saldo < 0 || balanco.homensQueSustenta <= 0) return null;
  const apertada = despensaApertada(campanha, idPoder, estilo, ajustes);
  const inimigos = campanha.hostes().filter((h) => campanha.emGuerra(idPoder, h.poder))
    .flatMap((h) => h.contingentes);
  const nossos = [
    ...campanha.hostes().filter((h) => h.poder === idPoder).flatMap((h) => h.contingentes),
    ...campanha.formacoes().filter((f) => f.formacao.poder === idPoder).flatMap((f) => f.formacao.contingentes),
  ];
  const antes = valorEmCampo(nossos, inimigos, combate.batalha);
  const emGuerra = campanha.guerrasDe(idPoder).length > 0;
  let melhor: LevaCotada | null = null;
  let melhorValor = 0;
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    for (const arma of campanha.armasEm(provincia)) {
      const dados = combate.batalha.armas[arma];
      const taxa = emGuerra
        ? Math.max(campanha.taxaDaTropaEmCasaEm(provincia), combate.manutencaoPorHomem.emCampanha)
        : campanha.taxaDaTropaEmCasaEm(provincia);
      const homens = Math.min(
        campanha.maximoParaLevaEm(provincia, arma),
        Math.floor(folga / taxa),
        Math.floor(balanco.homensQueSustenta / dados.comida),
      );
      if (homens <= 0 || !campanha.podeRecrutar(provincia, homens, arma, idPoder).pode) continue;
      const contingente = { arma, homens, qualidade: campanha.treinoEm(provincia) };
      const soldado = valorEmCampo([contingente], inimigos, combate.batalha);
      const depois = valorEmCampo([...nossos, contingente], inimigos, combate.batalha);
      // O counter depende do inimigo; o ganho de perseguição cai quando já há cavalaria.
      let valor = soldado.ataque * soldado.aguento *
        (1 + (depois.perseguicao - antes.perseguicao) * combate.batalha.letalidadeDaPerseguicao);
      if (estilo.arma === 'barata') valor /= dados.custo * dados.custo;
      if (apertada) valor /= dados.comida * dados.comida;
      valor *= homens;
      if (valor > melhorValor) {
        melhorValor = valor;
        melhor = { provincia, arma, homens };
      }
    }
  }
  return melhor;
}
