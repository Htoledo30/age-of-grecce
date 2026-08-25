/**
 * Geometria de anéis: área, simplificação, suavização e recorte.
 *
 * ⚠️ **Simplificar antes de suavizar.** A silhueta bruta do Natural Earth tem detalhe de
 * metros; suavizá-lo primeiro só arredondaria o ruído em vez de tirá-lo.
 */

export type Ponto = [number, number];
export type Anel = Ponto[];
type Poligono = Anel[];
type Geometria =
  | { type: 'Polygon'; coordinates: Poligono }
  | { type: 'MultiPolygon'; coordinates: Poligono[] };
export type Colecao = { features: Array<{ geometry: Geometria | null }> };

export function area(anel: Anel): number {
  let soma = 0;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const a = anel[i]!;
    const b = anel[j]!;
    soma += (b[0] + a[0]) * (b[1] - a[1]);
  }
  return Math.abs(soma) / 2;
}

function distanciaDaReta(p: Ponto, a: Ponto, b: Ponto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const comprimento = dx * dx + dy * dy;
  if (comprimento === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / comprimento));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas–Peucker: joga fora os pontos que não mudam a silhueta.
 * O Natural Earth tem detalhe de nível de metros; visto no tamanho do mapa isso vira
 * serrilha. Reduzir os pontos é o que faz a costa parar de parecer decalcada.
 */
export function simplificar(anel: Anel, tolerancia: number): Anel {
  if (anel.length < 4) return anel;
  const manter = new Uint8Array(anel.length);
  manter[0] = 1;
  manter[anel.length - 1] = 1;
  const pilha: Array<[number, number]> = [[0, anel.length - 1]];

  while (pilha.length > 0) {
    const [inicio, fim] = pilha.pop()!;
    let pior = 0;
    let indice = -1;
    for (let i = inicio + 1; i < fim; i++) {
      const d = distanciaDaReta(anel[i]!, anel[inicio]!, anel[fim]!);
      if (d > pior) {
        pior = d;
        indice = i;
      }
    }
    if (pior > tolerancia && indice > 0) {
      manter[indice] = 1;
      pilha.push([inicio, indice], [indice, fim]);
    }
  }

  const saida: Anel = [];
  for (let i = 0; i < anel.length; i++) if (manter[i]) saida.push(anel[i]!);
  return saida;
}

/** Chaikin: arredonda os cantos que sobraram. Costa desenhada, não traçada. */
export function suavizar(anel: Anel, passos: number): Anel {
  let atual = anel;
  for (let p = 0; p < passos; p++) {
    if (atual.length < 3) break;
    const saida: Anel = [];
    for (let i = 0; i < atual.length; i++) {
      const a = atual[i]!;
      const b = atual[(i + 1) % atual.length]!;
      saida.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      saida.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    atual = saida;
  }
  return atual;
}

export function caminho(anel: Anel): string {
  return (
    anel.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') +
    ' Z'
  );
}

/**
 * Sutherland–Hodgman num retângulo, já em unidades de mundo.
 *
 * É o ÚNICO corte do pipeline, e vem depois da suavização de propósito. Cortar antes
 * cria segmentos artificiais rentes à borda; a suavização não sabe distingui-los de
 * litoral e arredonda os cantos deles, e canto arredondado vira chanfro diagonal
 * atravessando a terra.
 */
export function recortarRetangulo(anel: Anel, min: number, maxX: number, maxY: number): Anel {
  const lados = [
    { dentro: (p: Ponto) => p[0] >= min, eixo: 0, valor: min },
    { dentro: (p: Ponto) => p[0] <= maxX, eixo: 0, valor: maxX },
    { dentro: (p: Ponto) => p[1] >= min, eixo: 1, valor: min },
    { dentro: (p: Ponto) => p[1] <= maxY, eixo: 1, valor: maxY },
  ] as const;

  let saida = anel;
  for (const lado of lados) {
    const entrada = saida;
    saida = [];
    if (entrada.length === 0) break;
    let anterior = entrada.at(-1)!;
    for (const atual of entrada) {
      const atualDentro = lado.dentro(atual);
      const anteriorDentro = lado.dentro(anterior);
      if (atualDentro !== anteriorDentro) {
        const e = lado.eixo;
        const o = e === 0 ? 1 : 0;
        const t = (lado.valor - anterior[e]) / (atual[e] - anterior[e]);
        const cruz: Ponto = [0, 0];
        cruz[e] = lado.valor;
        cruz[o] = anterior[o] + (atual[o] - anterior[o]) * t;
        saida.push(cruz);
      }
      if (atualDentro) saida.push(atual);
      anterior = atual;
    }
  }
  return saida;
}
