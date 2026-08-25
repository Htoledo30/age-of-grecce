/**
 * O ASSALTO — resolve no turno contra a milícia que a ficha mostra.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS.** O número mostrado na ficha é a própria
 * força combatida; não existe multiplicador defensivo escondido para desfazer.
 */

import { resolverBatalha } from '@/combate/batalha';
import { leves, porArma, valorEmCampo } from '@/combate/composicao';
import { defesaNoAssalto, milicianosPerdidos } from '@/combate/cerco';
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
  tomar: (provincia: string, poder: string) => void,
  levantar: (provincia: string) => void,
): void {
  const dono = mundo.donoDe(provincia);
  // ⚠️ **A muralha NÃO endurece o defensor, e é decisão de Henrique (25/08/2026).** Ela faz
  // duas coisas, as duas reais e visíveis: põe mais gente em pé (`efeito.milicia`, ×1,25 /
  // ×1,50 / ×1,75) e obriga o inimigo a sentar antes de assaltar. Um terceiro bônus foi
  // medido e recusado por ele: no nível I mudava a conta de 250 para 260 atacantes — ruído
  // — e no III de 340 para 410, encarecendo a guerra numa hora em que a IA ainda não existe.
  //
  // O campo continua aqui, valendo 1, porque é por ele que um muro entraria se um dia
  // entrar: multiplicador de resistência VISÍVEL, aparecendo round a round na janela, nunca
  // um número escondido dentro da força da defesa. Enquanto valer 1, a janela não desenha
  // muro nenhum — e é assim que ela para de prometer o que o jogo não faz.
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
  //
  // ⚠️ **A hoste acaba; os homens, não.** É a mesma regra que a batalha de campo já segue —
  // *quem quebra perde a hoste, não a geração* — e o assalto era o único lugar do jogo onde
  // ela não valia: 150 homens iam contra Elêusis, 20 sobreviviam à contra-investida, e esses
  // 20 sumiam do mundo. Não morriam na conta e não voltavam para a população: evaporavam.
  // Agora dispersam para a terra natal, como qualquer derrotado.
  retirar(hoste, atacantes - choque.sobreviventesA);
  if (hoste.contingentes.length > 0) mundo.dispersaram(terrasDe(hoste.contingentes));
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
