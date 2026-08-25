/**
 * O ASSALTO — resolve no turno contra a milícia que a ficha mostra.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS.** O número mostrado na ficha é a própria
 * força combatida; não existe multiplicador defensivo escondido para desfazer.
 */

import { resolverBatalha } from '@/combate/batalha';
import { leves, porArma, valorEmCampo } from '@/combate/composicao';
import { defesaNoAssalto, milicianosPerdidos } from '@/combate/cerco';
import { forcaDe, retirar } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { EstadoDaResolucao, MundoDaResolucao, RelatorioEmConstrucao } from './relatorio';

export function assaltar(
  estado: EstadoDaResolucao,
  provincia: string,
  hoste: Exercito,
  milicianos: number,
  mundo: MundoDaResolucao,
  relatorio: RelatorioEmConstrucao,
  tomar: (provincia: string, poder: string) => void,
  levantar: (provincia: string) => void,
): void {
  const dono = mundo.donoDe(provincia);
  // O assalto é contra a MURALHA, e por isso o defensor entra no relatório com o aguento
  // dela: é assim que a janela mostra o muro como um modificador visível, round a round, em
  // vez de um multiplicador escondido dentro do número da defesa.
  const aguentoDaMuralha = 1;
  const atacantes = forcaDe(hoste);
  const defesa = defesaNoAssalto(milicianos);
  // ⚠️ **A milícia é sempre leve comum, e nunca melhora.** Ela não passa por Armaria, Quartel
  // nem acampamento: é o lavrador com a lança que tinha em casa, o último escudo da cidade e
  // não um exército de graça. Quem quer tropa boa levanta tropa boa e paga por ela.
  const naMuralha = [{ arma: 'leve' as const, qualidade: 1, homens: defesa }];
  const ataca = valorEmCampo(hoste.contingentes, naMuralha, mundo.batalha);
  // A muralha multiplica o aguento do defensor — e entra aqui, VISÍVEL, em vez de inflar o
  // número de milicianos que a ficha mostra.
  const defende = { ...leves(defesa), aguento: leves(defesa).aguento * aguentoDaMuralha };
  // A cidade leva o empate: quem assalta precisa VENCER, e ser barrado já é derrota.
  const choque = resolverBatalha(
    { ...ataca, recuaAos: null },
    { ...defende, recuaAos: null },
    mundo.batalha,
    'b',
  );
  const ladosNoRelatorio = [
    { poder: hoste.poder, homens: atacantes, aguento: 1, composicao: porArma(hoste.contingentes) },
    { poder: dono, homens: defesa, aguento: aguentoDaMuralha, composicao: porArma(naMuralha) },
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
    tomar(provincia, hoste.poder);
    return;
  }

  // Rechaçado: o exército de assalto se desfaz diante da muralha, e a cidade fica.
  delete estado.hostes[hoste.id];
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
