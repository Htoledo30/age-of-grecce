/**
 * Vocabulário visual da interface.
 *
 * Os ícones são SVGs pequenos, monocromáticos e desenhados por código para herdarem a
 * cor do lugar onde aparecem. Centralizar as formas aqui impede cada painel de inventar
 * um símbolo diferente para a mesma ideia e permite trocar a linguagem inteira sem
 * caçar SVG espalhado pelo projeto.
 */

export type NomeDoIconeGrego =
  | 'balanca'
  | 'capacete'
  | 'celeiro'
  | 'coruja'
  | 'escudo'
  | 'lanca'
  | 'mapa'
  | 'martelo'
  | 'mercado'
  | 'moeda'
  | 'muralha'
  | 'quartel'
  | 'templo'
  | 'territorio'
  | 'turno';

type Forma = readonly [
  elemento: 'circle' | 'line' | 'path' | 'polyline' | 'rect',
  atributos: Record<string, string>,
];

const FORMAS: Record<NomeDoIconeGrego, readonly Forma[]> = {
  templo: [
    ['polyline', { points: '3 8 12 3 21 8' }],
    ['line', { x1: '3', y1: '9', x2: '21', y2: '9' }],
    ['line', { x1: '5', y1: '20', x2: '19', y2: '20' }],
    ['line', { x1: '4', y1: '22', x2: '20', y2: '22' }],
    ['line', { x1: '7', y1: '10', x2: '7', y2: '19' }],
    ['line', { x1: '12', y1: '10', x2: '12', y2: '19' }],
    ['line', { x1: '17', y1: '10', x2: '17', y2: '19' }],
  ],
  moeda: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['circle', { cx: '9', cy: '10', r: '1.4' }],
    ['circle', { cx: '15', cy: '10', r: '1.4' }],
    ['polyline', { points: '10 14 12 16 14 14' }],
    ['path', { d: 'M7 7 9 5l3 2 3-2 2 2' }],
  ],
  territorio: [
    ['path', { d: 'M4 5 9 3l6 2 5-2v16l-5 2-6-2-5 2Z' }],
    ['line', { x1: '9', y1: '3', x2: '9', y2: '19' }],
    ['line', { x1: '15', y1: '5', x2: '15', y2: '21' }],
  ],
  turno: [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2' }],
  ],
  martelo: [
    ['path', { d: 'm14 4 6 6-3 3-6-6Z' }],
    ['line', { x1: '13', y1: '9', x2: '4', y2: '20' }],
    ['line', { x1: '3', y1: '21', x2: '6', y2: '18' }],
  ],
  capacete: [
    ['path', { d: 'M5 21V11a7 7 0 0 1 14 0v2h-6v8' }],
    ['path', { d: 'M5 13h8l-3 3H5' }],
    ['path', { d: 'M9 4V2m4 2V2m4 4 2-2' }],
  ],
  escudo: [
    ['path', { d: 'M12 2 20 5v6c0 5-3 8-8 11-5-3-8-6-8-11V5Z' }],
    ['path', { d: 'm8.5 17 3.5-9 3.5 9M10 14h4' }],
  ],
  lanca: [
    ['line', { x1: '4', y1: '21', x2: '18', y2: '7' }],
    ['polyline', { points: '14 5 21 3 19 10' }],
    ['line', { x1: '3', y1: '18', x2: '6', y2: '21' }],
  ],
  balanca: [
    ['line', { x1: '12', y1: '3', x2: '12', y2: '20' }],
    ['line', { x1: '5', y1: '6', x2: '19', y2: '6' }],
    ['line', { x1: '7', y1: '6', x2: '4', y2: '13' }],
    ['line', { x1: '17', y1: '6', x2: '20', y2: '13' }],
    ['path', { d: 'M2 13h5a2.5 2.5 0 0 1-5 0Zm15 0h5a2.5 2.5 0 0 1-5 0Z' }],
    ['line', { x1: '7', y1: '21', x2: '17', y2: '21' }],
  ],
  mapa: [
    ['path', { d: 'M3 6 8 3l5 3 4-2 4 2v14l-4-2-4 2-5-3-5 3Z' }],
    ['line', { x1: '8', y1: '3', x2: '8', y2: '17' }],
    ['line', { x1: '13', y1: '6', x2: '13', y2: '20' }],
    ['line', { x1: '17', y1: '4', x2: '17', y2: '18' }],
  ],
  coruja: [
    ['path', { d: 'M6 8 4 4l5 2a8 8 0 0 1 6 0l5-2-2 4a8 8 0 1 1-12 0Z' }],
    ['circle', { cx: '9', cy: '11', r: '2' }],
    ['circle', { cx: '15', cy: '11', r: '2' }],
    ['polyline', { points: '10 15 12 17 14 15' }],
  ],
  celeiro: [
    ['path', { d: 'M4 10 12 4l8 6v11H4Z' }],
    ['line', { x1: '4', y1: '10', x2: '20', y2: '10' }],
    ['path', { d: 'M9 21v-7h6v7M7 7h10' }],
  ],
  mercado: [
    ['path', { d: 'M4 9h16l-2-5H6Z' }],
    ['path', { d: 'M5 9v11h14V9M9 20v-6h6v6' }],
    ['path', { d: 'M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0' }],
  ],
  muralha: [
    ['path', { d: 'M4 4v5h3V4h4v5h3V4h4v5h2v12H4V9h0' }],
    ['path', { d: 'M9 21v-6h6v6' }],
  ],
  quartel: [
    // Escudo grego com lança: duas silhuetas grandes sobrevivem melhor no botão de 17 px
    // que os detalhes do capacete anterior, que reduzido parecia uma cadeira.
    ['path', { d: 'M10 3 17 6v5c0 4-2.5 7-7 10-4.5-3-7-6-7-10V6Z' }],
    ['path', { d: 'm6.5 16 3.5-8 3.5 8M8 13h4' }],
    ['line', { x1: '20', y1: '6', x2: '20', y2: '22' }],
    ['polyline', { points: '17 6 20 2 23 6' }],
  ],
};

const NS = 'http://www.w3.org/2000/svg';

export function iconeGrego(nome: NomeDoIconeGrego, classe = ''): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('icone-grego', `icone-grego--${nome}`);
  if (classe) svg.classList.add(classe);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  for (const [tipo, atributos] of FORMAS[nome]) {
    const forma = document.createElementNS(NS, tipo);
    for (const [atributo, valor] of Object.entries(atributos)) forma.setAttribute(atributo, valor);
    svg.appendChild(forma);
  }
  return svg;
}

/** Mantém o texto acessível e o ícone puramente decorativo. */
export function rotularComIcone(alvo: HTMLElement, nome: NomeDoIconeGrego, texto: string): void {
  const rotulo = document.createElement('span');
  rotulo.className = 'rotulo-com-icone__texto';
  rotulo.textContent = texto;
  alvo.classList.add('rotulo-com-icone');
  alvo.replaceChildren(iconeGrego(nome), rotulo);
}

/** Ícones das construções autorais sem deixar essa decisão visual vazar para a campanha. */
export function iconeDaConstrucao(id: string): NomeDoIconeGrego {
  const conhecidos: Record<string, NomeDoIconeGrego> = {
    agora: 'templo',
    oficina: 'martelo',
    mercado: 'mercado',
    celeiro: 'celeiro',
    quartel: 'quartel',
    muralha: 'muralha',
  };
  return conhecidos[id] ?? 'martelo';
}
