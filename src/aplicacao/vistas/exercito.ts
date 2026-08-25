/**
 * A ficha da hoste escolhida: o que ela é, o que pode fazer e o que já mandou fazer.
 *
 * A campanha responde todas as perguntas de regra (pode assaltar? contra quem surtir?) para
 * que a tela nunca prometa uma decisão que a resolução vai converter noutra coisa.
 */

import { forcaDe } from '@/combate/exercito';
import type { Ajustes } from '@/dados/esquema';
import type { VistaDoExercito } from '@/ui/exercito-ficha/exercito-ficha';
import type { Jogo } from '../contexto';

export function vistaDoExercito(jogo: Jogo): VistaDoExercito | null {
  const { campanha, atlas, ajustes, selecao } = jogo;
  if (selecao.fase !== 'campanha' || selecao.hoste === null) return null;
  const exercito = campanha.hoste(selecao.hoste);
  if (!exercito) return null;
  const onde = exercito.posicao;
  const poder = campanha.poder(exercito.poder);
  const forca = forcaDe(exercito);
  const sitiante = campanha.sitianteDaHosteDe(exercito.id);
  const cerco = campanha.cercoEm(onde);
  const ordem = campanha.ordemDaHoste(exercito.id);
  const destinoDaOrdem = ordem?.rota[ordem.rota.length - 1];
  const emTerraAlheia = campanha.donoDe(onde) !== exercito.poder;
  return {
    hoste: { id: exercito.id },
    provincia: { id: onde, nome: atlas.nomeDe(onde) },
    poder: { nome: poder.nome, cor: poder.cor },
    forca,
    // A folha desta hoste pela taxa do chão em que ela pisa: o número na ficha SOBE no
    // turno em que ela cruza a fronteira, e é assim que o jogador aprende a regra.
    manutencao: Math.round(forca * taxaDaHoste(ajustes, emTerraAlheia)),
    emTerraAlheia,
    minha: campanha.jogador?.id === exercito.poder,
    destinos: campanha.alcanceDaHoste(exercito.id).length,
    marchando: selecao.marchando === exercito.id,
    alvo:
      selecao.alvoHostil === null
        ? null
        : {
            nome: atlas.nomeDe(selecao.alvoHostil),
            // Zero na cidade aberta. É a mesma conta do botão do cerco em pé — a campanha
            // responde as duas, para a tela nunca prometer um assalto que a resolução vai
            // converter em cerco.
            rodadasDeCercoExigidas: campanha.assaltoEm(selecao.alvoHostil).faltam,
          },
    // A decisão de quem está DENTRO. Só existe onde há cerco inimigo, e a campanha é quem
    // sabe: `sitianteDaHosteDe` já devolve `undefined` quando o cerco é da própria hoste —
    // um sitiante não surte contra si mesmo.
    surtida:
      sitiante === undefined
        ? null
        : {
            contra: campanha.poder(sitiante).nome,
            declarada: campanha.surtidaDe(exercito.id),
          },
    // Só é O cerco desta hoste se for ela quem está sentada: uma tropa de passagem por uma
    // cidade que outro poder sitia não comanda coisa nenhuma.
    cerco:
      cerco && cerco.sitiante === exercito.poder
        ? { postura: cerco.postura, faltamParaAssaltar: campanha.assaltoEm(onde).faltam }
        : null,
    ordem:
      ordem && destinoDaOrdem !== undefined
        ? { destino: atlas.nomeDe(destinoDaOrdem), homens: ordem.homens }
        : null,
    origens: Object.entries(exercito.origem)
      .map(([id, homens]) => {
        const donoAgora = campanha.donoDe(id);
        return {
          provincia: id,
          nome: atlas.nomeDe(id),
          homens,
          perdida: donoAgora !== exercito.poder,
          donoAtual: campanha.poder(donoAgora).nome,
        };
      })
      .sort((a, b) => b.homens - a.homens),
  };
}

/** Casa ou campanha: é o chão que decide o soldo. */
function taxaDaHoste(ajustes: Ajustes, emTerraAlheia: boolean): number {
  const taxas = ajustes.jogo.combate.manutencaoPorHomem;
  return emTerraAlheia ? taxas.emCampanha : taxas.emCasa;
}
