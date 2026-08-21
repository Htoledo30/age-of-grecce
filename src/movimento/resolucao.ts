/**
 * A resolução da rodada: executa todas as ordens juntas, em passos.
 *
 * O princípio, e ele responde quase tudo sozinho:
 *
 * > **A rodada resolve em PASSOS. Dentro de cada passo: primeiro todos PARTEM, depois
 * > todos CHEGAM, e só então se resolve quem ficou junto de quem.**
 *
 * É essa separação que faz a simultaneidade ser real. Se partida e chegada acontecessem
 * hoste por hoste, quem fosse processado primeiro veria um mundo que os outros ainda não
 * mexeram — que é exatamente o defeito que a resolução simultânea existe pra consertar.
 *
 * ⚠️ **Guarnição parada e destacamento em marcha são a MESMA coisa aqui: uma força com
 * posição.** Sem essa unificação, cada linha da tabela de adjudicação viraria um `if`
 * diferente — "hoste contra hoste", "hoste contra quem chegou", "quem chegou contra quem
 * chegou" — e as três teriam que concordar. Uma estrutura só, e o choque não pergunta de
 * onde a força veio.
 *
 * Ver `documentacao/design/resolucao-da-rodada.md` para a tabela completa.
 */

import { resolverChoque } from '@/combate/batalha';
import { exercitoVazio, forcaDe, retirar, somarLeva } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { OrdemDeMarcha } from './ordens';
import type { Ajustes } from '@/dados/esquema';
import {
  type Cerco,
  type Postura,
  avancoDoCerco,
  defesaNoAssalto,
  milicianosPerdidos,
} from '@/combate/cerco';

/** O recorte do estado que a resolução mexe. Nada além disto. */
export interface EstadoDaResolucao {
  exercitos: Record<string, Exercito>;
  ordens: Record<string, OrdemDeMarcha>;
  /** Cercos em curso, por província sitiada. Sobrevive à virada — cerco leva turnos. */
  cercos: Record<string, Cerco>;
}

/** O que a resolução precisa perguntar e mudar no mundo em volta. */
export interface MundoDaResolucao {
  donoDe: (idProvincia: string) => string;
  trocarDono: (idProvincia: string, idPoder: string) => void;
  /** Quantos milicianos esta província põe em pé. Zero onde não há população. */
  miliciaDe: (idProvincia: string) => number;
  /**
   * Avisa quantos milicianos a província PERDEU no choque.
   *
   * ⚠️ Perdido não é o mesmo que morto: milícia derrotada **dispersa**, e quem decide a
   * fatia que morreu é a campanha, que é onde os ajustes moram. A resolução não conhece
   * essa fração — se conhecesse, o número de balanço estaria em dois lugares.
   */
  miliciaPerdida: (idProvincia: string, perdidos: number) => void;
}

/**
 * Uma força durante a resolução: guarnição parada ou destacamento em marcha.
 *
 * **Enquanto marcha, ela não está na origem nem no destino**: está onde o passo a deixou.
 * Sem isso, "interceptar no meio do caminho" não teria onde acontecer.
 */
interface Forca {
  poder: string;
  /** Quantos homens de cada terra natal. Fatia proporcional da hoste de origem. */
  origem: Record<string, number>;
  /** Trechos que ainda vai andar. Vazio na guarnição parada. */
  rota: readonly string[];
  posicao: string;
  partiuDe: string;
  /** Morreu num choque. Não some da lista: sair no meio da varredura muda o resultado. */
  viva: boolean;
}

/** O que aconteceu na rodada — pra crônica, pra interface e pros testes. */
export interface RelatorioDaRodada {
  /**
   * Quem se moveu, e **por onde**.
   *
   * ⚠️ A trilha é o caminho INTEIRO, com as duas pontas: `trilha[0]` é de onde saiu e
   * `trilha.at(-1)` é onde parou. Guardar origem e destino ao lado dela seria guardar um
   * resumo junto do detalhe, e um dia os dois discordariam. Quem desenha a marcha precisa
   * das paradas do meio: com dois saltos por rodada, a reta entre as pontas passa por
   * fora do caminho que a seta prometeu.
   */
  marchas: readonly { trilha: readonly string[]; homens: number }[];
  /** Choques resolvidos. `provincia` é `null` no encontro na estrada, que não tem lugar. */
  batalhas: readonly {
    provincia: string | null;
    vencedor: string | null;
    perdedores: readonly string[];
    sobreviventes: number;
  }[];
  conquistas: readonly { provincia: string; de: string; para: string }[];
  /**
   * Milicianos que a província PERDEU defendendo, por província.
   *
   * Perdidos, não mortos: parte dispersa e volta pra casa. Quem aplica a fração é a
   * campanha.
   */
  milicianosMortos: readonly { provincia: string; mortos: number }[];
  /** Cidades sob cerco ao fim da rodada, com o quanto já foi feito e a postura. */
  cercos: readonly {
    provincia: string;
    sitiante: string;
    progresso: number;
    postura: Postura;
  }[];
}

export function resolverRodada(
  estado: EstadoDaResolucao,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
): RelatorioDaRodada {
  const relatorio: {
    marchas: RelatorioDaRodada['marchas'][number][];
    batalhas: RelatorioDaRodada['batalhas'][number][];
    conquistas: RelatorioDaRodada['conquistas'][number][];
    milicianosMortos: RelatorioDaRodada['milicianosMortos'][number][];
    cercos: RelatorioDaRodada['cercos'][number][];
  } = { marchas: [], batalhas: [], conquistas: [], milicianosMortos: [], cercos: [] };

  // As posturas são lidas ANTES de qualquer coisa: as ordens são consumidas no caminho, e
  // sem isto a cidade não saberia se quem chegou veio assaltar ou sentar.
  const posturas = posturasPorDestino(estado);

  const saltosPorRodada = ajustes.saltosPorRodada;
  const forcas = partir(estado);
  for (let passo = 0; passo < saltosPorRodada; passo++) {
    naEstrada(forcas, passo, relatorio.batalhas);
    chegar(forcas, passo);
    naProvincia(forcas, relatorio.batalhas);
  }
  pousar(estado, forcas, relatorio.marchas);
  resolverCidades(estado, ajustes, mundo, posturas, relatorio);

  // ⚠️ As ordens são da RODADA, não da partida. Se sobrevivessem à virada, executariam de
  // novo, e o sintoma seria tropa andando sozinha.
  estado.ordens = {};
  return relatorio;
}

/**
 * FASE PARTIDA — todos saem antes de qualquer um chegar, e o tabuleiro fica vazio.
 *
 * Tira TODAS as hostes do estado, não só as que marcham: quem fica vira uma força de rota
 * vazia. É o que permite o choque tratar guarnição e destacamento pela mesma régua.
 *
 * ⚠️ **A origem fica vazia já aqui**, mesmo com destino a dois trechos. Quem manda a
 * guarnição inteira embora deixa a casa aberta desde o primeiro instante da rodada.
 *
 * ⚠️ **Ordenado por id**, nunca pela ordem do registro: `Object.entries` devolve as chaves
 * na ordem de criação, e percorrer isso cru faria o resultado depender de quem foi
 * recrutado primeiro.
 */
function partir(estado: EstadoDaResolucao): Forca[] {
  const forcas: Forca[] = [];

  for (const onde of Object.keys(estado.exercitos).sort()) {
    const hoste = estado.exercitos[onde];
    if (!hoste) continue;
    const ordem = estado.ordens[onde];

    if (ordem) {
      // `retirar` já tira proporcionalmente de cada terra natal — é o que faz o
      // destacamento levar uma parcela de cada origem em vez da primeira da lista.
      const partem = retirar(hoste, Math.min(ordem.homens, forcaDe(hoste)));
      if (Object.keys(partem).length > 0) {
        forcas.push({
          poder: hoste.poder,
          origem: partem,
          rota: ordem.rota,
          posicao: onde,
          partiuDe: onde,
          viva: true,
        });
      }
    }

    if (forcaDe(hoste) > 0) {
      forcas.push({
        poder: hoste.poder,
        origem: { ...hoste.origem },
        rota: [],
        posicao: onde,
        partiuDe: onde,
        viva: true,
      });
    }
    delete estado.exercitos[onde];
  }

  return forcas;
}

/**
 * O ENCONTRO NA ESTRADA — duas forças hostis atravessando a mesma aresta em sentidos
 * opostos.
 *
 * Sem esta fase, as duas passariam uma pela outra e trocariam de território sem se tocar,
 * o que abre uma esquiva: adivinhando de onde vem o ataque, bastava marchar pra lá e
 * **nunca ser pego**.
 *
 * ⚠️ **É a única batalha do jogo sem lugar** — não acontece em província nenhuma, e por
 * isso não tem defensor nem terreno. Quem vence **continua a rota**; quem perde some.
 */
function naEstrada(
  forcas: readonly Forca[],
  passo: number,
  batalhas: RelatorioDaRodada['batalhas'][number][],
): void {
  const andando = forcas.filter((f) => f.viva && f.rota[passo] !== undefined);

  for (let i = 0; i < andando.length; i++) {
    for (let j = i + 1; j < andando.length; j++) {
      const a = andando[i];
      const b = andando[j];
      if (!a?.viva || !b?.viva) continue;
      if (a.poder === b.poder) continue;
      // A troca: o destino de um é a origem do outro, nos dois sentidos.
      if (a.rota[passo] !== b.posicao || b.rota[passo] !== a.posicao) continue;
      // Quem vence na estrada CONTINUA: não há província onde parar.
      travarLados([a], [b], null, batalhas, false);
    }
  }
}

/** FASE CHEGADA — todos os sobreviventes avançam um trecho. */
function chegar(forcas: readonly Forca[], passo: number): void {
  for (const forca of forcas) {
    if (!forca.viva) continue;
    const proxima = forca.rota[passo];
    if (proxima === undefined) continue;
    forca.posicao = proxima;
  }
}

/**
 * FASE CHOQUE — quem ficou junto de quem, agora que todos chegaram.
 *
 * Com três ou mais poderes no mesmo lugar, resolve **aos pares, da maior força para a
 * menor**, e o desempate é por id. É provisório e está marcado como tal: combate de três
 * lados de verdade é assunto de diplomacia, que não existe.
 */
function naProvincia(forcas: Forca[], batalhas: RelatorioDaRodada['batalhas'][number][]): void {
  const porProvincia = new Map<string, Forca[]>();
  for (const forca of forcas) {
    if (!forca.viva) continue;
    const lista = porProvincia.get(forca.posicao) ?? [];
    lista.push(forca);
    porProvincia.set(forca.posicao, lista);
  }

  for (const provincia of [...porProvincia.keys()].sort()) {
    const presentes = porProvincia.get(provincia) ?? [];
    for (;;) {
      const vivas = presentes.filter((f) => f.viva);
      const poderes = new Set(vivas.map((f) => f.poder));
      if (poderes.size < 2) break;

      // Ordena por força, e desempata por id: sem isso o resultado dependeria da ordem em
      // que as forças entraram na lista.
      const ordenadas = [...poderes]
        .map((poder) => ({
          poder,
          forca: vivas.filter((f) => f.poder === poder).reduce((s, f) => s + soma(f.origem), 0),
        }))
        .sort((x, y) => y.forca - x.forca || x.poder.localeCompare(y.poder));

      const maior = ordenadas[0];
      const segunda = ordenadas[1];
      if (!maior || !segunda) break;
      travarLados(
        vivas.filter((f) => f.poder === maior.poder),
        vivas.filter((f) => f.poder === segunda.poder),
        provincia,
        batalhas,
        // ⚠️ Quem lutou numa PROVÍNCIA para ali: a rota que sobrava é cancelada. É o
        // contrário do encontro na estrada, e a diferença tem motivo — lá não existe
        // lugar onde ficar, aqui existe. Deixar o vencedor seguir daria um segundo choque
        // no mesmo passo e quebraria a regra de "todos chegam antes de qualquer choque".
        true,
      );
    }
  }
}

/**
 * Um choque entre dois LADOS, cada um podendo ter várias forças no mesmo lugar.
 *
 * O perdedor some inteiro; o vencedor encolhe proporcionalmente em todas as suas forças.
 * Encolher proporcionalmente e não "a primeira da lista" é o que impede a ordem das
 * chegadas de virar uma regra escondida.
 */
function travarLados(
  ladoA: readonly Forca[],
  ladoB: readonly Forca[],
  provincia: string | null,
  batalhas: RelatorioDaRodada['batalhas'][number][],
  cancelarRota: boolean,
): void {
  const totalA = ladoA.reduce((s, f) => s + soma(f.origem), 0);
  const totalB = ladoB.reduce((s, f) => s + soma(f.origem), 0);
  const r = resolverChoque(totalA, totalB);

  const vencedores = r.vencedor === 'a' ? ladoA : r.vencedor === 'b' ? ladoB : [];
  const perdedores = r.vencedor === 'a' ? ladoB : r.vencedor === 'b' ? ladoA : [...ladoA, ...ladoB];

  for (const f of perdedores) {
    f.viva = false;
    f.origem = {};
  }
  reduzirLado(vencedores, r.sobreviventes);
  if (cancelarRota) for (const f of vencedores) f.rota = [];

  batalhas.push({
    provincia,
    vencedor: vencedores[0]?.poder ?? null,
    perdedores: [...new Set(perdedores.map((f) => f.poder))].sort(),
    sobreviventes: r.sobreviventes,
  });
}

/** Encolhe um lado até `alvo` homens, proporcionalmente entre as forças e as terras natais. */
function reduzirLado(lado: readonly Forca[], alvo: number): void {
  const total = lado.reduce((s, f) => s + soma(f.origem), 0);
  if (total <= alvo || total === 0) return;

  // Reaproveita `retirar`, que já reparte proporcionalmente e fecha exato no arredondamento.
  const caixa = exercitoVazio('provisorio');
  for (const f of lado) {
    for (const [terra, homens] of Object.entries(f.origem)) somarLeva(caixa, terra, homens);
  }
  retirar(caixa, total - alvo);

  // Redistribui o que sobrou de volta, na proporção do que cada força tinha.
  const sobrou = { ...caixa.origem };
  for (const f of lado) {
    const meu = soma(f.origem);
    const nova: Record<string, number> = {};
    for (const [terra, homens] of Object.entries(sobrou)) {
      const parte = Math.floor((homens * meu) / total);
      if (parte > 0) nova[terra] = parte;
    }
    f.origem = nova;
    if (soma(nova) === 0) f.viva = false;
  }

  // O resto do arredondamento vai pra maior força viva, pra soma fechar exata.
  const falta = alvo - lado.reduce((s, f) => s + soma(f.origem), 0);
  const maior = [...lado].filter((f) => f.viva).sort((x, y) => soma(y.origem) - soma(x.origem))[0];
  if (falta > 0 && maior) {
    const terra = Object.keys(sobrou).sort()[0];
    if (terra !== undefined) maior.origem[terra] = (maior.origem[terra] ?? 0) + falta;
  }
}

/** Põe as forças sobreviventes no chão, fundindo as do mesmo poder que pararam juntas. */
function pousar(
  estado: EstadoDaResolucao,
  forcas: readonly Forca[],
  marchas: RelatorioDaRodada['marchas'][number][],
): void {
  for (const forca of forcas) {
    if (!forca.viva || soma(forca.origem) === 0) continue;
    const naChegada = estado.exercitos[forca.posicao] ?? exercitoVazio(forca.poder);
    for (const [terra, homens] of Object.entries(forca.origem)) somarLeva(naChegada, terra, homens);
    estado.exercitos[forca.posicao] = naChegada;
    if (forca.posicao !== forca.partiuDe) {
      // `rota` é o plano inteiro e `posicao` é onde a força de fato parou — quem foi
      // barrado num choque na estrada parou antes do fim. Cortar a rota na posição atual
      // é o que faz a trilha ser o andado, e não o pretendido.
      const andados = forca.rota.indexOf(forca.posicao);
      marchas.push({
        trilha: [forca.partiuDe, ...forca.rota.slice(0, andados + 1)],
        homens: soma(forca.origem),
      });
    }
  }
}

function soma(origem: Record<string, number>): number {
  let total = 0;
  for (const homens of Object.values(origem)) total += homens;
  return total;
}

/**
 * A postura que cada hoste levava ao chegar, por província de destino.
 *
 * Lida antes de qualquer fase porque as ordens são consumidas no caminho — e sem ela a
 * cidade não teria como saber se quem apareceu na fronteira veio assaltar ou sentar.
 */
function posturasPorDestino(estado: EstadoDaResolucao): Map<string, Postura> {
  const posturas = new Map<string, Postura>();
  for (const origem of Object.keys(estado.ordens).sort()) {
    const ordem = estado.ordens[origem];
    const destino = ordem?.rota.at(-1);
    if (!ordem || destino === undefined) continue;
    posturas.set(destino, ordem.postura);
  }
  return posturas;
}

/**
 * AS CIDADES — o que acontece com quem ficou de pé em terra alheia.
 *
 * Substituiu a conquista instantânea, e a diferença é o jogo inteiro: antes, sobrar de pé
 * numa província alheia era ser dono dela. Agora sobrar de pé é ficar com o CAMPO, e a
 * cidade continua sendo um problema por resolver.
 *
 * ⚠️ **Província alheia realmente vazia continua caindo sem batalha.** Sem gente não há
 * quem feche portão nenhum — é fronteira desprotegida, e é o que dá peso a decidir se a
 * guarnição marcha ou fica. As 200 sem economia configurada caem assim.
 */
function resolverCidades(
  estado: EstadoDaResolucao,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
  posturas: Map<string, Postura>,
  relatorio: {
    batalhas: RelatorioDaRodada['batalhas'][number][];
    conquistas: RelatorioDaRodada['conquistas'][number][];
    milicianosMortos: RelatorioDaRodada['milicianosMortos'][number][];
    cercos: RelatorioDaRodada['cercos'][number][];
  },
): void {
  const tomar = (provincia: string, poder: string): void => {
    const de = mundo.donoDe(provincia);
    mundo.trocarDono(provincia, poder);
    relatorio.conquistas.push({ provincia, de, para: poder });
    delete estado.cercos[provincia];
  };

  for (const provincia of Object.keys(estado.exercitos).sort()) {
    const hoste = estado.exercitos[provincia];
    if (!hoste) continue;

    // Terra própria: se havia cerco aqui, ele acabou — ou o socorro chegou, ou o sitiante
    // foi expulso. Levantar o cerco é consequência, não regra separada.
    if (hoste.poder === mundo.donoDe(provincia)) {
      delete estado.cercos[provincia];
      continue;
    }

    const milicianos = mundo.miliciaDe(provincia);
    if (milicianos <= 0) {
      tomar(provincia, hoste.poder);
      continue;
    }

    // A ordem desta rodada manda; sem ordem, o cerco em curso continua como estava; sem
    // nem uma coisa nem outra, senta-se. Sitiar é o padrão de propósito: quem chegou sem
    // dizer nada não joga o exército contra a muralha por conta própria.
    const cerco = estado.cercos[provincia];
    const postura =
      posturas.get(provincia) ??
      (cerco && cerco.sitiante === hoste.poder ? cerco.postura : 'sitiar');

    if (postura === 'assaltar') {
      assaltar(estado, provincia, hoste, milicianos, ajustes, mundo, relatorio, tomar);
      continue;
    }

    const progresso =
      (cerco && cerco.sitiante === hoste.poder ? cerco.progresso : 0) +
      avancoDoCerco(forcaDe(hoste), milicianos, ajustes.cerco);
    if (progresso >= 1) {
      tomar(provincia, hoste.poder);
      continue;
    }
    const atual: Cerco = { sitiante: hoste.poder, progresso, postura: 'sitiar' };
    estado.cercos[provincia] = atual;
    relatorio.cercos.push({ provincia, sitiante: hoste.poder, progresso, postura: 'sitiar' });
  }

  // Cerco sem sitiante em cima não existe: quem marchou embora ou morreu soltou a cidade.
  for (const provincia of Object.keys(estado.cercos)) {
    const hoste = estado.exercitos[provincia];
    if (!hoste || hoste.poder !== estado.cercos[provincia]?.sitiante) {
      delete estado.cercos[provincia];
    }
  }
}

/**
 * O ASSALTO — resolve no turno, contra a milícia com o bônus da muralha.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS, não em unidades de defesa.** A defesa é
 * gente multiplicada pela muralha; sem desfazer a multiplicação, um assalto rechaçado
 * faria a população encolher pelo dobro do que de fato caiu.
 */
function assaltar(
  estado: EstadoDaResolucao,
  provincia: string,
  hoste: Exercito,
  milicianos: number,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
  relatorio: {
    batalhas: RelatorioDaRodada['batalhas'][number][];
    conquistas: RelatorioDaRodada['conquistas'][number][];
    milicianosMortos: RelatorioDaRodada['milicianosMortos'][number][];
  },
  tomar: (provincia: string, poder: string) => void,
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
    });
    tomar(provincia, hoste.poder);
    return;
  }

  // Rechaçado: o exército de assalto se desfaz diante da muralha, e a cidade fica.
  delete estado.exercitos[provincia];
  delete estado.cercos[provincia];
  perder(
    choque.vencedor === 'b'
      ? milicianosPerdidos(milicianos, choque.sobreviventes, ajustes.cerco)
      : milicianos,
  );
  relatorio.batalhas.push({
    provincia,
    vencedor: choque.vencedor === 'b' ? dono : null,
    perdedores: choque.vencedor === 'b' ? [hoste.poder] : [hoste.poder, dono],
    sobreviventes: choque.vencedor === 'b' ? Math.floor(choque.sobreviventes / ajustes.cerco.bonusDeMuralha) : 0,
  });
}
