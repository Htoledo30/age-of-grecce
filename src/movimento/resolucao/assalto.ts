/**
 * O ASSALTO — resolve no turno contra a milícia que a ficha mostra.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS.** O número mostrado na ficha é a própria
 * força combatida; não existe multiplicador defensivo escondido para desfazer.
 */

import { lado, resolverBatalha } from '@/combate/batalha';
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
  // A cidade leva o empate: quem assalta precisa VENCER, e ser barrado já é derrota.
  const choque = resolverBatalha(lado(atacantes), lado(defesa), mundo.batalha, 'b');

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
      lados: [
        { poder: hoste.poder, homens: atacantes, aguento: 1 },
        { poder: dono, homens: defesa, aguento: aguentoDaMuralha },
      ],
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
    lados: [
      { poder: hoste.poder, homens: atacantes, aguento: 1 },
      { poder: dono, homens: defesa, aguento: aguentoDaMuralha },
    ],
    rounds: choque.rounds,
    desfecho: choque.desfecho,
    tipo: 'assalto',
  });
}
