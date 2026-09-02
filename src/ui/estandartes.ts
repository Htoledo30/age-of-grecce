/**
 * Estandartes de hostes, reinos e províncias.
 *
 * A cor continua sendo a linguagem do mapa; o emblema acrescenta uma silhueta que o jogador
 * reconhece e reencontra em toda a interface. Os dezoito poderes funcionais usam símbolos
 * cívicos escolhidos em moedas e cultos locais. Outros poderes recebem um motivo geométrico
 * estável, inclusive os reinos `livre-*` que podem nascer durante a campanha.
 *
 * O SVG é decorativo: o nome do poder permanece como texto real ao lado dele.
 */

import { EMBLEMAS_DOS_PODERES, type EmblemaDePoder } from './emblemas-de-poder';

export type VarianteDeEstandarte = 'hoste' | 'reino' | 'provincia';

export interface PoderDoEstandarte {
  id: string;
  nome: string;
  cor: string;
}

type ElementoDoSvg = 'circle' | 'path';
type Aparencia = 'cheia' | 'linha' | 'recorte';
type Forma = readonly [
  elemento: ElementoDoSvg,
  atributos: Readonly<Record<string, string>>,
  aparencia?: Aparencia,
];

interface DesenhoDoEstandarte {
  nome: string;
  caminho?: string;
  formas?: readonly Forma[];
  viewBox: string;
}

const NS = 'http://www.w3.org/2000/svg';
const CATALOGO: Readonly<Record<string, EmblemaDePoder>> = EMBLEMAS_DOS_PODERES;

const cheia = (d: string): Forma => ['path', { d }, 'cheia'];
const linha = (d: string): Forma => ['path', { d }, 'linha'];

/**
 * Reserva para poderes sem economia completa.
 *
 * Aqui a função é somente diferenciar, não fingir uma identidade histórica. Os motivos são
 * largos, cabem em 24×24 e continuam estáveis pelo hash do id.
 */
const EMBLEMAS_GENERICOS: Readonly<Record<string, readonly Forma[]>> = {
  roseta: [
    ['circle', { cx: '12', cy: '5', r: '3.4' }, 'cheia'],
    ['circle', { cx: '18', cy: '9', r: '3.4' }, 'cheia'],
    ['circle', { cx: '17.2', cy: '16.5', r: '3.4' }, 'cheia'],
    ['circle', { cx: '10', cy: '19', r: '3.4' }, 'cheia'],
    ['circle', { cx: '5', cy: '13.2', r: '3.4' }, 'cheia'],
    ['circle', { cx: '12', cy: '12', r: '3.5' }, 'recorte'],
  ],
  palmeta: [
    linha('M12 21V9M12 10 4.2 4.6M12 10 7.9 2.7M12 10V2M12 10l4.1-7.3M12 10l7.8-5.4'),
    linha('M6 15.5c3.4 1.8 8.6 1.8 12 0'),
  ],
  espiral: [
    linha(
      'M12 20.8C5 20.8 2.7 15.5 4.9 10 7.2 4.2 15.2 2.1 19 6.5c3.1 3.6.8 9.3-3.6 9.3-3.6 0-4.8-4.3-2.1-6.1 1.6-1.1 3.8.1 3.5 1.8',
    ),
  ],
  tripode: [
    linha('M5 5h14l-2.2 5.1H7.2Zm3.2 5.1L5.1 21m10.7-10.9 3.1 10.9M12 10.1V21'),
    ['circle', { cx: '12', cy: '4.2', r: '1.4' }, 'cheia'],
  ],
  golfinho: [
    cheia(
      'M2.4 13.5c4.7-5.1 10.9-6.8 16.2-3l3-2.5-.4 4.2 2.2 3.1-4.3-.8c-4.7 4-10.1 4.7-15.4 1.6l-1.3 2.3Z',
    ),
  ],
  raio: [cheia('M13.9 1.8 5.2 13h5.5l-1 9.2L19 10.3h-5.5Z')],
  meandro: [linha('M3 6h12v4H7v8h10v-4h4M3 18V10h8V6')],
  estrela: [cheia('m12 2.2 2.7 6.5 7 .6-5.3 4.6 1.6 6.9-6-3.7-6 3.7 1.6-6.9-5.3-4.6 7-.6Z')],
};

const GENERICOS = [
  'roseta',
  'palmeta',
  'espiral',
  'tripode',
  'golfinho',
  'raio',
  'meandro',
  'estrela',
] as const;

const CORES_DE_RESERVA = [
  '#6d7f93',
  '#83666d',
  '#728468',
  '#7c6d96',
  '#8c735b',
  '#5f8580',
  '#8d6660',
  '#697293',
] as const;

function hashDoId(id: string): number {
  let hash = 2_166_136_261;
  for (let indice = 0; indice < id.length; indice += 1) {
    hash ^= id.charCodeAt(indice);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Nome estável do motivo; útil para DOM, testes e persistência visual. */
export function emblemaDoPoder(id: string): string {
  const normalizado = id.trim().toLowerCase();
  return (
    CATALOGO[normalizado]?.nome ?? `generico-${GENERICOS[hashDoId(normalizado) % GENERICOS.length]}`
  );
}

function desenhoDoPoder(id: string): DesenhoDoEstandarte {
  const normalizado = id.trim().toLowerCase();
  const proprio = CATALOGO[normalizado];
  if (proprio) {
    return {
      nome: proprio.nome,
      caminho: proprio.caminho,
      viewBox: '0 0 512 512',
    };
  }

  const nome = GENERICOS[hashDoId(normalizado) % GENERICOS.length] ?? 'roseta';
  return {
    nome: `generico-${nome}`,
    formas: EMBLEMAS_GENERICOS[nome] ?? EMBLEMAS_GENERICOS['roseta'] ?? [],
    viewBox: '0 0 24 24',
  };
}

function rgbDaCor(cor: string, id: string): readonly [number, number, number] {
  const texto = cor.trim();
  const curto = /^#([\da-f])([\da-f])([\da-f])$/i.exec(texto);
  if (curto) {
    const [, r = '0', g = '0', b = '0'] = curto;
    return [
      Number.parseInt(`${r}${r}`, 16),
      Number.parseInt(`${g}${g}`, 16),
      Number.parseInt(`${b}${b}`, 16),
    ];
  }
  const longo = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(texto);
  if (longo) {
    const [, r = '00', g = '00', b = '00'] = longo;
    return [Number.parseInt(r, 16), Number.parseInt(g, 16), Number.parseInt(b, 16)];
  }
  return rgbDaCor(
    CORES_DE_RESERVA[hashDoId(id) % CORES_DE_RESERVA.length] ?? CORES_DE_RESERVA[0],
    'reserva',
  );
}

function canalLinear(canal: number): number {
  const normalizado = canal / 255;
  return normalizado <= 0.04045 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
}

function luminancia([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

function contraste(a: number, b: number): number {
  const clara = Math.max(a, b);
  const escura = Math.min(a, b);
  return (clara + 0.05) / (escura + 0.05);
}

function hexadecimal([r, g, b]: readonly [number, number, number]): string {
  const canal = (valor: number): string =>
    Math.round(Math.max(0, Math.min(255, valor)))
      .toString(16)
      .padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

function misturar(
  cor: readonly [number, number, number],
  destino: readonly [number, number, number],
  peso: number,
): readonly [number, number, number] {
  return [
    cor[0] + (destino[0] - cor[0]) * peso,
    cor[1] + (destino[1] - cor[1]) * peso,
    cor[2] + (destino[2] - cor[2]) * peso,
  ];
}

function elementoSvg(tipo: ElementoDoSvg, atributos: Readonly<Record<string, string>>): SVGElement {
  const elemento = document.createElementNS(NS, tipo);
  for (const [nome, valor] of Object.entries(atributos)) elemento.setAttribute(nome, valor);
  return elemento;
}

function desenharEmblema(desenho: DesenhoDoEstandarte): SVGSVGElement {
  const campo = document.createElementNS(NS, 'svg');
  campo.classList.add('estandarte__emblema');
  campo.setAttribute('x', '12');
  campo.setAttribute('y', '11');
  campo.setAttribute('width', '50');
  campo.setAttribute('height', '47');
  campo.setAttribute('viewBox', desenho.viewBox);
  campo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  campo.setAttribute('overflow', 'visible');

  if (desenho.caminho) {
    const forma = elementoSvg('path', { d: desenho.caminho });
    forma.classList.add(
      'estandarte__forma',
      'estandarte__forma--cheia',
      'estandarte__forma--catalogo',
    );
    campo.appendChild(forma);
    return campo;
  }

  for (const [tipo, atributos, aparencia = 'cheia'] of desenho.formas ?? []) {
    const forma = elementoSvg(tipo, atributos);
    forma.classList.add('estandarte__forma', `estandarte__forma--${aparencia}`);
    campo.appendChild(forma);
  }
  return campo;
}

/**
 * Monta uma peça de facção, não um brasão: haste e travessa tornam o pano reconhecível mesmo
 * isolado; a cauda bifurcada afasta a aparência de escudo. As facetas dão a linguagem
 * low-poly sem competir com o símbolo.
 */
export function criarEstandarte(
  poder: PoderDoEstandarte,
  variante: VarianteDeEstandarte,
): SVGSVGElement {
  const rgb = rgbDaCor(poder.cor, poder.id);
  const fundo = hexadecimal(rgb);
  const marfim = [244, 230, 201] as const;
  const carvao = [33, 26, 22] as const;
  const bronze = [183, 135, 70] as const;
  const luzDoFundo = luminancia(rgb);
  const usarMarfim =
    contraste(luzDoFundo, luminancia(marfim)) >= contraste(luzDoFundo, luminancia(carvao));
  const tinta = usarMarfim ? hexadecimal(marfim) : hexadecimal(carvao);
  const borda = hexadecimal(misturar(rgb, carvao, 0.55));
  const haste = hexadecimal(
    misturar(bronze, usarMarfim ? marfim : carvao, usarMarfim ? 0.08 : 0.18),
  );
  const desenho = desenhoDoPoder(poder.id);

  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('estandarte', `estandarte--${variante}`);
  svg.setAttribute('viewBox', '0 0 68 80');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.dataset['poder'] = poder.id;
  svg.dataset['nomePoder'] = poder.nome;
  svg.dataset['emblema'] = desenho.nome;
  svg.dataset['tinta'] = usarMarfim ? 'marfim' : 'carvao';
  svg.dataset['livre'] = poder.id.startsWith('livre-') ? 'sim' : 'nao';
  svg.style.setProperty('--estandarte-cor', fundo);
  svg.style.setProperty('--estandarte-borda', borda);
  svg.style.setProperty('--estandarte-tinta', tinta);
  svg.style.setProperty('--estandarte-recorte', fundo);
  svg.style.setProperty('--estandarte-haste', haste);

  const hasteSombra = elementoSvg('path', { d: 'M6.5 5.5v69.5' });
  hasteSombra.classList.add('estandarte__haste-sombra');
  svg.appendChild(hasteSombra);

  const hastePrincipal = elementoSvg('path', { d: 'M5 4v70' });
  hastePrincipal.classList.add('estandarte__haste');
  svg.appendChild(hastePrincipal);

  const sombra = elementoSvg('path', { d: 'M12 11h54v57L39 59 12 70Z' });
  sombra.classList.add('estandarte__sombra');
  svg.appendChild(sombra);

  const pano = elementoSvg('path', { d: 'M9 8h55v58L37 57 9 68Z' });
  pano.classList.add('estandarte__pano');
  svg.appendChild(pano);

  const facetaClara = elementoSvg('path', { d: 'M11 10h27L25 65H11Z' });
  facetaClara.classList.add('estandarte__faceta', 'estandarte__faceta--clara');
  svg.appendChild(facetaClara);

  const facetaEscura = elementoSvg('path', { d: 'M38 10h24v53L37 55Z' });
  facetaEscura.classList.add('estandarte__faceta', 'estandarte__faceta--escura');
  svg.appendChild(facetaEscura);

  const moldura = elementoSvg('path', { d: 'M13 12h47v49L37 52 13 63Z' });
  moldura.classList.add('estandarte__moldura');
  svg.appendChild(moldura);

  svg.appendChild(desenharEmblema(desenho));

  const travessaSombra = elementoSvg('path', { d: 'M4 10h62' });
  travessaSombra.classList.add('estandarte__travessa-sombra');
  svg.appendChild(travessaSombra);

  const travessa = elementoSvg('path', { d: 'M4 8h62' });
  travessa.classList.add('estandarte__travessa');
  svg.appendChild(travessa);

  const remate = elementoSvg('circle', { cx: '5', cy: '4', r: '3' });
  remate.classList.add('estandarte__remate');
  svg.appendChild(remate);

  return svg;
}
