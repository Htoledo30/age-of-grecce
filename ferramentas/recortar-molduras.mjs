/** Recortes da prancha aprovada; preserva os pixels e o alfa do original. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const raiz = new URL('../', import.meta.url);
const origem = PNG.sync.read(
  readFileSync(new URL('artes-para-aprovar/molduras/kit-molduras-bronze-v1.png', raiz)),
);
const destino = new URL('assets/interface/molduras/bronze-v1/', raiz);
mkdirSync(destino, { recursive: true });

const regioes = {
  'canto-superior-esquerdo': [80, 20, 300, 280],
  'canto-superior-direito': [1160, 20, 300, 280],
  'canto-inferior-esquerdo': [80, 725, 300, 280],
  'canto-inferior-direito': [1160, 725, 300, 280],
  'borda-superior': [470, 90, 600, 85],
  'borda-inferior': [470, 845, 600, 85],
  'borda-esquerda': [100, 300, 85, 425],
  'borda-direita': [1350, 300, 85, 425],
  'ornamento-cabecalho': [535, 420, 470, 170],
};

function salvar(nome, x, y, largura, altura) {
  const imagem = new PNG({ width: largura, height: altura });
  PNG.bitblt(origem, imagem, x, y, largura, altura, 0, 0);
  writeFileSync(new URL(`${nome}.png`, destino), PNG.sync.write(imagem));
}

for (const [nome, [x, y, largura, altura]] of Object.entries(regioes)) {
  let esquerda = x + largura;
  let topo = y + altura;
  let direita = x;
  let baixo = y;
  for (let j = y; j < y + altura; j++) {
    for (let i = x; i < x + largura; i++) {
      if (origem.data[(j * origem.width + i) * 4 + 3] <= 8) continue;
      esquerda = Math.min(esquerda, i);
      topo = Math.min(topo, j);
      direita = Math.max(direita, i);
      baixo = Math.max(baixo, j);
    }
  }
  // Dois pixels de respiro conservam a suavização das bordas.
  esquerda -= 2;
  topo -= 2;
  const w = direita - esquerda + 3;
  const h = baixo - topo + 3;
  salvar(nome, esquerda, topo, w, h);
  // O miolo não contém as tampas das barras: pode repetir sem virar uma sequência de caixas.
  if (nome === 'borda-superior' || nome === 'borda-inferior') {
    salvar(`${nome}-repeticao`, esquerda + Math.floor(w / 2) - 64, topo, 128, h);
  } else if (nome === 'borda-esquerda' || nome === 'borda-direita') {
    salvar(`${nome}-repeticao`, esquerda, topo + Math.floor(h / 2) - 64, w, 128);
  }
}
console.log(`Molduras recortadas em ${fileURLToPath(destino)}`);
