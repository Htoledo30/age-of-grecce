/**
 * Traz os índices da imagem para a memória do processador.
 *
 * A MESMA imagem que a GPU pinta serve pra saber onde o mouse está: apontar vira ler um
 * número numa posição. Sem geometria, sem teste de ponto-em-polígono, sem passe de seleção
 * na placa de vídeo.
 *
 * A leitura é em FAIXAS de propósito: a imagem inteira em RGBA são ~100 MB de uma vez, e
 * faixa por faixa o pico fica em poucos megabytes. O que sobra no fim é só o vetor de 16
 * bits — metade do tamanho, porque aqui não interessa cor nenhuma, só o número.
 */

const LINHAS_POR_FAIXA = 256;

export async function lerIndices(
  endereco: string,
  largura: number,
  altura: number,
): Promise<Uint16Array> {
  const resposta = await fetch(endereco);
  const bitmap = await createImageBitmap(await resposta.blob());

  const tela = new OffscreenCanvas(largura, LINHAS_POR_FAIXA);
  const pincel = tela.getContext('2d', { willReadFrequently: true });
  if (!pincel) throw new Error('sem contexto 2d pra ler o mapa de províncias');
  pincel.imageSmoothingEnabled = false;

  const indices = new Uint16Array(largura * altura);
  for (let topo = 0; topo < altura; topo += LINHAS_POR_FAIXA) {
    const linhas = Math.min(LINHAS_POR_FAIXA, altura - topo);
    pincel.clearRect(0, 0, largura, LINHAS_POR_FAIXA);
    pincel.drawImage(bitmap, 0, -topo);
    const dados = pincel.getImageData(0, 0, largura, linhas).data;
    const base = topo * largura;
    for (let i = 0; i < largura * linhas; i++) {
      indices[base + i] = dados[i * 4]! | (dados[i * 4 + 1]! << 8);
    }
  }
  bitmap.close();
  return indices;
}
