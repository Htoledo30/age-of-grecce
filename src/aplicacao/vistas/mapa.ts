/**
 * O que o mapa desenha: peças, bandeiras de cerco, rotas e destinos.
 *
 * Tudo derivado na hora, a cada redesenho: guardar qualquer uma destas listas criaria uma
 * segunda verdade sobre onde as coisas estão.
 */

import { homensEmFormacao } from '@/combate/formacao-de-leva';
import { forcaDe } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { TrechoDeMarcha } from '@/ui/animacao-de-marcha';
import type { MarcaDeCerco } from '@/ui/cercos-mapa';
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
 * Onde fica a peça de quem JÁ TEM ORDEM: **no meio da própria seta, na estrada.**
 *
 * ⚠️ **É o lugar que o destacamento pedia, e a primeira tentativa errou.** Quando mandar parte
 * da tropa passou a partir a hoste na hora, as duas peças nasciam no mesmo centro de província e
 * eu as afastei de lado, em pixel de tela. Henrique, olhando: *"a única coisa que precisa
 * arrumar é onde ele fica quando se separam. gostaria que ele andasse em direção da seta, o mais
 * perto do meio da seta possível, como se estivesse se deslocando mesmo"*.
 *
 * Ele está certo, e o afastamento lateral era arbitrário: dizia "há duas coisas aqui" e não
 * dizia qual delas está de partida. Sobre a linha, a peça diz as duas de uma vez — quem fica
 * está na cidade, quem vai já está na estrada, e a seta deixa de ser um enfeite ao lado do
 * marcador para virar o caminho em que ele anda.
 *
 * ⚠️ **Meio do CAMINHO ANDADO, e não da linha reta.** Uma rota de três trechos dobra: o ponto
 * médio entre as duas pontas cairia fora da estrada, às vezes no mar. Este anda a polilinha até
 * gastar metade do comprimento dela, que é onde o olho vê o meio da seta.
 */
function meioDaMarcha(pontos: readonly PontoDeMarcha[]): PontoDeMarcha | null {
  if (pontos.length < 2) return null;
  const trechos = pontos.slice(1).map((p, i) => {
    const anterior = pontos[i] as PontoDeMarcha;
    return Math.hypot(p.x - anterior.x, p.y - anterior.y);
  });
  const total = trechos.reduce((soma, t) => soma + t, 0);
  if (total <= 0) return null;
  let faltam = total / 2;
  for (const [i, comprimento] of trechos.entries()) {
    if (comprimento <= 0) continue;
    if (faltam > comprimento) {
      faltam -= comprimento;
      continue;
    }
    const de = pontos[i] as PontoDeMarcha;
    const para = pontos[i + 1] as PontoDeMarcha;
    const fracao = faltam / comprimento;
    return { x: de.x + (para.x - de.x) * fracao, y: de.y + (para.y - de.y) * fracao };
  }
  return pontos[pontos.length - 1] ?? null;
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
  /**
   * Quantas peças do MESMO poder já saíram nesta província — o desvio de cada uma.
   *
   * ⚠️ **É o preço do destacamento, e ele é de interface.** Desde que mandar parte da hoste a
   * parte na hora, duas peças suas ocupam o mesmo centro de província durante a rodada; sem
   * desviar, a de baixo some sob a de cima e deixa de receber clique — o jogador divide a tropa
   * e perde metade dela de vista. Espalhadas, ele vê as duas colunas e comanda qualquer uma.
   */
  const jaNoLugar = new Map<string, number>();
  const desvioDe = (idPoder: string, provincia: string): number => {
    const chave = `${idPoder}@${provincia}`;
    const quantas = jaNoLugar.get(chave) ?? 0;
    jaNoLugar.set(chave, quantas + 1);
    // 0, +46, −46, +92, −92… A primeira fica no centro, para que uma província com uma hoste
    // só continue exatamente como sempre foi. O passo é a largura mínima da peça mais um fio:
    // menos que isso e as duas se encostam, que foi o que a primeira medição mostrou.
    const passo = Math.ceil(quantas / 2) * 46;
    return quantas === 0 ? 0 : quantas % 2 === 1 ? passo : -passo;
  };
  // `campanha.hostes()` já vem ordenado por id: a ordem no DOM não pode depender de quem foi
  // recrutado primeiro.
  const emArmas = campanha.hostes().map((exercito) => {
    const poder = campanha.poder(exercito.poder);
    // ⚠️ **Quem tem ordem já está na estrada.** É o que separa as duas peças de um
    // destacamento sem inventar deslocamento nenhum: a que fica mora no centro da província, a
    // que parte mora no meio da seta dela. Ver `meioDaMarcha`.
    const ordemDela = campanha.ordemDaHoste(exercito.id);
    const naEstrada =
      ordemDela === undefined
        ? null
        : meioDaMarcha([
            pontoDe(jogo, ordemDela.origem),
            ...ordemDela.rota.map((id) => pontoDe(jogo, id)),
          ]);
    const onde = naEstrada ?? pontoDaHoste(jogo, exercito);
    const cerco = campanha.cercoEm(exercito.posicao);
    const formacao = campanha.formacaoEm(exercito.posicao);
    // A leva engrossa o marcador da hoste do MESMO poder. Numa cidade sitiada a leva é do
    // defensor, e somá-la ao acampamento do sitiante contaria recrutas do inimigo.
    const leva = formacao?.poder === exercito.poder ? homensEmFormacao(formacao) : 0;
    return {
      id: exercito.id,
      provincia: exercito.posicao,
      x: onde.x,
      y: onde.y,
      // Só quem está no centro da província disputa lugar: quem já saiu para a estrada tem o
      // caminho dele só para si.
      desvio: naEstrada ? 0 : desvioDe(exercito.poder, exercito.posicao),
      forca: forcaDe(exercito),
      emFormacao: leva,
      // A cor é a do DONO DA HOSTE, não a do chão: assim que a tropa pisar em terra alheia as
      // duas deixam de coincidir, e é aí que a cor passa a informar.
      cor: poder.cor,
      idDoPoder: poder.id,
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
        desvio: desvioDe(formacao.poder, provincia),
        forca: 0,
        emFormacao: homensEmFormacao(formacao),
        cor: poder.cor,
        idDoPoder: poder.id,
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
/**
 * As rotas de uma hoste, calculadas UMA VEZ e emprestadas a quem precisar no mesmo desenho.
 *
 * ⚠️ **Existe porque o Porto fazia o jogo travar, e a causa era esta.** Henrique, jogando:
 * *"quando eu faço o porto, e movo uma unidade, laga todo o jogo"*. A busca de rotas roda uma
 * varredura do mapa inteiro; sem Porto ela morre em meia dúzia de províncias vizinhas, mas
 * **com Porto o mar abre e ela passa a percorrer as 244 províncias e as 48 zonas de água**,
 * guardando um caminho para cada uma. E ela rodava TRÊS VEZES por redesenho: a previsão da
 * marcha, os destinos no mapa, e a ficha do exército — esta última só para dizer quantos
 * destinos existem. Três varreduras do mundo a cada quadro, com o mouse andando.
 */
export interface RotasEmFoco {
  /** De quem são estas rotas. `null` quando não há hoste escolhida. */
  idHoste: string | null;
  rotas: ReadonlyMap<string, readonly string[]>;
}

const SEM_ROTAS: RotasEmFoco = { idHoste: null, rotas: new Map() };

/** As rotas da hoste que a interface está desenhando agora. Uma busca, e só. */
export function rotasEmFoco(jogo: Jogo): RotasEmFoco {
  const { selecao, campanha } = jogo;
  if (selecao.fase !== 'campanha' || selecao.hoste === null) return SEM_ROTAS;
  return { idHoste: selecao.hoste, rotas: campanha.rotasLongasDaHoste(selecao.hoste) };
}

/** As rotas emprestadas quando servem a esta hoste; senão, a busca de verdade. */
function rotasDe(jogo: Jogo, idHoste: string, foco: RotasEmFoco): ReadonlyMap<string, readonly string[]> {
  return foco.idHoste === idHoste ? foco.rotas : jogo.campanha.rotasLongasDaHoste(idHoste);
}

/**
 * A rota da marcha em composição — **UMA, a do lugar para onde o jogador está olhando.**
 *
 * ⚠️ **Eram todas ao mesmo tempo, e é isto que travava o jogo.** Esta função montava os pontos
 * de cada destino alcançável: quatro sem Porto, e **cento e noventa e nove com ele**, porque o
 * cais abre o mar e o mar leva a toda parte. Medido com GPU de verdade na máquina do Henrique,
 * no cenário dele: o quadro ia de 7 ms para **405 ms — 2,4 quadros por segundo**. E a conta era
 * inteira de PINTURA: escondendo só a camada das rotas, com todo o JavaScript rodando igual, o
 * mesmo quadro voltava a 18,6 ms. A busca de rotas, que parecia a culpada óbvia, custa 0,1 ms.
 *
 * Henrique: *"não faz sentido já ter todas as rotas à mostra, ou pontos. as rotas só deveriam
 * aparecer quando eu clicasse na zona/província que eu queira que meu exército vá"*. Ele estava
 * descrevendo o conserto sem saber: com uma rota por vez o mesmo quadro custa 21 ms.
 *
 * Duas rotas podem existir ao mesmo tempo, e só duas: a do ponteiro e a do alvo hostil já
 * apontado — porque enquanto ele decide entre assaltar e sitiar, a rota que está em jogo tem de
 * continuar desenhada mesmo que o mouse ande para outro lado.
 */
export function previsaoDaMarcha(jogo: Jogo, foco: RotasEmFoco = SEM_ROTAS): {
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
  const todas = rotasDe(jogo, selecao.marchando, foco);
  const querem = [selecao.alvoHostil, selecao.destinoApontado];
  const vistos = new Set<string>();
  const rotas: PrevisaoDeMarcha[] = [];
  for (const destino of querem) {
    if (destino === null || vistos.has(destino)) continue;
    const rota = todas.get(destino);
    // Sem rota não há linha: apontar Corinto do outro lado do mapa não desenha nada, e é o
    // silêncio que diz que dali não se chega. A recusa em palavra vem do clique.
    if (!rota) continue;
    vistos.add(destino);
    rotas.push({
      destino,
      pontos: [origem, ...rota.map((id) => pontoDe(jogo, id))],
      hostil:
        poder !== undefined && !campanha.ehMar(destino) && campanha.donoDe(destino) !== poder,
    });
  }
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
        hostil: !campanha.ehMar(destino) && campanha.donoDe(destino) !== hoste.poder,
      },
    ];
  });
}

/**
 * ⚠️ **`destinosDaMarcha` NÃO EXISTE MAIS, e este comentário é a lápide dela.**
 *
 * Ela devolvia um botão por destino alcançável para a camada `destinos-mapa`: quatro sem Porto,
 * cento e noventa e nove com ele. Henrique, jogando: *"não faz sentido já ter todas as rotas à
 * mostra, ou pontos. igual em age of history 2: eu clico na minha tropa e movo ela para onde eu
 * quiser só selecionando uma província/zona"*.
 *
 * Ele está certo por duas razões independentes. A de desenho: uma lista de alvos pré-marcados
 * responde uma pergunta que o jogador não fez — ele já sabe para onde quer ir. A de custo: com
 * os botões, o único jeito de o mapa dizer "aqui dá" era desenhar a rota de todos ao mesmo
 * tempo, e isso derrubava o jogo para 2,4 quadros por segundo.
 *
 * Agora o mapa inteiro é clicável enquanto a marcha está sendo composta; a rota aparece sob o
 * ponteiro; e o clique impossível recebe a palavra de `avaliarOrdem` em vez de nada.
 * Ver `aplicacao/ligar-acoes.ts`, na interceptação de `cena.aoSelecionar`.
 */
