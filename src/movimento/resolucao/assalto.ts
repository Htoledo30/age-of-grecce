/**
 * O ASSALTO — resolve no turno, contra a milícia com o bônus da muralha.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS, não em unidades de defesa.** A defesa é gente
 * multiplicada pela muralha; sem desfazer a multiplicação, um assalto rechaçado faria a
 * população encolher pelo dobro do que de fato caiu.
 */

import { resolverChoque } from '@/combate/batalha';
import { defesaNoAssalto, milicianosPerdidos } from '@/combate/cerco';
import { forcaDe, retirar } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { Ajustes } from '@/dados/esquema';
import type { EstadoDaResolucao, MundoDaResolucao, RelatorioEmConstrucao } from './relatorio';

type AjustesCombate = Ajustes['jogo']['combate'];

export function assaltar(
  estado: EstadoDaResolucao,
  provincia: string,
  hoste: Exercito,
  milicianos: number,
  ajustes: AjustesCombate,
  mundo: MundoDaResolucao,
  relatorio: RelatorioEmConstrucao,
  tomar: (provincia: string, poder: string) => void,
  levantar: (provincia: string) => void,
): void {
  const dono = mundo.donoDe(provincia);
  const atacantes = forcaDe(hoste);
  const defesa = defesaNoAssalto(milicianos, ajustes.cerco);
  const choque = resolverChoque(atacantes, defesa);

  const perder = (perdidos: number): void => {
    if (perdidos <= 0) return;
    mundo.miliciaPerdida(provincia, perdidos);
    relatorio.milicianosMortos.push({ provincia, mortos: perdidos });
  };

  if (choque.vencedor === 'a') {
    retirar(hoste, atacantes - choque.sobreviventes);
    perder(milicianos);
    relatorio.batalhas.push({
      provincia,
      vencedor: hoste.poder,
      perdedores: [dono],
      sobreviventes: choque.sobreviventes,
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
      ? milicianosPerdidos(milicianos, choque.sobreviventes, ajustes.cerco)
      : milicianos,
  );
  relatorio.batalhas.push({
    provincia,
    vencedor: choque.vencedor === 'b' ? dono : null,
    perdedores: choque.vencedor === 'b' ? [hoste.poder] : [hoste.poder, dono],
    sobreviventes:
      choque.vencedor === 'b'
        ? Math.floor(choque.sobreviventes / ajustes.cerco.bonusDeMuralha)
        : 0,
    tipo: 'assalto',
  });
}
