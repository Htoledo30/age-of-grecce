/**
 * O ASSALTO — resolve no turno contra a milícia que a ficha mostra.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS.** O número mostrado na ficha é a própria
 * força combatida; não existe multiplicador defensivo escondido para desfazer.
 */

import { porArma } from '@/combate/composicao';
import {
  AGUENTO_DA_MURALHA,
  choqueDoAssalto,
  defesaNoAssalto,
  milicianosPerdidos,
} from '@/combate/cerco';
import { forcaDe, retirar, terrasDe } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { EstadoDaResolucao, MundoDaResolucao, RelatorioEmConstrucao } from './relatorio';

export function assaltar(
  estado: EstadoDaResolucao,
  provincia: string,
  hoste: Exercito,
  milicianos: number,
  mundo: MundoDaResolucao,
  relatorio: RelatorioEmConstrucao,
  tomar: (provincia: string, poder: string, aForca?: boolean) => void,
  levantar: (provincia: string) => void,
): void {
  const dono = mundo.donoDe(provincia);
  const atacantes = forcaDe(hoste);
  const defesa = defesaNoAssalto(milicianos);
  const naMuralha = [{ arma: 'leve' as const, qualidade: 1, homens: defesa }];
  // ⚠️ **A conta do assalto mora em `cerco.ts`, e não aqui.** Ela tem dois leitores: a rodada,
  // que executa, e a IA, que precisa saber se vale a pena tentar. Escrita duas vezes, a que
  // discordaria seria a da IA — justamente a que precisa estar certa para ela não jogar o
  // exército contra uma muralha que não cai.
  const choque = choqueDoAssalto(hoste.contingentes, milicianos, mundo.batalha);
  const ladosNoRelatorio = [
    { poder: hoste.poder, homens: atacantes, aguento: 1, composicao: porArma(hoste.contingentes) },
    {
      poder: dono,
      homens: defesa,
      aguento: AGUENTO_DA_MURALHA,
      composicao: porArma(naMuralha),
    },
  ] as const;

  const perder = (perdidos: number): void => {
    if (perdidos <= 0) return;
    mundo.miliciaPerdida(provincia, perdidos);
    relatorio.milicianosMortos.push({ provincia, mortos: perdidos });
  };

  if (choque.vencedor === 'a') {
    retirar(hoste, atacantes - choque.sobreviventesA);
    perder(milicianos);
    relatorio.batalhas.push({
      provincia,
      vencedor: hoste.poder,
      perdedores: [dono],
      sobreviventes: choque.sobreviventesA,
      lados: ladosNoRelatorio,
      rounds: choque.rounds,
      desfecho: choque.desfecho,
      tipo: 'assalto',
    });
    tomar(provincia, hoste.poder, true);
    return;
  }

  // Sem quebra e com refúgio seguro, os sobreviventes recuam como uma hoste.
  // Nos demais casos dispersam e voltam à população de origem.
  retirar(hoste, atacantes - choque.sobreviventesA);
  const refugio = choque.desfecho !== 'quebrou' ? mundo.refugio(provincia, hoste.poder) : null;
  const seguro = refugio !== null && !Object.values(estado.hostes).some(
    (h) => h.posicao === refugio && mundo.emGuerra(hoste.poder, h.poder),
  );
  if (seguro && refugio !== null && hoste.contingentes.length > 0) hoste.posicao = refugio;
  else {
    if (hoste.contingentes.length > 0) mundo.dispersaram(terrasDe(hoste.contingentes));
    delete estado.hostes[hoste.id];
  }
  levantar(provincia);
  perder(
    choque.vencedor === 'b'
      ? milicianosPerdidos(milicianos, choque.sobreviventesB)
      : milicianos,
  );
  relatorio.batalhas.push({
    provincia,
    vencedor: choque.vencedor === 'b' ? dono : null,
    perdedores: choque.vencedor === 'b' ? [hoste.poder] : [hoste.poder, dono],
    sobreviventes: choque.vencedor === 'b' ? Math.floor(choque.sobreviventesB) : 0,
    lados: ladosNoRelatorio,
    rounds: choque.rounds,
    desfecho: choque.desfecho,
    tipo: 'assalto',
  });
}
