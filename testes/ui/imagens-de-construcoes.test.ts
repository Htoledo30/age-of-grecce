import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import construcoes from '../../dados/construcoes.json';
import { arquivoDaConstrucao } from '../../src/ui/imagens-de-construcoes';

describe('artes das construções', () => {
  it('cobre o catálogo inteiro com arquivos reais', () => {
    for (const id of Object.keys(construcoes.construcoes)) {
      const arquivo = arquivoDaConstrucao(id);
      expect(arquivo, `${id} não tem arte`).not.toBeNull();
      const caminho = resolve('assets/interface/construcoes', arquivo ?? 'ausente');
      expect(existsSync(caminho), `${id} aponta para ${caminho}, que não existe`).toBe(true);
      expect(statSync(caminho).size, `${id} tem uma arte vazia`).toBeGreaterThan(0);
    }
  });
});
