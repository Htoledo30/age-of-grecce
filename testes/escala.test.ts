import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  alturaDoPalco,
  aoMudarEscala,
  definirTamanhoDaInterface,
  larguraDoPalco,
  TAMANHOS_DA_INTERFACE,
  type TamanhoDaInterface,
} from '../src/estilo/escala';

/**
 * O tamanho da interface é uma DIVISÃO, e é ela que sustenta a promessa.
 *
 * Henrique pediu para aumentar o texto *"sem perder resolução ou qualidade"*. A resposta não
 * foi esticar nada: foi encolher o palco, porque `escala = min(janela / palco)` faz a escala
 * subir sozinha na mesma proporção — e o navegador REDESENHA o texto no corpo novo em vez de
 * ampliar um retrato dele. Se esta conta deixar de fechar, a promessa cai junto, e o defeito
 * apareceria como "o texto ficou borrado" muitas semanas depois.
 */
describe('o tamanho da interface', () => {
  // A escala mede a janela, e no ambiente de teste não há janela nenhuma. Uma de 1920x1080 é a
  // que dá escala 1 no tamanho normal — o ponto de partida contra o qual tudo se compara.
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 });
  });

  afterEach(() => {
    definirTamanhoDaInterface('normal');
    vi.unstubAllGlobals();
  });

  it('no tamanho normal o palco é exatamente a prancheta em que tudo foi desenhado', () => {
    definirTamanhoDaInterface('normal');
    expect(larguraDoPalco()).toBe(1920);
    expect(alturaDoPalco()).toBe(1080);
  });

  it('escolher uma interface maior ENCOLHE o palco, na proporção exata', () => {
    for (const [nome, fator] of Object.entries(TAMANHOS_DA_INTERFACE)) {
      definirTamanhoDaInterface(nome as TamanhoDaInterface);
      expect(larguraDoPalco()).toBe(Math.round(1920 / fator));
      expect(alturaDoPalco()).toBe(Math.round(1080 / fator));
      // A proporção do palco não muda: nada é esticado nem espremido em nenhum tamanho.
      expect(larguraDoPalco() / alturaDoPalco()).toBeCloseTo(1920 / 1080, 2);
    }
  });

  it('o palco menor vira escala maior — 130% na opção é 1,3x na tela', () => {
    const vistas: number[] = [];
    const parar = aoMudarEscala((escala) => vistas.push(escala));

    definirTamanhoDaInterface('normal');
    const normal = vistas.at(-1) ?? 0;
    definirTamanhoDaInterface('maior');
    const maior = vistas.at(-1) ?? 0;
    parar();

    expect(normal).toBe(1);
    expect(maior / normal).toBeCloseTo(TAMANHOS_DA_INTERFACE.maior, 2);
  });

  it('quem escolhe é avisado mesmo quando a escala, por coincidência, não muda', () => {
    // Numa janela quadrada de 1080, a escala é presa pela altura nos dois tamanhos abaixo por
    // acaso do arredondamento. Quem depende do TAMANHO do palco — o renderizador do mapa — não
    // pode ficar com a medida velha só porque o número da escala repetiu.
    vi.stubGlobal('window', { innerWidth: 1080, innerHeight: 1080, devicePixelRatio: 1 });
    let avisos = 0;
    const parar = aoMudarEscala(() => avisos++);
    const antes = avisos;
    definirTamanhoDaInterface('normal');
    definirTamanhoDaInterface('normal');
    parar();
    expect(avisos - antes).toBe(2);
  });
});
