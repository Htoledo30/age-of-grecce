/**
 * Os cercos em curso: quem está sentado na frente de quem, e o que já pode ser feito.
 *
 * Sitiar não acumula progresso nem toma a cidade — bloqueia produção e comércio até o
 * exército sair, morrer ou escolher assaltar. A fome de dentro é assunto de
 * `alimentacao/mantimentos-de-cerco.ts`; aqui mora só o estado do cerco e a postura.
 */

import { rodadasAteOAssalto } from '@/combate/cerco';
import type { Cerco, Postura } from '@/combate/cerco';
import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm } from '../provincia/consultas';
import { rodadasParaAssaltar } from '../provincia/beneficios-das-construcoes';

/** O cerco em curso nesta província, se houver. */
export function cercoEm(nucleo: NucleoDaCampanha, idProvincia: string): Cerco | undefined {
  return nucleo.estado.cercos[idProvincia];
}

/** Há inimigo acampado na frente desta cidade? A pergunta curta, sem o objeto. */
export function estaSitiada(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  return nucleo.estado.cercos[idProvincia] !== undefined;
}

/** Todos os cercos em curso, ordenados por província. */
export function cercos(nucleo: NucleoDaCampanha): { provincia: string; cerco: Cerco }[] {
  return Object.keys(nucleo.estado.cercos)
    .sort()
    .flatMap((provincia) => {
      const cerco = nucleo.estado.cercos[provincia];
      return cerco ? [{ provincia, cerco }] : [];
    });
}

/**
 * Esta província tem obra que obriga a sitiar antes de assaltar?
 *
 * ⚠️ Lê o campo do CATÁLOGO, e não o id `muralha`. Amarrar a regra de combate a um id de
 * conteúdo faria uma troca de catálogo apagar a regra de guerra sem ninguém perceber.
 */
export function impedeAssaltoImediatoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): boolean {
  return rodadasParaAssaltarEm(nucleo, idProvincia) > 0;
}

/** Quantas rodadas completas as fortificações erguidas exigem antes do assalto. */
export function rodadasParaAssaltarEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  const erguidas = nucleo.estado.construcoes[idProvincia] ?? {};
  const porNivel = rodadasParaAssaltar(nucleo.catalogo, erguidas);
  if (porNivel > 0) return porNivel;

  // Compatibilidade com catálogos antigos que declaravam só a trava binária.
  const travaAntiga = construcoesEm(nucleo, idProvincia).some(
    (id) => nucleo.catalogo[id]?.impedeAssaltoImediato === true,
  );
  return travaAntiga ? nucleo.ajustes.combate.cerco.rodadasParaAssaltarMuralha : 0;
}

/**
 * Dá para assaltar esta cidade agora, e se não, quantas rodadas de cerco ainda faltam?
 *
 * Serve às duas perguntas da interface: o botão do cerco em pé ("passar ao assalto") e a
 * escolha de postura de uma marcha que ainda vai chegar lá. Cidade aberta responde sempre
 * `{ pode: true, faltam: 0 }`.
 */
export function assaltoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): { pode: boolean; faltam: number } {
  const faltam = rodadasAteOAssalto(
    rodadasParaAssaltarEm(nucleo, idProvincia),
    nucleo.estado.cercos[idProvincia]?.rodadas ?? 0,
  );
  return { pode: faltam === 0, faltam };
}

/**
 * Troca a postura de um cerco já em pé. Devolve `false` quando nada mudou.
 *
 * É o que o desenho pedia: sentar na frente da cidade e, três turnos depois, decidir que
 * o socorro está perto demais e ir pra cima. A troca vale na PRÓXIMA virada, como toda
 * ordem — nada acontece no clique.
 */
export function mudarPostura(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  postura: Postura,
  porPoder: string | null,
): boolean {
  const cerco = nucleo.estado.cercos[idProvincia];
  if (!cerco) return false;
  // ⚠️ **Só o SITIANTE muda a postura do próprio cerco**, e a trava entrou quando a IA passou
  // a atacar. Sem ela, um poder mandava o exército de outro subir a muralha — bastava chamar o
  // comando com a província certa. Era inalcançável pela tela, que só oferece o botão a quem
  // está sentado ali, e virou alcançável no instante em que dezessete poderes passaram a
  // chamar a mesma fachada. É o que a regra "a IA não tem caminho de serviço" existe para
  // encontrar.
  if (cerco.sitiante !== porPoder) return false;
  // A muralha barra o assalto antes da hora. A resolução também recusa — ela é a
  // autoridade, porque a postura ainda pode chegar por uma ordem de marcha — mas deixar
  // a ordem ser registrada aqui mostraria ao jogador uma decisão que não vai acontecer.
  if (postura === 'assaltar' && !assaltoEm(nucleo, idProvincia).pode) return false;
  nucleo.estado.cercos[idProvincia] = { ...cerco, postura };
  return true;
}
