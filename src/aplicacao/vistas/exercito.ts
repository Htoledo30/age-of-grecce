/**
 * A ficha da hoste escolhida: o que ela é, o que pode fazer e o que já mandou fazer.
 *
 * A campanha responde todas as perguntas de regra (pode assaltar? contra quem surtir?) para
 * que a tela nunca prometa uma decisão que a resolução vai converter noutra coisa.
 */

import { ARMAS, forcaDe, porTerra } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import { NOME_DA_ARMA } from '@/ui/armas';
import type { VistaDoExercito } from '@/ui/exercito-ficha/exercito-ficha';
import type { Jogo } from '../contexto';
import type { RotasEmFoco } from './mapa';

export function vistaDoExercito(
  jogo: Jogo,
  /** As rotas já calculadas neste desenho. Ver `rotasEmFoco` — é o conserto do lag do Porto. */
  foco: RotasEmFoco = { idHoste: null, rotas: new Map() },
): VistaDoExercito | null {
  const { campanha, atlas, selecao } = jogo;
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
    manutencao: campanha.manutencaoDaHoste(exercito.id),
    emTerraAlheia,
    minha: campanha.jogador?.id === exercito.poder,
    destinos:
      foco.idHoste === exercito.id
        ? foco.rotas.size
        : campanha.rotasLongasDaHoste(exercito.id).size,
    marchando: selecao.marchando === exercito.id,
    // ⚠️ Perguntada com o MESMO poder e os MESMOS homens que o botão vai usar: uma recusa
    // calculada com outros números seria uma tela que promete o que a regra nega.
    recusaDaOrdem: motivoDaRecusa(jogo, exercito),
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
    // ⚠️ Duas listas, e elas respondem perguntas diferentes: a ARMA decide a próxima
    // batalha, a TERRA decide para quem a dispensa devolve os homens. Somar as duas numa
    // linha só ("300 hoplitas de Atenas") multiplicaria as entradas sem responder nem uma
    // nem outra.
    armas: ARMAS.flatMap((arma) => {
      const grupos = exercito.contingentes.filter((c) => c.arma === arma);
      if (grupos.length === 0) return [];
      const homens = grupos.reduce((s, c) => s + c.homens, 0);
      // Média ponderada do treino: uma hoste pode juntar levas de antes e de depois do
      // Quartel, e o que ela vale em campo é a média delas.
      const treino = grupos.reduce((s, c) => s + c.qualidade * c.homens, 0) / homens;
      return [{ nome: NOME_DA_ARMA[arma], homens, treino }];
    }),
    origens: Object.entries(porTerra(exercito))
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

/**
 * Por que a ordem contra o alvo apontado não sairia. Vazio quando ela sai.
 *
 * A pergunta é feita à campanha, e não deduzida aqui: `podeOrdenarMarcha` é quem sabe que
 * uma hoste só recebe uma ordem por rodada, que surtir ocupa a mesma rodada, e que a rota
 * precisa existir.
 */
function motivoDaRecusa(jogo: Jogo, exercito: Exercito): string {
  const { campanha, selecao } = jogo;
  if (selecao.alvoHostil === null || selecao.marchando !== exercito.id) return '';
  const r = campanha.podeOrdenarMarcha(
    exercito.id,
    selecao.alvoHostil,
    selecao.homensParaMarchar,
  );
  return r.pode ? '' : r.motivo;
}
