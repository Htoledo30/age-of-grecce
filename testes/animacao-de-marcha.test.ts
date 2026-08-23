import { describe, expect, it } from 'vitest';

import { AnimacaoDeMarcha } from '../src/ui/animacao-de-marcha';

/**
 * A marcha animada é ILUSTRAÇÃO: ela não decide nada, só atrasa a peça no caminho. Por
 * isso ela cabe aqui, sem navegador — não toca no DOM nem sabe o que é uma câmera.
 */

const RETA = [
  {
    hoste: 'maratona',
    pontos: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  },
];

describe('a peça anda o caminho em vez de saltar para o destino', () => {
  it('parte da origem e chega ao destino, passando pelo meio', () => {
    const a = new AnimacaoDeMarcha();
    a.comecar(RETA, 1);

    expect(a.posicaoDe('maratona')).toEqual({ x: 0, y: 0 });
    a.avancar(0.5);
    const meio = a.posicaoDe('maratona');
    expect(meio?.x).toBeGreaterThan(10);
    expect(meio?.x).toBeLessThan(90);
    a.avancar(0.5);
    expect(a.posicaoDe('maratona')).toBeNull(); // chegou e saiu de cena
  });

  it('quem não está marchando responde null, que é a resposta normal', () => {
    const a = new AnimacaoDeMarcha();
    expect(a.posicaoDe('atenas')).toBeNull();
    a.comecar(RETA, 1);
    expect(a.posicaoDe('atenas')).toBeNull();
  });

  it('segue a TRILHA, não a reta entre as pontas', () => {
    // Com dois saltos por rodada, a reta entre origem e destino passa por fora do caminho
    // que a seta prometeu. O desvio no meio é justamente o que se guarda aqui.
    const a = new AnimacaoDeMarcha();
    a.comecar(
      [
        {
          hoste: 'tebas',
          pontos: [
            { x: 0, y: 0 },
            { x: 50, y: 100 },
            { x: 100, y: 0 },
          ],
        },
      ],
      1,
    );
    a.avancar(1); // metade do prazo de dois saltos
    const meio = a.posicaoDe('tebas');
    expect(meio?.y).toBeGreaterThan(50); // desviou para o ponto do meio
  });

  it('o prazo é POR SALTO: dois saltos levam o dobro de um', () => {
    const a = new AnimacaoDeMarcha();
    a.comecar(
      [
        {
          hoste: 'maratona',
          pontos: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        },
        {
          hoste: 'tebas',
          pontos: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 20, y: 0 },
          ],
        },
      ],
      1,
    );
    a.avancar(1.01);
    // A curta chegou; a longa continua andando. É assim que a distância se lê na tela.
    expect(a.posicaoDe('maratona')).toBeNull();
    expect(a.posicaoDe('tebas')).not.toBeNull();
    expect(a.emCurso).toBe(true);
    a.avancar(1);
    expect(a.emCurso).toBe(false);
  });

  it('avisa cada chegada quando ela acontece, e não todas no fim', () => {
    const avisos: string[][] = [];
    const a = new AnimacaoDeMarcha();
    a.aoChegar = (destinos) => avisos.push([...destinos]);
    a.comecar(
      [
        {
          hoste: 'maratona',
          pontos: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        },
        {
          hoste: 'tebas',
          pontos: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 20, y: 0 },
          ],
        },
      ],
      1,
    );
    a.avancar(1.01);
    a.avancar(1);
    expect(avisos).toEqual([['maratona'], ['tebas']]);
  });

  it('marcha nova descarta a anterior: o mundo dela deixou de existir', () => {
    const a = new AnimacaoDeMarcha();
    a.comecar(RETA, 1);
    a.comecar(
      [
        {
          hoste: 'tebas',
          pontos: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
        },
      ],
      1,
    );
    expect(a.posicaoDe('maratona')).toBeNull();
    expect(a.posicaoDe('tebas')).not.toBeNull();
    a.parar();
    expect(a.emCurso).toBe(false);
  });

  it('trilha sem trecho nenhum não vira marcha', () => {
    const a = new AnimacaoDeMarcha();
    a.comecar([{ hoste: 'atenas', pontos: [{ x: 7, y: 7 }] }], 1);
    expect(a.emCurso).toBe(false);
  });
});
