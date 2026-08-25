/**
 * O que o mapa desenha: peças, bandeiras de cerco, rotas e destinos.
 *
 * Tudo derivado na hora, a cada redesenho: guardar qualquer uma destas listas criaria uma
 * segunda verdade sobre onde as coisas estão.
 */

import { forcaDe } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { TrechoDeMarcha } from '@/ui/animacao-de-marcha';
import type { MarcaDeCerco } from '@/ui/cercos-mapa';
import type { Destino } from '@/ui/destinos-mapa';
import type { MarcadorDeHoste } from '@/ui/hostes-mapa';
import type { OrdemNoMapa, PontoDeMarcha, PrevisaoDeMarcha } from '@/ui/marchas-mapa';
import type { Jogo } from '../contexto';

/**
 * Onde a PEÇA de uma hoste fica desenhada.
 *
 * Normalmente o centro da província. Mas **quem sitia acampa na divisa**, não dentro da
 * cidade: o exército está do lado de fora dos muros, e desenhá-lo no centro diria que ele já
 * tomou o lugar — que é exatamente o que sitiar não faz.
 *
 * A divisa é aproximada pelo meio do caminho entre os dois centros, o da província sitiada e
 * o da vizinha de onde ele veio. Não é a fronteira geométrica exata, e não precisa ser: o
 * que a peça tem que dizer é "estou na porta, vindo dali".
 */
function pontoDaHoste(jogo: Jogo, hoste: Exercito): PontoDeMarcha {
  const centro = jogo.atlas.provincia(hoste.posicao).centro;
  const cerco = jogo.campanha.cercoEm(hoste.posicao);
  if (!cerco || cerco.sitiante !== hoste.poder) return { x: centro.x, y: centro.y };

  // Ordenado por id: sem isso a peça pularia de uma divisa pra outra conforme a ordem em que
  // as vizinhas aparecem.
  const daBase = jogo.atlas
    .provincia(hoste.posicao)
    .vizinhas.filter((v) => jogo.campanha.donoDe(v) === hoste.poder)
    .sort()[0];
  if (daBase === undefined) return { x: centro.x, y: centro.y };

  const base = jogo.atlas.provincia(daBase).centro;
  // 0,55 e não 0,5: um fio para dentro do território sitiado, pra ler como "pressionando
  // esta província" em vez de "parado em cima da linha".
  return {
    x: base.x + (centro.x - base.x) * 0.55,
    y: base.y + (centro.y - base.y) * 0.55,
  };
}

function pontoDe(jogo: Jogo, idProvincia: string): PontoDeMarcha {
  const centro = jogo.atlas.provincia(idProvincia).centro;
  return { x: centro.x, y: centro.y };
}

/**
 * Onde desenhar cada hoste, e de que cor. **Uma peça por HOSTE, não por província.**
 *
 * ⚠️ Era uma por província, e por isso o segundo exército sumia do mapa: numa cidade sitiada
 * existem duas hostes, e a peça que aparecia era a de menor id — a guarnição do defensor.
 * Era daí que vinham as três coisas erradas de uma vez: o marcador do sitiante não existia, a
 * marcha dele terminava no centro da cidade e a cor era a do inimigo.
 */
export function marcadoresDasHostes(jogo: Jogo): MarcadorDeHoste[] {
  const { campanha, atlas, selecao } = jogo;
  const meu = campanha.jogador?.id ?? null;
  // `campanha.hostes()` já vem ordenado por id: a ordem no DOM não pode depender de quem foi
  // recrutado primeiro.
  const emArmas = campanha.hostes().map((exercito) => {
    const poder = campanha.poder(exercito.poder);
    const onde = pontoDaHoste(jogo, exercito);
    const cerco = campanha.cercoEm(exercito.posicao);
    const formacao = campanha.formacaoEm(exercito.posicao);
    // A leva engrossa o marcador da hoste do MESMO poder. Numa cidade sitiada a leva é do
    // defensor, e somá-la ao acampamento do sitiante contaria recrutas do inimigo.
    const leva = formacao?.poder === exercito.poder ? formacao.homens : 0;
    return {
      id: exercito.id,
      provincia: exercito.posicao,
      x: onde.x,
      y: onde.y,
      forca: forcaDe(exercito),
      emFormacao: leva,
      // A cor é a do DONO DA HOSTE, não a do chão: assim que a tropa pisar em terra alheia as
      // duas deixam de coincidir, e é aí que a cor passa a informar.
      cor: poder.cor,
      nomeDoPoder: poder.nome,
      minha: exercito.poder === meu,
      escolhendoDestino: selecao.marchando === exercito.id,
      temOrdem: campanha.ordemDaHoste(exercito.id) !== undefined,
      chegadaRecente: selecao.chegadasRecentes.has(exercito.id),
      sitiando: cerco?.sitiante === exercito.poder,
    };
  });

  // Leva sem hoste do mesmo poder no lugar: peça própria, com chave sintética. A formação
  // vive por província no estado e só ganha id de hoste ao ficar pronta.
  const levas = campanha.formacoes().flatMap(({ provincia, formacao }) => {
    // Comparado por ID de poder, não por nome: dois poderes podem chamar-se parecido, e o
    // nome é texto de interface.
    const jaTemPeca = campanha.hostesEm(provincia).some((h) => h.poder === formacao.poder);
    if (jaTemPeca) return [];
    const poder = campanha.poder(formacao.poder);
    const centro = atlas.provincia(provincia).centro;
    return [
      {
        id: `formacao:${provincia}`,
        provincia,
        x: centro.x,
        y: centro.y,
        forca: 0,
        emFormacao: formacao.homens,
        cor: poder.cor,
        nomeDoPoder: poder.nome,
        minha: formacao.poder === meu,
        escolhendoDestino: false,
        temOrdem: false,
        chegadaRecente: false,
        sitiando: false,
      },
    ];
  });

  return [...emArmas, ...levas];
}

/** As cidades sob cerco, para a bandeira de fogo. */
export function marcasDeCerco(jogo: Jogo): MarcaDeCerco[] {
  return jogo.campanha.cercos().map(({ provincia, cerco }) => {
    const centro = jogo.atlas.provincia(provincia).centro;
    return { provincia, x: centro.x, y: centro.y, postura: cerco.postura };
  });
}

/**
 * As marchas que a rodada acabou de resolver, no formato que a animação anda.
 *
 * A última parada é onde a PEÇA vai ficar, não o centro da província: quem chega sitiando
 * acampa na divisa, e a marcha tem que terminar exatamente ali — senão a peça anda até o
 * centro e salta pra divisa no quadro seguinte.
 */
export function trechosDaRodada(jogo: Jogo): TrechoDeMarcha[] {
  return jogo.campanha.rodada.marchas.flatMap((marcha) => {
    const destino = marcha.trilha.at(-1);
    if (destino === undefined) return [];
    const hoste = jogo.campanha.hoste(marcha.hoste);
    const pontos = marcha.trilha.map((id, i) =>
      i === marcha.trilha.length - 1 && hoste !== undefined
        ? pontoDaHoste(jogo, hoste)
        : pontoDe(jogo, id),
    );
    return [{ hoste: marcha.hoste, pontos }];
  });
}

/** Rotas ainda possíveis enquanto o jogador aponta um destino. */
export function previsaoDaMarcha(jogo: Jogo): {
  origem: PontoDeMarcha | null;
  rotas: PrevisaoDeMarcha[];
} {
  const { selecao, campanha } = jogo;
  if (selecao.fase !== 'campanha' || selecao.marchando === null) {
    return { origem: null, rotas: [] };
  }
  const hoste = campanha.hoste(selecao.marchando);
  if (!hoste) return { origem: null, rotas: [] };
  const origem = pontoDe(jogo, hoste.posicao);
  const poder = hoste.poder;
  const rotas = [...campanha.rotasDaHoste(selecao.marchando)].map(([destino, rota]) => ({
    destino,
    pontos: [origem, ...rota.map((id) => pontoDe(jogo, id))],
    hostil: poder !== undefined && campanha.donoDe(destino) !== poder,
  }));
  return { origem, rotas };
}

/** Ordens comprometidas continuam desenhadas até a resolução da rodada. */
export function ordensNoMapa(jogo: Jogo): OrdemNoMapa[] {
  const { campanha, selecao } = jogo;
  if (selecao.fase !== 'campanha') return [];
  return campanha.ordens().flatMap(({ idHoste, ordem }) => {
    const destino = ordem.rota.at(-1);
    const hoste = campanha.hoste(idHoste);
    if (!destino || !hoste) return [];
    const poder = campanha.poder(hoste.poder);
    return [
      {
        origem: ordem.origem,
        destino,
        pontos: [pontoDe(jogo, ordem.origem), ...ordem.rota.map((id) => pontoDe(jogo, id))],
        homens: ordem.homens,
        cor: poder.cor,
        minha: hoste.poder === campanha.jogador?.id,
        hostil: campanha.donoDe(destino) !== hoste.poder,
      },
    ];
  });
}

/** Para onde a marcha em composição pode ir. Vazio fora do modo de marcha. */
export function destinosDaMarcha(jogo: Jogo): Destino[] {
  const { campanha, atlas, selecao } = jogo;
  if (selecao.marchando === null) return [];
  const poder = campanha.hoste(selecao.marchando)?.poder;
  return campanha.alcanceDaHoste(selecao.marchando).map((id) => {
    const p = atlas.provincia(id);
    return {
      provincia: id,
      nome: p.nome,
      x: p.centro.x,
      y: p.centro.y,
      hostil: poder !== undefined && campanha.donoDe(id) !== poder,
    };
  });
}
